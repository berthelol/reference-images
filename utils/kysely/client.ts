// COMMENTED OUT - Kysely has DNS resolution issues with Supabase
// Using Supabase admin client instead for all database operations
// See replaced files:
// - trigger/process-image-task.ts
// - utils/orpc/router/tags.ts
// - utils/orpc/router/images.ts
// - utils/local-script/tags/generate-tags.ts

/*
import { Database as SupabaseDatabase } from "@/types/supabase";
import { Kysely, PostgresDialect } from "kysely";
import type { KyselifyDatabase } from "kysely-supabase";
// Fix for numeric type parsing
// https://github.com/brianc/node-postgres/issues/811#issuecomment-2406515577
import pg, { Pool } from "pg";

const types = pg.types;
types.setTypeParser(types.builtins.NUMERIC, (value: any) =>
  Number.parseFloat(value),
);

// Transaction pooler
export const connectionPool = new Pool({
  connectionString: `postgres://postgres:${process.env.SUPABASE_DB_PASSWORD}@db.eqzaehdjqnyhxuenxtfv.supabase.co:6543/postgres`,
  max: 15,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Use the same pool instance for Kysely
const dialect = new PostgresDialect({
  pool: connectionPool,
});

// Database interface is passed to Kysely's constructor, and from now on, Kysely
// knows your database structure.
// Dialect is passed to Kysely's constructor, and from now on, Kysely knows how
// to communicate with your database.
export type Database = KyselifyDatabase<SupabaseDatabase>;
export const db = new Kysely<Database>({
  dialect,
});
*/

// Placeholder exports to prevent import errors
export type Database = any;
export const db = null as any;
export const connectionPool = null as any;
