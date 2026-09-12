# Transcription Benchmark — Methodology & Decision (M2-2)

**Status:** Harness built; awaiting a real LV/EN dataset + provider keys to produce numbers.
**Gates:** Product Plan §39 decisions **#1** (best LV/EN engine), **#3** (cost/hour), **#4** (the
€19.99 audio assumption), **#7** (diarization approach). Pricing must not be finalized before this runs.

Tool: [`tools/transcription-benchmark/`](../tools/transcription-benchmark/README.md).

## Why this exists

The product's headline differentiator is high-quality handling of **mixed Latvian + English in the
same sentence** (Product Plan §3, §34). That quality — and the per-hour transcription cost — decide
both the provider and whether €19.99/mo has a safe margin. Neither can be guessed; both must be
measured on real Latvian workplace audio.

## Shortlist (measure these first)

| Provider | Why it's a candidate | Diarization | EU residency |
|---|---|---|---|
| **Speechmatics** | Strong multilingual + code-switch; one call → transcript + speakers + timestamps | ✅ built-in | ✅ |
| **OpenAI** (`whisper-1` / `gpt-4o-transcribe`) | Strong multilingual quality baseline | ❌ (pair with pyannote) | US default — check |
| **Deepgram** `nova-3` | Cheap, fast, built-in diarization if LV quality holds | ✅ built-in | check |
| **Apple on-device** (`SpeechTranscriber`, iOS 26) | €0 + max privacy **if** LV is supported | ❌ | on-device |

Apple on-device is evaluated separately (it can't run in this Node harness — it needs the iOS build);
if its LV quality is sufficient it becomes the default per Product Plan §7 Option C.

## Methodology

1. **Dataset**: 10–20 real LV/EN recordings with accurate human reference transcripts. Bias toward
   genuine code-switching and realistic room/meeting audio, not clean read speech.
2. **Metrics**:
   - **WER** (micro-averaged) — primary ranking.
   - **CER** — fairer for Latvian morphology; run with and without `--strip-diacritics` to separate
     word errors from diacritic-only errors.
   - **Cost/hour** — from each provider's real pricing (update `src/pricing.mjs`).
   - **Diarization** — qualitative for now (inspect speaker labels); automated DER is future work.
3. **Run**: `node run.mjs --providers …` → `results/latest.md`.
4. **Decide**: pick the best WER/CER at acceptable cost + EU residency; record the decision below.

## Decision criteria (proposed)

- **Quality gate**: WER meaningfully below the others on real code-switched audio; no systematic
  dropping of the minority language mid-sentence.
- **Cost gate**: per-hour cost that keeps a healthy margin under the expected monthly audio volume
  (feed the number into the unit-economics model, decision #4).
- **Ops gate**: EU data residency and a diarization story (built-in, or Whisper + pyannote).

## Results

_(Paste the `results/latest.md` table here once a run completes, then state the chosen provider and
the assumed average monthly audio minutes used for pricing.)_

| Provider | Model | WER | CER | $/hr | Notes |
|---|---|---|---|---|---|
| _tbd_ | | | | | |

**Chosen provider:** _tbd_
**Assumed avg audio/user/month for pricing:** _tbd_
