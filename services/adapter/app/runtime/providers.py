"""Provider abstraction using pydantic-ai model wrappers over OpenAI SDK.

Supports:
- OpenAI native (Responses API ready)
- OpenAI-compatible (Featherless, DeepSeek via base_url)
- Anthropic (via pydantic-ai AnthropicModel)
"""

from typing import Optional
import structlog

from pydantic_ai.models.openai import OpenAIModel
from pydantic_ai.models.anthropic import AnthropicModel
from openai import AsyncOpenAI

from app.config import get_settings

logger = structlog.get_logger()

# Provider endpoint registry
# Hierarchy: local DGX Spark -> Featherless/Z.ai -> OpenRouter free tier
_PROVIDER_ENDPOINTS = {
    "openai": {"base_url": None, "default_model": "gpt-4o"},
    "anthropic": {"base_url": None, "default_model": "claude-3-sonnet-20240229"},
    "dgx-spark-1": {
        "base_url": "http://dgx-spark-1:5000/v1",
        "default_model": "local-llm",
    },
    "dgx-spark-2": {
        "base_url": "http://dgx-spark-2:5000/v1",
        "default_model": "local-llm",
    },
    "featherless": {
        "base_url": "https://api.featherless.ai/v1",
        "default_model": "meta-llama-3.1-70b-instruct",
    },
    "zai": {
        "base_url": "https://api.z.ai/v1",
        "default_model": "z-ai-default",
    },
    "openrouter": {
        "base_url": "https://openrouter.ai/api/v1",
        "default_model": "openrouter/auto",
    },
    "deepseek": {
        "base_url": "https://api.deepseek.com/v1",
        "default_model": "deepseek-chat",
    },
}


def resolve_model_name(provider: str, requested_model: Optional[str] = None) -> str:
    """Resolve the effective model name for a provider.

    The adapter accepts the legacy placeholder model ``carbon-agent`` from
    OpenAI-compatible clients. When that placeholder is present, use the
    configured model name or the provider default instead.
    """
    settings = get_settings()
    p = (provider or settings.llm_provider or "openai").lower()
    if p == "agent-zero":
        p = "openai"
    config = _PROVIDER_ENDPOINTS.get(p)
    if config is None:
        raise ValueError(
            f"Unsupported provider: {p}. Supported: {list(_PROVIDER_ENDPOINTS.keys())}"
        )

    if requested_model and requested_model != "carbon-agent":
        return requested_model

    configured = settings.llm_model_name
    configured_provider = (settings.llm_provider or "").lower()
    if (
        configured
        and configured != "carbon-agent"
        and (configured_provider == p or not configured_provider)
    ):
        return configured

    return config["default_model"]


def resolve_provider_and_model(
    requested_provider: Optional[str],
    requested_model: Optional[str],
    policy_default: str,
    allowed_providers: list[str],
    routing_mode: str,
) -> tuple[str, str]:
    """Resolve the final provider/model pair from policy and request inputs."""
    provider = resolve_provider_from_policy(
        requested_provider=requested_provider,
        policy_default=policy_default,
        allowed_providers=allowed_providers,
        routing_mode=routing_mode,
    )
    model = resolve_model_name(provider, requested_model)
    return provider, model


def get_provider_model(
    provider: Optional[str] = None,
    model: Optional[str] = None,
    api_key: Optional[str] = None,
) -> OpenAIModel | AnthropicModel:
    """Create a pydantic-ai Model instance for the given provider.

    Args:
        provider: One of 'openai', 'featherless', 'deepseek', 'anthropic'
        model: Model name override
        api_key: API key override

    Returns:
        pydantic-ai Model instance ready for Agent construction
    """
    settings = get_settings()
    p = (provider or settings.llm_provider or "openai").lower()

    if p == "agent-zero":
        # Legacy mapping removed; route to OpenRouter free tier as fallback
        logger.warning("agent_zero_deprecated_routing_to_openrouter", provider=p)
        p = "openrouter"

    config = _PROVIDER_ENDPOINTS.get(p)
    if config is None:
        raise ValueError(
            f"Unsupported provider: {p}. Supported: {list(_PROVIDER_ENDPOINTS.keys())}"
        )

    m = resolve_model_name(p, model)
    key = api_key or settings.llm_api_key or ""

    logger.info("provider_model_created", provider=p, model=m)

    if p == "anthropic":
        return AnthropicModel(m, api_key=key)

    # OpenAI-compatible path (covers OpenAI, Featherless, DeepSeek)
    client = AsyncOpenAI(
        api_key=key,
        base_url=config["base_url"],
    )
    return OpenAIModel(m, provider=client)


def resolve_provider_from_policy(
    requested_provider: Optional[str],
    policy_default: str,
    allowed_providers: list[str],
    routing_mode: str,
) -> str:
    """Resolve which provider to use based on request + policy.

    Args:
        requested_provider: User-requested provider (may be None)
        policy_default: Policy default provider
        allowed_providers: List of allowed providers
        routing_mode: 'auto', 'force_premium', 'block_premium', 'cost_optimized'

    Returns:
        Resolved provider string
    """
    premium_providers = ("openai", "anthropic")
    # DGX local instances are preferred for cost + latency when available
    local_providers = ("dgx-spark-1", "dgx-spark-2")

    if routing_mode == "force_premium":
        for pp in premium_providers:
            if pp in allowed_providers:
                return pp
        raise ValueError(
            "Model policy requires a premium provider, but none are allowed"
        )

    if routing_mode == "block_premium":
        if requested_provider in premium_providers:
            requested_provider = None
        non_premium = [p for p in allowed_providers if p not in premium_providers]
        if not non_premium:
            raise ValueError(
                "Model policy blocks premium providers, but no non-premium providers are allowed"
            )
        return (
            requested_provider if requested_provider in non_premium else non_premium[0]
        )

    if routing_mode == "cost_optimized":
        # Prefer local DGX, then free-tier OpenRouter, then Featherless/Z.ai
        for lp in local_providers:
            if lp in allowed_providers:
                return lp
        for fp in ("openrouter", "featherless", "zai"):
            if fp in allowed_providers:
                return fp
        # Fall through to policy default if no cheap options allowed

    # Auto mode: respect request if allowed, else policy default
    if requested_provider and requested_provider in allowed_providers:
        return requested_provider
    return policy_default
