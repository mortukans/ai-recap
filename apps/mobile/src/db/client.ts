/**
 * Encrypted SQLite connection (op-sqlite + SQLCipher) wrapped by Drizzle.
 *
 * The SQLCipher key lives in the OS keystore via expo-secure-store (never in the DB or JS bundle).
 * op-sqlite must be built with SQLCipher enabled — see app.config.ts (`@op-engineering/op-sqlite`
 * build props). See AI_RECAP_TECHNICAL_ARCHITECTURE.md §5.1 / §21.
 */
import { open } from '@op-engineering/op-sqlite';
import { drizzle } from 'drizzle-orm/op-sqlite';
import { migrate } from 'drizzle-orm/op-sqlite/migrator';
import { getOrCreateDatabaseKey } from '../security/database-key';
import migrations from './migrations/migrations';
import { schema } from './schema';

const DB_NAME = 'airecap.db';

let dbSingleton: ReturnType<typeof drizzle<typeof schema>> | null = null;

/**
 * Open (once) the encrypted database. Call during app bootstrap before any repository is used.
 */
export async function initDatabase() {
  if (dbSingleton) return dbSingleton;

  const encryptionKey = await getOrCreateDatabaseKey();
  const connection = open({ name: DB_NAME, encryptionKey });

  // Concurrency hardening. The recorder inserts the final audio chunk from a background event at the
  // same moment finish() writes the recap's duration and reads the chunk list. Without a busy_timeout,
  // that concurrent read/write throws SQLITE_BUSY ("database is locked"), which aborted the finish flow
  // and left the recap stuck at 0s. This makes any lock contention wait (inserts are sub-ms) instead.
  connection.executeSync('PRAGMA busy_timeout = 5000;');

  // API adapter: drizzle-orm's op-sqlite driver (0.45) calls `executeRawAsync` and expects a plain
  // array of value-rows, but op-sqlite >= 8 returns a RawQueryResult object ({ rawRows, columnNames }).
  // Without this, every typed SELECT throws "undefined is not a function" (rows.map on an object)
  // while INSERT/UPDATE keep working — the recap screen then silently read nothing and showed 0s.
  const client = {
    ...connection,
    executeRawAsync: async (query: string, params?: Parameters<typeof connection.executeRaw>[1]) =>
      (await connection.executeRaw(query, params)).rawRows,
  } as unknown as typeof connection;

  dbSingleton = drizzle(client, { schema });
  await migrate(dbSingleton, migrations);
  return dbSingleton;
}

export function getDatabase() {
  if (!dbSingleton) {
    throw new Error('Database not initialized. Call initDatabase() during app bootstrap.');
  }
  return dbSingleton;
}

export type Database = ReturnType<typeof getDatabase>;
