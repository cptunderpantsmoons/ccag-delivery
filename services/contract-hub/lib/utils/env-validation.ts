/**
 * Contract Hub – Environment Validation
 *
 * Runs at server startup via instrumentation.ts.
 * In production, any missing REQUIRED var causes a fatal warning on boot.
 * Optional integrations (SharePoint, Docassemble, Inngest) are just warned about.
 */

const REQUIRED = [
  'DATABASE_URL',
  'NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY',
  'CLERK_SECRET_KEY',
] as const;

const RECOMMENDED = [
  // RAG – required for AI chat with document context
  'CARBON_RAG_BASE_URL',
] as const;

const OPTIONAL = [
  'OPENROUTER_API_KEY',
  'OPENROUTER_BASE_URL',
  'AZURE_AD_CLIENT_ID',
  'AZURE_AD_CLIENT_SECRET',
  'AZURE_AD_TENANT_ID',
  'SHAREPOINT_SITE_ID',
  'SHAREPOINT_LIBRARY_ID',
  'DOCASSEMBLE_URL',
  'DOCASSEMBLE_API_KEY',
  'OPENCODE_SERVER_URL',
  'OPENCODE_API_KEY',
  'INNGEST_EVENT_KEY',
] as const;

export function validateEnvironment(): void {
  const missing: string[] = [];
  const warn: string[] = [];

  for (const envVar of REQUIRED) {
    if (!process.env[envVar]) missing.push(envVar);
  }
  for (const envVar of RECOMMENDED) {
    if (!process.env[envVar]) warn.push(envVar);
  }
  for (const envVar of OPTIONAL) {
    if (!process.env[envVar]) warn.push(envVar);
  }

  if (missing.length > 0) {
    console.error(
      `[Contract Hub] FATAL: Missing required environment variables:\n` +
      missing.map(v => `  - ${v}`).join('\n') +
      '\nSet these in your .env.local or deployment environment before starting.'
    );
  }

  if (warn.length > 0) {
    const critical = warn.filter(v => RECOMMENDED.includes(v as typeof RECOMMENDED[number]));
    const opt = warn.filter(v => OPTIONAL.includes(v as typeof OPTIONAL[number]));
    if (critical.length > 0) {
      console.warn(`[Contract Hub] WARNING: Missing recommended variables (AI features may not work):\n` +
        critical.map(v => `  - ${v}`).join('\n'));
    }
    if (opt.length > 0) {
      console.info(`[Contract Hub] INFO: Optional integrations not configured:\n` +
        opt.map(v => `  - ${v}`).join('\n'));
    }
  }

  if (missing.length === 0) {
    console.log('[Contract Hub] Environment validated');
  }
}
