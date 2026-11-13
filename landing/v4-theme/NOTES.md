# v4 — premium app/startup theme layout

- Concept: the complete, conversion-oriented app page (Sceon genre) in AI Recap's own brand — sticky nav + download, hero with tilted phones on organic blobs, facts row, four alternating feature blocks, icon grid, 3 steps, privacy, screenshot carousel, pricing, FAQ, closing band, footer.
- Files: `index.html`, `assets/styles.css`, `assets/app.js` (vanilla, no libraries), 8 downscaled store screenshots (webp, ~250 KB total), `assets/icon-180.png`. `shoot.sh` + `_shots/` (screenshots, `frame.html` iframe harness for true 390 px renders) are verification only. Whole folder ~1.8 MB; the page itself ships ~0.4 MB.
- Real: every claim, price and FAQ answer comes from BRIEF.md / `docs/APP_STORE_LISTING.md` / the in-app paywall copy. No testimonials, ratings, user counts or press logos. The "No setup" flag on Unlimited is a description, not a popularity claim.
- Phones and the watch are HTML/CSS rebuilt from the design-canvas mocks on the brand tokens, so they follow light/dark and EN/LV. Sample content is the generic fictional meeting from `make_shots.py` (Anna, Q4 roadmap), with dates moved to November 2026 to agree with the calendar mock; "67 min", topics and the second open question are sample data.
- Placeholder-ish: the carousel uses the English App Store screenshots in both languages (noted under the carousel in LV). The store badge is drawn as text + a generic glyph (no Apple logo).
- Text is filled from the JS dictionary: with JavaScript off only a short noscript line with the App Store link shows.
- Debug hooks: `?lang=lv|en`, `?theme=light|dark`, `?p=0..1` (jump to a scroll fraction, everything revealed), `?static` (no reveal animation), `#features #calendar #how #privacy #screens #pricing #faq #get`.
- Fonts load from Google Fonts; offline the page falls back to Georgia / system sans.
