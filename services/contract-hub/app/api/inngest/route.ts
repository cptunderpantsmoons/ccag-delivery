/**
 * Inngest API Route Handler
 * Serves Inngest webhooks and function execution endpoints
 */

import { serve } from 'inngest/next';
import { inngest } from '@/inngest/client';
import { ingestDocument, reindexDocument, batchIndexDocuments } from '@/inngest/functions';

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    ingestDocument,
    reindexDocument,
    batchIndexDocuments,
  ],
});