// Contract Hub - Corporate Carbon Group Australia
// SharePoint Graph API Integration Service

import { ConfidentialClientApplication } from '@azure/msal-node';
import { Client } from '@microsoft/microsoft-graph-client';


interface SharePointConfig {
  clientId: string;
  clientSecret: string;
  tenantId: string;
  siteId?: string;
  libraryId?: string;
}

interface SharePointFile {
  id: string;
  name: string;
  webUrl: string;
  size: number;
  mimeType: string;
  createdDateTime: string;
  lastModifiedDateTime: string;
  eTag: string;
}

interface SharePointFolder {
  id: string;
  name: string;
  webUrl: string;
  childCount: number;
}

interface SharePointUploadResult {
  itemId: string;
  webUrl: string;
  eTag: string;
}

interface SharePointSite {
  id: string;
  displayName: string;
  webUrl: string;
}

interface SharePointDrive {
  id: string;
  name: string;
  webUrl: string;
}

class SharePointService {
  private config: SharePointConfig;
  private msalApp: ConfidentialClientApplication;
  private tokenExpiry: number = 0;
  private currentToken: string = '';

  constructor(config: SharePointConfig) {
    this.config = config;
    this.msalApp = new ConfidentialClientApplication({
      auth: {
        clientId: config.clientId,
        authority: `https://login.microsoftonline.com/${config.tenantId}`,
        clientSecret: config.clientSecret,
      },
    });
  }

  private async getAccessToken(): Promise<string> {
    const now = Date.now();
    // Refresh token 5 minutes before expiry (300000ms = 5 minutes)
    // The expiresOn value from MSAL represents the actual expiry time
    if (this.currentToken && this.tokenExpiry > now + 300000) {
      return this.currentToken;
    }

    const result = await this.msalApp.acquireTokenByClientCredential({
      scopes: ['https://graph.microsoft.com/.default'],
    });

    if (!result?.accessToken) {
      throw new Error('Failed to acquire SharePoint access token');
    }

    // Use expiresOn from MSAL if available, otherwise fall back to 1 hour
    const expiryTime = result.expiresOn?.getTime() ?? (now + 3600000);
    this.currentToken = result.accessToken;
    this.tokenExpiry = expiryTime;
    return result.accessToken;
  }

  async getClient(): Promise<Client> {
    await this.getAccessToken();
    return Client.initWithMiddleware({
      authProvider: {
        getAccessToken: async () => this.getAccessToken(),
      },
    });
  }

  /**
   * Upload a file to SharePoint document library
   */
  async testConnection(): Promise<{ connected: boolean; siteName?: string; libraryName?: string; error?: string }> {
    try {
      const token = await this.getAccessToken();
      if (!token) {
        return { connected: false, error: 'Failed to acquire access token' };
      }
      const client = await this.getClient();
      let siteName: string | undefined;
      let libraryName: string | undefined;
      if (this.config.siteId) {
        try {
          const site = await client.api(`/sites/${this.config.siteId}`).get();
          siteName = site.displayName;
        } catch {
          try {
            const site = await client.api(`/sites/${this.config.siteId}:/drive`).get();
            siteName = site.name;
          } catch { /* non-critical */ }
        }
      }
      if (this.config.libraryId) {
        try {
          const drive = await client.api(`/drives/${this.config.libraryId}`).get();
          libraryName = drive.name;
        } catch { /* non-critical */ }
      }
      return { connected: true, siteName, libraryName };
    } catch (error) {
      return { connected: false, error: error instanceof Error ? error.message : 'Unknown connection error' };
    }
  }

  async uploadFile(params: {
    libraryId: string;
    fileName: string;
    content: Buffer;
    contentType: string;
    metadata?: Record<string, string>;
  }): Promise<SharePointUploadResult> {
    const client = await this.getClient();
    const libraryId = params.libraryId || this.config.libraryId;

    if (!libraryId) {
      throw new Error('SharePoint library ID is required');
    }

    // Upload file (max 4MB for simple upload, use session upload for larger)
    const filePath = `/drives/${libraryId}/root:/${params.fileName}:/content`;
    const response = await client.api(filePath).put(params.content);

    // Update metadata if provided
    if (params.metadata && response.id) {
      await client.api(`/drives/${libraryId}/items/${response.id}/listItem`).patch({
        fields: params.metadata,
      });
    }

    return {
      itemId: response.id,
      webUrl: response.webUrl,
      eTag: response.eTag,
    };
  }

  /**
   * Download a file from SharePoint
   */
  async downloadFile(params: {
    libraryId: string;
    itemId: string;
  }): Promise<{ buffer: Buffer; mimeType: string; fileName: string }> {
    const client = await this.getClient();
    const libraryId = params.libraryId || this.config.libraryId;

    const item = await client.api(`/drives/${libraryId}/items/${params.itemId}`).get();
    const contentResponse = await client
      .api(`/drives/${libraryId}/items/${params.itemId}/content`)
      .get();

    const buffer = Buffer.isBuffer(contentResponse) ? contentResponse : Buffer.from(contentResponse);
    return {
      buffer,
      mimeType: item.file?.mimeType || 'application/octet-stream',
      fileName: item.name || 'download',
    };
  }

  /**
   * List files in SharePoint document library
   */
  async listFiles(params: {
    libraryId?: string;
    folderPath?: string;
    top?: number;
    filter?: string;
    orderBy?: string;
  }): Promise<{ files: SharePointFile[]; folders: SharePointFolder[] }> {
    const client = await this.getClient();
    const libraryId = params.libraryId || this.config.libraryId;

    if (!libraryId) {
      throw new Error('SharePoint library ID is required');
    }

    let apiPath = `/drives/${libraryId}/root/children`;

    if (params.folderPath) {
      apiPath = `/drives/${libraryId}/root:/${params.folderPath}:/children`;
    }

    const queryParams: string[] = [];
    if (params.top) queryParams.push(`$top=${params.top}`);
    if (params.filter) queryParams.push(`$filter=${params.filter}`);
    if (params.orderBy) queryParams.push(`$orderby=${params.orderBy}`);

    if (queryParams.length > 0) {
      apiPath += '?' + queryParams.join('&');
    }

    const response = await client.api(apiPath).get();
    const files: SharePointFile[] = [];
    const folders: SharePointFolder[] = [];
    for (const item of response.value) {
      if (item.file) {
        files.push({
          id: item.id, name: item.name, webUrl: item.webUrl, size: item.size,
          mimeType: item.file.mimeType || 'application/octet-stream',
          createdDateTime: item.createdDateTime, lastModifiedDateTime: item.lastModifiedDateTime, eTag: item.eTag,
        });
      } else if (item.folder) {
        folders.push({ id: item.id, name: item.name, webUrl: item.webUrl, childCount: item.folder.childCount });
      }
    }
    return { files, folders };
  }

  /**
   * Search files in SharePoint
   */
  async searchFiles(query: string, top: number = 20): Promise<SharePointFile[]> {
    const client = await this.getClient();

    const response = await client.api('/search/query').post({
      requests: [
        {
          entityTypes: ['driveItem'],
          query: {
            queryString: query,
          },
          from: 0,
          size: top,
        },
      ],
    });

    const results: SharePointFile[] = [];
    for (const container of response.value?.[0]?.hitsContainers ?? []) {
      for (const hit of container.hits ?? []) {
        const r = hit.resource;
        if (r) {
          results.push({
      id: r.id, name: r.name, webUrl: r.webUrl, size: r.size,
            mimeType: r.file?.mimeType || 'application/octet-stream',
            createdDateTime: r.createdDateTime, lastModifiedDateTime: r.lastModifiedDateTime, eTag: r.eTag,
          });
        }
      }
    }
    return results;
  }

  /**
   * Delete a file from SharePoint
   */
  async deleteFile(params: { libraryId: string; itemId: string }): Promise<void> {
    const client = await this.getClient();
    const libraryId = params.libraryId || this.config.libraryId;

    await client.api(`/drives/${libraryId}/items/${params.itemId}`).delete();
  }

  /**
   * Get file metadata from SharePoint
   */
  async getFileMetadata(params: { libraryId: string; itemId: string }): Promise<SharePointFile> {
    const client = await this.getClient();
    const libraryId = params.libraryId || this.config.libraryId;

    const r = await client.api(`/drives/${libraryId}/items/${params.itemId}`).get();

    return {
      id: r.id,
      name: r.name,
      webUrl: r.webUrl,
      size: r.size,
      mimeType: r.file?.mimeType || 'application/octet-stream',
      createdDateTime: r.createdDateTime,
      lastModifiedDateTime: r.lastModifiedDateTime,
      eTag: r.eTag,
    };
  }

  async listSites(): Promise<Array<{ id: string; name: string; webUrl: string }>> {
    const client = await this.getClient();
    const r = await client.api('/sites?search=*').get();
    return r.value.map((s: SharePointSite) => ({ id: s.id, name: s.displayName, webUrl: s.webUrl }));
  }

  async listLibraries(siteId: string): Promise<Array<{ id: string; name: string; webUrl: string }>> {
    const client = await this.getClient();
    const r = await client.api(`/sites/${siteId}/drives`).get();
    return r.value.map((d: SharePointDrive) => ({ id: d.id, name: d.name, webUrl: d.webUrl }));
  }

  /**
   * Create a sharing link for a file
   */
  async createSharingLink(params: {
    libraryId: string;
    itemId: string;
    type: 'view' | 'edit';
    scope: 'anonymous' | 'organization';
  }): Promise<string> {
    const client = await this.getClient();
    const libraryId = params.libraryId || this.config.libraryId;

    const response = await client
      .api(`/drives/${libraryId}/items/${params.itemId}/createLink`)
      .post({
        type: params.type,
        scope: params.scope,
      });

    return response.link.webUrl;
  }
}

// Singleton instance
let sharepointService: SharePointService | null = null;

export function resetSharePointService(): void {
  sharepointService = null;
}

export function getSharePointService(): SharePointService {
  if (!sharepointService) {
    sharepointService = new SharePointService({
      clientId: process.env.AZURE_AD_CLIENT_ID || '',
      clientSecret: process.env.AZURE_AD_CLIENT_SECRET || '',
      tenantId: process.env.AZURE_AD_TENANT_ID || '',
      siteId: process.env.SHAREPOINT_SITE_ID,
      libraryId: process.env.SHAREPOINT_LIBRARY_ID,
    });
  }
  return sharepointService;
}

export { SharePointService };
export type { SharePointFile, SharePointUploadResult, SharePointFolder };