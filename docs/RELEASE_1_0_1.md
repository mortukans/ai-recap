# Release 1.0.1 — checklist

Work accumulates on branch `release/1.0.1`; ship after 1.0 is approved. Version is `1.0.1` in
`apps/mobile/app.config.ts`; the EAS remote build number keeps auto-incrementing.

## In this release (all on `release/1.0.1`, built to TestFlight)
- **Resilient transcription** (commit `9ad5651`): a single bad chunk no longer loses the whole
  recording. Each chunk retries then is skipped; the recap is built from what succeeded, with a
  "part could not be transcribed" note. Fixes the lost 1h40m / 12-min watch recordings.
- **Anonymous crash/error diagnostics** (commit `eed74ab`): JS + render errors → `log-error` →
  `error_events` (EU), no content/keys. Calm ErrorBoundary recovery screen. Verified live.
- **English + generic App Store screenshots** (`686f879`) — no personal chat data.
- Carries the `main` infra: direct App Store upload from CI (verified working), expanded support page.

## Before submitting 1.0.1 — REQUIRED (M)
- [ ] **App Privacy nutrition labels**: add **Diagnostics → Crash Data**, not linked, not for tracking.
      Adding crash reporting without this is an App Review rejection risk. The privacy policy already
      discloses it (privacy.html §3.a on this branch → live when it merges to `main`).
- [ ] Replace the store screenshots on the version with `design/store-screenshots/**` (English/generic).
- [ ] Support email: fill `[support email]` in `docs/index.html` and `docs/privacy.html`.
- [ ] Ship after 1.0 is approved: merge `release/1.0.1` → `main`, then
      `gh workflow run ios-build.yml -f profile=production -f submit=true` (typecheck + tests are green).

## Done
- [x] Direct-upload fast path enabled and verified (docs/CI_DIRECT_UPLOAD.md); ~2-min upload, no EAS queue.
- [x] `pnpm -r typecheck && pnpm test` green (119 tests).

## Optional / when convenient
- Watch-face complication (branch `feat/watch-complication`): run `eas credentials -p ios` once, merge.
- Suggest to users: a dedicated STT model (chirp-3 / whisper) is more reliable than gemini-2.5-flash-lite.
- Wire `reportHandledError` into a couple of high-value catch sites if the diagnostics show blind spots.

## Not done (deliberately)
- The per-recording model-experiment UI is **kept**, now gated behind a stored OpenRouter key (BYOK).
  It is the STT/model comparison tool; it is not dead code, so it was not removed.
