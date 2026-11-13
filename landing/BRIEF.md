# AI Recap — landing page brief (shared by all 5 variations)

Five agents each build ONE variation in their own folder `landing/v<N>-<slug>/`. Stay inside your folder
(read anything in the repo, write only there). Do not commit, push, deploy, or touch `docs/`.

## Deliverable
- `landing/v<N>-<slug>/index.html` — a **one-page** promo landing page. Static, no build step: opens by
  double-click (`file://`) and works on GitHub Pages. Put extra files in your folder (`assets/`, `ad/`).
- **Two languages, EN + LV**, switchable in the page (toggle in the header; default from
  `navigator.language`, `lv*` → LV, else EN; remember in localStorage inside try/catch; `?lang=lv|en`
  overrides). Every visible string in both languages — including alt text and the `<title>`. Latvian must be
  natural, with correct diacritics (ā č ē ģ ī ķ ļ ņ š ū ž). The app's own LV wording is in
  `apps/mobile/src/i18n/lv.ts`, store copy in `docs/APP_STORE_LISTING.md` — reuse it.
- **Light + dark mode**: follow `prefers-color-scheme`, plus a manual toggle (`?theme=light|dark` overrides).
- Responsive: 360 px phone → 1440 px+ desktop, no horizontal scroll. Honour `prefers-reduced-motion`
  (content must be fully readable with animation off). Scroll effects must not make the page janky.
- `landing/v<N>-<slug>/NOTES.md` — 10 lines max: the concept, what is real vs. placeholder, anything broken.

## The product (facts only — do not invent features, numbers, testimonials, awards or user counts)
AI Recap is an iPhone + Apple Watch app. It records meetings, conversations and voice notes, transcribes them
and writes a structured recap: short summary, decisions, action items with owner and deadline, dates, open
questions. Built for **Latvian and English, even mixed in one sentence**.
- Record with the screen locked; timer + pause/finish in the Dynamic Island and on the Lock Screen.
- Apple Watch: start from the wrist; the watch can record on its own and hand the audio to the phone.
- Transcript with speakers and search; tap a line to hear that moment.
- Contexts: work meeting, sales call, interview, lecture, personal note — or your own with vocabulary + instructions.
- Ask the recording a question; answers cite the moment in the transcript.
- **Calendar (new in 1.1)**: dates mentioned in a recording are found automatically and shown on a calendar
  (month + list views, upcoming and past); add any to Apple Calendar with a reminder.
- Share to Apple Notes / Mail / Notion with formatting intact; export Markdown / txt.
- Private by default: audio, transcripts and recaps stay on the device in an encrypted database. No ads, no tracking.
- Plans: Free (15-min recordings, 5 recaps a day) · Unlimited €19.99/month (no daily limit, 90-min recordings,
  hosted AI) · Bring your own key €99.99 one-time (your OpenRouter key, no daily limit, 90-min recordings).
- CTA: App Store → `https://apps.apple.com/app/id6813450802`. iOS only (no Android, no web app).
- Footer links: privacy `https://mortukans.github.io/ai-recap/privacy.html`, terms `.../terms.html`.

## Brand — must match the app exactly
Fonts (Google Fonts): **Newsreader** (serif, weight 500, letter-spacing -0.02em) for headlines and big numbers;
**Hanken Grotesk** (400/500/600/700) for everything else.

| token | light | dark |
|---|---|---|
| bg | #F4F5F7 | #15171B |
| surface | #FFFFFF | #1D2025 |
| surface2 | #EAECF0 | #262A30 |
| line | #E1E4E9 | #2E333A |
| text | #16181D | #F1EDE6 |
| text2 (muted) | #656A73 | #A6A29B |
| text3 | #8A8F98 | #86827B |
| accent (amber) | #E9A24A | #E9A24A |
| accentText | #A8661A | #E9A24A |
| accentTint | #FBEFDC | #2A2418 |
| record (red) | #E0432F | #F2543F |
| primary button | #16181D on #FFFFFF text | #F1EDE6 with #15171B text |
| blue (speaker 2 / "dates") | #3A6E9A | #8FB7D6 |
| destructive / deadlines | #C4372A | #F2543F |

Feel: calm, editorial, warm amber on cool grey; cards radius 18 px, 1 px line border, soft shadow
(`0 8px 24px rgba(22,24,29,.06)`); pill tab bar; the red round record button is the signature element.
The logo mark is five amber vertical bars (a waveform) with a small red dot — see `apps/mobile/assets/images/icon.png`.

## Assets you can use (copy what you need into your folder; never hot-link into the repo tree)
- App screens as **HTML mocks**, 390×844, light (`*L.dc.html`) and dark: `design/ai-recap-design-handoff/design-canvas/`
  (Home, Recording, Detail = recap, Transcript, Contexts, Settings, Watch*, `CalendarL.dc.html`). They are
  Latvian with sample data; `design/store-screenshots/make_shots.py` shows how they are turned into English
  generic content (`SUBST`) and how their `sc-for` templates are expanded (`EXPAND_JS`). Never show the
  designer's sample names (Capital, Sales7, PIM, Mārtiņš) — use the generic fictional content from `SUBST`.
- Rendered store screenshots (PNG, English): `design/store-screenshots/iphone-6.9/*.png`, `apple-watch/*.png`,
  landscape hero `design/store-screenshots/search-results-calendar-3840x2560.png`. Downscale before shipping
  (keep the page light: aim < 3 MB total).
- App icon: `apps/mobile/assets/images/icon.png`. Current plain landing page for reference: `docs/index.html`.
- Prefer building phone screens in HTML/CSS/SVG (crisp, themeable, animatable) over pasting PNGs.
- No third-party images, stock photos, or trademarks other than the "Download on the App Store" badge
  drawn as plain text/SVG. JS libraries only from cdnjs / jsdelivr / unpkg with a pinned version; vanilla
  JS + CSS is preferred.

## Verify before you report (required)
Render with headless Chrome and LOOK at the result (Read the PNG):
`"C:\Program Files\Google\Chrome\Application\chrome.exe" --headless=new --disable-gpu --hide-scrollbars --window-size=1440,900 --virtual-time-budget=6000 --screenshot=<out.png> "file:///<path>/index.html?lang=lv&theme=dark"`
Check at least: desktop 1440 light EN, desktop dark LV, phone 390×844 light LV, and a mid-scroll state
(give scroll-driven pages a `?p=<0..1>` or `#section` debug hook so they can be captured). Put screenshots in
`landing/v<N>-<slug>/_shots/`. Fix what looks wrong; do not report success on something you did not see render.

## Report back (final message, short)
Path to index.html · the concept in 2 sentences · what you verified (which screenshots) · known gaps ·
anything you could not do. Plain text, no code dumps.
