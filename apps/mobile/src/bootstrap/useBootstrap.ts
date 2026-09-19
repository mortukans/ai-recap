import { builtInContexts } from '@ai-recap/prompts';
import { useEffect, useState } from 'react';
import { ensureSession, supabase } from '../api/supabase';
import { contextsRepo, initDatabase } from '../db';
import { importPendingWatchRecordings } from '../features/recording/importWatchRecording';
import { applyAudioRetention } from '../features/storage/audioStorage';
import { syncUsage } from '../features/usage/syncUsage';
import { processingCoordinator } from '../processing/coordinator';
import { initEntitlements } from '../purchases/entitlements';
import { configurePurchases } from '../purchases/revenuecat';

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
    // Safety net: whatever happens below, show the UI within 4 s (errors surface in-app, not on the splash).
    const failSafe = setTimeout(() => {
      if (!cancelled) setReady(true);
    }, 4000);
    (async () => {
      try {
        await initDatabase();
        await contextsRepo.ensureBuiltInContexts(builtInContexts(Date.now()));
        processingCoordinator.start();
        // Repairs interrupted recaps then resumes processing in the background. Never awaited: the
        // queue can hold minutes of transcription/AI work and must not hold the splash screen.
        void processingCoordinator.recover().catch(() => undefined);
        // Audio retention (Settings → Storage) is enforced on launch; never blocks the UI on failure.
        void applyAudioRetention().catch(() => undefined);
        // Recordings made on the Apple Watch while the app was closed are registered now.
        void importPendingWatchRecordings();
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e : new Error(String(e)));
      } finally {
        // Service plane: anonymous session → RevenueCat (app user id = Supabase uid) → entitlements.
        void (async () => {
          await ensureSession().catch(() => undefined);
          const uid = (await supabase.auth.getSession().catch(() => null))?.data.session?.user.id ?? null;
          await configurePurchases(uid);
          await initEntitlements();
          void syncUsage(); // M5-5: mirror local usage records to the backend
        })();
        if (!cancelled) setReady(true);
      }
    })();
    return () => {
      cancelled = true;
      clearTimeout(failSafe);
    };
  }, []);

  return { ready, error };
}
