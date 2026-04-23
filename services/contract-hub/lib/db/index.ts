import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';
import * as vectorSchema from './vector-schema';

if (!process.env.DATABASE_URL) {
  throw new Error(
    'DATABASE_URL environment variable is not set. ' +
    'Add it to your .env.local (development) or Railway environment (production).',
  );
}

// Merge both schemas so drizzle query helpers work for both core and vector tables.
const allSchema = {
  ...schema,
  ...vectorSchema,
};

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,              // max connections for 20 users
  idleTimeoutMillis: 30000,  // close idle connections after 30s
  connectionTimeoutMillis: 5000, // fail fast if can't connect in 5s
});

// Graceful shutdown handler
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, closing database pool...');
  await pool.end();
  console.log('Database pool closed');
});

export const db = drizzle(pool, { schema: allSchema });
export type Database = typeof db;