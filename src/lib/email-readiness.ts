/** Committee confirms operational Natale mailbox and sender-domain; the live
 * receipts and immediate gift were verified on settled QA donations. Christmas
 * readiness proves scheduling/cron/claim/auth, not an observed future delivery.
 */
export const OFFICIAL_EMAIL_READINESS = {
  sender: "natale@crimonza.org",
  mailboxApproved: true,
  domainVerified: true,
  managedSenderConfigured: true,
  receiptImplementedAndVerified: true,
  giftNowImplementedAndVerified: true,
  giftChristmasScheduleVerified: true,
} as const;
export type OfficialEmailReadiness = {
  sender: string;
  mailboxApproved: boolean;
  domainVerified: boolean;
  managedSenderConfigured: boolean;
  receiptImplementedAndVerified: boolean;
  giftNowImplementedAndVerified: boolean;
  giftChristmasScheduleVerified: boolean;
};
export const EMAIL_LIVE_BLOCKER =
  "ATTENZIONE: le email LIVE devono essere collaudate su donazioni pagate prima dell’attivazione pubblica.";
export function officialEmailReady(r: OfficialEmailReadiness = OFFICIAL_EMAIL_READINESS) {
  return (
    r.sender === "natale@crimonza.org" &&
    r.mailboxApproved &&
    r.domainVerified &&
    r.managedSenderConfigured &&
    r.receiptImplementedAndVerified &&
    r.giftNowImplementedAndVerified &&
    r.giftChristmasScheduleVerified
  );
}
export function assertOfficialEmailReady(r: OfficialEmailReadiness = OFFICIAL_EMAIL_READINESS) {
  if (!officialEmailReady(r)) throw new Error(EMAIL_LIVE_BLOCKER);
}
