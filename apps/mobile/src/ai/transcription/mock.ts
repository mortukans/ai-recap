/**
 * Mock transcription provider — returns canned LV/EN code-switched segments so the recap-generation
 * and chat slices are demoable end-to-end before the real transcription provider (M2) exists.
 * DEV/DEMO ONLY. Never selected in production.
 */
import type { TranscriptionInput, TranscriptionProvider, TranscriptionResult } from '../types';

const DEMO_SEGMENTS = [
  { startTime: 3, endTime: 9, speakerLabel: 'Speaker 1', language: 'lv', text: 'Labrīt visiem, sāksim ar Sales7 integrāciju.' },
  { startTime: 10, endTime: 18, speakerLabel: 'Speaker 2', language: 'lv', text: 'Jā, mums vēl jāsakārto product information management jeb PIM datu plūsma.' },
  { startTime: 19, endTime: 27, speakerLabel: 'Speaker 1', language: 'en', text: 'Right, the database should initially be read-only until we validate the sync.' },
  { startTime: 28, endTime: 36, speakerLabel: 'Speaker 2', language: 'lv', text: 'Es sagatavošu API specifikāciju līdz piektdienai, 14. datumam.' },
  { startTime: 37, endTime: 45, speakerLabel: 'Speaker 1', language: 'lv', text: 'Labi, tad nolemts — Jānis pārbauda Magento pusi, es sagatavoju vidi.' },
];

export class MockTranscriber implements TranscriptionProvider {
  readonly supportsDiarization = true;
  readonly runsOnDevice = true;

  async transcribe(_input: TranscriptionInput): Promise<TranscriptionResult> {
    const last = DEMO_SEGMENTS[DEMO_SEGMENTS.length - 1];
    return {
      segments: DEMO_SEGMENTS.map((s) => ({ ...s })),
      detectedLanguages: ['lv', 'en'],
      durationSeconds: last ? last.endTime : 0,
    };
  }
}
