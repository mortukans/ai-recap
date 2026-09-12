import {
  type SpeakerGroup,
  type TranscriptSegment,
  distinctSpeakerLabels,
  groupSegmentsBySpeaker,
  resolveSpeakerName,
} from '@ai-recap/core';
import { useCallback, useEffect, useState } from 'react';

import { recapSpeakersRepo, recapsRepo, speakerProfilesRepo } from '../../db';
import { ensureTranscript } from '../recap/ensureTranscript';

export function useTranscript(recapId: string) {
  const [groups, setGroups] = useState<SpeakerGroup[]>([]);
  const [segments, setSegments] = useState<TranscriptSegment[]>([]);
  const [nameByLabel, setNameByLabel] = useState<Record<string, string>>({});
  const [detectedLanguages, setDetectedLanguages] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const segs = await ensureTranscript(recapId);
      setSegments(segs);
      setGroups(groupSegmentsBySpeaker(segs));

      const recap = await recapsRepo.getRecap(recapId);
      setDetectedLanguages(recap?.detectedLanguages ?? []);

      await recapSpeakersRepo.ensureForLabels(recapId, distinctSpeakerLabels(segs));
      const speakers = await recapSpeakersRepo.listByRecap(recapId);
      const profiles = await speakerProfilesRepo.listProfiles();
      const profileName = (id: string | null) => profiles.find((p) => p.id === id)?.displayName ?? null;

      const map: Record<string, string> = {};
      for (const sp of speakers) {
        map[sp.diarizedLabel] = resolveSpeakerName(sp, profileName(sp.speakerProfileId));
      }
      setNameByLabel(map);
    } catch {
      /* db not ready */
    } finally {
      setLoading(false);
    }
  }, [recapId]);

  useEffect(() => {
    void load();
  }, [load]);

  const nameFor = useCallback(
    (label: string | null): string => (label ? (nameByLabel[label] ?? label) : ''),
    [nameByLabel],
  );

  return { groups, segments, nameFor, detectedLanguages, loading, reload: load };
}
