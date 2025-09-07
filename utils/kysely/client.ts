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
export const transationPooler = new Pool({
  connectionString:
    "postgres://postgres:gynZL48xkH2uv6v2@db.eqzaehdjqnyhxuenxtfv.supabase.co:6543/postgres",
  max: 15,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Use the same pool instance for Kysely
const dialect = new PostgresDialect({
  pool: transationPooler,
});

// Database interface is passed to Kysely's constructor, and from now on, Kysely
// knows your database structure.
// Dialect is passed to Kysely's constructor, and from now on, Kysely knows how
// to communicate with your database.
export type Database = KyselifyDatabase<SupabaseDatabase>;
export const db = new Kysely<Database>({
  dialect,
});
