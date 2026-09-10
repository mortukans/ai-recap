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

  dbSingleton = drizzle(connection, { schema });
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
