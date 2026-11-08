# CRI Monza demo — roadmap
## Campaign modes architecture
- [ ] Complete autonomous BASIC capabilities, independent Santa/biscuit options, email fail-closed preparation, tests and documentation (current request).
- [x] Central typed capabilities, readiness and route gates; DEMO remains active.
- [x] Server and direct RPC protections; DEMO data denied outside DEMO (LIVE storage/services not implemented).
- [x] Mode-coherent navigation, checkout, wishes, volunteers, TV and previews; discreet fiscal information under current readiness.
- [x] Document prerequisites, matrix, single setting and incomplete live dependencies; policy tests and DEMO responsive verification.
- [ ] LIVE services, payment verification and isolated data — blocked by payments setup, operator roles and administrative procedures.
- [ ] Authorized staff end-to-end QR/moderation test — requesting account has no volunteer/moderator role.
- [ ] Published legacy client compatibility — direct RPCs now denied; new client requires explicit publish authorization.
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
- [ ] Publish — awaits the user's explicit go-ahead (published site still calls the old gift function; online gifts there fail until republished).
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
- [ ] Prova reale con account volontario/moderatore (QR augurio, doppio uso, scadenza, approvazione) — awaits a volunteer/moderator account usable for testing
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
