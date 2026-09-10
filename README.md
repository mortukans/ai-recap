# AI Recap

> Record once. Understand the meeting in as many ways as you need.

An iPhone-first (cross-platform) meeting & conversation recorder that turns long audio into a reusable
AI workspace: record → chunked local audio → transcribe (Latvian + English) → structured recap →
ask questions / regenerate with new context.

**Platform strategy:** built on **Expo / React Native / TypeScript** so it can be developed on
Windows/Linux. Ships **iOS-first** (via EAS cloud builds — no local Mac needed), with Android as a
fast-follow that reuses the entire TypeScript layer.

## Documentation

- [`docs/AI_RECAP_TECHNICAL_ARCHITECTURE.md`](docs/AI_RECAP_TECHNICAL_ARCHITECTURE.md) — v0.2, the system design.
- [`docs/AI_RECAP_MVP_TASKS.md`](docs/AI_RECAP_MVP_TASKS.md) — the ordered MVP task breakdown.
- [`docs/BUILD.md`](docs/BUILD.md) — how to build/run from Windows (EAS, dev client, device).

## Monorepo layout

```
apps/mobile        Expo app (screens, DB, AI, processing) — the shippable client
packages/core      Pure-TS domain: models, enums, processing state machine, recap schema
packages/prompts   Versioned prompt components + built-in presets
packages/ui        Design tokens, shared components, LV/EN i18n
modules/recorder   Custom native module: chunked background recorder (iOS Swift / Android Kotlin)
modules/live-status Live Activity (iOS) / foreground-service notification (Android)
supabase/          Postgres migrations (RLS) + Edge Functions (service plane)
```

## Getting started (developer)

```bash
pnpm install
pnpm --filter mobile start   # Metro; open in the dev client on a physical device
```

You need a **development build** (custom dev client), not Expo Go, because the app ships custom native
modules. See [`docs/BUILD.md`](docs/BUILD.md).

## Status

Early scaffolding — see `docs/AI_RECAP_MVP_TASKS.md` for the milestone the code is currently at.
