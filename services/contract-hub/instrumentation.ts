export async function register() {
  // Only validate on server startup
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { validateEnvironment } = await import('./lib/utils/env-validation');
    validateEnvironment();
  }
}
