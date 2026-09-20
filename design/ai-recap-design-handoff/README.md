# AI Recap — Design handoff for implementation

This package is the complete visual redesign of **AI Recap** (iOS + watchOS voice-recording app: record → transcribe → AI summary).
It is written for an AI coding agent working in the existing Swift/SwiftUI codebase. Do not change app functionality; re-skin and re-structure the UI to match these specs.

Live references (open in a browser, both editable):
- Design canvas (all screens, both themes): https://claude.ai/artifact/DoMHCtvD34JYwhK6PuDVdW
- Lottie animations playing on the real player: https://claude.ai/artifact/Rg6XdaejqwCUmQFJL2BcEx

## 1. What's in this folder

```
HANDOFF.md                     ← this brief (read fully first)
design-canvas/
  canvas.json                  ← board layout; page "dark" = v1, page "light" = v2
  *.dc.html                    ← one self-contained HTML mock per screen (exact px, colors, copy)
  *L.dc.html                   ← same screen, LIGHT theme + motion (the "L" suffix)
  Main.dc.html / BrandL.dc.html← brand boards: logo, icon, palette, type, motion rules
lottie/
  *.json                       ← 6 Lottie (bodymovin) files, ready for lottie-ios
  preview-page.html            ← plays them with lottie-web; also lists placement
  preview-frames/*.png         ← rendered frames, for reference
  generate-lottie.py           ← source generator (python) if you need to re-tune colors/timing
```

How to read a mock: open any `.dc.html` in a browser. Every element's style is inline, so the exact font size, weight, color, radius, padding and gap are right there. Screens are 390×844 (iPhone points) and 416×496 (Watch at 2× — halve every number for watchOS points). The mocks intentionally omit the status bar; iOS draws it.

**Ship the LIGHT theme (v2) as the default appearance and the DARK theme (v1) for `.dark` color scheme.** Both share layout, copy and components — only tokens differ.

## 2. Design tokens

Define these as a `Theme` (Color assets or a struct) and never hard-code hex in views.

| Token | Light (v2) | Dark (v1) | Use |
|---|---|---|---|
| `bg` | `#F4F5F7` | `#15171B` | screen background |
| `surface` | `#FFFFFF` | `#1D2025` | cards, inputs, tab bar |
| `surface2` | `#EAECF0` | `#262A30` | segmented-control track, chips |
| `line` | `#E1E4E9` | `#2E333A` | hairlines, card borders (1 pt) |
| `text` | `#16181D` | `#F1EDE6` | primary text |
| `text2` | `#656A73` | `#A6A29B` | secondary text |
| `text3` | `#8A8F98` | `#86827B` | placeholders, disabled chevrons |
| `accent` | `#E9A24A` | `#E9A24A` | waveform bars, progress, active fills (never as text on light) |
| `accentText` | `#A8661A` | `#E9A24A` | amber used as text/icon (contrast-safe) |
| `accentTint` | `#FBEFDC` | `#2A2418` | context chip background |
| `onAccent` | `#1A1408` | `#1A1408` | text/icon on an amber fill |
| `record` | `#E0432F` | `#F2543F` | record button, live dot, "Ieraksta" label — recording ONLY |
| `primaryBtn` | `#16181D` | `#F1EDE6` | filled primary button background |
| `onPrimaryBtn` | `#FFFFFF` | `#15171B` | filled primary button label |
| `speaker2` | `#3A6E9A` | `#8FB7D6` | second speaker label in transcript |
| `success` | `#2E7D4F` | `#7FBF8E` | "Savienots" |
| `destructive` | `#C4372A` | `#F2543F` | delete action text |

Watch: background is always pure `#000000` (OLED); use dark tokens otherwise.

Shadows (light theme only, dark uses none except tab bar): cards `0 8 24 rgba(22,24,29,.06)`; floating tab bar `0 12 32 rgba(22,24,29,.12)`; record button `0 12 32 rgba(224,67,47,.30)`.

## 3. Typography

Two families, both free (Google Fonts, SIL OFL). Bundle the fonts in the app and register them in Info.plist.

- **Newsreader** (variable; use weights 300 / 400 / 500) — display only: screen titles, the big timer, wordmark, plan name, hero numbers.
- **Hanken Grotesk** (400 / 500 / 600) — everything else.

Scale (points):

| Role | Font | Size / weight | Where |
|---|---|---|---|
| Screen title | Newsreader 500 | 40, line-height 1.0, tracking −0.02em | "Ieraksti", "Konteksti", "Iestatījumi" |
| Detail title | Newsreader 500 | 30, lh 1.12 | recording title on detail screen |
| Timer | Newsreader 300 | 104 (phone) / 54 (watch pts), tabular numbers | recording screen |
| Summary lead | Newsreader 400 | 20, lh 1.4 | first paragraph of summary |
| Hero number | Newsreader 400 | 24–30 | "4 min", "Unlimited", usage tiles |
| Body | Hanken 500 | 17, lh 1.3 | list titles |
| Body text | Hanken 400 | 15–16, lh 1.45–1.5 | summary bullets, transcript |
| Meta | Hanken 400/600 | 13 | durations, context name, times |
| Caption | Hanken 400 | 12 | tile labels, chips |
| Section label | Hanken 600 | 13, color `text2` | "Šodien", "Lēmumi", "Uzdevumi" |
| Tab label | Hanken 500/600 | 11 | tab bar |

Support Dynamic Type: map these to `.custom(_, size:, relativeTo:)`.

## 4. Components

**Floating tab bar** (replaces the standard one). A 64-pt tall pill (`surface`, 1-pt `line` border, radius 32, 6-pt inner padding) holding three tabs — Ieraksti / Konteksti / Iestatījumi — plus, to its right with a 12-pt gap, a separate 64-pt round **record button** (`record` fill, white mic glyph). Active tab: pill highlight (`primaryBtn` in light, `surface2` in dark), icon in `accent`. Inset 16 pt from sides, 30 pt from bottom. Content scrolls beneath it with a bottom gradient fade.

**Cards**: `surface`, 1-pt `line`, radius 18, padding 16.
**List rows** (non-card): 14-pt vertical padding, 1-pt `line` divider, no background.
**Inputs**: height 50, radius 14, `surface`, 1-pt `line`; focused border 1.5-pt `accent`.
**Segmented control**: 40 tall, 3-pt padding, radius 12, track `surface2`; selected segment `surface` (light) / `line` (dark) with radius 9 and, on light, `0 2 6 rgba(22,24,29,.10)` shadow. Used for Kopsavilkums / Transkripts / Jautāt AI and for audio retention 7 d. / 30 d. / 90 d. / Vienmēr.
**Context chip**: `accentTint` background, `accentText` label, 600 weight, 12–13 pt, radius 12–20.
**Primary button**: 64 tall (recording) or 40–48 (nav), radius = height/2, `primaryBtn`/`onPrimaryBtn`.
**Secondary button**: same shape, `surface` + 1-pt `line`, `text`.
**Live indicator**: 8-pt dot in `record` + "Ieraksta" 13 pt 600 in `record`; dot pulses opacity 1 → .3, 1.6 s.
**Waveform**: bars 3–4 pt wide, radius 2, 3–4 pt gap; played portion `accent`, unplayed `#D5D9E0` (light) / `#3A3F47` (dark).
**Icons**: 22 pt, 1.8-pt stroke, round caps/joins (SF Symbols equivalents are fine: mic, rectangle.stack, slider.horizontal.3, magnifyingglass, chevron, square.and.arrow.up, ellipsis, play.fill, pause.fill, stop.fill, arrow.clockwise).

## 5. Screens (iPhone)

Copy is Latvian and must stay as written in the mocks. File names refer to `design-canvas/`.

### 5.1 Ieraksti — `HomeL.dc.html`
- Header: small date line (`text2`, 13) over title "Ieraksti" (40). Right-aligned: minutes recorded this month in Newsreader 24 `accentText` + caption "ierakstīts šomēnes".
- Search field (46 tall) "Meklēt ierakstos un kopsavilkumos".
- Sections grouped by day: "Šodien", "Vakar", then dates.
- A recording that is still processing renders as a **card** with: status line (3 tiny animated bars + "Transkribē · 38%" in `accentText`), title, 3-pt progress bar (`accent` on `line`), meta (duration 600 + context name).
- Finished recordings render as plain rows: title (17/500, max 2 lines), meta row: duration (600, `text`), context name, time right-aligned.
- Remove the old top "Sākt ierakstu" button; recording starts from the tab-bar record button.
- Tap row → Detail. Motion: rows rise in (10 pt, 0.5 s, 60 ms stagger) on first appear only.

### 5.2 Ieraksta (recording) — `RecordingL.dc.html`
- Top row: live indicator left; context picker chip right ("Work Meeting ▾") — user can change context while recording.
- Center: timer 104 pt tabular; caption "no 15 min · audio tiek saglabāts nepārtraukti".
- Live waveform (350 × 120) driven by the real mic level; until levels arrive, play `waveform-live.json`.
- Under it: "4 fragmenti nosūtīti · LV + EN" (fragments sent count, language).
- Soft amber halo behind the timer: `halo-breathe.json` at 12 % opacity (or a radial gradient).
- Bottom: **Pauzēt** (secondary, flex 1) and **Pabeigt** (primary, flex 1.4), 64 tall, 12 gap, 34 from bottom.
- Keep screen awake while recording.

### 5.3 Detail / Kopsavilkums — `DetailL.dc.html`
- Nav: back chevron left; share (`square.and.arrow.up`) and more (`ellipsis`) right. The old "Eksportēt (.md)" link becomes the share action; "Pārģenerēt" moves to a floating pill at the bottom.
- Title 30 pt, then meta: duration · date/time · speaker count, and the context chip right-aligned.
- Player card: 44-pt play button (`primaryBtn`), waveform scrubber with played/unplayed colors, times row (current 600, "1×", total).
- Segmented control: Kopsavilkums | Transkripts | Jautāt AI. This replaces the three separate buttons (Transkripts / Jautāt AI / Runātāji). Runātāji (speaker rename) moves into the Transcript tab.
- Summary body: lead paragraph (Newsreader 20), then sections with 13-pt labels: **Lēmumi** (bullet = 6-pt amber dot) and **Uzdevumi** (checkbox cards, 12/14 padding, radius 14; sub-line "owner · due" in 12 `text2`). Completed task: amber disc with drawn check, strikethrough title.
- "Piezīmes AI" (notes for AI) is no longer a permanent textarea; it lives behind the bottom pill **"Pārģenerēt ar piezīmēm"** which opens a sheet with the notes field and a Regenerate action.
- Motion: sections rise in sequence (80 ms apart); completed checkbox plays `check-draw.json` once.

### 5.4 Transkripts — `TranscriptL.dc.html`
- Same nav; compact title (15/600, truncated) centered.
- Segmented control with Transkripts selected.
- Row: search field "Meklēt transkriptā" + **Runātāji** button (two overlapping speaker dots) → speaker rename sheet.
- Transcript as a two-column list: 44-pt timestamp column (12, tabular) and text; speaker name 12/600 above each utterance, colored `accentText` (speaker 1) / `speaker2`.
- The utterance currently playing gets an `accentTint` background (breathes to `#F6E2C0`, 2.4 s) and a 3-bar equalizer under its timestamp. Search hits highlight with `#F3D9A6` (light) / `#3A2E17` (dark).
- Bottom floating player: 48-pt play/pause + 3-pt progress + times, on a gradient fade.

### 5.5 Konteksti — `ContextsL.dc.html`
- Header: caption "Kā AI raksta kopsavilkumu" over title; 44-pt round **+** button (`primaryBtn`) right.
- Section **Mani**: user contexts as cards showing name (18/600), description, and vocabulary terms as chips (`surface2`, 12/600) + "+ norādījumi" if instructions exist.
- Section **Iebūvētie**: rows with a 40-pt icon tile (`accentTint` bg, `accentText` icon), name 17/500, description 13 `text2`, chevron. Order: Work Meeting, Sales Call, Personal Voice Note, Interview, Lecture. Descriptions in Latvian as in the mock (the old English strings are replaced).

### 5.6 Jauns konteksts — `NewContextL.dc.html`
- Nav: "‹ Atcelt" left (text, `text2`), **Saglabāt** pill right (40 tall, `primaryBtn`), disabled until name is non-empty.
- Title 34 pt + helper paragraph.
- Fields with 13/600 labels: **Nosaukums**; **Kādām sanāksmēm tas paredzēts**; **Vārdnīca** (right-aligned hint "viens termins rindā") rendered as a structured list — each saved line shows `Term` (600, `accentText`, min-width 56) + explanation (`text2`), with an empty input row at the bottom; **Kā rakstīt kopsavilkumu** textarea (4 rows).
- Info callout (`accentTint`, radius 14, info icon) explaining the vocabulary also helps transcription.
- Storage format is unchanged: vocabulary is still "Term = explanation" per line; only the presentation changes.

### 5.7 Iestatījumi — `SettingsL.dc.html` (1280 tall = full scroll)
- Title, then **plan card**: dark card (`#16181D`) in both themes, "Plāns" caption, plan name in Newsreader 30 `accent`, logo mark right (animate with `logo-mark.json`), two stat tiles (max. ieraksta ilgums; kopsavilkumi dienā = "Bez limita" for ∞). Subtle sheen sweep every 3.4 s (optional).
- **AI modeļi · OpenRouter** group card: "Sava atslēga" row (Keychain, masked, green "Savienots" with check when test passes), "Kopsavilkums" model row, "Transkripcija" model row (each shows model id in `text2` and opens the picker), "OpenAI Whisper" optional row with "Pievienot" in `accentText`. The old "Pārbaudīt savienojumu" and "Noņemt atslēgu" actions live inside the key row's detail sheet.
- **Ierakstīšana** group: Valoda, Fragmenta ilgums, Audio kvalitāte — value + chevron on the right.
- **Lietojums šomēnes**: three tiles (min ierakstīts; AI tokeni; cost in € with `accentText`).
- **Krātuve un privātums** card: "Audio šajā ierīcē" + size; helper text; segmented control 7 d. / 30 d. / 90 d. / Vienmēr.
- Destructive text button "Dzēst visus ierakstus, transkriptus un kopsavilkumus" (`destructive`), confirm with an alert.

## 6. Apple Watch — `WatchHomeL / WatchRecordingL / WatchSavedL.dc.html`
Numbers in the mocks are 2×; halve for points. Background `#000`.
- **Sākums**: header with 14-pt logo mark + "Recap" (Newsreader 17); big red **Ierakstīt** button (72 pt tall, radius 20, white dot + label 18/600) that breathes scale 1 → 1.03 over 3 s; below, a `#1D2025` card with "Pēdējais · time", last title (1 line), and status ("Transkribē · 38%" with 3 animated bars in `accent`).
- **Ieraksta**: "● Ieraksta" (11/600 `record`) top; timer Newsreader 300 54 pt; 24-bar waveform (3 pt bars, 3 pt gap) from the mic level or `waveform-live.json`; bottom row **Pauzēt** (icon only, `#262A30`, 48 tall, flex 1) and **Pabeigt** (bone `#F1EDE6` fill, `#15171B` label 15/600, flex 1.5). Start/stop must also work from the Digital Crown action button if available.
- **Saglabāts**: 48-pt amber disc pops in (0.55 s spring) with drawn check (`check-draw.json`), "Saglabāts" Newsreader 20, "duration · context" 12 `text2`, line "Kopsavilkums parādīsies iPhone" with phone glyph, **Gatavs** button (`#262A30`, 44 tall). Auto-dismiss to Sākums after 4 s or on tap.
- Watch → iPhone transfer: audio and metadata handed off via WatchConnectivity; summary generated on iPhone (unchanged behavior).

## 7. Motion

Respect `accessibilityReduceMotion`: skip entrance/loop animations, show final state.

| Name | Where | Spec |
|---|---|---|
| Rise | list rows, summary sections, form fields | opacity 0→1, translateY 10→0, 0.5 s, `cubic-bezier(.2,.7,.2,1)`, 60–80 ms stagger, first appearance only |
| Pulse ring | record button in tab bar (idle) | ring scale 1→1.6, opacity .45→0, 2.2 s loop (`record-pulse.json`) |
| Live dot | "Ieraksta" indicator | opacity 1→.3→1, 1.6 s |
| Waveform | recording screen, processing rows, Watch | bars scaleY .25↔1, 1.1 s, per-bar phase offset |
| Halo | behind timer | scale .88↔1, opacity 30–80 %, 3 s |
| Shimmer | processing progress bar | gradient sweep 1.6 s linear |
| Check draw | task done, Watch saved | disc scale .6→1.1→1 (0.35 s) then stroke trims 0→100 % over 0.5 s |
| Segmented change | tabs | 0.25 s spring, selected pill slides |
| Sheen | plan card | 60-pt highlight sweeps across every 3.4 s (optional) |

Prefer native SwiftUI animation for Rise, Live dot, Segmented change and the real audio waveform. Use the Lottie files where a canned loop is fine.

## 8. Lottie files (`lottie/`)

Add `lottie-ios` via SwiftPM. Put the `.json` files in the app bundle (folder reference, not Assets.xcassets).

| File | Size | Duration | Loop | Placement |
|---|---|---|---|---|
| `logo-mark.json` | 200×200 | 2 s | yes | splash / launch, Settings plan card, Watch header |
| `record-pulse.json` | 200×200 | 1.2 s | yes | idle record button (tab bar + Watch Ierakstīt) |
| `waveform-live.json` | 400×120 | 1.5 s | yes | recording screen until real levels arrive |
| `check-draw.json` | 200×200 | 1.2 s | **once** | task completed, Watch Saglabāts |
| `processing-bars.json` | 60×40 | 1 s | yes | "Transkribē" rows, Watch last-recording card |
| `halo-breathe.json` | 400×400 | 3 s | yes | background behind the timer, at 12 % opacity |

```swift
LottieView(animation: .named("record-pulse")).looping()
LottieView(animation: .named("check-draw"))
    .playing(.fromProgress(0, toProgress: 1, loopMode: .playOnce))
```
Colors inside the files: amber `#E9A24A`, red `#E0432F`, check stroke `#1A1408`, mic glyph white. Override with `ValueProvider` if a theme ever needs it, or edit the `"c"` arrays and re-run `generate-lottie.py`.

## 9. Brand assets

- **Logo mark**: four vertical rounded bars (heights 22/40/52/30 on a 64 grid at x = 8/19/30/41, width 6, radius 3, amber) and a 3.5-radius red dot at (55, 47). Concept: sound becoming a sentence; the dot is the record dot. The exact SVG is in `Main.dc.html` / `BrandL.dc.html`.
- **App icon**: mark centered on `#15171B`→`#22262C` gradient with 1-pt `#2E333A` border (dark) or on white; export 1024×1024 without the rounded corners (iOS masks). Alternative monochrome: mark in `#1A1408` on amber.
- **Wordmark**: "AI Recap" in Newsreader 500, tracking −0.02em. Watch uses just "Recap".

## 10. Order of work (suggested)

1. Tokens + fonts + `Theme` environment; verify light/dark switching.
2. Components: floating tab bar with record button, card, row, input, segmented control, chip, buttons.
3. Screens in this order: Ieraksti → Ieraksta → Detail → Transcript → Konteksti → Jauns konteksts → Iestatījumi.
4. Watch: Sākums → Ieraksta → Saglabāts.
5. Lottie integration and native motion; Reduce Motion pass.
6. Accessibility: Dynamic Type, VoiceOver labels for icon-only buttons (Sākt ierakstu, Pauzēt, Atskaņot, Atpakaļ, Eksportēt), 44-pt hit targets.

Definition of done: every screen visually matches its `*L.dc.html` mock within a few points, dark mode matches the non-L mock, all existing features still work, and no hard-coded colors remain outside `Theme`.
