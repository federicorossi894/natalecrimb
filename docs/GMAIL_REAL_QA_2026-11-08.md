# Gmail real QA — 8 November, 18:36–18:40 UTC

## Concrete result

**0 sends made, 0 QA messages found, no message IDs generated.** No send endpoint or direct Gmail send was used, because neither owner account has the existing moderator/admin authorization required by the product. This is a permission blocker, not evidence of a failed delivery adapter.

| Category | Site execution | Gmail acceptance | Inbox/Sent evidence | ID |
|---|---|---|---|---|
| Informational donation DEMO confirmation | Blocked before claim | Not attempted | No matching QA message found | None |
| Immediate gift | Blocked before claim | Not attempted | No matching QA message found | None |
| Christmas timing simulation, send now | Blocked before claim | Not attempted | No matching QA message found | None |

## Verified evidence

- Existing project-linked connection `federico's Gmail` has Gmail readonly/send/compose/modify scopes. No connection or credential change.
- Actual app credential path GET `/gmail/v1/users/me/profile` through the configured gateway returned **HTTP 200**, exact identity `federico.rossi@crimonza.org`. This tests the generated application's environment credential path from the sandbox; it does **not** establish that the published Worker's protected `testDemoEmail` executed. That function checks moderator first and cannot legitimately reach Gmail for the owner sessions currently available.
- Published `https://natalecrimb.lovable.app/moderazione` opened in Chromium using the requester's own minted session. UI showed missing moderator role; **EmailQa panel absent**. No screenshot of session details retained, no role changed.
- Requester's personal app account has **no roles**. The separate app account `federico.rossi@crimonza.org` exists and has **volunteer only**, not moderator/admin. Gmail OAuth ownership is not an application moderator authorization. Shared volunteer password also intentionally cannot send QA email.
- Cloud `staff_qa_attempts` count is exactly **0**. SQL `claim_staff_gmail_qa` requires existing moderator/admin, takes a transaction advisory lock, rejects reused request IDs, enforces at least **600 seconds between all QA attempts** and **3 per Europe/Rome calendar day**. Failed/uncertain claims remain durable.
- Gmail connector read-only messages search, unrestricted by label (thus including Inbox/Sent), `from:federico.rossi@crimonza.org to:federico.rossi@crimonza.org subject:"NESSUN PAGAMENTO" newer_than:1d`, returned HTTP 200 with **resultSizeEstimate 0**. This is zero matching QA messages, not a claim that the entire mailbox is empty.
- Available connector request logs contained prior successful profile GETs and no listed sends. Logging can be incomplete; absence alone is not proof. This turn performed reads only.
- Existing adapter `src/lib/demo-email-qa.server.ts`: fixed From/To, three MIME-encoded DEMO subjects and bodies, immediate Christmas simulation, acceptance distinguished from delivery. `gift-email.functions.ts` checks auth and `is_moderator` before identity/claim/send. `EmailQa.tsx` preserves fixed destination and explicit approval.

## Remaining action

An existing authorized moderator can execute QA from the published panel. For Federico personally, explicit authorization to assign the appropriate moderator role to a specified account is required; none was inferred or granted. No new owner-only bypass was added: checking the server's already-connected OAuth mailbox alone cannot prove an arbitrary caller owns it, and widening the service-only claim would change the approved authorization model.

After authorized access: verify Gmail, select first category, approve and send; preserve returned request/claim and provider ID; verify matching message From/To/Inbox or Sent by ID. Wait **10 minutes**, repeat second, wait **10 minutes**, repeat third. Total minimum first-to-third spacing **20 minutes**. A short single turn cannot bypass those waits. No actual Christmas schedule or automatic public DEMO sends.

The existing gift subject is “Un augurio per te”, not the newly requested “Ti hanno fatto un regalo”. No production code change or deploy was made during this investigation, avoiding accidental publication of retained unfinished audio. This wording can be adjusted in the next explicitly authorized scoped release, together with any requested QA UI ID visibility; no such mismatch causes the current zero attempts.

LIVE payments/official Natale delivery OFF. No QR/volunteer/DNS/gala/audio publication changes. Audio publish call was cancelled before execution, not scheduled.