import { type RecapSpeaker, type SpeakerProfile, distinctSpeakerLabels } from '@ai-recap/core';
import { useCallback, useEffect, useState } from 'react';

import { recapSpeakersRepo, speakerProfilesRepo } from '../../db';
import { newId } from '../../lib/ids';
import { ensureTranscript } from '../recap/ensureTranscript';

export function useSpeakers(recapId: string) {
  const [speakers, setSpeakers] = useState<RecapSpeaker[]>([]);
  const [profiles, setProfiles] = useState<SpeakerProfile[]>([]);
  const [samples, setSamples] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const segments = await ensureTranscript(recapId);
      const labels = distinctSpeakerLabels(segments);
      await recapSpeakersRepo.ensureForLabels(recapId, labels);
      setSpeakers(await recapSpeakersRepo.listByRecap(recapId));
      setProfiles(await speakerProfilesRepo.listProfiles());

      const map: Record<string, string[]> = {};
      for (const s of segments) {
        const label = s.speakerLabel;
        if (!label) continue;
        const arr = map[label] ?? [];
        if (arr.length < 2) arr.push(s.text);
        map[label] = arr;
      }
      setSamples(map);
    } catch {
      /* db not ready */
    } finally {
      setLoading(false);
    }
  }, [recapId]);

  useEffect(() => {
    void load();
  }, [load]);

  const rename = useCallback(
    async (speakerId: string, name: string) => {
      await recapSpeakersRepo.update(speakerId, { customDisplayName: name.trim() || null });
      await load();
    },
    [load],
  );

  const assignProfile = useCallback(
    async (speakerId: string, profile: SpeakerProfile) => {
      await recapSpeakersRepo.update(speakerId, {
        speakerProfileId: profile.id,
        customDisplayName: profile.displayName,
      });
      await load();
    },
    [load],
  );

  const saveAsProfile = useCallback(
    async (speaker: RecapSpeaker, name: string) => {
      const trimmed = name.trim();
      if (!trimmed) return;
      const id = speaker.speakerProfileId ?? newId();
      const now = Date.now();
      await speakerProfilesRepo.upsertProfile({
        id,
        displayName: trimmed,
        voiceReferenceMetadata: null,
        createdAt: now,
        updatedAt: now,
      });
      await recapSpeakersRepo.update(speaker.id, { speakerProfileId: id, customDisplayName: trimmed });
      await load();
    },
    [load],
  );

  return { speakers, profiles, samples, loading, rename, assignProfile, saveAsProfile };
}
