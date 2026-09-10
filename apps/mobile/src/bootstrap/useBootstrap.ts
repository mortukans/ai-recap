import { builtInContexts } from '@ai-recap/prompts';
import { useEffect, useState } from 'react';
import { ensureSession } from '../api/supabase';
import { contextsRepo, initDatabase } from '../db';

/**
 * App bootstrap: open the encrypted DB, seed built-in preset contexts, and (best-effort) establish a
 * backend session. Never blocks the UI on the backend. If native modules are unavailable (e.g. before
 * a development build), we surface the error but still let the shell render.
 */
export function useBootstrap() {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await initDatabase();
        await contextsRepo.ensureBuiltInContexts(builtInContexts(Date.now()));
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e : new Error(String(e)));
      } finally {
        void ensureSession().catch(() => undefined);
        if (!cancelled) setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return { ready, error };
}
