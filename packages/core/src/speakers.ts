/**
 * Speaker helpers (AI_RECAP_TECHNICAL_ARCHITECTURE.md §7.5). Diarization yields "Speaker 1..N";
 * the user renames per recap and/or maps a label to a reusable SpeakerProfile. Names only in MVP —
 * no voice biometrics.
 */
import type { RecapSpeaker, TranscriptSegment } from './models';

/** Distinct diarized speaker labels in first-appearance order. */
export function distinctSpeakerLabels(segments: TranscriptSegment[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const s of segments) {
    const label = s.speakerLabel;
    if (label && !seen.has(label)) {
      seen.add(label);
      out.push(label);
    }
  }
  return out;
}

/** Resolve what to display for a speaker: custom name → linked profile name → raw diarized label. */
export function resolveSpeakerName(speaker: RecapSpeaker, profileName?: string | null): string {
  const custom = speaker.customDisplayName?.trim();
  if (custom) return custom;
  const profile = profileName?.trim();
  if (profile) return profile;
  return speaker.diarizedLabel;
}
