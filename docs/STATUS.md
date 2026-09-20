# AI Recap — project status

_Last updated: 2026-09-19 02:20 UTC (end of autopilot session). Owner: Martins Mortukans._

## Where we are

**On the phone (TestFlight 0.0.1 (21) — uploaded 2026-09-21 21:33 UTC, CI run 35537523282: redesign, build-18 fixes, live waveform, and rich-text share to Apple Notes. Daily cap lifted for testing.)**
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

## What to test on TestFlight 0.0.1 (21)

1. Light and dark appearance: porcelain/ink palette, Newsreader titles, Hanken Grotesk text, brand icon and splash.
2. Floating tab bar with the red record button; pulse ring while idle. Tap it → recording screen with halo, live waveform, context chip (tap to switch context mid-recording).
3. Ieraksti: grouped by Šodien / Vakar / date; a processing recording shows as a card with animated bars and a progress line.
4. Detail: tap title to rename; player card with waveform scrubber (tap to seek); segmented Kopsavilkums / Transkripts / Jautāt AI; tasks tick off with the amber check; "Pārģenerēt ar piezīmēm" pill opens the notes sheet.
5. Transcript: two-column, speaker colours, tap a line → plays from there with the highlighted utterance; floating player at the bottom; search highlights.
6. Konteksti and the new-context form (structured vocabulary list, amber callout). Iestatījumi: dark plan card, grouped rows, key sheet, usage tiles, retention segmented control.
7. Build-19 fixes: a new recording gets the AI title (not the first sentence) once the recap is generated; a voice note listing four to-dos yields four Uzdevumi; Share → Notes keeps headings/lists/checkboxes; in the "Pārģenerēt ar piezīmēm" sheet the context chip opens the picker and the sheet returns afterwards.
8. Live waveform: on the recording screen the bars move with your voice (newest sample in the middle) and the amber halo swells as you speak; the watch shows the same from its own mic, or mirrored from the phone when it remote-controls.
9. Watch: black home with breathing Ierakstīt and the last-recording card; recording screen with serif timer + waveform; Saglabāts check after finishing (auto-dismisses after 4 s).

## Previous checklist (TestFlight 0.0.1 (17)) (uploaded 2026-09-19; fixes the dead Live Activity buttons, adds auto-naming)

1. Fresh install → onboarding screen appears once (Free / paste key / see plans). Reinstall or delete app data to see it again.
2. Record 1–2 min, lock the phone → Lock Screen banner shows **Pause** and **Finish** buttons (build 14: rendered but dead — listener filtered on the wrong `source`; fixed); tap Pause → island shows paused + "Resume"; tap Finish → recording ends and processes. Expanded Dynamic Island (long-press) shows the same buttons.
3. Recap gets a name automatically: first words spoken right after transcription, then the AI's short title once the recap is generated. Tap the title to rename; regenerate with another context → a "Versions" row appears, chips switch between versions; the context you picked is preselected on the next recording.
4. Transcript: tap a line → audio jumps there and plays; the highlighted line follows playback.
5. Contexts → open "Sales Call" → "Duplicate as custom context" → edit and save; it appears in the recap context chips.
6. Settings: everything in Latvian when the phone is Latvian; About shows version (build) and an Account ID.
7. Watch: still works as before (complication is on a separate branch, not in this build).

## Design system (2026-09-20)

The visual redesign from `design/ai-recap-design-handoff/HANDOFF.md` is implemented for iPhone (React Native) and Apple Watch (SwiftUI):
- Tokens in `apps/mobile/src/design/tokens.ts` (light default, dark scheme), Newsreader + Hanken Grotesk via `@expo-google-fonts`, line icons in `design/icons.tsx`, UI kit in `design/components.tsx` (Card, Row, Input, Segmented, Chip, Button, Rise motion, waveform, processing bars), floating tab bar with the record button, Lottie files under `assets/lottie/` (lottie-react-native).
- Screens: Ieraksti (grouped by day, processing cards), Ieraksta (halo, live waveform, context chip), Detail (player card, segmented Kopsavilkums/Transkripts/Jautāt AI, tasks as checkboxes, "Pārģenerēt ar piezīmēm" sheet), Transkripts (two-column, playing highlight, floating player), Konteksti, Jauns konteksts (structured vocabulary), Iestatījumi (plan card, grouped rows, usage tiles, retention segmented). Legacy screens (paywall, chat, speakers, onboarding) use the new palette via the `Colors` shim.
- Watch: Sākums (breathing Ierakstīt, last-recording card fed by `setWatchLastRecap`), Ieraksta (serif timer, waveform, Pauzēt/Pabeigt), Saglabāts (check pop, auto-dismiss 4 s).
- Brand icon/splash regenerated from the SVG mark (dark gradient tile; light/dark splash). Live Activity recoloured to amber/ink.
- Not yet: real mic levels for the waveform (Lottie/placeholder bars instead), Dynamic Type mapping for custom fonts, a redesigned paywall/chat/speakers layout (palette only).

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
