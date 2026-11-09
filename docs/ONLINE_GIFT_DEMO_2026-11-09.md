# ONLINE_GIFT DEMO — 9 November 2026

## Deployment axes and rollback
`src/lib/site-experience.ts`: SITE_EXPERIENCE=ONLINE_GIFT. Independent campaign mode remains DEMO. To restore FULL, change SITE_EXPERIENCE to FULL, test and publish; do not change payment/email readiness. All old TV/audio/volunteer/review/cash/wall code and Cloud records remain intact. No second project, DNS change or record deletion.

## Public experience
Home → four projects → €5 minimum/whole euros → optional private recipient/sender/90-character message → SumUp or PayPal SIMULATED → one shared DEMO ornament → own ornament focus → local personalized PNG/download/native file share or honest WhatsApp text/link fallback.
Private names/messages stay only in component/device memory; they are not stored in Cloud or included in public tree responses. Ornament deep-links identify the project bauble, not a private dedication. Reload preserves the idempotency request for the same project/amount but not private postcard fields. A second gift of the same project/amount in the same session reuses that request rather than creating another ornament; starting a new gift session is not yet separately implemented.

Routes retained: `/`, `/regali`, four `/regali/$id`, `/albero`, `/pagamento`, reserved `/email-qa`.
Routes redirect to `/` server-side and on client navigation: `/piazza`, `/casetta`, `/albero-live`, `/tv-preview`, `/volontari`, `/auguri`, `/augurio/*`, `/moderazione`, `/presentazione`, `/crediti-musica`, `/babbo-natale`, `/giochi/*`, `/piccoli-volontari/*`, `/calendario`. Calendar is conservatively disabled because a future locked text includes a volunteer reference; it remains unchanged for FULL. Santa and children flags are false. Shared-session/staff operational endpoints reject ONLINE_GIFT; public shared RPC only allows redacted tree reads. Existing provider adapters remain unaltered and LIVE remains fail-closed.

## Real email evidence and remaining blocker
Gmail connection already linked, exact sender Federico verified HTTP 200. Fixed From/To: federico.rossi@crimonza.org. No new connection/domain is needed for QA. Three fixed QA categories exist (receipt, immediate gift, Christmas-time simulation); updated festive HTML, DEMO subject/body, no physical-event references. Christmas simulation sends now only after authorized manual action; no scheduler installed.
`/email-qa` requires authentic app sign-in plus existing moderator/admin authorization. Current owner's authenticated app account has no such role: browser confirms denial. Connected Gmail identity alone does not confer app permissions. No role assigned, no guard bypass, no QA send. Preserved service-only durable audit, 10-minute spacing and maximum three/day; no automatic replay after ambiguous acceptance.

All three categories: **0 sent, 0 accepted, 0 confirmed received**. Gmail search for matching Federico-to-Federico DEMO since November 8 returned zero. Human action: an authorized app administrator must grant the owner's approved staff authority, or an already-authorized moderator must perform the three consented sends, spaced ten minutes apart. Then check Gmail message IDs and Sent/Inbox separately. Current QA templates are fixed synthetic examples, not automatically bound to the privately composed postcard; this integration remains unfinished. Public visitors cannot send real email to arbitrary addresses. LIVE email remains unverified/disabled, intended sender Federico.

## Concrete verification
- 392 tests in 37 files pass; automatic preview build reports build OK (2026-11-09 09:43:34 UTC, subsequent updates require fresh check).
- Isolated PGlite database: concurrent/replayed request returns one ornament, cross-client reuse rejected, minimum €5 enforced, anonymous/authenticated direct RPC denied. No persistent test records created.
- Chromium mobile 390px and desktop 1280px: all four project flows use mocked server responses, four create calls total, successful own-bauble focus, private postcard PNG downloaded, WhatsApp fallback honest; no runtime errors. These are UI/isolated tests, **not a newly verified Cloud donation**.
- Rendered body and head checker across home, gifts, four projects, tree and payment: no Piazza/casetta/TV/wall/volunteer/cash/Santa terms; no horizontal overflow. Legacy route redirect checked; email QA real authenticated denial checked.
- Public privacy redaction checked, full legacy regression tests pass without changing TV/audio content or functioning review.
- Basic security scan completed without issues; deep code analysis was not part of that scan.

## Limits
No three real emails without authorized staff session. No new real Cloud gift end-to-end test (isolated tests only). Postcard private data intentionally device-local, not recipient-private storage. No payment, scheduler, venue, volunteer or DNS activation. Publication requested only after tests; public deployment status must be checked separately, never inferred from request acceptance.
