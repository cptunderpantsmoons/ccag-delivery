const PREMIUM_PROVIDERS = new Set(["openai", "anthropic"]);

const PROVIDER_CATALOG = [
  {
    id: "featherless",
    label: "Featherless",
    tier: "fast",
    baseUrl: "https://api.featherless.ai/v1",
    models: [
      { id: "glm-5.1", label: "GLM-5.1" },
      { id: "glm-4.7", label: "GLM-4.7" },
      { id: "qwen3.5-9b", label: "Qwen3.5-9B" },
      { id: "minimax-2.7", label: "MiniMax 2.7" },
    ],
  },
  {
    id: "deepseek",
    label: "DeepSeek",
    tier: "reasoning",
    baseUrl: "https://api.deepseek.com/v1",
    models: [
      { id: "deepseek-chat", label: "DeepSeek Chat" },
      { id: "deepseek-reasoner", label: "DeepSeek Reasoner" },
    ],
  },
  {
    id: "openai",
    label: "OpenAI",
    tier: "premium",
    baseUrl: "https://api.openai.com/v1",
    models: [
      { id: "gpt-4.1", label: "GPT-4.1" },
      { id: "gpt-4o", label: "GPT-4o" },
    ],
  },
  {
    id: "anthropic",
    label: "Claude",
    tier: "premium",
    baseUrl: "https://api.anthropic.com/v1",
    models: [
      { id: "claude-4-sonnet", label: "Claude 4 Sonnet" },
      { id: "claude-3-7-sonnet-latest", label: "Claude 3.7 Sonnet" },
    ],
  },
];

export function buildModelCatalog({ routingMode = "auto", allowPremium = false } = {}) {
  const providers = PROVIDER_CATALOG.filter((provider) => {
    if (routingMode === "block_premium") {
      return !PREMIUM_PROVIDERS.has(provider.id);
    }

    if (routingMode === "force_premium") {
      return true;
    }

    if (!allowPremium) {
      return !PREMIUM_PROVIDERS.has(provider.id);
    }

    return true;
  });

  return {
    routingMode,
    allowPremium,
    providers,
  };
}
