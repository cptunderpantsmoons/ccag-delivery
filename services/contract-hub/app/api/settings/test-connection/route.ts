import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/current-user';
import { errorResponse } from '@/lib/api-errors';

// POST /api/settings/test-connection - Test API connections (OpenRouter or SharePoint)
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return errorResponse('Unauthorized', 'UNAUTHORIZED', 401);
    }

    const body = await request.json();
    const { provider } = body;

    // SharePoint connection test
    if (provider === 'sharepoint') {
      const { clientId, clientSecret, tenantId, siteId, libraryId } = body;
      if (!clientId || !clientSecret || !tenantId) {
        return NextResponse.json({ success: false, message: 'Azure AD Client ID, Client Secret, and Tenant ID are required' });
      }
      try {
        const { SharePointService } = await import('@/lib/services/sharepoint');
        const testService = new SharePointService({ clientId, clientSecret, tenantId, siteId, libraryId });
        const result = await testService.testConnection();
        if (result.connected) {
          return NextResponse.json({
            success: true,
            message: `Connected to SharePoint${result.siteName ? ': ' + result.siteName : ''}${result.libraryName ? ', Library: ' + result.libraryName : ''}`,
          });
        } else {
          return NextResponse.json({ success: false, message: result.error || 'Failed to connect to SharePoint' });
        }
      } catch (error) {
        return NextResponse.json({ success: false, message: `SharePoint connection failed: ${error instanceof Error ? error.message : 'Unknown error'}` });
      }
    }

    // OpenRouter connection test
    if (!provider || provider === 'openrouter' || provider === 'opencode') {
      const apiKey = process.env.OPENROUTER_API_KEY;
      const baseUrl = process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1';
      if (!apiKey) {
        return NextResponse.json({
          success: false,
          message: 'OpenRouter API key not configured. Set OPENROUTER_API_KEY in environment variables.',
        });
      }
      const response = await fetch(`${baseUrl}/models`, {
        headers: { Authorization: `Bearer ${apiKey}` },
        signal: AbortSignal.timeout(10000),
      });
      if (response.ok) {
        return NextResponse.json({
          success: true,
          message: `Connected to OpenRouter successfully. Provider: ${provider || 'opencode'}, Model: ${body.model || 'default'}`,
        });
      } else {
        return NextResponse.json({
          success: false,
          message: `OpenRouter API returned status ${response.status}. Check your API key.`,
        });
      }
    }

    return NextResponse.json({ success: false, message: 'Unknown provider. Use sharepoint, openrouter, or opencode.' });
  } catch (error) {
    return NextResponse.json({
      success: false,
      message: `Connection test failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
    });
  }
}