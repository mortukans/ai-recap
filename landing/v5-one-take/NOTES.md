# v5 — One take

**Concept:** the page is one 38-minute recording and your scroll is the playhead — sound becomes words, words become a recap, dates land on a calendar, and the page ends with a recap of itself whose only task is "Download AI Recap".

- Hero: live 2D-canvas waveform flowing through the red record button. Pressing it plays a scripted demo by driving the scroll (any wheel / touch / key takes over). No microphone, no network calls except Google Fonts; no JS libraries.
- "The take" (desktop ≥1000×640): pinned stage scrubbed by scroll — transcript words resolve out of waveform bars (mixed LV+EN, same in both UI languages on purpose), phrases get marked, recap items and calendar dots appear. Phones, short windows and `prefers-reduced-motion` get a stacked, non-pinned path (animates once on view; static with reduced motion).
- Left "tape" (≥1100 px) = the whole page as a waveform with chapter timecodes, click to seek; header timer follows scroll. Phones get a thin progress line instead.
- Real: all product facts, prices, links, LV wording (from `lv.ts` / store listing). Placeholder/fictional: the meeting (Anna, Speaker 2, Q4 roadmap — from `SUBST`), chapter timecodes, the CSS-drawn Lock Screen / watch, the text-only App Store badge.
- Debug hooks: `?lang=lv|en`, `?theme=light|dark`, `?p=0..1` (page scroll), `?stage=0..1` (inside the take), `?flat=1` (force stacked path). `p/stage/flat` freeze transitions for screenshots.
- `_shots/frame.html` only exists to frame the page for plain headless-Chrome captures (it cannot go below 500 px wide); the screenshots here were taken with Playwright driving system Chrome.
- Known gaps: autoplay and scrubbing were checked in headless Chrome only, not on a real iPhone/Safari; no OG image/favicon; the app icon has four bars (the brief says five) — the logo here follows the icon.
