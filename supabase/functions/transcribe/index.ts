// POST /transcribe — hosted transcription of ONE audio chunk for Unlimited users (MVP task M2-1).
// Body: { audioBase64, format: 'm4a', durationSeconds, recapId?, languageHint?: 'auto'|'lv'|'en' }
// Returns { language: string|null, segments: [{ start, end, speaker, text }] } with times relative to the chunk.
// The audio is processed in memory and never stored server-side (Arch §16: no user content at rest).
import { TRANSCRIPTION_MODEL, admin, callOpenRouter, costMicros, json, recordUsage, requireUnlimited, requireUser } from '../_shared/hosted.ts';

const SYSTEM_PROMPT = `You are a precise speech-to-text engine. Transcribe the audio verbatim.
The speech is usually Latvian, English, or a mix; keep each utterance in its original language with correct diacritics.
Respond with ONLY a JSON object, no prose, no markdown fences:
{"language":"<dominant ISO 639-1 code>","segments":[{"start":<seconds from audio start>,"end":<seconds>,"speaker":"<Speaker 1|Speaker 2|...>","text":"<utterance>"}]}
Split segments at natural pauses (roughly one sentence each) and whenever the speaker changes. Label distinct voices consistently within this audio as "Speaker 1", "Speaker 2", ... in order of first appearance; use "Speaker 1" if there is clearly only one voice. If there is no speech, return {"language":null,"segments":[]}.`;

interface Body {
  audioBase64: string;
  format?: string;
  durationSeconds?: number;
  recapId?: string;
  languageHint?: string;
}

const MAX_BASE64 = 12 * 1024 * 1024; // ~9 MB of audio — far above a 60 s AAC chunk

/** Normalize model speaker labels to "Speaker N" (rough per-chunk diarization, MVP task M2-5). */
function normalizeSpeaker(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const m = raw.match(/(\d+)/);
  return m ? `Speaker ${m[1]}` : raw.trim() || null;
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });
  const who = await requireUser(req);
  if (who instanceof Response) return who;
  const db = admin();
  const denied = await requireUnlimited(db, who.userId);
  if (denied) return denied;

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return json({ error: 'bad_json' }, 400);
  }
  if (!body.audioBase64 || body.audioBase64.length > MAX_BASE64) return json({ error: 'audio_invalid' }, 400);

  const duration = Math.max(0, Number(body.durationSeconds ?? 0));
  const hint = body.languageHint && body.languageHint !== 'auto' ? ` The speaker's primary language is "${body.languageHint}".` : '';

  try {
    const r = await callOpenRouter({
      model: TRANSCRIPTION_MODEL,
      temperature: 0,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        {
          role: 'user',
          content: [
            { type: 'text', text: `Transcribe this ${Math.round(duration)} second recording.${hint}` },
            { type: 'input_audio', input_audio: { data: body.audioBase64, format: body.format ?? 'm4a' } },
          ],
        },
      ],
    });

    await recordUsage(db, {
      user_id: who.userId,
      recap_client_id: body.recapId ?? null,
      transcription_seconds: duration,
      input_tokens: r.usage?.prompt_tokens ?? 0,
      output_tokens: r.usage?.completion_tokens ?? 0,
      model: r.model,
      provider: 'openrouter-hosted',
      estimated_cost_micros: costMicros(r.usage),
    });

    // Lenient parse — the app also tolerates a plain-text reply.
    const trimmed = r.text.trim();
    const jsonText = trimmed.startsWith('{') ? trimmed : trimmed.match(/\{[\s\S]*\}/)?.[0] ?? '';
    try {
      const parsed = JSON.parse(jsonText) as { language?: string | null; segments?: { start?: number; end?: number; text?: string; speaker?: string | null }[] };
      return json({
        language: parsed.language ?? null,
        segments: (parsed.segments ?? [])
          .map((s) => ({
            start: Number(s.start ?? 0),
            end: Number(s.end ?? duration),
            speaker: normalizeSpeaker(s.speaker),
            text: (s.text ?? '').trim(),
          }))
          .filter((s) => s.text.length > 0),
      });
    } catch {
      return json({ language: null, segments: trimmed ? [{ start: 0, end: duration, speaker: null, text: trimmed }] : [] });
    }
  } catch (e) {
    return json({ error: String(e) }, 502);
  }
});
