/**
 * Returns the recap's transcript segments (possibly empty). Historically this synthesized a demo
 * transcript when none existed (pre-M2 shim); real transcription has shipped, so fabricating text for
 * a recap that failed to transcribe would be a correctness bug — callers now handle "no transcript yet".
 */
import type { TranscriptSegment } from '@ai-recap/core';
import { segmentsRepo } from '../../db';

export async function ensureTranscript(recapId: string): Promise<TranscriptSegment[]> {
  return segmentsRepo.listSegments(recapId);
}
