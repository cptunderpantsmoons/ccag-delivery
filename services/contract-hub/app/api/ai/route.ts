import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/current-user';
import { errorResponse } from '@/lib/api-errors';
import { DEFAULT_MODEL_SETTINGS } from '@/config/models';
import { rateLimit } from '@/lib/utils/rate-limiter';

// POST /api/ai/analyze - Run AI analysis using OpenRouter
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return errorResponse('Unauthorized', 'UNAUTHORIZED', 401);

    // Rate limiting
    const rateLimitKey = `ai-api:${user.tenantId}`;
    const rateLimitResult = rateLimit(rateLimitKey, { windowMs: 60000, maxRequests: 30 });
    if (!rateLimitResult.allowed) {
      return errorResponse(
        'Rate limit exceeded. Please try again later.',
        'RATE_LIMITED',
        429,
        { retryAfter: rateLimitResult.retryAfter }
      );
    }

    const body = await request.json();
    const { entityType, entityId, analysisType, content, modelOverride } = body;

    if (!entityType || !entityId || !analysisType || !content) {
      return errorResponse('Missing required fields: entityType, entityId, analysisType, content', 'VALIDATION_ERROR', 400);
    }

    // Validate analysis type
    const validTypes = ['contract_review', 'risk_assessment', 'compliance', 'extraction', 'legal_advice', 'narrative_review'];
    if (!validTypes.includes(analysisType)) {
      return errorResponse(`Invalid analysis type. Must be one of: ${validTypes.join(', ')}`, 'VALIDATION_ERROR', 400);
    }

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      return errorResponse('OpenRouter API key not configured. Set OPENROUTER_API_KEY in environment variables.', 'SERVICE_UNAVAILABLE', 503);
    }

    // Resolve model from static config — no round-trip HTTP call needed.
    const tierMap: Record<string, keyof typeof DEFAULT_MODEL_SETTINGS> = {
      contract_review: 'reviewModel',
      risk_assessment: 'reviewModel',
      compliance: 'analysisModel',
      extraction: 'extractionModel',
      legal_advice: 'analysisModel',
      narrative_review: 'reviewModel',
    };
    const modelKey = tierMap[analysisType] ?? 'defaultModel';
    const model = modelOverride || DEFAULT_MODEL_SETTINGS[modelKey] || DEFAULT_MODEL_SETTINGS.defaultModel;

    // Validate model configuration exists
    if (!model) {
      return errorResponse(
        'Invalid model configuration. Please contact support.',
        'CONFIGURATION_ERROR',
        500
      );
    }

    // Get prompt template
    const { getAIService } = await import('@/lib/services/opencode-ai');
    const aiService = getAIService();

    // Use the AI service which handles OpenRouter directly
    const result = await aiService.runAnalysis({
      entityType,
      entityId,
      analysisType,
      content,
      modelOverride: model,
      userId: user.userId,
      tenantId: user.tenantId,
    });

    return NextResponse.json({
      success: result.success,
      result: result.result,
      error: result.error,
      model: result.model,
      provider: result.provider,
      tokensUsed: result.tokensUsed,
      duration: result.duration,
      safetyScore: result.safetyScore,
      analysisType,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}