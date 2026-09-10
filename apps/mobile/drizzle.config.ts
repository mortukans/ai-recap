import type { Config } from 'drizzle-kit';

/**
 * Drizzle Kit config. `driver: 'expo'` emits a migrations bundle that runs on-device with op-sqlite.
 * Generate with: `pnpm --filter mobile db:generate`.
 */
export default {
  schema: './src/db/schema.ts',
  out: './src/db/migrations',
  dialect: 'sqlite',
  driver: 'expo',
} satisfies Config;
