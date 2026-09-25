# Release 1.0.1 — checklist

Work accumulates on branch `release/1.0.1`; ship after 1.0 is approved. Version is `1.0.1` in
`apps/mobile/app.config.ts`; the EAS remote build number keeps auto-incrementing.

## In this release
- **Anonymous crash/error diagnostics.** Uncaught JS errors and React render errors are reported to
  our EU backend (`log-error` → `error_events`). No recording content, transcripts, keys or personal
  data. A calm ErrorBoundary recovery screen replaces blank crashes. (commit `eed74ab`)
- **English + generic App Store screenshots** already regenerated on `main` (`686f879`); swap them
  into the listing with this version (the 1.0 listing still shows the earlier set).
- Carries everything already on `main`: direct-upload CI, expanded support page.

## Before submitting 1.0.1 — REQUIRED
- [ ] **App Privacy nutrition labels**: add a data type **Diagnostics → Crash Data** (and, if asked,
      *Other Diagnostic Data*), marked **not linked to identity** and **not used for tracking**.
      Adding crash reporting without updating the labels is an App Review rejection risk.
      The privacy policy page already discloses it (privacy.html §3.a, added on this branch → live
      when the branch merges to `main`).
- [ ] Replace the store screenshots on the version with `design/store-screenshots/**` (English/generic).
- [ ] Support email: fill `[support email]` in `docs/index.html` and `docs/privacy.html`.
- [ ] `pnpm -r typecheck && pnpm test`, then trigger the production build from this branch
      (`gh workflow run ios-build.yml --ref release/1.0.1 -f profile=production -f submit=true`).

## Optional / when convenient
- Enable the direct-upload fast path (docs/CI_DIRECT_UPLOAD.md) — removes the ~3 h EAS Submit queue.
- Watch-face complication (branch `feat/watch-complication`): run `eas credentials -p ios` once, merge.
- Wire `reportHandledError` into a couple of high-value catch sites if the diagnostics show blind spots.

## Not done (deliberately)
- The per-recording model-experiment UI is **kept**, now gated behind a stored OpenRouter key (BYOK).
  It is the STT/model comparison tool; it is not dead code, so it was not removed.
