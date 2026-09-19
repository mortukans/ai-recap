# AI Recap — project status

_Last updated: 2026-09-19 02:20 UTC (end of autopilot session). Owner: Martins Mortukans._

## Where we are

**On the phone (TestFlight 0.0.1 (17) — uploaded from commit 56bf2b8, CI run 35434346121. Build 16 was stuck on the splash (bootstrap awaited the processing queue; fixed). Daily cap lifted for testing.)**
- Record → chunked audio → transcribe (Latvian/English via OpenRouter, Apple on-device fallback) → structured AI recap → transcript, speakers, Ask-AI chat, notes-for-AI, search, share/export.
- Live Activity in the Dynamic Island / Lock Screen; phone-call and AirPods interruption handling.
- Apple Watch app: remote control when the phone app is open; records on the watch itself otherwise and hands the audio to the phone.
- Free plan enforced: 15-min recordings, 5 recaps/day (server-verified when online). Paywall with Unlimited + BYOK lifetime (prices appear once Apple's Paid Apps Agreement is active).
- **Free daily cap (5 recaps/day) temporarily LIFTED for testing** (`FREE_CAPABILITIES.maxRecapsPerDay: null`, commit on 2026-09-19) — restore to 5 before public launch.
- Chunk-gap "audio missing" banner, usage accounting (Settings → Usage this month), watch haptics, rough speaker labels.
- New in (14): first-launch onboarding (Free / paste OpenRouter key / see plans); last-used context remembered for new recordings; recap **version history** (switch between regenerated recaps); transcript **tap-to-seek** playback with playhead follow; rename a recap by tapping its title; duplicate any context as a custom template; Settings → About shows version (build) + anonymous account id; hosted AI fair-use caps; no more synthesized demo transcripts; **Live Activity Pause/Resume + Finish buttons** on the Lock Screen banner and expanded Dynamic Island (expo-widgets LiveActivityIntent → app; iOS 17+); Settings/recap sections fully LV/EN.

**Backend (Supabase, EU/Ireland, project `syjpumaqnlmglrokiujy`)**
- Anonymous auth, `entitlements`/`usage_events`/`daily_quota` tables with RLS, Edge Functions `entitlements`, `quota-consume`, `revenuecat-webhook` — all deployed and smoke-tested.

**Purchases**
- App Store Connect: subscription group "AI Recap Plans"; `lv.airecap.unlimited.monthly` €19.99/mo; `lv.airecap.byok.lifetime` €99.99 (Apple has no €99 tier). All regions, EN localizations. Status "Prepare for Submission" (ships with the next app version review).
- RevenueCat project "AI Recap": App Store app linked (IAP key + shared secret), products, entitlements `unlimited`/`byok`, offering `default` (`$rc_monthly`, `$rc_lifetime`), webhook → Supabase (test event 200).

**Build & release**
- EAS Free plan iOS quota exhausted until 2026-10-01. Builds now run on **GitHub Actions macOS runners** via `eas build --local` (no EAS quota) and upload through EAS Submit: `.github/workflows/ios-build.yml`, repo `github.com/mortukans/ai-recap` (private). ~23 min per build, ≈8 builds/month on the free private-repo allowance.
  - Trigger: `gh workflow run ios-build.yml -f profile=production -f submit=true`
- EAS env vars (all profiles): `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`, `EXPO_PUBLIC_REVENUECAT_IOS_KEY`.

## What to test on TestFlight 0.0.1 (17) (uploaded 2026-09-19; fixes the dead Live Activity buttons, adds auto-naming)

1. Fresh install → onboarding screen appears once (Free / paste key / see plans). Reinstall or delete app data to see it again.
2. Record 1–2 min, lock the phone → Lock Screen banner shows **Pause** and **Finish** buttons (build 14: rendered but dead — listener filtered on the wrong `source`; fixed); tap Pause → island shows paused + "Resume"; tap Finish → recording ends and processes. Expanded Dynamic Island (long-press) shows the same buttons.
3. Recap gets a name automatically: first words spoken right after transcription, then the AI's short title once the recap is generated. Tap the title to rename; regenerate with another context → a "Versions" row appears, chips switch between versions; the context you picked is preselected on the next recording.
4. Transcript: tap a line → audio jumps there and plays; the highlighted line follows playback.
5. Contexts → open "Sales Call" → "Duplicate as custom context" → edit and save; it appears in the recap context chips.
6. Settings: everything in Latvian when the phone is Latvian; About shows version (build) and an Account ID.
7. Watch: still works as before (complication is on a separate branch, not in this build).

## Open items — owner: Martins (account/legal)

1. **Paid Apps Agreement** (App Store Connect → Business → Agreements): confirm Legal Entity → DSA trader compliance → accept agreement → banking + tax forms. _Gates every purchase, including sandbox tests._
2. **Sandbox tester** Apple ID (Users and Access → Sandbox → Testers) and sign in on the iPhone (Settings → App Store → Sandbox Account).
3. After 1–2: buy Unlimited with the sandbox account → Plan row shows "Unlimited", Supabase `entitlements.unlimited_active = true`.
4. **Watch complication credentials** — one interactive `eas credentials -p ios` run on branch `feat/watch-complication` (see engineering list below), ~2 minutes.
5. ~~Latvian IAP localizations~~ — not possible: App Store Connect offers no Latvian for in-app purchase metadata (EN stays; app UI is LV/EN).

## Open items — owner: engineering

- **M2-1 / M3-2 hosted AI path** — BUILT (Edge Functions `transcribe`, `recap-generate`, entitlement-gated, metered). Needs the server secret `OPENROUTER_API_KEY` (`npx supabase secrets set OPENROUTER_API_KEY=sk-or-…`) and an Unlimited entitlement to exercise end to end.
- **M1-7** chunk-gap check BUILT (core `checkRecordingIntegrity`, banner on recap screen). Still to run once by hand: a 60-minute locked-phone recording → expect no "audio missing" banner.
- **M2-2** LV/EN transcription benchmark with real recordings (gates final pricing).
- **M2-5** rough diarization BUILT ("Speaker N" labels from the transcription model, consistent within a chunk; may re-number across chunks — true diarization still needs a dedicated provider).
- **M5-5** usage accounting BUILT (local records → `usage_events` idempotent sync; provider cost captured; Settings → "Usage this month").
- Android: recorder (Kotlin foreground service), Play Billing, build/submit.
- Watch: haptics BUILT.
- Before public launch: re-check Free caps, IAP review screenshots, privacy labels — draft answers + review notes in `docs/APP_REVIEW_NOTES.md`.
- Onboarding BUILT (M5-4).
- **Watch-face complication** BUILT on branch `feat/watch-complication` (tap on the watch face → watch app opens and starts recording; `targets/watch-widget`, bundle `lv.airecap.app.watchkitapp.recordwidget`, already registered with Apple by CI). Blocked on a **one-time interactive credentials step** (EAS refuses to create a new provisioning profile non-interactively): Martins runs, on that branch, `cd apps/mobile && eas credentials -p ios` → production → set up a provisioning profile for target `AIRecapWatchWidget` (or just `eas build --profile production --platform ios` and cancel once credentials are stored). Then merge the branch and run the CI build. Not on main so TestFlight builds keep working.

## Reference

- Setup runbook: `docs/BACKEND_SETUP.md` · App Review prep: `docs/APP_REVIEW_NOTES.md` · Tasks: `docs/AI_RECAP_MVP_TASKS.md` · Architecture: `docs/AI_RECAP_TECHNICAL_ARCHITECTURE.md`
- App Store Connect app id `6813450802` · RevenueCat project `19269c38` · EAS project `77676bfa-…`
