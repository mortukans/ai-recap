/**
 * Returns the recap's transcript segments, synthesizing a demo transcript (MockTranscriber) if none
 * exist yet. DEMO shim so the recap + chat slices work before real transcription (M2) lands.
 */
import type { TranscriptSegment } from '@ai-recap/core';
import { MockTranscriber } from '../../ai';
import { recapsRepo, segmentsRepo } from '../../db';
import { newId } from '../../lib/ids';

export async function ensureTranscript(recapId: string): Promise<TranscriptSegment[]> {
  const existing = await segmentsRepo.listSegments(recapId);
  if (existing.length > 0) return existing;

  const mock = await new MockTranscriber().transcribe({ recapId, audioUris: [] });
  const segments = mock.segments.map<TranscriptSegment>((s) => ({
    id: newId(),
    recapId,
    startTime: s.startTime,
    endTime: s.endTime,
    speakerLabel: s.speakerLabel,
    language: s.language,
    text: s.text,
  }));
  await segmentsRepo.replaceSegments(recapId, segments);
  await recapsRepo.updateRecap(recapId, { detectedLanguages: mock.detectedLanguages });
  return segments;
}
