/** Single deployment setting. Never derive this from URL, storage or browser input. */
export const ACTIVE_CAMPAIGN_MODE: CampaignMode = 'DEMO';
export const CAMPAIGN_MODES = ['DEMO', 'BASIC', 'ADVANCED_1', 'ADVANCED_2'] as const;
export type CampaignMode = typeof CAMPAIGN_MODES[number];

/** Readiness is evidence, not a switch to pretend an integration exists. */
export const LIVE_READINESS = {
  payments: false, cash: false, purchaseWishQR: false, liveData: false,
} as const;
export type Readiness = { [K in keyof typeof LIVE_READINESS]: boolean };
export function campaignCapabilities(mode: CampaignMode, ready: Readiness = LIVE_READINESS) {
  const demo = mode === 'DEMO';
  const cash = mode === 'ADVANCED_1' || mode === 'ADVANCED_2';
  const wall = mode === 'ADVANCED_2';
  return {
    demo, simulators: demo, previews: demo,
    livePayments: !demo && ready.payments && ready.liveData,
    volunteerCashDonations: demo || (cash && ready.cash && ready.liveData),
    volunteerPurchaseWishQR: demo || (wall && ready.purchaseWishQR && ready.liveData),
    publicWishWall: demo || (wall && ready.purchaseWishQR && ready.liveData),
    wishModeration: demo || (wall && ready.purchaseWishQR && ready.liveData),
    cashRequested: cash, wishWallRequested: wall,
    sharedDemoData: demo, liveData: !demo && ready.liveData,
    calendar: true, academy: true, casetta: true, tv: true,
    bookingSimulator: demo, emailSimulator: demo,
  };
}
export const CAMPAIGN = campaignCapabilities(ACTIVE_CAMPAIGN_MODE);
export type CampaignCapabilities = ReturnType<typeof campaignCapabilities>;
export function campaignRouteAllowed(path: string, c = CAMPAIGN) {
  const p = path.replace(/\/$/, '') || '/';
  if (p === '/tv-preview' || p === '/presentazione') return c.previews;
  if (p === '/auguri' || p.startsWith('/augurio/')) return c.publicWishWall;
  if (p === '/volontari') return c.volunteerCashDonations || c.volunteerPurchaseWishQR;
  return true;
}
export function campaignPaymentMethods(c = CAMPAIGN): ('sumup' | 'paypal' | 'cash')[] {
  return [...(c.simulators ? ['sumup' as const, 'paypal' as const] : []), ...(c.volunteerCashDonations ? ['cash' as const] : [])];
}
export function assertDemoData(c = CAMPAIGN) {
  if (!c.sharedDemoData) throw new Error('Operazione indisponibile: integrazione LIVE non verificata.');
}
export const PUBLIC_DEMO_RPC = ['hang_ornament', 'public_tree', 'my_ornaments', 'create_cash_request', 'cash_request_status', 'cash_request_result', 'wish_lookup', 'submit_wish', 'public_wishes'] as const;
export const VOLUNTEER_DEMO_RPC = ['cash_request_lookup', 'confirm_cash_request', 'volunteer_add_ornament', 'create_wish_token'] as const;
export const MODERATOR_DEMO_RPC = ['moderate_wish'] as const;
export type DemoRpc = typeof PUBLIC_DEMO_RPC[number] | typeof VOLUNTEER_DEMO_RPC[number] | typeof MODERATOR_DEMO_RPC[number];
export function assertCampaignRpc(name: string, role: 'public' | 'volunteer' | 'moderator', c = CAMPAIGN) {
  assertDemoData(c);
  const list: readonly string[] = role === 'public' ? PUBLIC_DEMO_RPC : role === 'volunteer' ? VOLUNTEER_DEMO_RPC : MODERATOR_DEMO_RPC;
  if (!list.includes(name)) throw new Error('Operazione non autorizzata.');
}