# AI Recap — Transcription Benchmark (M2-2)

Zero-dependency Node tool to compare LV/EN transcription providers on **your** real audio, so the
provider choice — and the €19.99 pricing — rests on numbers, not guesses.

Runs on plain **Node 20+** (uses built-in `fetch`/`FormData`/`Blob`). No `npm install` needed.

## Quick start

```bash
cd tools/transcription-benchmark
node run.mjs --selftest            # verify scoring works (no keys/audio needed)

cp .env.example .env               # add the keys for providers you want to test
cp dataset/manifest.example.json dataset/manifest.json
# put audio in dataset/audio/ and reference transcripts in dataset/reference/, then:
node run.mjs --providers openai,deepgram,speechmatics
```

Results print to the console and are written to `results/latest.md` + a timestamped JSON.

## Building the dataset

- Collect **10–20 real Latvian workplace recordings** with genuine LV/EN code-switching (the harder
  and more representative, the better).
- For each, write an accurate **reference transcript** (what was actually said).
- List them in `dataset/manifest.json`:
  ```json
  { "entries": [
    { "id": "meeting-01", "audio": "audio/meeting-01.m4a",
      "reference": "reference/meeting-01.txt",
      "durationSeconds": 312, "language": "lv-en", "speakers": 2 }
  ]}
  ```
- `durationSeconds` is used for cost — include it (cost is skipped if absent).

## What it measures

- **WER** — word error rate (micro-averaged across files). Primary ranking metric.
- **CER** — character error rate; fairer for morphologically rich Latvian. Use `--strip-diacritics`
  to separate genuine word errors from diacritic-only mistakes.
- **Cost** — from approximate per-minute pricing in `src/pricing.mjs` (**verify before quoting**).
- **Speaker diarization** is returned by the providers but full DER scoring is not automated yet —
  eyeball speaker labels in the raw output for now.

## Providers

Add a key to `.env` to enable each; missing keys are skipped.

- **OpenAI** — `whisper-1` (default), `gpt-4o-transcribe`, `gpt-4o-mini-transcribe` (`--openai-model`).
- **Deepgram** — `nova-3` (default), with `detect_language` + diarization.
- **Speechmatics** — batch job with `diarization: speaker`; base `--language` (default `lv`).

Adding another provider = one file in `src/providers/` returning `{ text, modelKey }`.
