import { readFile } from 'node:fs/promises';

/** Deepgram pre-recorded transcription (nova-3). detect_language handles mixed LV/EN better than pinning one. */
export async function transcribeDeepgram(audioPath, { apiKey, model }) {
  const buf = await readFile(audioPath);
  const params = new URLSearchParams({
    model,
    smart_format: 'true',
    diarize: 'true',
    detect_language: 'true',
  });
  const res = await fetch(`https://api.deepgram.com/v1/listen?${params.toString()}`, {
    method: 'POST',
    headers: { Authorization: `Token ${apiKey}`, 'Content-Type': 'application/octet-stream' },
    body: buf,
  });
  if (!res.ok) throw new Error(`Deepgram ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const json = await res.json();
  const alt = json?.results?.channels?.[0]?.alternatives?.[0];
  return { text: alt?.transcript ?? '', modelKey: `deepgram:${model}` };
}
