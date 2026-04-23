import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { AVAILABLE_MODELS, DEFAULT_MODEL_SETTINGS } from '@/config/models';
import { getCurrentUser } from '@/lib/auth/current-user';
import { errorResponse } from '@/lib/api-errors';
import { getConnectionStatus } from '@/lib/services/anthropic';

// GET /api/settings - Get current AI model settings + provider connection status
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) return errorResponse('Unauthorized', 'UNAUTHORIZED', 401);

    // 'none' | 'configured' | 'active'
    const claudeStatus = await getConnectionStatus(user.tenantId);

    return NextResponse.json({
      success: true,
      settings: DEFAULT_MODEL_SETTINGS,
      availableModels: AVAILABLE_MODELS,
      providers: {
        anthropic: {
          // 'none'       — no credentials saved yet
          // 'configured' — credentials saved, OAuth not yet completed
          // 'active'     — fully connected with access token
          status: claudeStatus,
        },
      },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// PUT /api/settings - Update AI model settings
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate model selections
    const errors: string[] = [];

    const modelChecks = [
      { key: 'defaultModel', model: body.defaultModel },
      { key: 'reviewModel', model: body.reviewModel },
      { key: 'extractionModel', model: body.extractionModel },
      { key: 'analysisModel', model: body.analysisModel },
    ];

    for (const check of modelChecks) {
      if (check.model) {
        const modelConfig = AVAILABLE_MODELS.find(m => m.model === check.model || m.id === check.model);
        if (!modelConfig) {
          errors.push(`Invalid model selection for ${check.key}: ${check.model}`);
        }
      }
    }

    if (errors.length > 0) {
      return NextResponse.json(
        { success: false, errors },
        { status: 400 }
      );
    }

    // Save to database
    const { getCurrentUser } = await import('@/lib/auth/current-user');
    const authUser = await getCurrentUser();
    if (!authUser) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }
        
    const db = (await import('@/lib/db')).db;
    const { aiModelSettings } = await import('@/lib/db/schema');

    // Build the settings payload once — avoids duplicating all fields for insert vs. update.
    const settingsPayload = {
      defaultProvider: body.defaultProvider || DEFAULT_MODEL_SETTINGS.defaultProvider,
      defaultModel: body.defaultModel || DEFAULT_MODEL_SETTINGS.defaultModel,
      reviewProvider: body.reviewProvider || DEFAULT_MODEL_SETTINGS.reviewProvider,
      reviewModel: body.reviewModel || DEFAULT_MODEL_SETTINGS.reviewModel,
      extractionProvider: body.extractionProvider || DEFAULT_MODEL_SETTINGS.extractionProvider,
      extractionModel: body.extractionModel || DEFAULT_MODEL_SETTINGS.extractionModel,
      analysisProvider: body.analysisProvider || DEFAULT_MODEL_SETTINGS.analysisProvider,
      analysisModel: body.analysisModel || DEFAULT_MODEL_SETTINGS.analysisModel,
      requireHumanApproval: body.requireHumanApproval ?? DEFAULT_MODEL_SETTINGS.requireHumanApproval,
      autoClassifyDocuments: body.autoClassifyDocuments ?? DEFAULT_MODEL_SETTINGS.autoClassifyDocuments,
    };

    await db
      .insert(aiModelSettings)
      .values({ tenantId: authUser.tenantId, ...settingsPayload })
      .onConflictDoUpdate({
        target: aiModelSettings.tenantId,
        set: { ...settingsPayload, updatedAt: new Date() },
      });

    // Get updated settings from database with tenant isolation
    const [updatedSettings] = await db.select().from(aiModelSettings)
      .where(eq(aiModelSettings.tenantId, authUser.tenantId));

    return NextResponse.json({
      success: true,
      settings: updatedSettings,
    });
  } catch (error) {
    console.error('Failed to save settings:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}