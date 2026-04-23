/**
 * Inngest Client Configuration
 * Contract Hub uses Inngest for async background jobs:
 * - Document vector indexing (on upload)
 * - Batch re-indexing
 * - AI analysis queuing
 */

import { Inngest } from 'inngest';

export const inngest = new Inngest({
  id: 'contract-hub',
  eventKey: process.env.INNGEST_EVENT_KEY,
});