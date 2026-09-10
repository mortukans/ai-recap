/**
 * Recording controller hook (MVP task M1-8). Bridges the native recorder to the DB: creates the recap,
 * persists chunks as they close, tracks duration, and finalizes on stop. Tolerant of a missing native
 * module (before a development build) — surfaces an error instead of crashing.
 */
import { DEFAULT_SETTINGS } from '@ai-recap/core';
import { Recorder } from '@ai-recap/recorder';
import type { EventSubscription } from 'expo-modules-core';
import { useCallback, useEffect, useRef, useState } from 'react';

import { chunksRepo, recapsRepo } from '../../db';
import { newId } from '../../lib/ids';

type RecordingStatus = 'idle' | 'requesting' | 'recording' | 'paused' | 'finishing';

export function useRecording() {
  const [status, setStatus] = useState<RecordingStatus>('idle');
  const [seconds, setSeconds] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const recapIdRef = useRef<string | null>(null);
  const subsRef = useRef<EventSubscription[]>([]);

  const cleanup = useCallback(() => {
    for (const s of subsRef.current) s.remove();
    subsRef.current = [];
  }, []);

  useEffect(() => cleanup, [cleanup]);

  const start = useCallback(async () => {
    setError(null);
    setStatus('requesting');
    try {
      const granted = await Recorder.requestPermission();
      if (!granted) {
        setStatus('idle');
        setError('permission');
        return;
      }

      const id = newId();
      const now = Date.now();
      await recapsRepo.createRecap({
        id,
        title: '',
        startedAt: now,
        endedAt: null,
        durationSeconds: 0,
        detectedLanguages: [],
        status: 'recording',
        presetId: null,
        contextId: null,
        createdAt: now,
        updatedAt: now,
      });
      recapIdRef.current = id;

      subsRef.current.push(
        Recorder.addListener('duration', ({ seconds: s }) => setSeconds(s)),
        Recorder.addListener('chunkClosed', (chunk) => {
          void chunksRepo.addChunk({
            id: newId(),
            recapId: id,
            index: chunk.index,
            relativePath: chunk.relativePath,
            startOffset: chunk.startOffset,
            duration: chunk.duration,
            byteSize: chunk.byteSize,
            uploadStatus: 'local',
          });
        }),
        Recorder.addListener('error', (e) => setError(e.message)),
      );

      await Recorder.start(id, { chunkSeconds: DEFAULT_SETTINGS.chunkDurationSeconds });
      setStatus('recording');
    } catch (e) {
      setStatus('idle');
      setError(e instanceof Error ? e.message : String(e));
    }
  }, []);

  const pause = useCallback(async () => {
    await Recorder.pause();
    setStatus('paused');
  }, []);

  const resume = useCallback(async () => {
    await Recorder.resume();
    setStatus('recording');
  }, []);

  const finish = useCallback(async (): Promise<string | null> => {
    const id = recapIdRef.current;
    setStatus('finishing');
    try {
      const result = await Recorder.finish();
      if (id) {
        await recapsRepo.updateRecap(id, {
          endedAt: Date.now(),
          durationSeconds: result.durationSeconds,
          status: 'recorded',
        });
      }
      return id;
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      return id;
    } finally {
      cleanup();
      setStatus('idle');
      setSeconds(0);
      recapIdRef.current = null;
    }
  }, [cleanup]);

  return { status, seconds, error, start, pause, resume, finish };
}
