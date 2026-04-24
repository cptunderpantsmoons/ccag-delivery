"""Tests for the adapter FastAPI app."""

from unittest.mock import AsyncMock, patch

from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_health():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"


def test_readyz():
    response = client.get("/readyz")
    assert response.status_code in [200, 503]
    body = response.json()
    assert body["status"] in ["ready", "not_ready"]
    assert body["service"] == "carbon-agent-adapter"
    assert "components" in body


def test_chat_completions_preserves_openai_request_fields():
    """Test the OpenAI bridge forwards model and generation settings."""
    from app.runtime.responses import AgentExecutionResult, TokenUsage

    mock_result = AgentExecutionResult(
        output_text="Bridge works",
        provider="openai",
        model="gpt-4o-mini",
        token_usage=TokenUsage(prompt_tokens=3, completion_tokens=7, total_tokens=10),
        trace_id="trace-123",
        conversation_id=None,
        finish_reason="stop",
    )

    with patch(
        "app.main.execute_agent_run", new=AsyncMock(return_value=mock_result)
    ) as mock_run:
        response = client.post(
            "/v1/chat/completions",
            headers={"Authorization": "Bearer sk-test"},
            json={
                "model": "gpt-4o-mini",
                "messages": [
                    {"role": "system", "content": "Be concise.", "name": "sys"},
                    {
                        "role": "user",
                        "content": "Hello",
                        "name": "tester",
                        "tool_call_id": "call-123",
                    },
                ],
                "temperature": 0.2,
                "max_tokens": 42,
                "stop": ["END"],
            },
        )

    assert response.status_code == 200
    body = response.json()
    assert body["model"] == "gpt-4o-mini"
    assert body["choices"][0]["message"]["content"] == "Bridge works"

    runtime_request = mock_run.call_args.args[0]
    assert runtime_request.model == "gpt-4o-mini"
    assert runtime_request.max_tokens == 42
    assert runtime_request.stop == ["END"]
    assert runtime_request.messages[0].name == "sys"
    assert runtime_request.messages[1].name == "tester"
    assert runtime_request.messages[1].tool_call_id == "call-123"
