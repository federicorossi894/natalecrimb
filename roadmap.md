# CRI Monza demo — roadmap
## TV cinematic storytelling — 8 November
- [ ] Add public-only fair narrative focus, smooth TV camera and safe scene priorities; no audio or other services.
- [ ] Run regression tests, 1920×1080 camera/fallback/priority checks and 4–6 minute browser soak.
- [ ] Document evidence, verify build and publish safe DEMO revision.
## TV 40-day audit — 8 November
- [x] Harden public-only polling, exact count beyond 300, reconnect, arrival queue, reload/ceremony, QR visibility and Wake Lock cleanup.
- [x] 335 tests, build OK, 15min accelerated browser fault/scene/clock matrix, 308.8s real WebGL soak and safe DEMO release HTTP 200/new asset verified.
- [x] Record evidence and physical kiosk checklist in docs/TV_40_DAY_QA_2026-11-08.md; GO on-site soak, NOT YET unattended 40d.
- [ ] Physical TV soak / unattended endurance — requires on-site device and operator.
## Gmail manual QA correction — 8 November
- [x] Verified existing Gmail identity and runtime credentials; linked exact owner account, gala untouched, no sends.
- [x] Three fixed manual staff tests, independent QA gate and service-only durable audit/limits; 306 tests pass, build OK. Desktop/mobile confirms current account denied by role; authorized real UI flow awaits authorized account.
- [ ] Actual reception check — awaits explicit manual send and mailbox confirmation; LIVE unchanged.
## Shared cash DEMO and authorized email preparation — 8 November
- [x] Shared Cloud volunteer access primary, optional local presentation explicitly separate; isolated SQL idempotence/three fresh reads and three-reader 15-second DEMO polling/remount tests, browser role denial verified. Physical Cloud test remains blocked by authorized account below.
- [x] Owner-confirmed server-only QA recipient, protected preparation endpoint, fixed manual template and mocked claim/audit orchestration; no real send. Superseded for QA by the Gmail path above; official LIVE setup remains separate.
- [x] Public legacy version verified HTTP 200 and old local-first desk; safe DEMO release tested (296 tests, build OK, basic security checks without findings); publish authorized by owner, no LIVE/payment/provider changes. Practical steps and blockers in docs/SHARED_DEMO_QA_2026-11-08.md.
## Email preparation and afternoon checks — 8 November
- [x] Independent donor confirmation opt-in, private intent/atomic attempt audit and paid-only trigger; no real send.
- [x] Gift email templates, paid-record ownership, disabled sender state, central LIVE initialization gate and mock tests; Christmas single-event callback prepared but not scheduled.
- [x] DEMO desktop/mobile regression, read-only TV/content checks and executable two-phone checklist; published comparison blocked by HTTP 403, physical hardware and authorized moderation remain unverified.
- [ ] Configure official LIVE Natale mailbox/domain and managed email scaffold — requires owner/domain DNS authorization; exact QA recipient confirmed, no sends before setup and approval.
## Campaign modes architecture
- [x] 8 November preflight code/tests: foreign webhook no-op, effective return origin, paid postcard, PayPal missing custom_id fallback, SumUp transaction identity, isolated PostgreSQL validation and read-only listener/accessibility audit; see docs/PAYMENT_PREFLIGHT.md.
- [x] Pre-live payment hardening: verified PayPal APPROVED capture without browser, cross-request capture exclusion, bounded recovery endpoint, mock-only regression suite and manual procedure; all LIVE readiness unchanged/false.
- [x] Securely connect SumUp and store PayPal credentials; verify authentication without payments, retain DEMO and deny LIVE execution.
- [x] Implement SumUp/PayPal real checkout, server verification, idempotent isolated LIVE ornaments and tree reads for all three LIVE modes; DEMO unchanged, no charges/publication.
- [ ] Payment operational verification — STOP by owner: no staging/second project; future dedicated PayPal app after President meeting and authorized 5 EUR/provider test on main project. Preserve existing code; no listener, rotation or schedule now.
- [x] Correct online method selection with per-provider readiness; verify DEMO/LIVE execution separation and biscuit OFF regression.
- [x] Autonomous BASIC capability contract, independent Santa/biscuit options, email fail-closed preparation, tests and documentation; real services remain explicitly blocked below.
- [ ] Real LIVE single-event email delivery/scheduling — blocked by official mailbox/domain setup, managed send adapter and verified per-event scheduling. Manual QA Gmail implemented separately above; no reception or schedule fabricated.
- [ ] Optional home visits and courtesy biscuit activation — blocked by Committee approval; Santa also needs real availability/contribution and booking operations.
- [x] Central typed capabilities, readiness and route gates; DEMO remains active.
- [x] Server and direct RPC protections; DEMO data denied outside DEMO (LIVE storage/services not implemented).
- [x] Mode-coherent navigation, checkout, wishes, volunteers, TV and previews; discreet fiscal information under current readiness.
- [x] Document prerequisites, matrix, single setting and incomplete live dependencies; policy tests and DEMO responsive verification.
- [ ] LIVE services, payment verification and isolated data — blocked by payments setup, operator roles and administrative procedures.
- [ ] Authorized staff end-to-end QR/moderation test — requesting account has no volunteer/moderator role.
- [x] Published legacy client identified and DEMO-only update explicitly authorized on 8 November; publication requested after final safe-release checks.
- [x] Official CRI marks in header, footer, postcard, email, kids page, TV.
- [x] Lush 3D tree, project ornaments, dedication panel X/outside/Back.
- [x] Phase 1: home "Prenota il tuo Babbo Natale" scroll section (Santa down the chimney, static with reduced motion).
- [x] Phase 1: Santa demo booking (adult form, validation, summary, simulated confirmation, €30 indicative), nothing stored or sent.
- [x] Phase 1: post-donation two choices; per-project postcard, locally drawn share image, WhatsApp share, "Trova il mio addobbo", project CTA.
- [x] Email preview with "Invia ora" / "Sorprendilo a Natale" (25 Dec 00:05 Europe/Rome), sender natale@crimonza.org, validation, simulated confirmation, address cleared.
- [ ] Official "Comitato di Monza" territorial lockup file — awaits Comitato.
- [x] Phase 2: stylised lush fir, painted project baubles with ribbons/tags, even ornament spread, growth to 200.
- [x] Phase 2: TV director loop (panorama, dedication zoom, events card, arrivals), CTA, 24/7 safeguards.
- [x] Phase 2: casetta_events Cloud table + moderator management; TV DEMO examples when empty.
- [x] Fix: bauble placement — no rows/overlaps, rest on needles, stable slots, tree widens with gifts (tested 4–200).
- [x] Phase 3: SumUp/PayPal simulators, cash QR at the casetta, /volontari (scan + manual entry) with roles.
- [ ] Assign volunteer role to real accounts — awaits the Comitato's volunteer sign-ups.
- [x] Refined demo for 27 Oct: 2.5D gift boxes, €5 quick path, project copy rewrite, official Unità Mobile link, email modes (Christmas = 25 Dec 00:05 Europe/Rome), cash donor postcard recovery, /presentazione (3 fictitious cases, PNG/HTML export).
- [x] Publish DEMO update — owner explicitly authorized on 8 November after safe-release checks; deployment completion checked separately, LIVE remains off.
- Limits: no physical-iPhone/TV test; moderator approval + event creation not exercised (no moderator account yet); native share sheet with image not testable headless (wa.me fallback verified).
## Audit 23/10 stabilisation (P0/P1)
- [x] P0 SPA nav: email/postcard form stays visible after clicking a link (regali → /albero; /volontari back to dashboard)
- [x] P0 WebGL fallback: illustrated tree + shared count + QR on /albero and /albero-live
- [x] P1 custom amount: block 0/neg/NaN/<5 € client + server
- [x] P1 brand header/email territorial composition
- [x] P1 home donation wording
- [x] P1 Prossimità copy as project to be realised
- [x] P1 hide floating casetta pill on operative screens
- [x] P1 WhatsApp clarity + "albero digitale su schermo"
- [x] P1 Santa: remove other-organisation price comparison
- [x] P1 Kids mission 1 choices + 112 wording
- [x] Test matrix 390 / 768 portrait+landscape / desktop

- [x] TV restyle /albero-live: tree left, warm right panel, big QR to public site, small DEMO counter, silent 60–90 s loop (invito, 3 passi, attività, casetta/eventi reali, dedica pubblica), arrival card; 1080p/768p/4K + WebGL off checked.

## Casetta di Natale (Sapori e regali solidali)
- [x] /casetta showcase (no checkout): 4 confirmed products/prices, 21 nov–6 gen, sale only at the casetta, CTA to Piazza San Paolo; nav + home link; TV casetta scene dates
- [x] Official poster "Mercatini di Natale" on /casetta, home and TV casetta scene
- [x] Product photos: cioccolatini, panettone carta, panettone latta
- [ ] Pandoro photo — awaits the original from the user (placeholder shown)

## Tre nuove esperienze (23/10)
- [x] Calendario della Gentilezza: /calendario, 24 sportelli 1–24 dic, sblocco con data Europe/Rome del server, testi modificabili dai moderatori
- [x] TV: cerimonia apertura sportello alle 12:00 Rome (spostata dalle 10:00 il 26/10) una volta al giorno, poi messaggio compatto fisso; anteprima prima del 1/12, chiusura dopo il 24/12
- [x] Casetta delle meraviglie: /casetta più ricca e interattiva (stesse foto/locandina/prezzi, solo in presenza)
- [x] Muro degli auguri: /auguri con bigliettini su legno e mollette, solo approvati + esempi DEMO etichettati
- [x] Volontari: "Acquisto alla casetta" → QR/link monouso (7 giorni) per un augurio; demo in memoria
- [x] Pagina /augurio scrittura (180 car., soprannome facoltativo, consenso obbligatorio) + recupero stato
- [x] Moderazione auguri solo moderatori/admin (approva/rifiuta/nascondi, segnali automatici)
- [x] TV scena auguri approvati
- [ ] Prova reale volontari con password comune (solo il proprietario la conosce) + moderatore per QR augurio — awaits owner login test
- [ ] Calendar texts: 24 draft gentle missions written by the agent — await staff review in /moderazione

## Rifinitura TV pre-presentazione (26/10)
- [x] Santa: red-cross sleeve patch (white disc, thin red rim) on the volunteer jacket
- [x] TV wish wall: panoramic 16:9, 3–5 twine rows, note size by length, no overlap, QR kept, new-note animation
- [x] /tv-preview (unlinked): real TV scenes on buttons + 35 s quick demo, DEMO labels

## Calendario definitivo sulla sede CRI Monza (26/10)
- [x] /calendario: illustrazione originale della sede + 24 sportellini allineati al riferimento numerato
- [x] TV: cerimonia delle 12:00 (zoom, apertura, messaggio, ritorno), una volta al giorno
- [x] /tv-preview?modo=calendario: giorno 1–24, simula/pausa/salti di fase
- [ ] Prova su TV fisica della cerimonia — awaits the casetta screen

## Area volontari con password condivisa (8 nov 2026)
- [x] Login Nome e cognome + password comune verificata solo sul server (PBKDF2), cookie HttpOnly 12h, logout, rate limit, registro nomi
- [x] Solo lettura QR, conferma QR e pallina manuale; moderazione, Gmail QA e pagamenti restano fuori
- [x] volontari.natale.crimonza.org → / apre /volontari (solo quell'host)
- [ ] Collegare il sottodominio in Impostazioni → Domini (NON primario) e far creare i record DNS a chi gestisce crimonza.org — attende il Comitato
- [ ] Prova reale con la password vera su due telefoni + TV — attende il proprietario (unico a conoscere la password)
- [ ] QR auguri con password condivisa — non approvato
