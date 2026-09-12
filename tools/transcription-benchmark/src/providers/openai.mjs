import { readFile } from 'node:fs/promises';
import { basename } from 'node:path';

/** OpenAI audio transcription (whisper-1 / gpt-4o-transcribe / gpt-4o-mini-transcribe). */
export async function transcribeOpenAI(audioPath, { apiKey, model }) {
  const buf = await readFile(audioPath);
  const form = new FormData();
  form.append('file', new Blob([buf]), basename(audioPath));
  form.append('model', model);
  form.append('response_format', 'json');
  const res = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}` },
    body: form,
  });
  if (!res.ok) throw new Error(`OpenAI ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const json = await res.json();
  return { text: json.text ?? '', modelKey: `openai:${model}` };
}
