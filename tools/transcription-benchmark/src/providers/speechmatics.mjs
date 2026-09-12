import { readFile } from 'node:fs/promises';
import { basename } from 'node:path';

const BASE = 'https://asr.api.speechmatics.com/v2';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Speechmatics batch transcription (create job → poll → fetch transcript).
 * Batch requires a base language; for LV/EN we default to 'lv' (override with --language).
 * Diarization is enabled ("speaker").
 */
export async function transcribeSpeechmatics(audioPath, { apiKey, language }) {
  const buf = await readFile(audioPath);
  const config = {
    type: 'transcription',
    transcription_config: {
      language: language === 'lv-en' || language === 'auto' ? 'lv' : language,
      diarization: 'speaker',
    },
  };

  const form = new FormData();
  form.append('data_file', new Blob([buf]), basename(audioPath));
  form.append('config', JSON.stringify(config));

  const created = await fetch(`${BASE}/jobs`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}` },
    body: form,
  });
  if (!created.ok) throw new Error(`Speechmatics create ${created.status}: ${(await created.text()).slice(0, 300)}`);
  const id = (await created.json())?.id;
  if (!id) throw new Error('Speechmatics: no job id returned');

  const deadline = Date.now() + 15 * 60 * 1000;
  while (Date.now() < deadline) {
    await sleep(5000);
    const st = await fetch(`${BASE}/jobs/${id}`, { headers: { Authorization: `Bearer ${apiKey}` } });
    if (!st.ok) throw new Error(`Speechmatics status ${st.status}`);
    const status = (await st.json())?.job?.status;
    if (status === 'done') break;
    if (status === 'rejected' || status === 'expired') throw new Error(`Speechmatics job ${status}`);
  }

  const tr = await fetch(`${BASE}/jobs/${id}/transcript?format=txt`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  if (!tr.ok) throw new Error(`Speechmatics transcript ${tr.status}`);
  return { text: await tr.text(), modelKey: 'speechmatics:standard' };
}
