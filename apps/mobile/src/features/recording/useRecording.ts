/**
 * Recording controller hook (MVP task M1-8). Bridges the native recorder to the DB: creates the recap,
 * persists chunks as they close, tracks duration, and finalizes on stop. Tolerant of a missing native
 * module (before a development build) — surfaces an error instead of crashing.
 */
import { DEFAULT_SETTINGS, FREE_CAPABILITIES, checkRecordingIntegrity } from '@ai-recap/core';
import { Recorder } from '@ai-recap/recorder';
import { useCallback, useEffect, useRef, useState } from 'react';

import { chunksRepo, recapsRepo, usageRepo } from '../../db';
import { newId } from '../../lib/ids';
import { reconcileChunksFromManifest } from '../recap/manifest';
import {
  endRecordingActivity,
  startRecordingActivity,
  updateRecordingActivity,
} from './liveActivity';
import { publishWatchState } from './watchBridge';

type RecordingStatus = 'idle' | 'requesting' | 'recording' | 'paused' | 'finishing';

export function useRecording() {
  const [status, setStatus] = useState<RecordingStatus>('idle');
  const [seconds, setSeconds] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const recapIdRef = useRef<string | null>(null);
  const secondsRef = useRef(0); // latest duration for callbacks that must not re-create on every tick
  const subsRef = useRef<{ remove: () => void }[]>([]);

  const cleanup = useCallback(() => {
    for (const s of subsRef.current) s.remove();
    subsRef.current = [];
  }, []);

  useEffect(() => cleanup, [cleanup]);

  const start = useCallback(async (maxSeconds: number = FREE_CAPABILITIES.maxRecordingMinutes * 60) => {
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
        Recorder.addListener('duration', ({ seconds: s }) => {
          secondsRef.current = s;
          setSeconds(s);
        }),
        Recorder.addListener('chunkClosed', (chunk) => {
          chunksRepo
            .addChunk({
              id: newId(),
              recapId: id,
              index: chunk.index,
              relativePath: chunk.relativePath,
              startOffset: chunk.startOffset,
              duration: chunk.duration,
              byteSize: chunk.byteSize,
              uploadStatus: 'local',
            })
            .catch((e) => console.warn('[recording] live chunk insert failed:', String(e)));
        }),
        Recorder.addListener('error', (e) => {
          console.warn('[recording] native error:', e.code, e.message);
          setError(e.message);
        }),
        // System pauses (phone call, Siri, headset unplugged) — keep UI + Live Activity truthful.
        Recorder.addListener('interrupted', () => {
          setStatus('paused');
          void updateRecordingActivity(true, secondsRef.current);
          publishWatchState('paused', secondsRef.current);
        }),
        Recorder.addListener('resumed', () => {
          setStatus('recording');
          void updateRecordingActivity(false, secondsRef.current);
          publishWatchState('recording', secondsRef.current);
        }),
      );

      await Recorder.start(id, { chunkSeconds: DEFAULT_SETTINGS.chunkDurationSeconds });
      setStatus('recording');
      void startRecordingActivity(maxSeconds); // Lock Screen / Dynamic Island timer (iOS, best-effort)
      publishWatchState('recording', 0);
    } catch (e) {
      setStatus('idle');
      setError(e instanceof Error ? e.message : String(e));
    }
  }, []);

  const pause = useCallback(async () => {
    await Recorder.pause();
    setStatus('paused');
    void updateRecordingActivity(true, secondsRef.current);
    publishWatchState('paused', secondsRef.current);
  }, []);

  const resume = useCallback(async () => {
    await Recorder.resume();
    setStatus('recording');
    void updateRecordingActivity(false, secondsRef.current);
    publishWatchState('recording', secondsRef.current);
  }, []);

  const finish = useCallback(async (): Promise<string | null> => {
    const id = recapIdRef.current;
    setStatus('finishing');
    publishWatchState('finishing', secondsRef.current);
    try {
      const result = await Recorder.finish();
      if (id) {
        // Save the native duration first (reliable) — never blocked by chunk persistence.
        await recapsRepo.updateRecap(id, {
          endedAt: Date.now(),
          durationSeconds: result.durationSeconds,
          status: 'recorded',
        });
        // Best-effort: reconcile chunks from the manifest for playback/transcription.
        try {
          const manifestDuration = await reconcileChunksFromManifest(id, result.chunkCount || 1);
          if (manifestDuration > result.durationSeconds) {
            await recapsRepo.updateRecap(id, { durationSeconds: manifestDuration });
          }
          // M1-7: definitive lost-audio check (also surfaced on the recap screen).
          const report = checkRecordingIntegrity(await chunksRepo.listChunks(id), result.durationSeconds);
          if (!report.ok) console.warn('[recording] integrity gaps:', JSON.stringify(report.gaps));
        } catch (e) {
          console.warn('[recording] chunk reconcile failed:', String(e));
        }
        await usageRepo.addUsage({
          id: newId(),
          recapId: id,
          recordingSeconds: result.durationSeconds,
          transcriptionSeconds: 0,
          inputTokens: 0,
          outputTokens: 0,
          model: '',
          provider: '',
          estimatedCostMicros: 0,
          occurredAt: Date.now(),
          syncedToBackend: false,
        });
      }
      return id;
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      return id;
    } finally {
      cleanup();
      void endRecordingActivity();
      publishWatchState('idle', 0);
      setStatus('idle');
      setSeconds(0);
      secondsRef.current = 0;
      recapIdRef.current = null;
    }
  }, [cleanup]);

  return { status, seconds, error, start, pause, resume, finish };
}
