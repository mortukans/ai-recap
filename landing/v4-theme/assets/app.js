/* AI Recap landing v4 — i18n, themed phone screens, interactions (vanilla JS, no dependencies) */
(function () {
  'use strict';
  var STORE = 'https://apps.apple.com/app/id6813450802';

  var T = {
    en: {
      title: 'AI Recap — Record. Transcribe. Remember.',
      desc: 'AI Recap records meetings, conversations and voice notes, transcribes them and writes a structured recap. Latvian and English, even mixed. iPhone and Apple Watch.',
      n_feat: 'Features', n_how: 'How it works', n_shots: 'Screens', n_price: 'Pricing', n_faq: 'FAQ',
      download: 'Download', a_lang: 'Language', a_theme: 'Switch between light and dark mode', a_menu: 'Menu', a_home: 'AI Recap — to the top',
      st_small: 'Download on the', st_big: 'App Store', a_store: 'Download AI Recap on the App Store',
      pill_tag: 'New in 1.1', pill: 'Calendar for every date you mention',
      h1: 'Record once.<br><em>Remember</em> everything.',
      hero_p: 'AI Recap records your meetings, conversations and voice notes, transcribes them and writes a structured recap — decisions, action items, dates. In Latvian and English, even mixed in one sentence.',
      hero_how: 'See how it works',
      as1: 'iPhone and Apple Watch', as2: 'Free to start', as3: 'No ads, no tracking',
      chip_lang: 'Latvian + English', chip_lang2: 'even mixed',
      f1: 'Latvian and English — even when speakers switch mid-sentence',
      f2: 'per recording with Unlimited or your own key',
      f3: 'ads or trackers. Recordings stay on your device',
      f4: 'to start: 15-minute recordings, 5 recaps a day',
      r1_e: 'Record', r1_h: 'Press record. Put the phone away.',
      r1_p: 'AI Recap keeps recording with the screen locked, and the audio is saved continuously.',
      r1_b1: 'Dynamic Island and Lock Screen', r1_t1: 'The timer lives there, with pause and finish buttons.',
      r1_b2: 'Start from your wrist', r1_t2: 'On Apple Watch a recording starts with one tap. The watch can record on its own and hand the audio to the phone.',
      r1_b3: 'Interruptions handled', r1_t3: 'Calls and headphone changes do not end the recording — it continues.',
      isl: 'Lock Screen',
      r2_e: 'Recap', r2_h: 'Not a wall of text. A recap you can act on.',
      r2_p: 'Every recording becomes a structured document, written for the kind of conversation it was.',
      r2_b1: 'Summary and decisions', r2_t1: 'A short overview first, then what was actually agreed.',
      r2_b2: 'Action items with owner and deadline', r2_t2: 'Tick them off right in the recap.',
      r2_b3: 'Dates and open questions', r2_t3: 'Whatever was left hanging stays visible.',
      share_h: 'Share to',
      r3_e: 'Transcript and Ask AI', r3_h: 'Tap a line. Hear the moment.',
      r3_p: 'The whole conversation, with speakers, search and playback that follows the text.',
      r3_b1: 'Speakers and search', r3_t1: 'Find a word and see who said it.',
      r3_b2: 'Jump to any moment', r3_t2: 'Tap a line and the audio plays from exactly there.',
      r3_b3: 'Ask the recording', r3_t3: '“What did we decide on pricing?” The answer cites the moment in the transcript.',
      ask_q: 'What did we decide on pricing?',
      ask_a: 'Nothing final yet — annual pricing was left open while sales tests the offer. To be confirmed before the next meeting.',
      r4_e: 'Calendar', r4_new: 'New in 1.1', r4_h: 'Every date, caught. On one calendar.',
      r4_p: 'Dates mentioned in your recordings are found automatically and laid out on a calendar.',
      r4_b1: 'Month and list views', r4_t1: 'Upcoming and past, in one place.',
      r4_b2: 'Events, deadlines, dates', r4_t2: 'Each kind has its own colour, so deadlines stand out.',
      r4_b3: 'Add to Apple Calendar', r4_t3: 'Send any date there, with a reminder.',
      cal_b: 'Added to Apple Calendar', cal_s: 'Reminder · 1 day before',
      g_e: 'And more', g_h: 'The details that make it useful every day.',
      g1: 'Contexts', g1t: 'Work meeting, sales call, interview, lecture, personal note — each recap is written for its situation.',
      g2: 'Your own vocabulary', g2t: 'Create a context with project names, client names and acronyms, plus instructions on how to write.',
      g3: 'Regenerate any time', g3t: 'Try a different context or add notes. Every version is kept.',
      g4: 'Share with formatting intact', g4t: 'Headings, lists and checkbox tasks land in Apple Notes, Mail or Notion just as they should.',
      g5: 'Export', g5t: 'Recaps as Markdown, transcripts as plain text.',
      g6: 'Search everything', g6t: 'One search across recordings, transcripts and recaps.',
      h_e: 'How it works', h_h: 'From conversation to recap in three steps.',
      s1: 'Record', s1t: 'On iPhone or Apple Watch. Pick a context if you like.',
      s2: 'Transcribe', s2t: 'Latvian and English are recognised together, with speakers.',
      s3: 'Remember', s3t: 'Read the recap, tick off tasks, ask questions, share it.',
      p_e: 'Privacy', p_h: 'Private by default.',
      p_p: 'Audio, transcripts and recaps are stored only on your device, in an encrypted database.',
      p_link: 'Read the privacy policy',
      p1: 'On your device', p1t: 'Recordings live in an encrypted database on your iPhone.',
      p2: 'No ads, no tracking', p2t: 'The app carries no advertising and no trackers.',
      p3: 'Anonymous to us', p3t: 'Our server sees an anonymous identifier and your plan status — not your content.',
      c_e: 'Screens', c_h: 'Take a look inside.', c_note: 'App Store screenshots.',
      a_prev: 'Previous screenshot', a_next: 'Next screenshot', a_goto: 'Go to screenshot',
      c1: 'Recordings', c2: 'Calendar', c3: 'Recording', c4: 'Recap', c5: 'Transcript', c6: 'Apple Watch', c7: 'Contexts', c8: 'Dark mode',
      c1a: 'AI Recap home screen with the list of recordings', c2a: 'Calendar screen with dates found in recordings', c3a: 'Recording screen with timer and live waveform',
      c4a: 'Recap screen with summary, decisions and tasks', c5a: 'Transcript screen with speakers and search', c6a: 'AI Recap on Apple Watch',
      c7a: 'Contexts screen with built-in and custom contexts', c8a: 'Recap screen in dark mode',
      pr_e: 'Pricing', pr_h: 'Start free. Upgrade when you need more.',
      pl1: 'Free', pl1d: 'For voice notes and short meetings.', pl1c: 'Get the app',
      pl1a: 'Recordings up to 15 minutes', pl1b: '5 recaps a day', pl1e: 'On-device transcription', pl1f: 'No ads, no tracking',
      pl2: 'Unlimited', pl2d: 'Everything handled for you — no API key needed.', pl2c: 'Get Unlimited', pl2flag: 'No setup', per_m: '/ month',
      pl2a: 'Hosted AI transcription and recaps, including Latvian', pl2b: 'Recordings up to 90 minutes', pl2e: 'No daily limit', pl2f: 'Export recaps and transcripts',
      pl3: 'Bring your own key', pl3d: 'Pay once and use your own OpenRouter account.', pl3c: 'Get the app', per_o: 'one-time',
      pl3a: 'Your own OpenRouter key — you pay the provider directly', pl3b: 'Recordings up to 90 minutes', pl3e: 'No daily limit', pl3f: 'Pick the AI models yourself',
      p0: '€0', p19: '€19.99', p99: '€99.99',
      fine: 'Purchases are made inside the app through the App Store. Unlimited renews monthly until cancelled. Prices are set by the App Store for your region.',
      q_e: 'FAQ', q_h: 'Questions, answered.', q_p: 'The short version of what people ask before they install.',
      terms: 'Terms of use', privacy: 'Privacy policy',
      q1: 'Which languages does it understand?',
      a1: 'AI Recap is built for Latvian and English — including conversations where speakers switch between the two mid-sentence. Diacritics stay intact. The app itself is available in Latvian and English too.',
      q2: 'Where are my recordings stored?',
      a2: 'On your device. Audio, transcripts and recaps are kept in an encrypted database on your iPhone. Our server never sees the content — only an anonymous identifier and your plan status. There are no ads and no tracking.',
      q3: 'Can I record with the screen locked?',
      a3: 'Yes. Recording continues with the screen locked, and the timer with pause and finish buttons is shown in the Dynamic Island and on the Lock Screen. Calls and headphone changes are handled automatically.',
      q4: 'How does it work with Apple Watch?',
      a4: 'Start a recording from your wrist. If the iPhone app is not open, the watch records on its own and hands the audio to the phone, where the recap appears.',
      q5: 'What does “Bring your own key” mean?',
      a5: 'It is a one-time purchase (€99.99) for people who have their own OpenRouter account. You paste your API key into the app, pick the AI models yourself and pay the provider directly for what you use. The key stays on your device and is sent only to OpenRouter. If you would rather not set anything up, Unlimited includes the AI.',
      q6: 'What are the limits of the free plan?',
      a6: 'Recordings up to 15 minutes and 5 recaps a day, with transcription on the device. Unlimited and Bring your own key remove the daily limit and extend recordings to 90 minutes.',
      q7: 'Is there an Android or web version?',
      a7: 'No. AI Recap is available for iPhone and Apple Watch only.',
      q8: 'How do I cancel Unlimited?',
      a8: 'The subscription is billed through the App Store and renews automatically unless cancelled at least 24 hours before the end of the period. You manage it in your App Store account, under Subscriptions.',
      b_h: 'Your next meeting, remembered.', b_p: 'Download AI Recap for iPhone and Apple Watch. Free to start.', b_req: 'iPhone · Apple Watch',
      ft_tag: 'Record. Transcribe. Remember. Meeting recaps in Latvian and English.',
      ft_prod: 'Product', ft_legal: 'Legal', ft_get: 'Get the app', ft_store: 'App Store',
      ft_c: '© 2026 AI Recap · Available for iPhone and Apple Watch only.',
      ft_tm: 'Apple, iPhone, Apple Watch and App Store are trademarks of Apple Inc.',
      mb: 'Free on the App Store', mb_get: 'Get',
      // phone screens
      s_date: 'Wednesday, 11 November', s_recs: 'Recordings', s_month: 'recorded this month', s_search: 'Search recordings and recaps',
      s_today: 'Today', s_yday: 'Yesterday', s_trans: 'Transcribing · 38%',
      s_m1: 'Product team: Q4 roadmap review', s_m2: 'Remember to book the venue for the…', s_m3: 'On my shopping list, I need to…',
      s_m4: 'Supplier contract review – terms and deadlines', s_m5: 'Idea: tag recordings automatically from the calendar',
      s_work: 'Work meeting', s_note: 'Personal note', s_sales: 'Sales call',
      t_rec: 'Recordings', t_cal: 'Calendar', t_ctx: 'Contexts', t_set: 'Settings',
      s_meta_t: 'Today 14:32', s_meta_s: '2 speakers', s_sum: 'Summary', s_tr: 'Transcript', s_ask: 'Ask AI',
      s_sumtext: 'The team reviewed the Q4 roadmap and agreed to ship the new onboarding flow by the end of November. Open question — whether annual pricing launches this quarter or next.',
      s_dec: 'Decisions', s_d1: 'The onboarding redesign ships first; the analytics dashboard moves to December.', s_d2: 'The weekly sync moves to Tuesdays at 10:00 so design can attend.',
      s_tasks: 'Tasks', s_t1: 'Finalize the onboarding copy with design', s_t1m: 'Anna · done',
      s_t2: 'Confirm annual pricing with sales', s_t2m: 'Speaker 2 · next meeting',
      s_t3: 'Send the roadmap summary to the team', s_t3m: 'Anna', s_t3d: 'by Friday',
      s_regen: 'Regenerate with notes',
      s_dates: 'Important dates', s_dt1: '13 Nov', s_dt1t: 'Onboarding copy final', s_dt2: '24 Nov', s_dt2t: 'Weekly sync, new time 10:00',
      s_open: 'Open questions', s_oq: 'Does annual pricing launch this quarter or next?', s_oq2: 'Who takes over the analytics dashboard in December?', s_topics: 'Topics', s_tp: 'Onboarding,Pricing,Weekly sync',
      s_recording: 'Recording', s_of: 'of 15 min · audio is saved continuously', s_seg: '4 segments sent', s_pause: 'Pause', s_finish: 'Finish',
      s_ttl2: 'Q4 roadmap review', s_srch_t: 'Search transcript', s_spk: 'Speakers', s_sp2: 'Speaker 2',
      s_l1: 'Onboarding is our biggest drop-off. If we ship the redesign first, everything else in Q4 benefits from it.',
      s_l2: 'Agreed. But pricing — <mark>should annual plans go live this quarter</mark>? Sales is still testing the offer with a few accounts.',
      s_l3: 'Good question. Let’s leave it open and confirm before the next meeting. Meanwhile the onboarding redesign stays first on the list.',
      s_l4: 'And we move the weekly sync to Tuesday so design can join.',
      c_cnt: '9 dates · 4 upcoming', c_month: 'November 2026', c_wd: 'M,T,W,T,F,S,S', c_ev: 'Events', c_dl: 'Deadlines', c_dt: 'Dates',
      c_e1: 'Q4 roadmap review', c_e2: 'Supplier contract — sign and return', c_due: 'Due today'
    },
    lv: {
      title: 'AI Recap — Ieraksti. Transkribē. Atceries.',
      desc: 'AI Recap ieraksta sanāksmes, sarunas un balss piezīmes, transkribē tās un uzraksta strukturētu kopsavilkumu. Latviski un angliski, arī jaukti. iPhone un Apple Watch.',
      n_feat: 'Iespējas', n_how: 'Kā tas strādā', n_shots: 'Ekrāni', n_price: 'Cenas', n_faq: 'Jautājumi',
      download: 'Lejupielādēt', a_lang: 'Valoda', a_theme: 'Pārslēgt gaišo un tumšo režīmu', a_menu: 'Izvēlne', a_home: 'AI Recap — uz sākumu',
      st_small: 'Lejupielādē', st_big: 'App Store', a_store: 'Lejupielādēt AI Recap no App Store',
      pill_tag: 'Jaunums 1.1', pill: 'Kalendārs katram pieminētajam datumam',
      h1: 'Ieraksti vienreiz.<br><em>Atceries</em> visu.',
      hero_p: 'AI Recap ieraksta sanāksmes, sarunas un balss piezīmes, transkribē tās un uzraksta strukturētu kopsavilkumu — lēmumi, uzdevumi, datumi. Latviski un angliski, arī jaukti vienā teikumā.',
      hero_how: 'Kā tas strādā',
      as1: 'iPhone un Apple Watch', as2: 'Sākt var bez maksas', as3: 'Bez reklāmām un izsekošanas',
      chip_lang: 'Latviešu + angļu', chip_lang2: 'arī jaukti',
      f1: 'Latviešu un angļu valoda — arī tad, ja runātāji pārslēdzas teikuma vidū',
      f2: 'vienā ierakstā ar Unlimited vai savu atslēgu',
      f3: 'reklāmu un izsekotāju. Ieraksti paliek tavā ierīcē',
      f4: 'lai sāktu: 15 minūšu ieraksti, 5 kopsavilkumi dienā',
      r1_e: 'Ieraksts', r1_h: 'Nospied ierakstu. Noliec telefonu malā.',
      r1_p: 'AI Recap turpina ierakstīt ar aizslēgtu ekrānu, un audio tiek saglabāts nepārtraukti.',
      r1_b1: 'Dynamic Island un bloķēšanas ekrāns', r1_t1: 'Taimeris redzams tur, ar pauzes un pabeigšanas pogām.',
      r1_b2: 'Sāc no plaukstas', r1_t2: 'Apple Watch ieraksts sākas ar vienu pieskārienu. Pulkstenis var ierakstīt pats un nodot audio telefonam.',
      r1_b3: 'Pārtraukumi netraucē', r1_t3: 'Zvani un austiņu maiņa ierakstu nepārtrauc — tas turpinās.',
      isl: 'Bloķēšanas ekrāns',
      r2_e: 'Kopsavilkums', r2_h: 'Nevis teksta siena, bet kopsavilkums, ar ko var strādāt.',
      r2_p: 'Katrs ieraksts kļūst par strukturētu dokumentu, kas uzrakstīts atbilstoši sarunas veidam.',
      r2_b1: 'Pārskats un lēmumi', r2_t1: 'Vispirms īss pārskats, tad — par ko patiešām vienojāties.',
      r2_b2: 'Uzdevumi ar atbildīgo un termiņu', r2_t2: 'Atzīmē izdarīto turpat kopsavilkumā.',
      r2_b3: 'Datumi un atvērtie jautājumi', r2_t3: 'Tas, kas palika neatbildēts, paliek redzams.',
      share_h: 'Kopīgot uz',
      r3_e: 'Transkripts un Jautāt AI', r3_h: 'Pieskaries rindai. Dzirdi to brīdi.',
      r3_p: 'Visa saruna — ar runātājiem, meklēšanu un atskaņošanu, kas seko tekstam.',
      r3_b1: 'Runātāji un meklēšana', r3_t1: 'Atrodi vārdu un redzi, kurš to teica.',
      r3_b2: 'Uz jebkuru brīdi', r3_t2: 'Pieskaries rindai, un audio atskaņojas tieši no tās vietas.',
      r3_b3: 'Jautā ierakstam', r3_t3: '„Ko nolēmām par cenām?” Atbilde ar atsauci uz brīdi transkriptā.',
      ask_q: 'Ko nolēmām par cenām?',
      ask_a: 'Galīga lēmuma vēl nav — gada cenas palika atvērts jautājums, kamēr pārdošana testē piedāvājumu. Jānoskaidro līdz nākamajai sanāksmei.',
      r4_e: 'Kalendārs', r4_new: 'Jaunums 1.1', r4_h: 'Katrs datums pamanīts. Vienā kalendārā.',
      r4_p: 'Ierakstos minētie datumi tiek atrasti automātiski un salikti kalendārā.',
      r4_b1: 'Mēneša un saraksta skats', r4_t1: 'Gaidāmie un pagājušie — vienuviet.',
      r4_b2: 'Notikumi, termiņi, datumi', r4_t2: 'Katram veidam sava krāsa, lai termiņi izceltos.',
      r4_b3: 'Pievieno Apple kalendāram', r4_t3: 'Nosūti turp jebkuru datumu kopā ar atgādinājumu.',
      cal_b: 'Pievienots Apple kalendāram', cal_s: 'Atgādinājums · 1 dienu pirms',
      g_e: 'Un vēl', g_h: 'Detaļas, kas noder katru dienu.',
      g1: 'Konteksti', g1t: 'Darba sanāksme, pārdošanas zvans, intervija, lekcija, personīga piezīme — kopsavilkums atbilst situācijai.',
      g2: 'Sava vārdnīca', g2t: 'Izveido kontekstu ar projektu nosaukumiem, klientu vārdiem un saīsinājumiem, kā arī norādījumiem, kā rakstīt.',
      g3: 'Pārģenerē, kad vajag', g3t: 'Izmēģini citu kontekstu vai pievieno piezīmes. Visas versijas saglabājas.',
      g4: 'Kopīgo ar visu noformējumu', g4t: 'Virsraksti, saraksti un uzdevumu ķekši nonāk Apple Notes, Mail vai Notion tieši tā, kā tiem jāizskatās.',
      g5: 'Eksports', g5t: 'Kopsavilkumi Markdown formātā, transkripti — teksta failā.',
      g6: 'Meklē visur', g6t: 'Viena meklēšana ierakstos, transkriptos un kopsavilkumos.',
      h_e: 'Kā tas strādā', h_h: 'No sarunas līdz kopsavilkumam trīs soļos.',
      s1: 'Ieraksti', s1t: 'Ar iPhone vai Apple Watch. Ja vēlies, izvēlies kontekstu.',
      s2: 'Transkribē', s2t: 'Latviešu un angļu valoda tiek atpazīta kopā, ar runātājiem.',
      s3: 'Atceries', s3t: 'Izlasi kopsavilkumu, atzīmē uzdevumus, uzdod jautājumus, kopīgo.',
      p_e: 'Privātums', p_h: 'Privātums pēc noklusējuma.',
      p_p: 'Audio, transkripti un kopsavilkumi glabājas tikai tavā ierīcē, šifrētā datubāzē.',
      p_link: 'Lasīt privātuma politiku',
      p1: 'Tavā ierīcē', p1t: 'Ieraksti glabājas šifrētā datubāzē tavā iPhone.',
      p2: 'Bez reklāmām un izsekošanas', p2t: 'Lietotnē nav ne reklāmu, ne izsekotāju.',
      p3: 'Mums — anonīmi', p3t: 'Mūsu serveris redz tikai anonīmu identifikatoru un plāna statusu — ne saturu.',
      c_e: 'Ekrāni', c_h: 'Ieskaties iekšā.', c_note: 'App Store ekrānuzņēmumi (angļu valodā).',
      a_prev: 'Iepriekšējais ekrānuzņēmums', a_next: 'Nākamais ekrānuzņēmums', a_goto: 'Rādīt ekrānuzņēmumu',
      c1: 'Ieraksti', c2: 'Kalendārs', c3: 'Ieraksts', c4: 'Kopsavilkums', c5: 'Transkripts', c6: 'Apple Watch', c7: 'Konteksti', c8: 'Tumšais režīms',
      c1a: 'AI Recap sākuma ekrāns ar ierakstu sarakstu', c2a: 'Kalendāra ekrāns ar ierakstos atrastajiem datumiem', c3a: 'Ieraksta ekrāns ar taimeri un skaņas vilni',
      c4a: 'Kopsavilkuma ekrāns ar pārskatu, lēmumiem un uzdevumiem', c5a: 'Transkripta ekrāns ar runātājiem un meklēšanu', c6a: 'AI Recap Apple Watch pulkstenī',
      c7a: 'Kontekstu ekrāns ar iebūvētajiem un saviem kontekstiem', c8a: 'Kopsavilkuma ekrāns tumšajā režīmā',
      pr_e: 'Cenas', pr_h: 'Sāc bez maksas. Paplašini, kad vajag vairāk.',
      pl1: 'Bezmaksas', pl1d: 'Balss piezīmēm un īsām sanāksmēm.', pl1c: 'Lejupielādēt',
      pl1a: 'Ieraksti līdz 15 minūtēm', pl1b: '5 kopsavilkumi dienā', pl1e: 'Transkripcija ierīcē', pl1f: 'Bez reklāmām un izsekošanas',
      pl2: 'Unlimited', pl2d: 'Viss notiek pats — API atslēga nav vajadzīga.', pl2c: 'Izvēlēties Unlimited', pl2flag: 'Bez iestatīšanas', per_m: '/ mēnesī',
      pl2a: 'Mūsu AI transkripcija un kopsavilkumi, arī latviešu valodā', pl2b: 'Ieraksti līdz 90 minūtēm', pl2e: 'Nav dienas limita', pl2f: 'Kopsavilkumu un transkriptu eksports',
      pl3: 'Sava atslēga', pl3d: 'Samaksā vienreiz un izmanto savu OpenRouter kontu.', pl3c: 'Lejupielādēt', per_o: 'vienreiz',
      pl3a: 'Sava OpenRouter atslēga — par lietojumu maksā tieši pakalpojumam', pl3b: 'Ieraksti līdz 90 minūtēm', pl3e: 'Nav dienas limita', pl3f: 'Pats izvēlies AI modeļus',
      p0: '0 €', p19: '19,99 €', p99: '99,99 €',
      fine: 'Pirkumi notiek lietotnē caur App Store. Unlimited atjaunojas katru mēnesi, līdz to atceļ. Cenas nosaka App Store tavam reģionam.',
      q_e: 'Jautājumi', q_h: 'Jautājumi un atbildes.', q_p: 'Īsumā par to, ko parasti jautā pirms instalēšanas.',
      terms: 'Lietošanas noteikumi', privacy: 'Privātuma politika',
      q1: 'Kādas valodas tas saprot?',
      a1: 'AI Recap ir radīts latviešu un angļu valodai — arī sarunām, kurās runātāji pārslēdzas teikuma vidū. Diakritiskās zīmes paliek vietā. Arī pati lietotne ir pieejama latviski un angliski.',
      q2: 'Kur glabājas mani ieraksti?',
      a2: 'Tavā ierīcē. Audio, transkripti un kopsavilkumi glabājas šifrētā datubāzē tavā iPhone. Mūsu serveris saturu neredz — tikai anonīmu identifikatoru un plāna statusu. Nav reklāmu un nav izsekošanas.',
      q3: 'Vai var ierakstīt ar aizslēgtu ekrānu?',
      a3: 'Jā. Ieraksts turpinās ar aizslēgtu ekrānu, un taimeris ar pauzes un pabeigšanas pogām ir redzams Dynamic Island un bloķēšanas ekrānā. Zvani un austiņu maiņa tiek apstrādāti automātiski.',
      q4: 'Kā tas strādā ar Apple Watch?',
      a4: 'Sāc ierakstu no plaukstas. Ja iPhone lietotne nav atvērta, pulkstenis ieraksta pats un nodod audio telefonam, kur parādās kopsavilkums.',
      q5: 'Ko nozīmē „Sava atslēga”?',
      a5: 'Tas ir vienreizējs pirkums (99,99 €) tiem, kam ir savs OpenRouter konts. Tu ielīmē savu API atslēgu lietotnē, pats izvēlies AI modeļus un par lietojumu maksā tieši pakalpojumam. Atslēga paliek tavā ierīcē un tiek sūtīta tikai OpenRouter. Ja nevēlies neko iestatīt, Unlimited plānā AI jau ir iekļauts.',
      q6: 'Kādi ir bezmaksas plāna limiti?',
      a6: 'Ieraksti līdz 15 minūtēm un 5 kopsavilkumi dienā, transkripcija notiek ierīcē. Unlimited un Sava atslēga noņem dienas limitu un pagarina ierakstus līdz 90 minūtēm.',
      q7: 'Vai ir Android vai tīmekļa versija?',
      a7: 'Nē. AI Recap ir pieejams tikai iPhone un Apple Watch.',
      q8: 'Kā atcelt Unlimited?',
      a8: 'Abonements tiek apmaksāts caur App Store un atjaunojas automātiski, ja to neatceļ vismaz 24 stundas pirms perioda beigām. To var pārvaldīt savā App Store kontā, sadaļā „Abonementi”.',
      b_h: 'Pēc nākamās sanāksmes atcerēsies visu.', b_p: 'Lejupielādē AI Recap savam iPhone un Apple Watch. Sākt var bez maksas.', b_req: 'iPhone · Apple Watch',
      ft_tag: 'Ieraksti. Transkribē. Atceries. Sanāksmju kopsavilkumi latviski un angliski.',
      ft_prod: 'Produkts', ft_legal: 'Juridiskā informācija', ft_get: 'Lejupielāde', ft_store: 'App Store',
      ft_c: '© 2026 AI Recap · Pieejams tikai iPhone un Apple Watch.',
      ft_tm: 'Apple, iPhone, Apple Watch un App Store ir Apple Inc. preču zīmes.',
      mb: 'Bez maksas App Store', mb_get: 'Iegūt',
      s_date: 'Trešdiena, 11. novembris', s_recs: 'Ieraksti', s_month: 'ierakstīts šomēnes', s_search: 'Meklēt ierakstos un kopsavilkumos',
      s_today: 'Šodien', s_yday: 'Vakar', s_trans: 'Transkribē · 38%',
      s_m1: 'Produkta komanda: Q4 plāna pārskats', s_m2: 'Jāatceras rezervēt telpas pasākumam…', s_m3: 'Iepirkumu sarakstā man vajag…',
      s_m4: 'Piegādātāja līguma pārskats – nosacījumi un termiņi', s_m5: 'Ideja: automātiski marķēt ierakstus pēc kalendāra',
      s_work: 'Darba sanāksme', s_note: 'Personīga piezīme', s_sales: 'Pārdošanas zvans',
      t_rec: 'Ieraksti', t_cal: 'Kalendārs', t_ctx: 'Konteksti', t_set: 'Iestatījumi',
      s_meta_t: 'Šodien 14:32', s_meta_s: '2 runātāji', s_sum: 'Kopsavilkums', s_tr: 'Transkripts', s_ask: 'Jautāt AI',
      s_sumtext: 'Komanda pārskatīja Q4 plānu un vienojās jauno ievadprocesu izlaist līdz novembra beigām. Atvērts jautājums — vai gada cenu plāns sāksies šajā vai nākamajā ceturksnī.',
      s_dec: 'Lēmumi', s_d1: 'Vispirms tiek izlaists jaunais ievadprocess; analītikas panelis pārcelts uz decembri.', s_d2: 'Iknedēļas sanāksme pārcelta uz otrdienām plkst. 10:00, lai var piedalīties dizaineri.',
      s_tasks: 'Uzdevumi', s_t1: 'Pabeigt ievadprocesa tekstus kopā ar dizaineriem', s_t1m: 'Anna · izdarīts',
      s_t2: 'Saskaņot gada cenas ar pārdošanu', s_t2m: 'Runātājs 2 · nākamā sanāksme',
      s_t3: 'Nosūtīt komandai plāna kopsavilkumu', s_t3m: 'Anna', s_t3d: 'līdz piektdienai',
      s_regen: 'Pārģenerēt ar piezīmēm',
      s_dates: 'Svarīgi datumi', s_dt1: '13. nov.', s_dt1t: 'Ievadprocesa teksti gatavi', s_dt2: '24. nov.', s_dt2t: 'Iknedēļas sanāksme, jaunais laiks 10:00',
      s_open: 'Atvērtie jautājumi', s_oq: 'Vai gada cenu plāns sāksies šajā vai nākamajā ceturksnī?', s_oq2: 'Kurš decembrī pārņem analītikas paneli?', s_topics: 'Temati', s_tp: 'Ievadprocess,Cenas,Iknedēļas sanāksme',
      s_recording: 'Ieraksta', s_of: 'no 15 min · audio tiek saglabāts nepārtraukti', s_seg: '4 fragmenti nosūtīti', s_pause: 'Pauzēt', s_finish: 'Pabeigt',
      s_ttl2: 'Q4 plāna pārskats', s_srch_t: 'Meklēt transkriptā', s_spk: 'Runātāji', s_sp2: 'Runātājs 2',
      s_l1: 'Onboarding ir vieta, kur zaudējam visvairāk lietotāju. Ja redesign izlaižam pirmo, viss pārējais Q4 no tā tikai iegūst.',
      s_l2: 'Piekrītu. Bet pricing — <mark>vai gada plānus palaižam jau šajā ceturksnī</mark>? Pārdošana piedāvājumu vēl testē ar dažiem klientiem.',
      s_l3: 'Labs jautājums. Atstājam atvērtu un noskaidrojam līdz nākamajai sanāksmei. Tikmēr onboarding redesign paliek pirmais sarakstā.',
      s_l4: 'Un weekly sync pārceļam uz otrdienu, lai dizaineri var pievienoties.',
      c_cnt: '9 datumi · 4 gaidāmie', c_month: '2026. gada novembris', c_wd: 'P,O,T,C,P,S,Sv', c_ev: 'Notikumi', c_dl: 'Termiņi', c_dt: 'Datumi',
      c_e1: 'Q4 plāna pārskats', c_e2: 'Piegādātāja līgums — parakstīt un nosūtīt', c_due: 'Termiņš šodien'
    }
  };

  var qs = new URLSearchParams(location.search);
  var root = document.documentElement;
  var store = { get: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } }, set: function (k, v) { try { localStorage.setItem(k, v); } catch (e) {} } };
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- language ---------- */
  var lang = (function () {
    var q = (qs.get('lang') || '').toLowerCase();
    if (q === 'lv' || q === 'en') return q;
    var s = store.get('airecap-lang');
    if (s === 'lv' || s === 'en') return s;
    return /^lv/i.test(navigator.language || '') ? 'lv' : 'en';
  })();
  var t;

  /* ---------- phone screens ---------- */
  var ic = function (n, cls) { return '<svg class="ic' + (cls ? ' ' + cls : '') + '" viewBox="0 0 24 24" aria-hidden="true"><use href="#i-' + n + '"/></svg>'; };
  var SB = '<div class="isl"></div><div class="sb"><b>9:41</b><span><svg width="18" height="12" viewBox="0 0 18 12" fill="currentColor"><rect x="0" y="8" width="3" height="4" rx="1"/><rect x="5" y="5.5" width="3" height="6.5" rx="1"/><rect x="10" y="3" width="3" height="9" rx="1"/><rect x="15" y="0" width="3" height="12" rx="1"/></svg><svg width="27" height="13" viewBox="0 0 27 13" fill="none"><rect x=".5" y=".5" width="22" height="12" rx="3.5" stroke="currentColor" opacity=".45"/><rect x="2" y="2" width="17" height="9" rx="2" fill="currentColor"/><rect x="24" y="4.2" width="2" height="4.6" rx="1" fill="currentColor" opacity=".5"/></svg></span></div>';
  var CHECK = '<i class="ck on"><svg viewBox="0 0 24 24"><path d="M6 12.5l4 4L18 8"/></svg></i>';
  var PLAY = '<svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>';
  var PAUSE = '<svg viewBox="0 0 24 24"><rect x="6" y="4" width="4" height="16" rx="1.5"/><rect x="14" y="4" width="4" height="16" rx="1.5"/></svg>';
  var STOP = '<svg viewBox="0 0 24 24"><rect x="5" y="5" width="14" height="14" rx="3"/></svg>';
  function tabbar(on) {
    var tabs = [['mic', t.t_rec], ['cal', t.t_cal], ['card', t.t_ctx], ['sliders', t.t_set]];
    return '<div class="s-nav"><div class="s-bar">' + tabs.map(function (x, i) { return '<span class="s-tab' + (i === on ? ' on' : '') + '">' + ic(x[0]) + x[1] + '</span>'; }).join('') + '</div><span class="s-rec">' + ic('mic') + '</span></div>';
  }
  function topbar(title) {
    return '<div class="s-top">' + ic('back') + (title ? '<b>' + title + '</b>' : '') + '<span style="display:flex;gap:18px">' + ic('share') + (title ? '' : ic('more')) + '</span></div>';
  }
  function tabs3(on) {
    return '<div class="s-tabs">' + [t.s_sum, t.s_tr, t.s_ask].map(function (x, i) { return '<span' + (i === on ? ' class="on"' : '') + '>' + x + '</span>'; }).join('') + '</div>';
  }
  var WAVE = [6,10,16,24,30,22,14,10,18,28,36,30,20,12,8,14,22,32,38,28,18,10,6,12,20,30,34,24,16,10,8,14,24,32,26,18,12,8,10,18,26,30,22,14,8,6,12];
  var BIG = [8,14,22,36,54,72,88,64,40,26,18,30,48,70,96,110,84,58,34,20,14,24,42,66,90,104,78,52,30,16,10,20,38,60,82,96,70,46,28,14,8,12,18,10];
  var WW = [10,18,30,46,64,52,36,22,14,26,44,60,70,54,38,24,16,28,42,34,22,14,10,8];
  var wave = function (hs, cut, cls, anim) { return hs.map(function (h, i) { return '<i' + ((cls === 'p' ? i < cut : i >= cut) ? ' class="' + cls + '"' : '') + ' style="height:' + h + 'px' + (anim ? ';animation-delay:-' + ((i * 7) % 11) / 10 + 's' : '') + '"></i>'; }).join(''); };

  var SCREENS = {
    home: function () {
      var item = function (ttl, dur, ctx, time) { return '<div class="s-item"><div class="s-ttl">' + ttl + '</div><div class="s-meta"><b>' + dur + '</b><span>' + ctx + '</span><span class="r">' + time + '</span></div></div>'; };
      return SB + '<div class="s-row" style="align-items:flex-end"><div><div class="s-mut">' + t.s_date + '</div><h1 style="margin-top:2px">' + t.s_recs + '</h1></div><div style="text-align:right;padding-bottom:4px"><div class="s-num">67 min</div><div class="s-mut" style="font-size:12px;margin-top:2px">' + t.s_month + '</div></div></div>' +
        '<div class="s-search">' + ic('search') + t.s_search + '</div>' +
        '<div style="display:flex;flex-direction:column;gap:8px"><div class="s-lbl">' + t.s_today + '</div>' +
        '<div class="s-card"><div class="s-row"><div class="s-status"><span class="eq"><i></i><i></i><i></i></span>' + t.s_trans + '</div><div class="s-mut">14:32</div></div><div class="s-ttl">' + t.s_m1 + '</div><div class="s-prog"><i style="width:38%"></i></div><div class="s-meta"><b>38 min</b><span>' + t.s_work + '</span></div></div>' +
        item(t.s_m2, '16 s', t.s_note, '09:41') + item(t.s_m3, '25 s', t.s_note, '08:39') + '</div>' +
        '<div style="display:flex;flex-direction:column;gap:0"><div class="s-lbl">' + t.s_yday + '</div>' + item(t.s_m4, '24 min', t.s_sales, '16:05') + item(t.s_m5, '1 min', t.s_note, '09:12') + '</div>' + tabbar(0);
    },
    recap: function () {
      return SB + topbar() +
        '<div style="display:flex;flex-direction:column;gap:10px;margin-top:-6px"><h1 style="font-size:30px;line-height:1.12;letter-spacing:-.015em">' + t.s_m1 + '</h1><div class="s-meta"><span>38 min</span><i class="s-dot"></i><span>' + t.s_meta_t + '</span><i class="s-dot"></i><span>' + t.s_meta_s + '</span></div></div>' +
        '<div class="s-card" style="padding:14px 16px"><div class="s-player"><span class="s-play">' + PLAY + '</span><div class="s-wave">' + wave(WAVE, 15, 'p') + '</div></div><div class="s-times"><b>12:04</b><span>1×</span><span>38:12</span></div></div>' +
        tabs3(0) +
        '<p class="s-sum">' + t.s_sumtext + '</p>' +
        '<div style="display:flex;flex-direction:column;gap:10px"><div class="s-lbl">' + t.s_dec + '</div><div class="s-li">' + t.s_d1 + '</div><div class="s-li">' + t.s_d2 + '</div></div>' +
        '<div style="display:flex;flex-direction:column;gap:8px"><div class="s-lbl">' + t.s_tasks + '</div><div class="s-task done">' + CHECK + '<div><span>' + t.s_t1 + '</span><small>' + t.s_t1m + '</small></div></div></div>' +
        '<div class="s-fade"><span class="s-regen">' + ic('refresh') + t.s_regen + '</span></div>';
    },
    recap2: function () {
      return SB + topbar() + tabs3(0) +
        '<div style="display:flex;flex-direction:column;gap:8px"><div class="s-lbl">' + t.s_tasks + '</div>' +
        '<div class="s-task done">' + CHECK + '<div><span>' + t.s_t1 + '</span><small>' + t.s_t1m + '</small></div></div>' +
        '<div class="s-task"><i class="ck"></i><div>' + t.s_t3 + '<small>' + t.s_t3m + ' · ' + t.s_t3d + '</small></div></div>' +
        '<div class="s-task"><i class="ck"></i><div>' + t.s_t2 + '<small>' + t.s_t2m + '</small></div></div></div>' +
        '<div style="display:flex;flex-direction:column;gap:8px"><div class="s-lbl">' + t.s_dates + '</div>' +
        '<div class="s-date"><em class="dl">' + t.s_dt1 + '</em>' + t.s_dt1t + '</div><div class="s-date"><em>' + t.s_dt2 + '</em>' + t.s_dt2t + '</div></div>' +
        '<div style="display:flex;flex-direction:column;gap:10px"><div class="s-lbl">' + t.s_open + '</div><div class="s-li q">' + t.s_oq + '</div><div class="s-li q">' + t.s_oq2 + '</div></div>' +
        '<div style="display:flex;flex-direction:column;gap:10px"><div class="s-lbl">' + t.s_topics + '</div><div class="s-topics">' + t.s_tp.split(',').map(function (x) { return '<span>' + x + '</span>'; }).join('') + '</div></div>' +
        '<div class="s-fade"><span class="s-regen">' + ic('refresh') + t.s_regen + '</span></div>';
    },
    recording: function () {
      return SB + '<div class="s-halo"></div><div class="s-row" style="position:relative"><div class="s-recst"><i></i>' + t.s_recording + '</div><span class="s-ctx">' + t.s_work + ic('down') + '</span></div>' +
        '<div class="s-mid"><div style="text-align:center"><div class="s-timer">04:12</div><div class="s-mut" style="margin-top:6px">' + t.s_of + '</div></div><div class="s-big">' + wave(BIG, 33, 'dim', true) + '</div>' +
        '<div class="s-meta" style="gap:16px"><span>' + t.s_seg + '</span><i class="s-dot" style="width:4px;height:4px"></i><span>LV + EN</span></div></div>' +
        '<div class="s-btns"><span>' + PAUSE + t.s_pause + '</span><span>' + STOP + t.s_finish + '</span></div>';
    },
    transcript: function () {
      var line = function (time, who, s2, txt, now) { return '<div class="s-tline' + (now ? ' now' : '') + '"><time>' + time + (now ? '<span class="eq" style="height:10px"><i style="width:2px;height:10px"></i><i style="width:2px;height:10px"></i><i style="width:2px;height:10px"></i></span>' : '') + '</time><div><b' + (s2 ? ' class="s2"' : '') + '>' + who + '</b><p>' + txt + '</p></div></div>'; };
      return SB + topbar(t.s_ttl2) + tabs3(1) +
        '<div style="display:flex;gap:8px"><div class="s-search" style="flex:1;height:40px;border-radius:12px;font-size:14px">' + ic('search') + t.s_srch_t + '</div><span class="s-spk"><i></i><i></i>&nbsp;' + t.s_spk + '</span></div>' +
        '<div style="display:flex;flex-direction:column;gap:20px;padding-top:4px">' + line('11:48', 'Anna', 0, t.s_l1) + line('12:04', t.s_sp2, 1, t.s_l2, 1) + line('12:31', 'Anna', 0, t.s_l3) + line('13:02', t.s_sp2, 1, t.s_l4) + '</div>' +
        '<div class="s-pbar"><span class="s-play" style="width:48px;height:48px">' + PAUSE.replace('<svg', '<svg style="width:18px;height:18px;fill:currentColor"') + '</span><div><div class="s-prog"><i style="width:32%"></i></div><div class="s-times"><b>12:04</b><span>38:12</span></div></div></div>';
    },
    calendar: function () {
      var dots = { 3: ['mn'], 5: [''], 11: [''], 13: ['dl'], 18: ['', 'mn'], 20: ['dl'], 24: [''], 27: ['mn'] };
      var cells = '';
      for (var i = 0; i < 42; i++) {
        var d = i - 5, mu = d < 1 || d > 30, n = d < 1 ? 31 + d : d > 30 ? d - 30 : d;
        cells += '<div class="c-cell' + (mu ? ' mu' : '') + (d === 11 ? ' sel' : '') + '"><span>' + n + '</span><u>' + (!mu && dots[d] ? dots[d].map(function (c) { return '<i class="' + c + '"></i>'; }).join('') : '') + '</u></div>';
      }
      return SB + '<div class="s-row" style="align-items:flex-end"><div><div class="s-mut">' + t.c_cnt + '</div><h1 style="margin-top:3px">' + t.t_cal + '</h1></div><div class="c-seg"><span class="on">' + ic('month') + '</span><span>' + ic('list') + '</span></div></div>' +
        '<div class="c-card"><div class="s-row"><div class="c-nav">' + ic('back') + '<span class="c-m" style="color:var(--text)">' + t.c_month + '</span>' + ic('fwd') + '</div><span class="c-today">' + t.s_today + '</span></div>' +
        '<div class="c-grid">' + t.c_wd.split(',').map(function (w) { return '<b>' + w + '</b>'; }).join('') + cells + '</div>' +
        '<div class="c-leg"><span><i></i>' + t.c_ev + '</span><span><i class="dl"></i>' + t.c_dl + '</span><span><i class="mn"></i>' + t.c_dt + '</span></div></div>' +
        '<div><div class="s-lbl" style="margin-bottom:2px">' + t.s_date + '</div><div class="c-ev"><i></i><span>' + t.c_e1 + '</span><small>14:00</small></div><div class="c-ev"><i class="dl"></i><span>' + t.c_e2 + '</span><small>' + t.c_due + '</small></div></div>' + tabbar(1);
    },
    watch: function () {
      return '<div class="w-st"><i></i>' + t.s_recording + '</div><div><div class="w-t">04:12</div><div class="w-wave">' + wave(WW, 20, 'dim', true) + '</div></div><div class="w-b"><span>' + PAUSE + '</span><span>' + STOP + t.s_finish + '</span></div>';
    }
  };

  function renderScreens() {
    $$('[data-screen]').forEach(function (el) {
      var k = el.getAttribute('data-screen');
      el.innerHTML = k === 'watch' ? '<div class="vp"><div class="w-scr">' + SCREENS.watch() + '</div></div>' : '<div class="vp"><div class="scr">' + SCREENS[k]() + '</div></div>';
    });
  }

  function renderFaq() {
    var box = $('#faq-list'); if (!box) return;
    var open = $$('.qa', box).map(function (q) { return q.classList.contains('open'); });
    var h = '';
    for (var i = 1; i <= 8; i++) {
      var o = open.length ? open[i - 1] : i === 1;
      h += '<div class="qa' + (o ? ' open' : '') + '"><h3 style="margin:0"><button type="button" aria-expanded="' + o + '" aria-controls="ans' + i + '"><span>' + t['q' + i] + '</span><i class="pm" aria-hidden="true"></i></button></h3><div class="ans" id="ans' + i + '" role="region"><div><p>' + t['a' + i] + '</p></div></div></div>';
    }
    box.innerHTML = h;
  }

  function applyLang(l) {
    lang = l; t = T[l];
    root.lang = l;
    document.title = t.title;
    var md = $('meta[name=description]'); if (md) md.setAttribute('content', t.desc);
    $$('[data-i]').forEach(function (el) { var v = t[el.getAttribute('data-i')]; if (v != null) el.innerHTML = v; });
    $$('[data-ia]').forEach(function (el) {
      el.getAttribute('data-ia').split(';').forEach(function (p) { var a = p.split(':'); if (t[a[1]] != null) el.setAttribute(a[0], t[a[1]]); });
    });
    $$('[data-lang]').forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-lang') === l)); });
    renderScreens(); renderFaq(); buildDots();
  }

  /* ---------- theme ---------- */
  function setTheme(th) { root.setAttribute('data-theme', th); var m = $('meta[name=theme-color]'); if (m) m.setAttribute('content', th === 'dark' ? '#15171B' : '#F4F5F7'); }
  var manualTheme = (function () { var q = qs.get('theme'); if (q === 'light' || q === 'dark') return q; var s = store.get('airecap-theme'); return s === 'light' || s === 'dark' ? s : null; })();
  var mq = window.matchMedia ? matchMedia('(prefers-color-scheme: dark)') : null;
  setTheme(manualTheme || (mq && mq.matches ? 'dark' : 'light'));
  if (mq) { var onMq = function (e) { if (!manualTheme) setTheme(e.matches ? 'dark' : 'light'); }; mq.addEventListener ? mq.addEventListener('change', onMq) : mq.addListener(onMq); }

  /* ---------- carousel ---------- */
  var track, shots = [], dotsBox;
  function buildDots() {
    if (!dotsBox) return;
    dotsBox.innerHTML = shots.map(function (_, i) { return '<button type="button" aria-label="' + t.a_goto + ' ' + (i + 1) + '"></button>'; }).join('');
    markDot();
  }
  function maxScroll() { return Math.max(1, track.scrollWidth - track.clientWidth); }
  function current() { return Math.round(Math.min(1, Math.max(0, track.scrollLeft / maxScroll())) * (shots.length - 1)); }
  function markDot() { if (!track) return; var c = current(); $$('button', dotsBox).forEach(function (b, i) { b.classList.toggle('on', i === c); }); }
  function go(i) {
    i = Math.max(0, Math.min(shots.length - 1, i));
    track.scrollTo({ left: i / (shots.length - 1) * maxScroll(), behavior: reduce ? 'auto' : 'smooth' });
  }

  /* ---------- init ---------- */
  function init() {
    $$('a[data-store]').forEach(function (a) { a.href = STORE; a.target = '_blank'; a.rel = 'noopener'; });
    track = $('.track'); dotsBox = $('.dots'); shots = $$('.shot');
    applyLang(lang);

    $$('[data-lang]').forEach(function (b) { b.addEventListener('click', function () { var l = b.getAttribute('data-lang'); store.set('airecap-lang', l); applyLang(l); }); });
    $('#theme').addEventListener('click', function () { manualTheme = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark'; store.set('airecap-theme', manualTheme); setTheme(manualTheme); });

    // mobile menu
    var sheet = $('.sheet'), burger = $('#burger');
    var closeSheet = function () { sheet.classList.remove('open'); burger.setAttribute('aria-expanded', 'false'); };
    burger.addEventListener('click', function (e) { e.stopPropagation(); var o = sheet.classList.toggle('open'); burger.setAttribute('aria-expanded', String(o)); });
    sheet.addEventListener('click', function (e) { if (e.target.closest('a')) closeSheet(); });
    document.addEventListener('click', function (e) { if (!e.target.closest('.sheet')) closeSheet(); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeSheet(); });

    // faq
    $('#faq-list').addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b) return;
      var qa = b.closest('.qa'), o = qa.classList.toggle('open'); b.setAttribute('aria-expanded', String(o));
    });

    // carousel
    $('#car-prev').addEventListener('click', function () { go(current() - 1); });
    $('#car-next').addEventListener('click', function () { go(current() + 1); });
    dotsBox.addEventListener('click', function (e) { var b = e.target.closest('button'); if (b) go($$('button', dotsBox).indexOf(b)); });
    var tick = false;
    track.addEventListener('scroll', function () { if (!tick) { tick = true; requestAnimationFrame(function () { markDot(); tick = false; }); } }, { passive: true });

    // nav state, active link, hero parallax, mobile bar
    var nav = $('.nav'), hero = $('.hero'), mbar = $('.mbar'), band = $('.band');
    var links = $$('.links a'), secs = links.map(function (a) { return $(a.getAttribute('href')); });
    var raf = false;
    function onScroll() {
      raf = false;
      var y = window.scrollY || 0;
      nav.classList.toggle('stuck', y > 8);
      if (!reduce && y < 1200) hero.style.setProperty('--sy', y.toFixed(0));
      var mid = y + innerHeight * 0.35, act = -1;
      secs.forEach(function (s, i) { if (s && s.getBoundingClientRect().top + y <= mid) act = i; });
      links.forEach(function (a, i) { a.classList.toggle('on', i === act); });
      var br = band.getBoundingClientRect();
      mbar.classList.toggle('show', y > 640 && br.top > innerHeight - 40);
    }
    window.addEventListener('scroll', function () { if (!raf) { raf = true; requestAnimationFrame(onScroll); } }, { passive: true });
    window.addEventListener('resize', onScroll);
    onScroll();

    // reveal on scroll
    var debugP = qs.get('p'), debugY = qs.get('y');
    if (debugP === null && debugY !== null) debugP = 'y';
    if (!reduce && 'IntersectionObserver' in window && debugP === null && qs.get('static') === null) {
      root.classList.add('anim');
      var io = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }); }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
      $$('.rv').forEach(function (el) { io.observe(el); });
    }
    // debug hooks: ?p=0..1 jumps to that fraction of the page, ?y=<px> to an absolute offset — both with everything revealed
    if (debugP !== null) {
      var jump = function () { window.scrollTo(0, debugP === 'y' ? parseFloat(debugY) || 0 : Math.max(0, Math.min(1, parseFloat(debugP) || 0)) * (document.documentElement.scrollHeight - innerHeight)); onScroll(); };
      jump(); window.addEventListener('load', jump); setTimeout(jump, 400);
    } else {
      setTimeout(function () { root.classList.add('smooth'); }, 300);
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
