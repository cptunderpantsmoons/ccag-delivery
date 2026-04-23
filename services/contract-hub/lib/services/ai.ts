/**
 * AI Service Helper
 * Wrapper for OpenRouter AI integration
 * Provides simple interface for document generation
 */

export interface AIGenerationRequest {
  prompt: string;
  systemPrompt?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface AIGenerationResponse {
  success: boolean;
  content?: string;
  error?: string;
  model?: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

/**
 * Generate content using AI via OpenRouter
 */
export async function generateContent(request: AIGenerationRequest): Promise<AIGenerationResponse> {
  try {
    if (!process.env.OPENROUTER_API_KEY) {
      return {
        success: false,
        error: 'AI service not configured. Check OPENROUTER_API_KEY in environment variables.',
      };
    }

    // Use the existing OpenRouter service's internal method
    // We need to call fetch directly with OpenRouter API
    const baseUrl = process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1';
    
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'HTTP-Referer': process.env.NEXT_PUBLIC_APP_NAME || 'Contract Hub',
        'X-Title': 'Contract Hub - CCG Australia',
      },
      body: JSON.stringify({
        model: request.model || 'openai/gpt-4',
        messages: [
          { role: 'system', content: request.systemPrompt || 'You are a helpful assistant.' },
          { role: 'user', content: request.prompt }
        ],
        temperature: request.temperature ?? 0.3,
        max_tokens: request.maxTokens || 4000,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      return {
        success: false,
        error: `AI API error: ${response.status} - ${error}`,
      };
    }

    const data = await response.json();
    
    return {
      success: true,
      content: data.choices?.[0]?.message?.content || '',
      model: data.model,
      usage: {
        promptTokens: data.usage?.prompt_tokens || 0,
        completionTokens: data.usage?.completion_tokens || 0,
        totalTokens: data.usage?.total_tokens || 0,
      },
    };
  } catch (error) {
    console.error('AI generation error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}
