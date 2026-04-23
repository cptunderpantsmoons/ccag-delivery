// Contract Hub - Corporate Carbon Group Australia
// AI Model Configuration - OpenRouter & Local Models
// User-selectable in Settings UI

export interface AIModelConfig {
  id: string;
  provider: string;
  model: string;
  displayName: string;
  description: string;
  tier: 'extraction' | 'review' | 'analysis';
  maxTokens: number;
  supportsStructuredOutput: boolean;
  costPer1kTokens?: number;
  isFree?: boolean;
}

// Available models for Contract Hub (user-selectable in Settings)
// Using OpenRouter for multi-provider access
export const AVAILABLE_MODELS: AIModelConfig[] = [
  // ============================================================
  // EXTRACTION TIER (fast, cheap - for parsing, classification, entity extraction)
  // ============================================================
  {
    id: 'qwen3-next-80b-a3b-free',
    provider: 'openrouter',
    model: 'qwen/qwen3-next-80b-a3b-instruct:free',
    displayName: 'Qwen3 Next 80B (Free)',
    description: 'Free MoE model for fast extraction and classification tasks.',
    tier: 'extraction',
    maxTokens: 4096,
    supportsStructuredOutput: true,
    costPer1kTokens: 0,
    isFree: true,
  },
  {
    id: 'nemotron-nano-12b-free',
    provider: 'openrouter',
    model: 'nvidia/nemotron-nano-12b-v2-vl:free',
    displayName: 'Nemotron Nano 12B (Free)',
    description: 'Free lightweight vision-language model. Good for quick classification and simple extraction.',
    tier: 'extraction',
    maxTokens: 4096,
    supportsStructuredOutput: true,
    costPer1kTokens: 0,
    isFree: true,
  },
  {
    id: 'qwen3.5-9b',
    provider: 'openrouter',
    model: 'qwen/qwen3.5-9b',
    displayName: 'Qwen3.5 9B',
    description: 'Fast, efficient model for document parsing, entity extraction, and classification tasks.',
    tier: 'extraction',
    maxTokens: 8192,
    supportsStructuredOutput: true,
    costPer1kTokens: 0.0005,
  },
  {
    id: 'mimo-v2-flash',
    provider: 'openrouter',
    model: 'xiaomi/mimo-v2-flash',
    displayName: 'MiMo V2 Flash',
    description: 'Fast inference model for rapid document processing and lightweight agent interactions.',
    tier: 'extraction',
    maxTokens: 8192,
    supportsStructuredOutput: true,
    costPer1kTokens: 0.0003,
  },

  // ============================================================
  // REVIEW TIER (balanced quality - for contract review, risk assessment)
  // ============================================================
  {
    id: 'elephant-alpha',
    provider: 'openrouter',
    model: 'openrouter/elephant-alpha',
    displayName: 'Elephant Alpha',
    description: '100B-parameter reasoning model. Excellent for contract review, clause analysis, and code completion. 256K context window.',
    tier: 'review',
    maxTokens: 32768,
    supportsStructuredOutput: true,
    costPer1kTokens: 0.002,
  },
  {
    id: 'qwen3.5-35b-a3b',
    provider: 'openrouter',
    model: 'qwen/qwen3.5-35b-a3b',
    displayName: 'Qwen3.5 35B MoE',
    description: 'Efficient MoE model for balanced contract review and risk assessment.',
    tier: 'review',
    maxTokens: 16384,
    supportsStructuredOutput: true,
    costPer1kTokens: 0.001,
  },
  {
    id: 'llama-nemotron-super-49b',
    provider: 'openrouter',
    model: 'nvidia/llama-3.3-nemotron-super-49b-v1.5',
    displayName: 'Llama Nemotron Super 49B',
    description: 'NVIDIA fine-tuned Llama for detailed review and analysis tasks.',
    tier: 'review',
    maxTokens: 16384,
    supportsStructuredOutput: true,
    costPer1kTokens: 0.0015,
  },

  // ============================================================
  // ANALYSIS TIER (high-quality reasoning - for compliance, legal advice)
  // ============================================================
  {
    id: 'qwen3.6-plus-preview',
    provider: 'openrouter',
    model: 'qwen/qwen3.6-plus-preview',
    displayName: 'Qwen3.6 Plus Preview',
    description: 'Latest Qwen reasoning model with enhanced legal understanding. Best for deep legal analysis and compliance review.',
    tier: 'analysis',
    maxTokens: 16384,
    supportsStructuredOutput: true,
    costPer1kTokens: 0.003,
  },
  {
    id: 'kimi-k2.5',
    provider: 'openrouter',
    model: 'moonshotai/kimi-k2.5',
    displayName: 'Kimi K2.5',
    description: 'Moonshot AI flagship model. Strong reasoning for complex legal analysis and multi-step compliance checks.',
    tier: 'analysis',
    maxTokens: 32768,
    supportsStructuredOutput: true,
    costPer1kTokens: 0.004,
  },
  {
    id: 'olmo-3-32b-think',
    provider: 'openrouter',
    model: 'allenai/olmo-3-32b-think',
    displayName: 'OLMo 3 32B Think',
    description: 'AI2 reasoning model with chain-of-thought. Good for structured legal reasoning and argument analysis.',
    tier: 'analysis',
    maxTokens: 16384,
    supportsStructuredOutput: true,
    costPer1kTokens: 0.002,
  },
];

// Default model settings for new tenants
export const DEFAULT_MODEL_SETTINGS = {
  defaultProvider: 'openrouter',
  defaultModel: 'openrouter/elephant-alpha',
  reviewProvider: 'openrouter',
  reviewModel: 'openrouter/elephant-alpha',
  extractionProvider: 'openrouter',
  extractionModel: 'qwen/qwen3-next-80b-a3b-instruct:free',
  analysisProvider: 'openrouter',
  analysisModel: 'qwen/qwen3.6-plus-preview',
  requireHumanApproval: true,
  autoClassifyDocuments: false,
};

// Orchestration model for agent calls (OpenCode SDK)
export const ORCHESTRATION_CONFIG = {
  provider: 'openrouter',
  model: 'openrouter/elephant-alpha',
  baseUrl: 'https://openrouter.ai/api/v1',
  apiKeyEnvVar: 'OPENROUTER_API_KEY',
};

export function getModelConfig(modelId: string): AIModelConfig | undefined {
  return AVAILABLE_MODELS.find(m => m.id === modelId);
}

export function getModelsByTier(tier: AIModelConfig['tier']): AIModelConfig[] {
  return AVAILABLE_MODELS.filter(m => m.tier === tier);
}

export function getFreeModels(): AIModelConfig[] {
  return AVAILABLE_MODELS.filter(m => m.isFree);
}