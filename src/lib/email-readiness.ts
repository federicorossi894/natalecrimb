/** Evidence set only after the Committee's dedicated sender has been verified. */
export const OFFICIAL_EMAIL_READINESS = {
  sender: "federico.rossi@crimonza.org",
  mailboxApproved: false,
  domainVerified: false,
  managedSenderConfigured: false,
  receiptImplementedAndVerified: false,
  giftNowImplementedAndVerified: false,
  giftChristmasScheduleVerified: false,
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
  "ATTENZIONE: email ufficiale Natale non ancora configurata; impossibile attivare modalità LIVE";
export function officialEmailReady(r: OfficialEmailReadiness = OFFICIAL_EMAIL_READINESS) {
  return (
    r.sender === "federico.rossi@crimonza.org" &&
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
