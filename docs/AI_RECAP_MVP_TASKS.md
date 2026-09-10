# AI Recap — MVP Task Breakdown

**Version:** 0.1
**Date:** 2026-09-10
**Sequencing:** **iOS-first** (product priority per Product Plan). Cross-platform stack (Expo / React
Native / TypeScript) per `AI_RECAP_TECHNICAL_ARCHITECTURE.md` v0.2. Android native halves are a
documented fast-follow (§ Deferred).
**Scope:** MVP v0.1 — the 23 features in Product Plan §27.
**Audience:** a coding agent (Codex) + the developer. Each task is PR-sized and self-contained.

---

## How to use this document

- Tasks are **ordered**; later tasks assume earlier ones are merged. Where order is flexible, a
  **Parallel** tag says so.
- Every task has: **Goal · Depends · Platform · Steps · Acceptance · Files**.
- **Platform tags:** `[TS]` shared TypeScript (serves iOS + Android) · `[iOS]` Swift native ·
  `[Backend]` Supabase · `[Ops]` tooling/CI. Android-native (`[AND]`) tasks are listed only in
  § Deferred for MVP.
- **Definition of Done (applies to every task):** builds clean; `tsc` + ESLint pass; unit tests for
  pure logic; the acceptance check is demonstrably met on a **physical iPhone** running the dev
  client (for anything touching native/UI); no secret committed.
- **§ references** point at `AI_RECAP_TECHNICAL_ARCHITECTURE.md` v0.2.
- **iOS + no Mac reality:** native Swift tasks (M1 recorder, M6 Live Activity) build via **EAS** and
  may need a short **cloud-Mac** session to debug native crashes. Tasks that need it say so.

---

## Critical path (the spine)

```
M0 setup + EAS iOS loop ──▶ M1 recorder native module ──▶ M2 transcription ──▶ M3 recap
                                    │                                              │
                                    └── library + playback (TS)                    └── M4 context + chat
M5 monetization + M6 polish attach after M3/M4.
```

The **single riskiest item is M1** (custom native recorder). Front-load it; nothing else matters if a
meeting can be lost.

---

# M0 — Foundation & the Windows→iOS loop

> Goal of M0: a running Expo dev client on a physical iPhone (built from Windows via EAS), an empty
> but typed data layer, navigation shell, and Supabase reachable. No product features yet.

### M0-1 · Scaffold the Expo monorepo `[Ops]`
- **Goal:** repo skeleton per §4, New Architecture on, TypeScript strict.
- **Depends:** —
- **Steps:** init pnpm monorepo (`apps/mobile`, `modules/`, `packages/core|prompts|ui`, `supabase/`);
  create Expo app (latest SDK, New Arch enabled); configure `tsconfig` strict, ESLint, Prettier;
  set up Expo Router; commit `app.config.ts` with app name/bundle id `lv.airecap.app`.
- **Acceptance:** `pnpm i && pnpm typecheck && pnpm lint` pass; app boots in Expo dev client on the
  Android emulator (fastest local check) showing a placeholder screen.
- **Files:** repo root, `apps/mobile/*`, `packages/*/package.json`.

### M0-2 · EAS build + iOS dev client on a physical iPhone `[Ops]` **(de-risk the pipeline first)**
- **Goal:** prove the Windows→iOS pipeline end-to-end **before** writing native code.
- **Depends:** M0-1
- **Steps:** create Apple Developer + Google Play accounts; `eas.json` with `development`, `preview`,
  `production` profiles; `eas build -p ios --profile development`; install the dev client on a real
  iPhone via internal distribution; confirm Metro fast-refresh from Windows over LAN. Set up **EAS
  Update** channel.
- **Acceptance:** a JS edit on Windows hot-reloads on the physical iPhone; an EAS iOS build completes
  and installs. Document the exact commands in `docs/BUILD.md`.
- **Files:** `eas.json`, `docs/BUILD.md`.
- **Note:** this task also validates signing/credentials managed by EAS (no Keychain needed).

### M0-3 · Local DB: op-sqlite + Drizzle schema & migrations `[TS]`
- **Goal:** the §5 schema as Drizzle tables with migrations and a repository layer.
- **Depends:** M0-1
- **Steps:** add `op-sqlite` + `drizzle-orm`; implement all tables from §5.2; generate initial
  migration; write `packages/core` enums (`RecapStatus`, `ArtifactType`, `PresetKey`, etc.);
  implement `RecapRepository`, `ChunkRepository`, `SegmentRepository`, `ArtifactRepository`,
  `ContextRepository` with typed CRUD; enable SQLCipher with a key from `expo-secure-store`.
- **Acceptance:** unit tests create/read/update/delete a `recap` with cascading chunks; migration runs
  on a fresh install; DB file is encrypted (opening without the key fails).
- **Files:** `apps/mobile/src/db/schema.ts`, `.../migrations/*`, `.../repositories/*`, `packages/core/*`.

### M0-4 · App shell, navigation, design system, LV/EN i18n `[TS]` **Parallel with M0-3**
- **Goal:** tab structure + theme + localization baseline.
- **Depends:** M0-1
- **Steps:** implement navigation per Product Plan §35 (simpler MVP: **Recaps · Contexts · Settings**
  with a floating **Start Recap** button); design tokens/components in `packages/ui`; i18next +
  `expo-localization` with `lv` + `en` resource files; a `useCapabilities()` placeholder returning
  Free defaults.
- **Acceptance:** three tabs render; language switches LV/EN from Settings; empty-state Recaps list.
- **Files:** `apps/mobile/app/*`, `packages/ui/*`, `apps/mobile/src/i18n/*`.

### M0-5 · Supabase project + schema + RLS + anonymous auth `[Backend]` **Parallel**
- **Goal:** service plane reachable with per-user isolation.
- **Depends:** M0-1
- **Steps:** create Supabase project (**EU region**); apply §16 tables (`profiles`, `entitlements`,
  `usage_events`, `daily_quota`, `processing_jobs`) with **RLS `user_id = auth.uid()`**; enable
  **anonymous auth**; add `supabase-js` client in `apps/mobile/src/api` that mints an anon session on
  first launch and stores it; add `processing-audio` private Storage bucket.
- **Acceptance:** app obtains an anon JWT on first launch; a smoke test inserts/reads a `usage_events`
  row only for the owning user (cross-user read denied by RLS).
- **Files:** `supabase/migrations/*`, `apps/mobile/src/api/supabase.ts`.

---

# M1 — Recorder (the trust foundation) `[iOS]` + `[TS]`

> Milestone 1 from Product Plan §37 / arch §7. **No AI.** Prove a 60-minute locked recording survives
> interruptions and crashes. Build the **iOS half** of `modules/recorder` first.

### M1-1 · Scaffold the `recorder` Expo native module + TS API `[TS]/[iOS]`
- **Goal:** the unified interface from §7.1 with an iOS Swift skeleton.
- **Depends:** M0-2, M0-3
- **Steps:** `create-expo-module recorder`; define the TS API (`start/pause/resume/finish/addMarker`
  + event emitter for `duration|chunkClosed|interrupted|resumed|error`); stub the Swift side to emit a
  fake duration tick; wire a config plugin adding `UIBackgroundModes: [audio]` and
  `NSMicrophoneUsageDescription`.
- **Acceptance:** JS calls `start()` and receives duration ticks from native on the iPhone dev client.
- **Files:** `modules/recorder/{index.ts,ios/*,expo-module.config.json}`, `app.config.ts` plugin.

### M1-2 · Audio session + microphone permission (iOS) `[iOS]`
- **Goal:** correct `AVAudioSession` config (§7.2) and permission flow.
- **Depends:** M1-1
- **Steps:** request mic permission with a clear pre-prompt; configure `.playAndRecord`, `.default`,
  `[.allowBluetooth, .allowBluetoothA2DP]`; activate session; expose permission state to JS.
- **Acceptance:** permission prompt shows once; session activates; denying permission surfaces a
  recoverable error, not a crash.
- **Files:** `modules/recorder/ios/*`, `apps/mobile/src/features/recorder-ui/permission.ts`.

### M1-3 · Capture + chunk writer (AVAudioEngine → rotating m4a) `[iOS]` **(highest risk)**
- **Goal:** gapless 16 kHz mono AAC chunks, default 60 s, written to the recap dir (§7.2).
- **Depends:** M1-2
- **Steps:** install input-node tap; `AVAudioConverter` to 16 kHz mono; write `AVAudioFile` per chunk;
  rotate on a buffer boundary (close file N → emit `chunkClosed` with index/offset/duration → open
  N+1); keep file I/O off the audio thread (serial queue).
- **Acceptance:** a 10-minute recording yields ~10 valid, individually-playable `.m4a` files with
  continuous timestamps and no dropped audio at boundaries (verify by ear + duration sum).
- **Files:** `modules/recorder/ios/*`.
- **Note:** likely needs a **cloud-Mac** session for AVFoundation debugging.

### M1-4 · Manifest + crash recovery `[iOS]/[TS]`
- **Goal:** atomic `manifest.json` after each chunk; rebuild on launch (§7.4).
- **Depends:** M1-3
- **Steps:** write manifest atomically (temp file + rename) after every `chunkClosed`; on app launch,
  TS `ProcessingCoordinator.recover()` scans `Recaps/*/manifest.json`, rebuilds any `recording`-state
  recap from closed chunks, sums duration, sets status `recorded`, flags "recovered."
- **Acceptance:** force-kill the app mid-recording; on relaunch the recap appears with all completed
  chunks and correct duration; only the open chunk (≤60 s) is lost.
- **Files:** `modules/recorder/ios/*`, `apps/mobile/src/processing/recover.ts`.

### M1-5 · Pause / resume + duration tracking `[iOS]/[TS]`
- **Goal:** clean pause/resume with exact accumulated duration.
- **Depends:** M1-3
- **Steps:** pause closes the current chunk cleanly and stops the tap; resume opens a new chunk;
  track accumulated paused time so displayed duration is correct.
- **Acceptance:** pause/resume 3× during a recording; final duration equals active recording time;
  no corrupt chunk at pause boundaries.
- **Files:** `modules/recorder/ios/*`.

### M1-6 · Interruption & route-change handling `[iOS]`
- **Goal:** survive calls/Siri/headset changes (§7.2 table).
- **Depends:** M1-5
- **Steps:** observe `interruptionNotification`, `routeChangeNotification`, `mediaServicesWereReset`;
  auto-pause on `.began`/`oldDeviceUnavailable`, auto-resume on `.ended`+`.shouldResume`; rebuild
  engine on media reset; emit `interrupted`/`resumed` to JS.
- **Acceptance:** an incoming phone call auto-pauses and auto-resumes; unplugging AirPods pauses and
  shows the active-input change; no completed chunk lost in any case.
- **Files:** `modules/recorder/ios/*`.

### M1-7 · Background-while-locked verification `[iOS]/[Ops]`
- **Goal:** confirm the core promise — record for the full hour while locked.
- **Depends:** M1-6
- **Steps:** verify `audio` background mode keeps capture alive; set file protection
  `.completeUntilFirstUserAuthentication` on the Recaps dir; run a scripted 60-minute locked session
  with 3 induced interruptions.
- **Acceptance:** **60-minute locked recording completes** with all chunks intact and duration exact;
  documented as a repeatable manual test in `docs/RECORDER_TESTPLAN.md`.
- **Files:** `modules/recorder/ios/*`, `docs/RECORDER_TESTPLAN.md`.

### M1-8 · Recording UI (start/pause/finish, live timer) `[TS]`
- **Goal:** the recording screen (Product Plan §4).
- **Depends:** M1-5
- **Steps:** Start Recap → creates a `recap` row (status `recording`), starts the module; live timer
  from module events; Pause/Finish; "Audio saved continuously" indicator; on Finish set status
  `recorded` and route to the recap detail.
- **Acceptance:** full record→pause→resume→finish flow persists a recap with chunks in the DB.
- **Files:** `apps/mobile/src/features/recorder-ui/*`.

### M1-9 · Recording library + audio playback `[TS]`
- **Goal:** list recaps; play back the chunked audio (Product Plan §27 items 5–6).
- **Depends:** M1-4, M1-8
- **Steps:** Recaps list (title, duration, date, status) with search box (title only for now); detail
  screen; playback via `expo-audio`/`AVQueuePlayer`-style queue over the chunk files with a scrubber
  and elapsed/total time.
- **Acceptance:** a recorded meeting plays back continuously start-to-finish with a working scrubber.
- **Files:** `apps/mobile/src/features/recap/{list,detail,player}.tsx`.

---

# M2 — Transcription

> Arch §10. Hosted transcription default; LV/EN benchmark gates the provider. Diarization + timestamps
> + speaker naming.

### M2-1 · Transcription provider abstraction + hosted impl `[TS]/[Backend]`
- **Goal:** `TranscriptionProvider` protocol + `HostedTranscriber` via Edge Function.
- **Depends:** M0-5, M1-9
- **Steps:** define the protocol (§7.5-style) in `packages/core`; Edge Function
  `/transcription/jobs` (idempotent by client `jobId`) that uploads chunk(s) to `processing-audio`,
  calls the provider, returns segments `{start,end,speaker,language,text}`, then **deletes the cloud
  audio**; poll endpoint `/transcription/jobs/:id`.
- **Acceptance:** a recorded recap returns real segments; the cloud audio object is gone after success
  (verified in Storage).
- **Files:** `supabase/functions/transcription/*`, `apps/mobile/src/ai/transcription/*`.

### M2-2 · LV/EN transcription benchmark `[Ops]` **Parallel · `[BENCHMARK]` (blocks pricing)**
- **Goal:** pick the provider on real Latvian workplace audio (§10.2, Product Plan §39 #1/#3/#7).
- **Depends:** M2-1 (or run standalone with sample scripts)
- **Steps:** assemble a held-out set of real LV/EN code-switched recordings with reference
  transcripts; measure WER + speaker error + code-switch accuracy + cost/hour for **Speechmatics,
  gpt-4o-transcribe(+pyannote), Deepgram/AssemblyAI**; record results in `docs/TRANSCRIPTION_BENCHMARK.md`.
- **Acceptance:** a ranked recommendation with numbers; the chosen provider is wired as
  `HostedTranscriber`'s backend.
- **Files:** `docs/TRANSCRIPTION_BENCHMARK.md`, benchmark scripts.

### M2-3 · Upload/processing states + offline queue `[TS]`
- **Goal:** the §9 state machine + §8 offline queue driving transcription.
- **Depends:** M2-1
- **Steps:** implement `ProcessingCoordinator` states (`recorded→transcribing→transcribed`,
  `waitingForNetwork`, failures) with retry/backoff; `netinfo` gating; background upload
  (`expo-file-system` background / native `URLSession`); `autoProcessWhenOnline` setting.
- **Acceptance:** record in airplane mode → recap sits in `waitingForNetwork` → reconnect →
  auto-transcribes; a failed job is retryable and never loses audio.
- **Files:** `apps/mobile/src/processing/*`.

### M2-4 · Transcript view + timestamp navigation `[TS]`
- **Goal:** readable transcript with tap-to-seek (§12).
- **Depends:** M2-1, M1-9
- **Steps:** render segments grouped by speaker with `[mm:ss]`; tapping a segment seeks the player;
  per-segment language subtly indicated for code-switch.
- **Acceptance:** tapping any segment starts playback at that offset; LV and EN segments both render.
- **Files:** `apps/mobile/src/features/recap/transcript.tsx`.

### M2-5 · Speaker diarization → rename + saved profiles `[TS]`
- **Goal:** Speaker 1..N, rename per recap, reuse profiles (§7.5, Product Plan §27 items 9–10).
- **Depends:** M2-1
- **Steps:** create `recapSpeakers` from diarized labels; UI to rename per recap and/or map to a
  `speakerProfiles` entry; reuse saved names in future recaps. **Voice biometrics excluded.**
- **Acceptance:** renaming "Speaker 1"→"Jānis" updates the transcript throughout; the saved profile
  is offered in the next recap.
- **Files:** `apps/mobile/src/features/recap/speakers.tsx`, repositories.

---

# M3 — Recap generation

> Arch §11–§13. Structured JSON recap + regeneration + templates.

### M3-1 · `LLMProvider` protocol + BYOK OpenRouter impl `[TS]`
- **Goal:** direct OpenRouter calls with the user's key (§11).
- **Depends:** M0-3
- **Steps:** protocol `generateStructured/stream/availableModels`; `OpenRouterLLMProvider` →
  `chat/completions` with key from `expo-secure-store`, headers `Authorization/HTTP-Referer/X-Title`;
  SSE streaming; `GET /models` for the picker; tolerant JSON parsing + repair retry.
- **Acceptance:** with a test key, a prompt returns a streamed completion and a parsed JSON object.
- **Files:** `apps/mobile/src/ai/llm/openrouter.ts`, `packages/core/llm.ts`.

### M3-2 · Hosted LLM impl (Unlimited path) `[TS]/[Backend]`
- **Goal:** `HostedLLMProvider` via Edge Function for non-BYOK users (§11).
- **Depends:** M0-5, M3-1
- **Steps:** Edge Functions `/recap/generate` + `/chat` calling the provider with our key; meter
  tokens into `usage_events`; `Fast|Balanced|Best`→model map (server config).
- **Acceptance:** a recap generates via the backend and a `usage_events` row is written.
- **Files:** `supabase/functions/{recap,chat}/*`, `apps/mobile/src/ai/llm/hosted.ts`.

### M3-3 · Structured recap schema + generation pipeline `[TS]`
- **Goal:** `RecapDocument` JSON (summary/decisions/actionItems/dates/openQuestions/topics) with
  citations (§11–§12).
- **Depends:** M3-1 (BYOK) or M3-2 (hosted), M2-4
- **Steps:** define Codable-equivalent TS types in `packages/core`; prompt assembly (§13) →
  request structured output → validate against schema → store as `generatedArtifact`; map-reduce for
  long transcripts, single-pass when it fits (§ arch 8.3/11).
- **Acceptance:** a transcribed recap produces a valid `RecapDocument` with `timestampRefs`;
  invalid JSON triggers a repair pass, not a crash.
- **Files:** `apps/mobile/src/ai/recap/*`, `packages/prompts/*`.

### M3-4 · Recap detail UI (summary/decisions/actions/dates) + citations `[TS]`
- **Goal:** render the structured recap with tappable `[mm:ss]` chips (Product Plan §4).
- **Depends:** M3-3, M2-4
- **Steps:** sectioned detail (Summary, Decisions, Action Items, Important Dates, Open Questions,
  Topics); citation chips seek the transcript/audio; empty/partial states.
- **Acceptance:** a full recap renders; tapping a decision's `[32:14]` jumps to that transcript moment.
- **Files:** `apps/mobile/src/features/recap/recap-view.tsx`.

### M3-5 · Built-in presets + custom templates `[TS]`
- **Goal:** seed the 5 presets + custom template creation (Product Plan §27 items 14–15).
- **Depends:** M3-3
- **Steps:** seed `contexts` for `workMeeting|lecture|interview|personalVoiceNote|salesCall`;
  template packages in `packages/prompts`; UI to create/edit a custom template.
- **Acceptance:** choosing "Sales Call" changes the recap structure; a user-made template persists and
  is selectable.
- **Files:** `packages/prompts/presets/*`, `apps/mobile/src/features/contexts/*`.

### M3-6 · Post-recording preset/context prompt + regenerate `[TS]`
- **Goal:** default "ask after recording" flow + regeneration (Product Plan §4/§5, differentiator §34).
- **Depends:** M3-4, M3-5
- **Steps:** after Finish, prompt for preset/context (respect `contextSelectionTiming`); "Regenerate"
  runs the pipeline again with a different context/template → new `generatedArtifact` (keep history),
  **no re-transcription**.
- **Acceptance:** regenerating the same meeting "for management" yields a different summary without
  re-transcribing; both artifacts are retained.
- **Files:** `apps/mobile/src/features/recap/regenerate.tsx`.

---

# M4 — Context system + chat

> Arch §13, §12. Saved/reusable/meeting context; chat over the transcript with citations.

### M4-1 · Context management (create/edit/reuse) `[TS]`
- **Goal:** full CRUD for saved contexts + attach to a recording (Product Plan §5).
- **Depends:** M3-5
- **Steps:** Contexts tab: create/edit name, vocabulary, instructions; select a context before or
  after recording; combine preset + custom context at generation time.
- **Acceptance:** a "Capital – IT" context with vocabulary ("Sales7 = internal ERP") measurably steers
  the recap wording.
- **Files:** `apps/mobile/src/features/contexts/*`.

### M4-2 · Text/PDF context attachments `[TS]`
- **Goal:** attach txt/md/pdf as context; extract text (§15, Product Plan §27 item 16).
- **Depends:** M4-1
- **Steps:** file picker; store under the recap/context; extract text (PDF via a JS/native text
  extractor); scope = recap|context|global; feed extracted text into prompt assembly.
- **Acceptance:** attaching a PDF spec lets a recap/chat reference its content.
- **Files:** `apps/mobile/src/features/attachments/*`.

### M4-3 · Ask-AI chat over a recap `[TS]`
- **Goal:** conversational Q&A over transcript + context with citations (Product Plan §27 item 13).
- **Depends:** M3-3
- **Steps:** chat UI persisting `chatMessages`; each turn sends transcript (or map-reduce summaries)
  + context to the selected `LLMProvider`; assistant answers include `timestampRefs` rendered as
  tappable chips; streaming responses.
- **Acceptance:** "What did Jānis say about database access?" returns an answer with a working
  `[mm:ss]` citation.
- **Files:** `apps/mobile/src/features/chat/*`.

### M4-4 · Local search across recaps `[TS]` **Parallel**
- **Goal:** FTS5 over titles/transcripts/summaries/decisions/actions/contexts/attachments (§14).
- **Depends:** M2-1, M3-3
- **Steps:** FTS5 virtual tables + triggers to keep them in sync; a Search surface returning recaps +
  the matching snippet.
- **Acceptance:** searching a term from a transcript returns the right recap and highlights the hit.
- **Files:** `apps/mobile/src/db/fts.ts`, `apps/mobile/src/features/search/*`.

---

# M5 — Monetization

> Arch §17–§18, §23. RevenueCat (iOS first), Free quota, BYOK setup, usage accounting.

### M5-1 · RevenueCat integration + products (iOS) `[TS]`
- **Goal:** subscription + BYOK unlock via App Store through RevenueCat (§18).
- **Depends:** M0-2
- **Steps:** configure App Store Connect products `ai_recap_unlimited_monthly` (sub) +
  `ai_recap_byok_lifetime` (non-consumable); `react-native-purchases`; offerings + paywall;
  purchase/restore; expose `unlimited`/`byok` entitlements.
- **Acceptance:** a sandbox purchase of Unlimited and of BYOK both unlock their entitlements and
  restore correctly.
- **Files:** `apps/mobile/src/features/paywall/*`, `apps/mobile/src/purchases/*`.

### M5-2 · Entitlement webhook → capabilities `[Backend]/[TS]`
- **Goal:** server-truth entitlements + a capability resolver (§18).
- **Depends:** M5-1, M0-5
- **Steps:** Edge Function `/revenuecat/webhook` updates `entitlements`; `GET /entitlements`
  authoritative for hosted features; TS `useCapabilities()` resolves owned entitlements →
  `{maxRecordingMinutes, maxRecapsPerDay, hostedTranscription, hostedLLM, byokEnabled, export, ...}`.
- **Acceptance:** hosted recap generation is refused server-side without an active entitlement even if
  the client is tampered.
- **Files:** `supabase/functions/revenuecat/*`, `apps/mobile/src/purchases/capabilities.ts`.

### M5-3 · Free-plan enforcement `[TS]/[Backend]`
- **Goal:** 15-min cap + 5 recaps/day (Product Plan §21/§22).
- **Depends:** M5-2, M1-8
- **Steps:** recording timer warns 13:00, strong-warns 14:00, **auto-stops 15:00 but saves +
  processes**; `/quota/consume` atomically enforces 5/day server-side; show "3 of 5 used today."
- **Acceptance:** the 16th minute is impossible on Free yet the recording is saved; the 6th recap is
  blocked with a clear paywall; audio is never deleted at a limit.
- **Files:** `apps/mobile/src/features/recorder-ui/limits.ts`, `supabase/functions/quota/*`.

### M5-4 · BYOK guided setup (OpenRouter) `[TS]`
- **Goal:** non-technical OpenRouter onboarding + model pickers (Product Plan §8/§36).
- **Depends:** M3-1, M5-2
- **Steps:** short explainer + link to create a key; single key field → store in `expo-secure-store`;
  **Test connection** (validate via `/models`) with clear success/error; Summary/Chat model pickers
  from the live model list; advanced settings after success (temperature, max output, system prompt).
- **Acceptance:** pasting a valid key passes the test and populates the model picker; an invalid key
  shows a helpful error; the key is never sent to our backend.
- **Files:** `apps/mobile/src/features/settings/byok/*`.

### M5-5 · Usage accounting `[TS]/[Backend]`
- **Goal:** local `usageRecords` + server `usage_events` for unit economics (§23).
- **Depends:** M2-1, M3-2
- **Steps:** record recording/transcription seconds + in/out tokens + model/provider + est.
  micro-EUR per job; sync to `usage_events`; a simple internal debug view.
- **Acceptance:** a full record→transcribe→recap cycle writes coherent local + server usage rows.
- **Files:** `apps/mobile/src/usage/*`, `supabase/functions/usage/*`.

---

# M6 — iOS-native polish

> Arch §19. Live Activity/Dynamic Island (iOS) + formatted sharing.

### M6-1 · Live Activity + Dynamic Island (recording) `[iOS]` **(needs cloud-Mac debugging)**
- **Goal:** always-visible recording state with Pause/Finish (Product Plan §17).
- **Depends:** M1-8
- **Steps:** add a Widget Extension via config plugin; `RecordingActivityAttributes` + `ContentState`
  (§ arch 16); `Text(timerInterval:)` live timer, state pushed only on pause/resume/finish;
  Pause/Finish as `LiveActivityIntent` calling the recorder in-process; compact/minimal/expanded +
  lock-screen views; `live-status` module methods `start/update/end`.
- **Acceptance:** recording shows a live timer on the Lock Screen and Dynamic Island; Pause/Finish
  from the island control the recorder without opening the app.
- **Files:** `modules/live-status/ios/*`, widget target, `app.config.ts` plugin.

### M6-2 · Formatted sharing (recap/actions) `[TS]`
- **Goal:** share formatted recap/summary/actions to the system sheet incl. Notes (Product Plan §36A).
- **Depends:** M3-4
- **Steps:** build formatted output preserving headings/lists/checkboxes (RTF/attributed for
  Notes-like targets); share sheet; **exclude audio + full transcript**; a separate explicit
  Save/Export for audio/transcript to Files.
- **Acceptance:** sharing a recap to Notes keeps headings + checkbox action items; audio/transcript are
  not in the normal share.
- **Files:** `apps/mobile/src/features/share/*`.

### M6-3 · Settings surface (Product Plan §36) `[TS]`
- **Goal:** the MVP settings the plan enumerates.
- **Depends:** M5-2, M5-4
- **Steps:** Account/Plan; Recording (audio quality, default language, chunk duration,
  context-before/after, auto-process); AI (summary/chat model, custom instructions — BYOK only);
  Contexts; Storage (keep audio retention, export); Privacy (delete all, export data); OpenRouter
  (key, models, test) shown only to BYOK/preview.
- **Acceptance:** each setting persists and takes effect (e.g., chunk duration changes real chunk
  length; retention deletes audio on schedule).
- **Files:** `apps/mobile/src/features/settings/*`.

---

## Deferred (not in MVP v0.1)

Per Product Plan §27 "Not required," these are **explicitly out** of the first release but designed for:

- **Android native halves** `[AND]`: the recorder (foreground service + `AudioRecord`/`MediaCodec`,
  §7.3), the live-status foreground notification (§19), RevenueCat Play Billing, and Android build/submit.
  **Low incremental cost** because the entire TS layer (M0/M2/M3/M4/M5 logic + UI) already runs on
  Android — this is a fast-follow, not a rebuild.
- Apple Watch / Wear (Product Plan §16, arch §20) — remote control first.
- Semantic/global search across recaps (arch §14 `[PHASE 2]`).
- File types beyond txt/md/pdf; team/workspace features; calendar/CRM; web/Android parity release.

---

## Parallelization & ownership

- **Solo-dev critical path:** M0-1 → M0-2 → M1-1…M1-9 → M2 → M3 → M4 → M5 → M6.
- **Can run in parallel while M1 is in progress:** M0-3/M0-4/M0-5 (foundation), **M2-2 benchmark**
  (longest lead time — start immediately), backend Edge Function stubs (M2-1, M3-2).
- **Gates on external data, start early:** M2-2 (transcription benchmark) blocks provider choice and
  the €19.99 pricing decision (Product Plan §39 #1/#3/#4).

---

## Done = MVP v0.1

The MVP is shippable to TestFlight/App Store when M0–M6 are merged and the Product Plan §27 checklist
(items 1–23) is demonstrably satisfied on a physical iPhone, with the **60-minute locked-recording
test (M1-7) green** and the **transcription provider chosen (M2-2)**.

*Next: after M1 proves out, revisit pricing with M5-5 usage data before locking €19.99.*
