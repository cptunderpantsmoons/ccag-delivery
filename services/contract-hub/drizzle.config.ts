import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './lib/db/schema/index.ts',
  out: './lib/db/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    // Non-null assertion: drizzle-kit is only executed at migration time when
    // DATABASE_URL must already be set. Fail fast here is the right behaviour.
    url: process.env.DATABASE_URL!,
  },
});