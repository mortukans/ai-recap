# v2 — the whole process inside one phone, driven by scroll

- Concept: one iPhone stays pinned while you scroll; its screen plays the real flow (home → record → locked-screen recording → transcript → recap → dates → calendar → Add to Apple Calendar) with a synced caption and a 6-step indicator. Scroll scrubs it both ways.
- Everything is one file (`index.html`): vanilla JS + CSS, no images, no libraries; only Google Fonts are loaded from the network (falls back to Georgia / system sans offline).
- Phone screens are rebuilt in HTML/CSS from the design-canvas mocks (Home, Recording, Detail, Transcript, CalendarL) with brand tokens, so they follow light/dark and EN/LV.
- Real: product facts, prices, links, app wording (from `i18n/lv.ts`, `en.ts`, store listing). Sample meeting content is fictional (the generic "Q4 roadmap review" set; no designer sample names).
- Placeholder / invented UI: the lock screen + Live Activity card, the "important dates" rows and the event sheet with reminder chips are plausible renderings, not pixel copies of the shipped screens (no mock exists for them). "58 min recorded this month", "12 dates" are sample numbers inside the mock phone.
- Debug hooks: `?t=0..7.3` (step float) or `?p=0..1` pins the story at a state; `?rm=1` forces the reduced-motion layout; `?lang=lv|en`, `?theme=light|dark`.
- Reduced motion: the pinned story is replaced by a plain vertical list of six phone screens with captions; all animation and transitions are off.
- `_shots/` holds verification screenshots (`frame.html` is only a helper to render phone-width views in headless Chrome, which cannot go below ~500 px wide).
- Not done: no real device test (verified in headless Chrome only); no Apple Watch mock in the story (Watch appears as a small drawn illustration in the feature cards).
