"""Carbon Agent OpenAI Adapter — pydantic-ai runtime with compatibility layer.

Provides:
- /v1/chat/completions   (OpenAI-compatible, backward compatible)
- /v1/agent/run          (new internal execution path)
- /v1/models, /v1/user, /health, /metrics
"""

import uuid
from fastapi import FastAPI, HTTPException, Depends, Response
from fastapi.responses import StreamingResponse
import structlog
from sqlalchemy import text

from app.schemas import (
    ChatCompletionRequest,
    ChatCompletionResponse,
    ChatCompletionChoice,
    ChatMessage,
)
from app.streaming import fake_stream_response
from app.config import get_settings
from app.auth import verify_api_key
from app.models import User, UserStatus
from app.metrics import RequestIDMiddleware, metrics_endpoint
from app.database import async_session_factory

# New pydantic-ai runtime
from app.runtime import (
    AgentExecutionRequest,
    AgentExecutionResult,
    RuntimeDeps,
    execute_agent_run,
    ChatMessage as RuntimeChatMessage,
)

logger = structlog.get_logger()
app = FastAPI(title="Carbon Agent OpenAI Adapter", version="2.1.0")

# Request ID and metrics middleware
app.add_middleware(RequestIDMiddleware)


@app.get("/health")
async def health():
    return {"status": "healthy", "service": "carbon-agent-adapter"}


@app.get("/readyz")
async def readyz(response: Response):
    """Readiness endpoint with dependency checks."""
    settings = get_settings()
    config_ok = bool(settings.llm_provider and settings.llm_model_name)
    database_ok = False

    try:
        async with async_session_factory() as session:
            await session.execute(text("SELECT 1"))
        database_ok = True
    except Exception as exc:
        logger.warning("readiness_database_check_failed", error=str(exc))

    ready = config_ok and database_ok
    if not ready:
        response.status_code = 503

    return {
        "status": "ready" if ready else "not_ready",
        "service": "carbon-agent-adapter",
        "components": {
            "config": config_ok,
            "database": database_ok,
        },
    }


# Metrics endpoint for Prometheus scraping
app.add_api_route("/metrics", metrics_endpoint, methods=["GET"])


@app.get("/v1/models")
async def list_models(user: User = Depends(verify_api_key)):
    """List available models (returns current LLM provider model)."""
    settings = get_settings()

    return {
        "object": "list",
        "data": [
            {
                "id": settings.llm_model_name,
                "object": "model",
                "created": 1700000000,
                "owned_by": settings.llm_provider,
            }
        ],
    }


@app.post("/v1/chat/completions")
async def chat_completions(
    request: ChatCompletionRequest,
    user: User = Depends(verify_api_key),
):
    """OpenAI-compatible chat completions endpoint.

    Routes through the pydantic-ai runtime for all supported providers.
    """
    settings = get_settings()

    # Extract the latest user message
    user_message = ""
    for msg in reversed(request.messages):
        if msg.role == "user":
            user_message = msg.content
            break

    if not user_message:
        raise HTTPException(status_code=400, detail="No user message found")

    logger.info(
        "chat_request",
        user_id=user.id,
        user_email=user.email,
        stream=request.stream,
        llm_provider=settings.llm_provider,
    )

    # ── pydantic-ai runtime path ─────────────────────────────────────────
    trace_id = str(uuid.uuid4())

    runtime_request = AgentExecutionRequest(
        user_id=user.id,
        tenant_id="default",
        conversation_id=None,
        provider=settings.llm_provider,
        model=request.model,
        task_type="chat",
        temperature=request.temperature,
        max_tokens=request.max_tokens,
        stop=request.stop,
        messages=[
            RuntimeChatMessage(
                role=m.role,
                content=m.content,
                name=m.name,
                tool_call_id=m.tool_call_id,
            )
            for m in request.messages
        ],
        stream=request.stream,
    )

    deps = RuntimeDeps.from_request(runtime_request, trace_id=trace_id)

    try:
        result: AgentExecutionResult = await execute_agent_run(runtime_request, deps)
    except Exception as e:
        logger.error(
            "runtime_execution_failed",
            user_id=user.id,
            trace_id=trace_id,
            error=str(e),
            error_type=type(e).__name__,
        )
        raise HTTPException(
            status_code=502,
            detail=f"Runtime execution failed: {str(e)}",
        )

    if request.stream:
        return StreamingResponse(
            fake_stream_response(result.output_text),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "X-Accel-Buffering": "no",
            },
        )

    return ChatCompletionResponse(
        model=result.model,
        choices=[
            ChatCompletionChoice(
                message=ChatMessage(role="assistant", content=result.output_text)
            )
        ],
    )


@app.post("/v1/agent/run")
async def agent_run(
    request: AgentExecutionRequest,
    user: User = Depends(verify_api_key),
):
    """New internal execution path for the Intelligence Hub runtime.

    Accepts the normalized AgentExecutionRequest and returns a normalized
    AgentExecutionResult with full observability metadata.
    """
    trace_id = str(uuid.uuid4())
    deps = RuntimeDeps.from_request(request, trace_id=trace_id)

    logger.info(
        "agent_run_request",
        trace_id=trace_id,
        user_id=user.id,
        task_type=request.task_type,
        provider=request.provider,
    )

    try:
        result = await execute_agent_run(request, deps)
    except Exception as e:
        logger.error(
            "agent_run_failed",
            trace_id=trace_id,
            user_id=user.id,
            error=str(e),
            error_type=type(e).__name__,
        )
        raise HTTPException(
            status_code=502,
            detail=f"Agent run failed: {str(e)}",
        )

    return result


@app.get("/v1/user")
async def get_user_info(user: User = Depends(verify_api_key)):
    """Get current authenticated user information."""
    return {
        "id": user.id,
        "email": user.email,
        "display_name": user.display_name,
        "status": user.status,
        "has_service": user.status == UserStatus.ACTIVE,
    }
