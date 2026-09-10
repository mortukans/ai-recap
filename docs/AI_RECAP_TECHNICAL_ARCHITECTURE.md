# AI Recap — Technical Architecture

**Version:** 0.2 (cross-platform pivot)
**Date:** 2026-09-10
**Status:** Draft for review. Locks the engineering foundation for MVP v0.1 on a **cross-platform stack**.
**Supersedes:** v0.1 (iOS-native). v0.1's iOS-specific designs (AVAudioEngine chunking, ActivityKit, StoreKit)
remain valid **inside the iOS half of our native modules** and are referenced where relevant.
**Companion documents:** `AI_RECAP_PRODUCT_PLAN.md` (v0.2), `AI_RECAP_MVP_TASKS.md` (to follow).

> **Why this version exists.** The developer environment is **Windows/Linux only, no Mac**. A native
> iOS app cannot be built or shipped without macOS (Xcode is the only tool that compiles, signs, and
> submits to the App Store). Rather than buy/rent a Mac, we pivot to a **cross-platform stack
> (Expo / React Native / TypeScript)** developed entirely on Windows, shipping **Android-first**
> (fully local builds) and **iOS second via EAS cloud builds** (no local Mac). This document
> re-architects the plan around that reality while preserving the product's substance.

> **Reading conventions.** Decisions are stated as decisions. **`[BENCHMARK]`** = do not lock until
> measured. **`[PHASE 2]`** = design now, build later. **`[NATIVE]`** = requires a custom native
> module (Swift + Kotlin) rather than off-the-shelf JS. Re-verify Expo SDK, RN, Android, Apple, and
> provider versions/policies at implementation time.

---

## 1. The pivot in one page

### 1.1 The immovable fact

- **No Mac → no local iOS build.** Windows/Linux can *write* iOS code but cannot compile/sign/submit it.
- **Escape hatch used:** **Expo EAS Build/Submit** runs the iOS build on cloud macOS workers and can be
  driven entirely from Windows. This is Expo's headline capability and the reason we chose it.
- **Android is 100% local** on Windows/Linux (Android Studio + Gradle + emulator + Play Console).

### 1.2 Stack decision

| Layer | Decision | Note |
|---|---|---|
| **Framework** | **React Native (New Architecture) via Expo** | Development builds (custom dev client), **not** Expo Go — we ship custom native modules. |
| **Language** | **TypeScript** | Escape hatch: switch to Flutter/Dart on request; Codemagic would replace EAS for iOS cloud builds. |
| **iOS build/submit** | **EAS Build + EAS Submit** (cloud macOS) | From Windows. Needs an Apple Developer account (~€99/yr); EAS manages certs/profiles. |
| **Android build/submit** | **Local (Gradle) + EAS / Play Console** | Fully on Windows/Linux. |
| **Local DB** | **SQLite** (`op-sqlite`) + **Drizzle ORM** | Typed schema + migrations; SQLCipher-capable. Replaces SwiftData. |
| **Recorder** | **Custom native module** `[NATIVE]` | iOS: AVAudioEngine chunking (v0.1 design). Android: foreground service + `AudioRecord`. Unified TS API. |
| **Monetization** | **RevenueCat** | Abstracts StoreKit (iOS) + Google Play Billing (Android) + entitlements + webhooks. |
| **Backend** | **Supabase** (unchanged) | EU region; two-plane model retained. |
| **Secrets** | **`expo-secure-store`** | Keychain (iOS) / Keystore-backed encryption (Android). BYOK keys never hit our servers. |
| **Live status** | iOS **Live Activity** `[NATIVE]` / Android **foreground-service notification** | Different mechanisms, one product concept. |
| **Cross-device sync** | **None in MVP** | CloudKit is iOS-only and is dropped; see §22. |

### 1.3 What the pivot costs us (be honest)

1. **The recorder is now our code, on both platforms.** No RN library does reliable hour-long,
   locked, *chunked* recording. We own a native module. This is the highest-risk work item (§7).
2. **No CloudKit** → the privacy-free iCloud sync path from v0.1 is gone. MVP is **device-local only**;
   future sync must be **end-to-end encrypted through Supabase** (§22). Audio still never leaves the
   device durably.
3. **Native differentiators cost more.** Live Activity / Dynamic Island and the Apple Watch app are
   Swift/Xcode work exposed to JS through modules; they build in the cloud but are **hard to debug
   with no Mac at all** — budget for occasional cloud-Mac time for iOS-native debugging.
4. **"Apple-native experience" (Product Plan §34) is softened.** We compensate with a genuinely good
   cross-platform UX and by keeping the iOS-native touches (Live Activity, Watch) as later polish.

### 1.4 What the pivot keeps (the product substance survives)

The two-plane data model, chunked fault-tolerant recording, processing state machine, provider
abstractions, structured recap JSON, timestamp citations, context/regeneration, offline queue, Free
quota + paid tiers, BYOK-via-OpenRouter, and the LV/EN transcription benchmark discipline — **all
carry over unchanged in intent**. Only their implementation surface changes.

---

## 2. Architecture overview

### 2.1 Two planes (retained from v0.1)

```
USER CONTENT PLANE  — on device (SQLite + files). Source of truth. We never durably store it.
                       Audio · transcript segments · recaps · contexts · chat.
SERVICE PLANE       — Supabase. Accounts · entitlements(+RevenueCat) · usage · transient jobs.
                       Audio/transcript pass through only during a job, then deleted.
```

### 2.2 Component map

```
                       Expo / React Native app (JS thread + native)
   ┌───────────────────────────────────────────────────────────────────────┐
   │  UI (React Native, Expo Router)                                        │
   │  ├─ RecorderModule            [NATIVE] iOS AVAudioEngine · Android FGS  │
   │  ├─ DB (op-sqlite + Drizzle)  source of truth on device                │
   │  ├─ ProcessingCoordinator (TS) state machine · offline queue           │
   │  ├─ AI layer (TranscriptionProvider / LLMProvider / EmbeddingProvider) │
   │  ├─ Purchases (RevenueCat) → Capabilities                              │
   │  ├─ LiveStatusModule          [NATIVE] iOS Live Activity · Android FGS  │
   │  └─ SecureStore (BYOK keys)                                            │
   └──────────────┬───────────────────────────────────┬────────────────────┘
                  │ background upload (native)          │ supabase-js (JWT)
   ┌──────────────▼───────────┐          ┌──────────────▼────────────────────┐
   │ Watch/Wear   [PHASE 2]    │          │ Supabase (EU)                     │
   │ iOS: WCSession [NATIVE]   │          │ Auth · Postgres(RLS) ·            │
   │ Android: Wear (Kotlin)    │          │ Storage(transient) · Edge Fns ·   │
   └───────────────────────────┘          │ Cron · RevenueCat webhook         │
                                          └──────┬───────────────┬────────────┘
                                        ┌────────▼──────┐  ┌──────▼─────────┐
                                        │ Transcription │  │ OpenRouter     │
                                        │ provider (EU) │  │ (LLM, BYOK     │
                                        └───────────────┘  │ direct from app)│
                                                           └────────────────┘
```

### 2.3 Runtime model

- **JS thread** orchestrates; **native modules** own anything latency- or reliability-critical
  (recording, live status, background upload, secure storage).
- New RN architecture (**TurboModules + Fabric**) via the **Expo Modules API** (ergonomic Swift/Kotlin).
- Async everywhere; the recorder emits events to JS over a native event emitter.

---

## 3. Build & release pipeline (Windows-first)

This section is the whole point of v0.2, so it is explicit.

### 3.1 Local dev (Windows or Linux)

- Node LTS, `pnpm`, Expo CLI, EAS CLI.
- **Development build (custom dev client)** installed on devices — Expo Go cannot load our native
  modules. Build the dev client once per native change; JS iterates over Metro with fast refresh.
- **Android:** run on the Android emulator or a physical Android phone directly from Windows.
- **iOS during dev:** you cannot run the iOS Simulator on Windows. Options, in order of practicality:
  1. Test iOS via **EAS-built dev client installed on a physical iPhone** (internal distribution / ad
     hoc) — JS reloads over Metro on the same network; JS-level debugging works from Windows.
  2. For **native iOS debugging** (crashes inside the Swift module, Live Activity), use **short cloud-Mac
     sessions** (MacinCloud/MacStadium by the hour). Budget this; it's the honest gap.

### 3.2 CI / cloud builds

| Target | How | Runs on Windows? |
|---|---|---|
| Android internal/prod | `eas build -p android` or local Gradle → Play Console | ✅ |
| iOS internal (TestFlight) | `eas build -p ios --profile preview` (cloud macOS) | ✅ (invoked from Windows) |
| iOS submit | `eas submit -p ios` → App Store Connect | ✅ |
| OTA JS updates | **EAS Update** (ship JS/asset changes without a store review) | ✅ |

- **Accounts needed:** Apple Developer Program (~€99/yr, required even for TestFlight) and Google Play
  Developer (~$25 one-time). EAS stores and rotates iOS signing credentials so you never touch a
  Keychain.
- **Config plugins** (in `app.config.ts`) inject the native project settings our modules need
  (background modes, permissions, entitlements, widget/Watch targets) at prebuild time, so we never
  hand-edit Xcode/Gradle projects.

### 3.3 Release order

1. **Android alpha/beta** (fully local loop) — fastest feedback, Latvia testers.
2. **iOS TestFlight** via EAS once the recorder native module passes on-device.
3. Public launch on both, Android likely first.

---

## 4. Repository structure (monorepo)

```
ai-recap/
├─ apps/mobile/                 # Expo app (TS)
│   ├─ app/                     # Expo Router screens
│   ├─ src/features/…           # recap, recorder-ui, contexts, chat, settings, paywall
│   ├─ src/db/                  # Drizzle schema + migrations + repositories
│   ├─ src/ai/                  # provider protocols + impls (transcription, llm, embedding)
│   ├─ src/processing/          # state machine, offline queue, upload
│   ├─ app.config.ts            # Expo config + config plugins
│   └─ eas.json                 # build/submit profiles
├─ modules/
│   ├─ recorder/                # [NATIVE] Expo module: ios/ (Swift) + android/ (Kotlin) + index.ts
│   ├─ live-status/             # [NATIVE] Live Activity (iOS) / FGS notification (Android)
│   └─ watch/                   # [NATIVE][PHASE 2] WCSession bridge / Wear
├─ packages/
│   ├─ core/                    # domain types, enums, state machine (pure TS)
│   ├─ prompts/                 # versioned prompt components + presets (§13)
│   └─ ui/                      # design system, LV/EN i18n
└─ supabase/
    ├─ migrations/              # SQL (schema + RLS)
    └─ functions/               # Edge Functions
```

- `packages/core` depends on nothing. Native modules expose typed TS and are consumed by `apps/mobile`.

---

## 5. Local persistence (SQLite + Drizzle)

### 5.1 Engine

- **`op-sqlite`** (fast, JSI, SQLCipher-capable) + **Drizzle ORM** (typed schema, migrations,
  relational queries). Source of truth on device.
- **Repository layer** wraps Drizzle so features never write raw SQL; mirrors v0.1's repo abstraction.
- **FTS5** virtual tables for search (§14).
- **Encryption at rest:** SQLCipher key stored in `expo-secure-store`; on iOS also rely on data
  protection, on Android on Keystore + full-disk encryption (§21).

### 5.2 Schema (Drizzle) — mirrors Product Plan §11

```ts
export const recaps = sqliteTable("recaps", {
  id: text("id").primaryKey(),                 // uuid
  title: text("title").notNull().default(""),
  startedAt: integer("started_at", { mode: "timestamp_ms" }).notNull(),
  endedAt: integer("ended_at", { mode: "timestamp_ms" }),
  durationSeconds: real("duration_seconds").notNull().default(0),
  detectedLanguages: text("detected_languages", { mode: "json" }).$type<string[]>().default([]),
  status: text("status").notNull().default("recording"),   // RecapStatus (§9)
  presetId: text("preset_id"),
  contextId: text("context_id"),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
});

export const audioChunks = sqliteTable("audio_chunks", {
  id: text("id").primaryKey(),
  recapId: text("recap_id").notNull().references(() => recaps.id, { onDelete: "cascade" }),
  index: integer("index").notNull(),
  relativePath: text("relative_path").notNull(),  // within recap dir; not absolute
  startOffset: real("start_offset").notNull().default(0),
  duration: real("duration").notNull().default(0),
  byteSize: integer("byte_size").notNull().default(0),
  uploadStatus: text("upload_status").notNull().default("local"),
});

export const transcriptSegments = sqliteTable("transcript_segments", {
  id: text("id").primaryKey(),
  recapId: text("recap_id").notNull().references(() => recaps.id, { onDelete: "cascade" }),
  startTime: real("start_time").notNull(),         // seconds — [mm:ss] citations (§12)
  endTime: real("end_time").notNull(),
  speakerLabel: text("speaker_label"),             // "Speaker 1" (pre-rename)
  language: text("language"),                       // per-segment for code-switch display
  text: text("text").notNull().default(""),
});

export const contexts = sqliteTable("contexts", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  summary: text("summary").notNull().default(""),
  vocabulary: text("vocabulary", { mode: "json" }).$type<string[]>().default([]),
  instructions: text("instructions").notNull().default(""),
  isBuiltIn: integer("is_built_in", { mode: "boolean" }).notNull().default(false),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
});

export const speakerProfiles = sqliteTable("speaker_profiles", {
  id: text("id").primaryKey(),
  displayName: text("display_name").notNull().default(""),
  voiceReferenceMetadata: blob("voice_reference_metadata"), // reserved; DISABLED in MVP (§7.4)
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
});

export const recapSpeakers = sqliteTable("recap_speakers", {
  id: text("id").primaryKey(),
  recapId: text("recap_id").notNull().references(() => recaps.id, { onDelete: "cascade" }),
  diarizedLabel: text("diarized_label").notNull(),           // "Speaker 1"
  customDisplayName: text("custom_display_name"),
  speakerProfileId: text("speaker_profile_id"),
});

export const generatedArtifacts = sqliteTable("generated_artifacts", {
  id: text("id").primaryKey(),
  recapId: text("recap_id").notNull().references(() => recaps.id, { onDelete: "cascade" }),
  type: text("type").notNull().default("summary"),           // ArtifactType
  model: text("model").notNull().default(""),
  promptVersion: text("prompt_version").notNull().default(""),
  contextVersion: text("context_version").notNull().default(""),
  content: text("content", { mode: "json" }).notNull(),      // structured RecapDocument (§11)
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
});

export const attachments = sqliteTable("attachments", {
  id: text("id").primaryKey(),
  recapId: text("recap_id").references(() => recaps.id, { onDelete: "cascade" }),
  filename: text("filename").notNull(),
  mimeType: text("mime_type").notNull(),
  relativePath: text("relative_path").notNull(),
  extractedText: text("extracted_text"),
  scope: text("scope").notNull().default("recap"),           // recap | context | global
});

export const chatMessages = sqliteTable("chat_messages", {
  id: text("id").primaryKey(),
  recapId: text("recap_id").notNull().references(() => recaps.id, { onDelete: "cascade" }),
  role: text("role").notNull().default("user"),              // user | assistant
  content: text("content").notNull().default(""),
  citations: text("citations", { mode: "json" }).$type<number[]>(),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
});

export const usageRecords = sqliteTable("usage_records", {
  id: text("id").primaryKey(),
  recapId: text("recap_id"),
  recordingSeconds: real("recording_seconds").notNull().default(0),
  transcriptionSeconds: real("transcription_seconds").notNull().default(0),
  inputTokens: integer("input_tokens").notNull().default(0),
  outputTokens: integer("output_tokens").notNull().default(0),
  model: text("model").notNull().default(""),
  provider: text("provider").notNull().default(""),
  estimatedCostMicros: integer("estimated_cost_micros").notNull().default(0),
  occurredAt: integer("occurred_at", { mode: "timestamp_ms" }).notNull(),
  syncedToBackend: integer("synced_to_backend", { mode: "boolean" }).notNull().default(false),
});
```

### 5.3 On-disk files

`expo-file-system` document directory:

```
<documentDir>/Recaps/<recapId>/
    manifest.json              # atomic rewrite after each chunk close (crash-recovery source)
    chunks/chunk_0001.m4a …
    transcript.json
    artifacts/<id>.json
    attachments/<id>.<ext>
```

Paths in the DB are **relative to the recap dir** so a restore/migration never breaks references.

---

## 6. (reserved — numbering aligned with v0.1 sections below)

---

## 7. Recording engine `[NATIVE]` — the trust foundation (Milestone 1)

No RN library gives us reliable, hour-long, locked, chunked recording, so we build **one Expo native
module (`modules/recorder`) with an iOS half and an Android half behind a single TS API.**

### 7.1 Unified TS interface

```ts
export interface RecorderModule {
  start(recapId: string, opts: RecordOptions): Promise<void>;
  pause(): Promise<void>;
  resume(): Promise<void>;
  finish(): Promise<RecordResult>;          // duration, chunk manifest
  addMarker(label?: string): Promise<void>; // data captured now; UI [PHASE 2]
  // events: "duration", "chunkClosed", "interrupted", "resumed", "error"
  addListener(event: RecorderEvent, cb: (p: any) => void): Subscription;
}
```

### 7.2 iOS half (Swift, inside the module)

- **AVAudioEngine input-node tap → rotating `AVAudioFile` chunks** (the v0.1 design, unchanged):
  16 kHz mono AAC `.m4a`, default **60 s** chunks (configurable 30–300 s), gapless rotation, atomic
  `manifest.json`.
- `AVAudioSession` `.playAndRecord`, `.default` mode, `[.allowBluetooth, .allowBluetoothA2DP]`.
- **`UIBackgroundModes: audio`** via config plugin — the entitlement for locked/background capture.
- File protection **`.completeUntilFirstUserAuthentication`** on the Recaps dir (writable while
  locked, encrypted at rest).
- Handles `interruption`, `routeChange`, `mediaServicesWereReset` → auto-pause/clean-close/resume.
- **AAC boundary-priming tradeoff** accepted (fine for per-chunk transcription; `AVQueuePlayer` for
  playback) — see v0.1 §5.3.

### 7.3 Android half (Kotlin, inside the module)

- **Foreground Service** with **`foregroundServiceType="microphone"`** + **`FOREGROUND_SERVICE_MICROPHONE`**
  permission (Android 14+), plus runtime `RECORD_AUDIO` and `POST_NOTIFICATIONS` (Android 13+). The
  service keeps recording alive while locked/backgrounded and shows the ongoing notification (which
  doubles as our "live status," §19).
- **`AudioRecord`** (raw PCM) → encode to AAC/`.m4a` via `MediaCodec`, writing the **same rotating
  chunk files + manifest** as iOS so the JS/processing layer is platform-agnostic. (`MediaRecorder`
  is simpler but rotating it cleanly is harder; `AudioRecord` + `MediaCodec` gives gapless chunking.)
- Interruptions via `AudioManager` **audio focus** changes and `BroadcastReceiver` for calls/headset;
  auto-pause/resume mirrors iOS.
- Android's default full-disk encryption covers at-rest; SQLCipher covers the DB.

### 7.4 Shared behavior (both platforms, enforced by the module contract)

- **Chunk = unit of durability.** Worst-case loss on crash/kill = the one open chunk (≤ chunk
  duration). Completed chunks are immediately valid files listed in `manifest.json`.
- **Recovery on launch:** scan `Recaps/*/manifest.json`; any recap still `recording` is rebuilt from
  its closed chunks and marked "recovered."
- **Diarization-friendly:** mono 16 kHz is enough; diarization runs server-side on the concatenated
  recap (§10).

### 7.5 Speaker naming (launch-critical)

Provider returns `Speaker 1..N` → `recapSpeakers` rows → user renames per recap and/or maps to a
reusable `speakerProfiles` entry. **Voice biometrics DISABLED in MVP** (schema-reserved only) pending
accuracy/consent/privacy validation. → **Answers Product Plan §39 #8: names only.**

---

## 8. Background processing, offline queue & uploads

- **Offline queue:** completed recaps in `recorded`/`waitingForNetwork` are drained in order on
  reconnect (`@react-native-community/netinfo`), honoring the `autoProcessWhenOnline` setting.
- **Background execution:**
  - Android: **WorkManager** (via the recorder/processing native module or `expo-background-task`) for
    resilient upload + job kickoff.
  - iOS: **BGProcessingTask** via `expo-background-task`; chunk uploads via a **background upload**
    (native `URLSession` background session in the module, or `expo-file-system` background upload).
- **Uploads are chunk-granular and idempotent** (client-generated `jobId`), resumable across app kills.
- The app never promises offline transcription/AI — recording is offline-capable; processing waits.

---

## 9. Processing state machine & retries (retained from v0.1)

States (Product Plan §10): `recording → recorded → [waitingForNetwork] → transcribing → transcribed
→ summarizing → ready`; failures `transcriptionFailed | summaryFailed | uploadFailed`, each
re-entrant with the same idempotency key. **Invariant: no failure ever deletes source audio.**
Retries: exponential backoff with jitter; upload auto-retries in the background; transcription auto
×3 then manual; summary auto ×2 then manual. Implemented in `packages/core` (pure TS) + a TS
`ProcessingCoordinator` in `apps/mobile/src/processing`.

---

## 10. Transcription

**No change to strategy from v0.1 — only the default weighting shifts.** On a cross-platform stack,
on-device speech would be *two* native modules (Apple Speech + Android SpeechRecognizer/on-device),
so **hosted transcription is the MVP default**, and on-device becomes a later `[NATIVE]` optimization.

### 10.1 Requirement (unchanged)

Mixed **Latvian + English within one sentence** (code-switching) + **diarization** + **word/segment
timestamps**. Diarization is language-agnostic; the hard part is LV/EN code-switch quality.

### 10.2 Provider shortlist `[BENCHMARK]` (Product Plan §39 #1,#3,#7)

Measure on real Latvian workplace recordings before locking price:
1. **Speechmatics** — one call → transcript + speakers + timestamps, EU residency, strong multilingual.
2. **gpt-4o-transcribe** (or self-hosted **Whisper large-v3**) **+ pyannote** diarization — quality
   baseline; self-host = EU residency + word timestamps.
3. **Deepgram Nova-3** / **AssemblyAI** — cheap, built-in diarization if LV quality holds.
4. **On-device (Apple `SpeechTranscriber` iOS 26 / Android on-device)** — `[NATIVE][PHASE 2]`; promote
   to default per platform if LV quality is sufficient (Product Plan §7 Option C).

**Provisional default:** hosted **Speechmatics** (EU, one-call diarization) until the benchmark says
otherwise. Reached from **backend**, not the app (keys stay server-side).

### 10.3 Pipeline

`chunks → transient upload → Edge Function /transcription/jobs → provider (whole recap, overlap-stitched
if capped) → segments back to device → cloud audio deleted`. Segments carry per-segment language.

---

## 11. LLM layer (retained; BYOK direct)

- **`LLMProvider`** protocol; two impls:
  - **`OpenRouterLLMProvider`** (BYOK): app → `https://openrouter.ai/api/v1/chat/completions`
    **directly** with the user's key from `expo-secure-store`. Key **never** touches our servers.
    Headers `Authorization`, `HTTP-Referer`, `X-Title: AI Recap`; models via `GET /api/v1/models`
    (dynamic picker); SSE streaming; `response_format` JSON schema where supported + tolerant parser
    fallback. "Test connection" drives the guided BYOK setup (Product Plan §36).
  - **`HostedLLMProvider`** (Unlimited): app → Edge Function → provider; keys ours; usage metered;
    `Fast|Balanced|Best` → concrete models server-configurable.
- **Long meetings:** map-reduce (topic summaries → global synthesis) or single-pass when it fits the
  model's context (Product Plan §31).
- **→ Answers #5 (MVP): BYOK = OpenRouter for LLM; transcription stays hosted/on-device.**

---

## 12. Structured output & citations (retained)

- LLM returns **JSON** (`RecapDocument`: title, summary, decisions[], actionItems[], importantDates[],
  openQuestions[], topics[]) stored in `generatedArtifacts.content`. Types live in `packages/core`.
- **Citations:** every claim carries `timestampRefs` (seconds). UI renders `[32:14]` chips; tapping
  scrolls the transcript and offers "Play from here" (seek the audio player to that offset). This is a
  headline trust feature (Product Plan §13).

---

## 13. Context & prompt architecture (retained)

Versioned prompt components (`SYSTEM + USER CONTEXT + METADATA + TRANSCRIPT + TEMPLATE + OUTPUT
SCHEMA`), stored in `packages/prompts`; `promptVersion` + `contextVersion` saved on every artifact for
reproducibility. Presets (`workMeeting, lecture, interview, personalVoiceNote, salesCall, custom`)
seed built-in `contexts` + templates. **Regeneration** = same transcript + different context →
new artifact, no re-transcription (the core differentiator, Product Plan §34). Default timing:
context chosen **after** recording; `contextSelectionTiming` setting flips it.

---

## 14. Search (retained; SQLite FTS5)

MVP: local **FTS5** index over titles, transcript, summaries, decisions, action items, contexts,
extracted attachment text. Semantic global search is `[PHASE 2]` behind an `EmbeddingProvider`
(designed now, not built).

---

## 15. Attachments (retained)

MVP: **txt/md/pdf** text extraction only (PDF via a JS/native PDF-text lib), so files never block
recording. Scope: recap / context / global. `[Provisional answer to #12; confirm.]`

---

## 16. Backend (Supabase) — service plane only

Unchanged from v0.1 in shape (no user content at rest). Postgres tables: `profiles`, `entitlements`,
`usage_events`, `daily_quota`, `processing_jobs`; **RLS `user_id = auth.uid()` on every table**;
transient `processing-audio` Storage bucket deleted on job completion + hourly cleanup cron. Edge
Functions: `/transcription/jobs`, `/recap/generate`, `/chat`, `/usage/events`, `/entitlements`,
`/quota/consume`, `cron/cleanup-processing`, **`/revenuecat/webhook`** (replaces the raw StoreKit
webhook — see §18). BYOK LLM calls do not pass through the backend.

---

## 17. Authentication (retained, cross-platform)

- **Anonymous Supabase session at first launch** (device-bound JWT) authorizes backend calls +
  metering without a signup wall. → **Answers #6: no explicit account in MVP.**
- Upgrade to **Sign in with Apple** (iOS) / **Google** (Android) — Supabase supports both — required
  only to link identity for future sync. Sign in with Apple is still required by App Review if any
  other social login is offered on iOS.

---

## 18. Monetization — RevenueCat (replaces raw StoreKit)

Cross-platform IAP is the reason to use **RevenueCat** rather than hand-rolling StoreKit + Play Billing.

| Product | Type | Price target | iOS | Android |
|---|---|---|---|---|
| Unlimited monthly | Auto-renewable sub | €19.99/mo | App Store subscription | Play subscription |
| BYOK lifetime | Non-consumable | €99 one-time | App Store non-consumable | Play one-time product |

- **`react-native-purchases`** presents offerings, handles purchase/restore, and exposes **entitlements**
  (`unlimited`, `byok`) uniformly across stores.
- **Server truth:** RevenueCat **webhook → `/revenuecat/webhook`** updates our `entitlements` table so
  server-gated work (hosted AI) can't be spoofed by a tampered client. `GET /entitlements` is
  authoritative for hosted features.
- **Capabilities, not a plan enum** (retained): resolve owned entitlements → `{ maxRecordingMinutes,
  maxRecapsPerDay, hostedTranscription, hostedLLM, byokEnabled, watch, export, advancedTemplates }`.
  Free defaults (15 min / 5 per day); BYOK and Unlimited unlock different sets and can co-exist.
- **Free enforcement (Product Plan §21/§22):** warn 13:00, strong warn 14:00, **auto-stop 15:00, still
  save + process**; 5 recaps/day enforced client + server (`/quota/consume`); Unlimited 60-min cap +
  server fair-use guards.
- Apple IAP / Google Play Billing are required for these digital unlocks; **no custom license flow**.
  Re-verify store policies before submission.

---

## 19. Live status: iOS Live Activity `[NATIVE]` / Android foreground notification

One product concept ("recording is unmistakably visible"), two mechanisms in `modules/live-status`:

- **iOS — Live Activity + Dynamic Island** (ActivityKit, Swift widget extension added via config
  plugin). Timer via `Text(timerInterval:)` (no per-second pushes); state pushed only on
  pause/resume/finish; interactive **Pause/Finish as `LiveActivityIntent`** running in-process (the
  app is alive via the `audio` background mode). This is genuinely advanced from RN — budget cloud-Mac
  debugging time. `[NATIVE]`
- **Android — the recorder's foreground-service notification** *is* the live status: ongoing,
  non-dismissable while recording, with Pause/Finish actions and a chronometer. On Android 14+ it can
  be a promoted/"live" notification. This comes essentially for free from §7.3.
- No Dynamic Island analog on Android; the persistent notification is the parallel affordance.

---

## 20. Watch / Wear `[PHASE 2][NATIVE]`

- **Apple Watch** (Product Plan §16): native Swift Watch target + `WCSession` bridged to JS via a
  native module; **remote control first** (start/pause/finish/marker, timer rendered locally from a
  pushed `startedAt`), independent Watch mic recording second (watchOS background-audio caveats,
  Product Plan §39 #10). `[BENCHMARK]`
- **Wear OS** (Kotlin) is the Android parallel and is fully Windows-buildable.
- Both are post-MVP; designed now, built later.

---

## 21. Security & privacy

| Concern | Mechanism |
|---|---|
| **BYOK secrets** | `expo-secure-store` (Keychain / Keystore). Never in the DB/AsyncStorage; never sent to our servers (app→OpenRouter direct). |
| **DB at rest** | **SQLCipher** (op-sqlite) with a key in secure-store. |
| **Files at rest** | iOS `.completeUntilFirstUserAuthentication` on Recaps dir; Android full-disk encryption. |
| **In transit** | TLS 1.2+; optional cert pinning for our backend. |
| **Transient cloud audio** | RLS-scoped bucket; deleted on completion + cron; provider DPAs; EU region; disable provider training where possible. |
| **Backend isolation** | Postgres RLS (`auth.uid()`); service-role key only in Edge Functions. |
| **Deletion** | User-initiated hard delete of audio/transcript/recaps/account cascades local files + DB (+ backend rows). The app never hard-deletes user data without an explicit user action. |
| **Sharing** | Normal share = formatted recap/summary/actions/sections, preserving headings/lists/checkboxes for Notes-like targets; **audio + full transcript excluded**, available only via an explicit Save/Export (Product Plan §36A). |
| **Consent (Product Plan §19)** | First-run "you are responsible for permission to record"; optional start announcement; `Info.plist` mic/speech usage strings + Android permission rationale. **Legal/GDPR review required before launch (#11) `[LEGAL]`.** |

Retention (Product Plan §18): `audioRetention ∈ {forever, 90d, 30d, deleteAfterTranscription}`
enforced by a background task; transcript toggle separate; export is a separate explicit action.

---

## 22. Cross-device sync (#13 revised for cross-platform)

**CloudKit is iOS-only and is dropped.** New position:

- **MVP: device-local only, no sync.** Simplest and most private; audio/transcripts never leave the
  device except transiently for processing.
- **Future sync (Product Plan §39 #13) `[PHASE 2]`:** if wanted, **end-to-end encrypted sync through
  Supabase** — the client encrypts recap metadata + generated artifacts (never raw audio by default)
  with a user-held key before upload; the server stores only ciphertext. This preserves "we can't read
  your content" while working on Android + iOS. → **Answers #13: no sync in MVP; if added, E2EE via
  Supabase, not CloudKit; audio stays local.**

---

## 23. Observability & unit economics (retained)

`usageRecords` (local) → `usage_events` (server): recording/transcription seconds, in/out tokens,
model, provider, integer micro-EUR cost. Feeds the **light/normal/heavy simulation that must run
before €19.99 is locked** (Product Plan §26, §39 #4) `[BENCHMARK]`. Content-free product metrics per
Product Plan §32.

---

## 24. Open decisions — resolved vs deferred (updated for v0.2)

| # | Question | v0.2 answer |
|---|---|---|
| 1 | Best LV/EN transcription | `[BENCHMARK]` shortlist (§10.2) |
| 2 | Local transcription feasible? | Deferred `[NATIVE]`; hosted default for MVP (§10) |
| 3 | Transcription cost/hr | Measure on shortlist → §23 |
| 4 | €19.99 assumption | Model via §23 before locking |
| 5 | BYOK scope | **OpenRouter (LLM) only in MVP** (§11) |
| 6 | Accounts in MVP? | **Anonymous; platform sign-in optional** (§17) |
| 7 | Diarization | Provider-built-in / pyannote; language-agnostic (§10.2) `[BENCHMARK]` |
| 8 | Speaker profiles | **Names only in MVP** (§7.5) |
| 9 | Min OS | **Android API 26+; iOS 15.1+ (Live Activity needs 16.1+)** (§25) |
| 10 | Watch matrix | `[BENCHMARK]`, Phase 2 (§20) |
| 11 | EU/LV disclosures | `[LEGAL]` (§21) |
| 12 | Context file types | **txt/md/pdf** provisional (§15) |
| 13 | Sync | **None in MVP; E2EE-via-Supabase later; no CloudKit** (§22) |
| 14 (new) | RN vs Flutter | **Expo/React Native + TS** (§1.2) |
| 15 (new) | iOS build without Mac | **EAS cloud build/submit from Windows** (§3) |

---

## 25. Platform targets (cross-platform)

| Item | Decision | Note |
|---|---|---|
| Expo SDK / RN | Latest stable, **New Architecture on** | Re-verify current SDK at start. |
| Android min / target | **min API 26 (8.0)** / target latest (35+) | FGS-mic rules apply on Android 14+. |
| iOS min | **15.1** (Expo floor) | Live Activity features gated to 16.1+. |
| Devices | Phones first | Tablets later; Watch/Wear Phase 2. |

---

## 26. Milestone → architecture mapping (build order, Android-first)

1. **M1 Recorder** `[NATIVE]` (§7, §8, §9) — the recorder native module (**Android first**, iOS via
   EAS), chunking, recovery, foreground service / background audio, library, playback. **No AI.**
2. **M2 Transcript** (§10, §16) — provider abstraction + LV/EN benchmark, job states, segmentation,
   timestamps, diarization, speaker rename/profiles.
3. **M3 Recap** (§11, §12, §13) — structured schema, decisions/actions/dates/topics, regenerate,
   built-in + custom templates.
4. **M4 Context + chat** (§13, §12) — saved/reusable/meeting context, chat over transcript, citations.
5. **M5 Monetization** (§17, §18, §23) — Free quota, RevenueCat sub + BYOK unlock, OpenRouter key +
   model picker, usage accounting.
6. **M6 Native polish** (§19) — Live Activity/Dynamic Island (iOS) + rich FGS notification (Android),
   App Intents/Shortcuts (iOS), Quick Settings/Assistant (Android), formatted sharing.
7. **M7 Watch/Wear** (§20) — remote control first, then independent recording.

---

## 27. Immediate engineering to-dos before M1 code

1. **Scaffold** the Expo monorepo (§4), New Architecture on, dev-client build working on an Android
   device from Windows.
2. **Prove the recorder native module on Android first** — 60-min locked foreground-service recording
   with induced interruptions (calls, headset unplug, app kill) and clean crash recovery. This is the
   highest-risk item; do it before anything else.
3. Wire **EAS**: Apple Developer + Google Play accounts, `eas.json` profiles, first **iOS dev-client
   cloud build** installed on a physical iPhone (confirms the Windows→iOS pipeline end-to-end early).
4. Kick off the **LV/EN transcription benchmark** (§10.2) in parallel — longest lead time, gates
   pricing.
5. Stand up **Supabase** (EU) + schema + RLS + anonymous auth + RevenueCat project.
6. Draft **`AI_RECAP_MVP_TASKS.md`** — small, ordered, Codex-ready tasks from §26/§27.

---

*End of AI_RECAP_TECHNICAL_ARCHITECTURE.md v0.2 (cross-platform). Re-verify all Expo/RN/Android/Apple
versions, store policies, and provider terms at implementation time.*
