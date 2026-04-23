import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/current-user';
import { errorResponse } from '@/lib/api-errors';

// ============================================================
// SharePoint Proxy API - Proxies requests to SharePoint Graph API
// This route handles file operations that go through our backend
// to keep Azure AD credentials server-side
// ============================================================

// POST /api/sharepoint - Proxy SharePoint operations
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return errorResponse('Unauthorized', 'UNAUTHORIZED', 401);
    }

    const body = await request.json();
    const { action } = body;

    // Check if SharePoint credentials are configured
    const clientId = process.env.AZURE_AD_CLIENT_ID;
    const clientSecret = process.env.AZURE_AD_CLIENT_SECRET;
    const tenantId = process.env.AZURE_AD_TENANT_ID;

    if (!clientId || !clientSecret || !tenantId) {
      return NextResponse.json(
        {
          success: false,
          error: 'SharePoint integration not configured. Please set AZURE_AD_CLIENT_ID, AZURE_AD_CLIENT_SECRET, and AZURE_AD_TENANT_ID in environment variables.',
          action,
        },
        { status: 503 }
      );
    }

    // Import the SharePoint service
    const { getSharePointService } = await import('@/lib/services/sharepoint');
    const spService = getSharePointService();

    switch (action) {
      case 'list-files': {
        const { libraryId, folderPath, top, filter, orderBy } = body;
        const result = await spService.listFiles({
          libraryId,
          folderPath,
          top,
          filter,
          orderBy,
        });
        return NextResponse.json({ success: true, data: result });
      }

      case 'test-connection': {
        const testResult = await spService.testConnection();
        return NextResponse.json({ success: true, data: testResult });
      }

      case 'list-sites': {
        const sites = await spService.listSites();
        return NextResponse.json({ success: true, data: sites });
      }

      case 'list-libraries': {
        const { siteId } = body;
        if (!siteId) {
          return NextResponse.json({ success: false, error: 'siteId is required for list-libraries' }, { status: 400 });
        }
        const libraries = await spService.listLibraries(siteId);
        return NextResponse.json({ success: true, data: libraries });
      }

      case 'upload-file': {
        const { libraryId, fileName, content, contentType, metadata } = body;
        // Content should be base64 encoded
        const buffer = Buffer.from(content, 'base64');
        const result = await spService.uploadFile({
          libraryId,
          fileName,
          content: buffer,
          contentType,
          metadata,
        });
        return NextResponse.json({ success: true, data: result }, { status: 201 });
      }

      case 'download-file': {
        const { libraryId, itemId } = body;
        const result = await spService.downloadFile({ libraryId, itemId });
        const base64 = result.buffer.toString('base64');
        return NextResponse.json({ success: true, data: { base64, mimeType: result.mimeType, fileName: result.fileName } });
      }

      case 'delete-file': {
        const { libraryId, itemId } = body;
        await spService.deleteFile({ libraryId, itemId });
        return NextResponse.json({ success: true, message: 'File deleted successfully' });
      }

      case 'get-metadata': {
        const { libraryId, itemId } = body;
        const metadata = await spService.getFileMetadata({ libraryId, itemId });
        return NextResponse.json({ success: true, data: metadata });
      }

      case 'create-sharing-link': {
        const { libraryId, itemId, type, scope } = body;
        const link = await spService.createSharingLink({
          libraryId,
          itemId,
          type: type || 'view',
          scope: scope || 'organization',
        });
        return NextResponse.json({ success: true, data: { link } });
      }

      case 'search': {
        const { query, top } = body;
        const results = await spService.searchFiles(query, top);
        return NextResponse.json({ success: true, data: results });
      }

      default:
        return NextResponse.json(
          { success: false, error: `Unknown action: ${action}. Valid actions: list-files, upload-file, download-file, delete-file, get-metadata, create-sharing-link, search, test-connection, list-sites, list-libraries` },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('SharePoint API error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        hint: 'Ensure SharePoint credentials are correctly configured and the Azure AD app has the necessary Graph API permissions (Sites.ReadWrite.All, Files.ReadWrite.All).',
      },
      { status: 500 }
    );
  }
}

// GET /api/sharepoint - Check SharePoint connection status
export async function GET() {
  try {
    const clientId = process.env.AZURE_AD_CLIENT_ID;
    const clientSecret = process.env.AZURE_AD_CLIENT_SECRET;
    const tenantId = process.env.AZURE_AD_TENANT_ID;
    const siteId = process.env.SHAREPOINT_SITE_ID;
    const libraryId = process.env.SHAREPOINT_LIBRARY_ID;

    const configured = !!(clientId && clientSecret && tenantId);

    return NextResponse.json({
      success: true,
      configured,
      siteId: siteId || null,
      libraryId: libraryId || null,
      message: configured
        ? 'SharePoint integration is configured'
        : 'SharePoint integration not configured. Set AZURE_AD_CLIENT_ID, AZURE_AD_CLIENT_SECRET, and AZURE_AD_TENANT_ID.',
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}