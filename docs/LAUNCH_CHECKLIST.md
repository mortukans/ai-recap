# Launch checklist — AI Recap 1.0 (iOS)

Ordered. "Me" = engineering (Claude), "M" = Martins. Everything marked Me is done or scripted; M items need accounts, legal or a physical device.

## A. Product decisions (M)
- [ ] Final default models (from the per-recording experiments): transcription ______ , summary ______ . → Me: set `DEFAULT_TRANSCRIPTION_MODEL` / `DEFAULT_SUMMARY_MODEL`, hosted `LLM_TIERS`, remove or hide the experiment UI.
- [ ] Paid recording length: keep 90 min or the plan's 60? → one value in `packages/core/src/capabilities.ts` (`LIMITS.paidMinutes`).
- [ ] Domain for privacy policy + support (e.g. airecap.lv).

## B. Code flips before the release build (Me, 10 minutes once A is decided)
- [ ] `TESTING_MODE = false` in `packages/core/src/capabilities.ts` (restores Free 15 min / 5 per day). Tests adapt automatically.
- [ ] Remove the "AI modeļi šim ierakstam" experiment group from the notes sheet, or gate it behind BYOK.
- [ ] Version `1.0.0` in `apps/mobile/app.config.ts`; build number keeps auto-incrementing.
- [ ] Onboarding / paywall copy already states 15 min / 5 per day — verify once more.
- [ ] `pnpm -r typecheck && pnpm test`, then `gh workflow run ios-build.yml -f profile=production -f submit=true`.

## C. Accounts (M)
- [ ] Paid Apps Agreement signed; banking + tax complete (App Store Connect → Business).
- [ ] Sandbox tester created; one sandbox purchase of Unlimited verified (Settings → Plan shows Unlimited; Supabase `entitlements` row).
- [ ] `npx supabase secrets set OPENROUTER_API_KEY=sk-or-...` so Unlimited users can transcribe.
- [ ] `eas credentials -p ios` once on branch `feat/watch-complication` → Me merges the watch-face complication.

## D. App Store Connect content
- [ ] Listing texts from `docs/APP_STORE_LISTING.md` (LV primary, EN) — M pastes, or Me via the browser session.
- [ ] Screenshots 6.7" + 6.1" (M captures on device following the shot list; Me can frame/caption them).
- [ ] App Privacy questionnaire — answers in `docs/APP_REVIEW_NOTES.md`.
- [ ] Privacy policy hosted at the chosen domain — text in `docs/PRIVACY_POLICY.md` (fill controller + contact).
- [ ] Review notes pasted from `docs/APP_REVIEW_NOTES.md`; IAP review screenshots attached to both products; products attached to version 1.0.0.
- [ ] Age rating, category, support URL, marketing URL.

## E. Verification on the release build (M, ~90 minutes)
- [ ] 60–90 min locked-phone recording with a phone call and an AirPods switch in the middle → exact duration, no "audio missing" banner.
- [ ] Free account: 6th recap of the day is blocked with the paywall alert; 15-minute auto-stop saves the recording.
- [ ] Watch: start from watch with the phone app closed → recording appears on the phone and processes.
- [ ] Live Activity buttons, share to Notes, language switch.

## F. Submit
- [ ] Add build to version 1.0.0, submit for review. Typical review time 24–48 h.
- [ ] After approval: make the repo private again if desired (Actions minutes reset on the 1st; EAS quota also resets).

## Post-launch backlog
- Android (recorder foreground service, Play Billing, build/submit).
- Real speaker diarization provider; transcription benchmark numbers.
- Watch complication in the store build; Dynamic Type mapping for custom fonts.
