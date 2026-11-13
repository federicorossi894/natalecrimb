# BASIC candidate — 13 November 2026

Not published. No new checkout, payment, capture, refund, email, database mutation, secret, webhook, job or Gala change.

## Enabled scope
- BASIC with ONLINE_GIFT preserved; verified SumUp/PayPal online payments and immediate/scheduled email only.
- Cash, purchase wish QR, Santa bookings, physical prizes and FULL remain disabled/preserved.
- Christmas readiness means persisted scheduling, active cron, atomic due claims and authentication, not observed delivery on Christmas day.

## Evidence
- Existing QA donations remain paid/completed, each with one approved live ornament and verified webhook; donor confirmations accepted.
- SumUp gift accepted with one attempt; PayPal gift remains blocked until 2026-12-24T23:05:00Z with zero attempts.
- Full suite: 514 passed, zero failures, 61 files (`vitest run --testTimeout=15000`). The longer timeout accommodates concurrent isolated PostgreSQL startup; assertions were not relaxed.
- BASIC Christmas worker: no queue access at 23:04:59Z; bounded paid/completed due queue at 23:05:00Z with isolated empty queue, no real sender invoked.
- Chromium 390/1280: real candidate project form, PayPal selection, enabled checkout button NOT clicked, privacy page and live tree with exactly two ornaments, zero runtime errors/overflow.
- Official checkout origin/return URLs restricted to https://natale.crimonza.org; bearer payment ownership, permanent capture claims and foreign-event isolation retained.
- QA registration rejects BASIC before identity/provider access; private tables remain inaccessible to anonymous/authenticated direct reads. TV store selects live data when accessible; ONLINE_GIFT keeps TV route hidden.
- Current privacy notice is dated 12 November, identifies controller and vendors, separates public consent/private messages and explains retention; supplier legal/contractual compliance is not certified by source inspection.
- Automatic compilation log reports build OK. Independent release build/typecheck were not manually run because this environment delegates those checks to its automatic harness; do not treat this document as separate release/typecheck certification.

## Next gate
Review automatic release/typecheck or commit-check results before deployment. No deployment is authorized by this report itself. Christmas delivery remains future and unobserved.