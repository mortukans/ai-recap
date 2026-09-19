# AI Recap — Privacy Policy (draft)

_Draft for review by Martins before publishing. Host at a public URL and enter it in App Store Connect → App Privacy → Privacy Policy URL. Effective date and controller details to be filled in._

**Controller:** [Name / legal entity], Latvia. Contact: [support email].
**Effective:** [date]

## 1. What AI Recap does
AI Recap records meetings and conversations on your iPhone or Apple Watch, transcribes them, and writes a structured recap (summary, decisions, action items, dates). You can ask questions about a recording and regenerate the recap with different context.

## 2. Data that stays on your device
- **Audio recordings, transcripts, recaps, chat history, notes, contexts, speaker names.** Stored only in the app's encrypted database and private storage on your device. We have no copy and no access.
- **Your own API key** ("bring your own key"), if you add one, is stored in the iOS Keychain on your device and is sent only to the provider you chose (OpenRouter).
- Deleting a recap in the app deletes its audio, transcript and recap from the device. Deleting the app deletes everything.

## 3. Data we process on our servers
Our backend runs on Supabase (EU, Ireland). It stores **no audio, transcripts or recap content**. It stores:
- an **anonymous account identifier** created on first launch (no email, name or phone number);
- your **plan / entitlement status** (Free, Unlimited, Bring-your-own-key), received from our purchase provider;
- **usage counters**: recording seconds processed, AI tokens used, a per-day count of recaps — needed to enforce plan limits and fair use;
- a **daily quota counter** for the Free plan.

We keep these for as long as your anonymous account exists. Uninstalling the app abandons the anonymous account; contact us to have it deleted.

## 4. AI processing (Bring-your-own-key and Unlimited plans)
When you use your own key or the Unlimited plan, audio segments and transcript text are sent over an encrypted connection to the AI provider for processing:
- **Bring-your-own-key:** directly from your device to **OpenRouter** and the model vendor you selected, under your own OpenRouter account and their terms.
- **Unlimited:** from your device to our server function, which forwards the audio or text to OpenRouter using our provider account and returns the result. **Nothing is stored** by our server; audio and text are processed in memory only. OpenRouter's and the model vendors' own data policies apply to processing.

The Free plan transcribes **on your device** using Apple's speech recognition (Apple's processing terms apply; no audio is sent to us).

## 5. Purchases
In-app purchases are made through Apple. Receipt validation and subscription status are handled by **RevenueCat**, which receives your anonymous account identifier and purchase receipts from Apple. We do not receive your payment details.

## 6. Analytics and tracking
None. AI Recap contains no advertising, no third-party analytics SDKs and no cross-app tracking.

## 7. Permissions
- **Microphone** — to record. **Speech recognition** — on-device transcription on the Free plan. Requested the first time you record.
- **Apple Watch** — the watch app records or controls the recorder; audio moves from the watch to your iPhone over Apple's encrypted device link.
- **Notifications / Live Activity** — to show the recording timer while the app is in the background.

## 8. Your rights (GDPR)
You can access, correct, export or delete your data. Everything personal is on your device and under your control; for the anonymous server records, contact [support email] with the account identifier shown in Settings → About. You may lodge a complaint with the Latvian Data State Inspectorate (Datu valsts inspekcija).

## 9. Children
AI Recap is not intended for children under 16.

## 10. Recording others
You are responsible for complying with recording and consent laws where you record. Inform participants before recording.

## 11. Changes
We will post updates to this page and change the effective date.

---

# AI Recap — Privātuma politika (melnraksts)

**Pārzinis:** [Vārds / juridiskā persona], Latvija. Kontakti: [atbalsta e-pasts]. **Spēkā no:** [datums]

## 1. Ko dara AI Recap
AI Recap ieraksta sanāksmes un sarunas iPhone vai Apple Watch, transkribē tās un sagatavo strukturētu kopsavilkumu (kopsavilkums, lēmumi, uzdevumi, datumi).

## 2. Dati, kas paliek ierīcē
Audio ieraksti, transkripti, kopsavilkumi, sarakste ar AI, piezīmes, konteksti un runātāju vārdi tiek glabāti tikai jūsu ierīcē šifrētā datubāzē. Mums nav kopijas un piekļuves. Jūsu API atslēga (ja pievienota) glabājas iOS Keychain un tiek sūtīta tikai izvēlētajam pakalpojumam (OpenRouter). Ieraksta dzēšana lietotnē dzēš tā audio, transkriptu un kopsavilkumu.

## 3. Dati mūsu serveros
Aizmugursistēma darbojas Supabase (ES, Īrija). Tā **neglabā audio, transkriptus vai kopsavilkumus**. Glabājam: anonīmu konta identifikatoru; plāna statusu (Free, Unlimited, BYOK); lietojuma skaitītājus (apstrādātās sekundes, AI tokeni, kopsavilkumu skaits dienā) plānu limitu un godīgas lietošanas nodrošināšanai.

## 4. AI apstrāde (BYOK un Unlimited)
Audio fragmenti un transkripta teksts tiek nosūtīti šifrētā savienojumā AI pakalpojumam apstrādei: ar savu atslēgu — tieši no ierīces uz OpenRouter un izvēlēto modeļa piegādātāju; Unlimited plānā — uz mūsu servera funkciju, kas tos pārsūta OpenRouter ar mūsu kontu un atgriež rezultātu, **nekur neglabājot**. Bezmaksas plānā transkripcija notiek **ierīcē** ar Apple runas atpazīšanu.

## 5. Pirkumi
Pirkumi notiek caur Apple. Abonementa statusu apstrādā RevenueCat, kas saņem anonīmo konta identifikatoru un Apple čekus. Maksājumu datus mēs nesaņemam.

## 6. Analītika un izsekošana
Nav. Nav reklāmu, trešo pušu analītikas un starplietotņu izsekošanas.

## 7. Jūsu tiesības (VDAR)
Jūs varat piekļūt datiem, tos labot, eksportēt vai dzēst. Par anonīmajiem servera ierakstiem rakstiet [atbalsta e-pasts], norādot identifikatoru no Iestatījumi → Par. Sūdzību var iesniegt Datu valsts inspekcijā.

## 8. Citu personu ierakstīšana
Jūs atbildat par ierakstīšanas un piekrišanas likumu ievērošanu. Informējiet dalībniekus pirms ieraksta.
