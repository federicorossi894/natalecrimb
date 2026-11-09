import { assertOfficialEmailReady, officialEmailReady } from './email-readiness';
import { experienceRouteAllowed } from './site-experience';
/** Single deployment setting. Never derive this from URL, storage or browser input. */
export const ACTIVE_CAMPAIGN_MODE: CampaignMode = 'DEMO';
export const CAMPAIGN_MODES = ['DEMO', 'BASIC', 'ADVANCED_1', 'ADVANCED_2'] as const;
export type CampaignMode = typeof CAMPAIGN_MODES[number];

/** Readiness is evidence, not a switch to pretend an integration exists. */
export const LIVE_READINESS = {
  payments: false, cash: false, purchaseWishQR: false, liveData: true,
} as const;
export type Readiness = { [K in keyof typeof LIVE_READINESS]: boolean };
/** Optional Committee-approved services, independent of campaign tier. */
export const CAMPAIGN_OPTIONS = {
  santaHomeVisitsEnabled: false,
  courtesyBiscuitAvailable: false,
} as const;
export type CampaignOptions = { [K in keyof typeof CAMPAIGN_OPTIONS]: boolean };
export const OPTIONAL_SERVICE_READINESS = { santaBookings: false, emailSending: false, emailScheduling: false } as const;
export type OptionalReadiness = { [K in keyof typeof OPTIONAL_SERVICE_READINESS]: boolean };
export const ONLINE_PROVIDERS = ['sumup', 'paypal'] as const;
export type OnlineProvider = typeof ONLINE_PROVIDERS[number];
export type ProviderReadiness = Record<OnlineProvider, { implemented: boolean; configured: boolean; webhookVerified: boolean }>;
/** Implemented server adapters; operational webhook checks remain pending (no real payments performed). */
export const LIVE_PROVIDER_READINESS: ProviderReadiness = {
  sumup: { implemented: true, configured: true, webhookVerified: false },
  paypal: { implemented: true, configured: true, webhookVerified: false },
};
export function campaignCapabilities(mode: CampaignMode, ready: Readiness = LIVE_READINESS, options: CampaignOptions = CAMPAIGN_OPTIONS, services: OptionalReadiness = OPTIONAL_SERVICE_READINESS, providers: ProviderReadiness = LIVE_PROVIDER_READINESS) {
  const demo = mode === 'DEMO';
  const cash = mode === 'ADVANCED_1' || mode === 'ADVANCED_2';
  const wall = mode === 'ADVANCED_2';
  const verifiedProviders = ONLINE_PROVIDERS.filter(p => providers[p].implemented && providers[p].configured && providers[p].webhookVerified);
  const livePayments = !demo && ready.payments && ready.liveData && verifiedProviders.length > 0;
  return {
    demo, simulators: demo, previews: demo,
    livePayments,
    liveOnlineProviders: livePayments ? verifiedProviders : [],
    volunteerCashDonations: demo || (cash && ready.cash && ready.liveData),
    volunteerPurchaseWishQR: demo || (wall && ready.purchaseWishQR && ready.liveData),
    publicWishWall: demo || (wall && ready.purchaseWishQR && ready.liveData),
    wishModeration: demo || (wall && ready.purchaseWishQR && ready.liveData),
    cashRequested: cash, wishWallRequested: wall,
    sharedDemoData: demo, liveData: !demo && ready.liveData,
    calendar: true, academy: true, casetta: true, tv: true,
    onlineDonations: true, persistentOrnaments: true, dedications: true, whatsappPostcards: true, giftEmails: true, diploma: true,
    santaHomeVisitsVisible: demo || options.santaHomeVisitsEnabled,
    santaHomeVisitsOperational: !demo && options.santaHomeVisitsEnabled && services.santaBookings,
    courtesyBiscuit: demo || options.courtesyBiscuitAvailable,
    liveEmailSending: !demo && services.emailSending && ready.liveData,
    liveEmailScheduling: !demo && services.emailSending && services.emailScheduling && ready.liveData,
    bookingSimulator: demo, emailSimulator: demo,
  };
}
export const CAMPAIGN = campaignCapabilities(ACTIVE_CAMPAIGN_MODE);
/** Module initialization fails closed in browser, SSR and server handlers on a mode-only edit. */
export function assertCampaignDeployment(mode: CampaignMode) {
  if (mode !== 'DEMO') assertOfficialEmailReady();
}
assertCampaignDeployment(ACTIVE_CAMPAIGN_MODE);
export const EMAIL_PREFLIGHT = { officialReady: officialEmailReady(), receiptRequiredCapability: true, giftNowRequiredCapability: true, giftChristmasRequiredCapability: true } as const;
export type CampaignCapabilities = ReturnType<typeof campaignCapabilities>;
export function campaignRouteAllowed(path: string, c = CAMPAIGN) {
  if (!experienceRouteAllowed(path)) return false;
  const p = path.replace(/\/$/, '') || '/';
  if (p === '/tv-preview' || p === '/presentazione') return c.previews;
  if (p === '/auguri' || p.startsWith('/augurio/')) return c.publicWishWall;
  if (p === '/volontari') return c.volunteerCashDonations || c.volunteerPurchaseWishQR;
  if (p === '/babbo-natale' || p.startsWith('/babbo-natale/')) return c.santaHomeVisitsVisible;
  return true;
}
export function campaignPaymentMethods(c = CAMPAIGN): ('sumup' | 'paypal' | 'cash')[] {
  return [...(c.demo && c.simulators ? [...ONLINE_PROVIDERS] : !c.demo && c.livePayments ? c.liveOnlineProviders : []), ...(c.volunteerCashDonations ? ['cash' as const] : [])];
}
/** Shared checkout/server boundary: identical identifiers never imply identical execution. */
export function assertCampaignPayment(method: string, execution: 'demo' | 'live', c = CAMPAIGN) {
  if (!campaignPaymentMethods(c).some(p => p === method)) throw new Error('Metodo di pagamento non disponibile.');
  if (execution === 'demo') {
    if (!c.demo || !c.simulators) throw new Error('Simulazione non autorizzata.');
    return;
  }
  assertCampaignAction(method === 'cash' ? 'cashDonation' : 'onlinePayment', c);
  if (method !== 'cash' && !c.liveOnlineProviders.some(p => p === method)) throw new Error('Provider non verificato.');
}
/** Guard for every future LIVE handler, before data access. Never accepts client readiness. */
export function assertCampaignAction(action: 'onlinePayment' | 'cashDonation' | 'purchaseWishQR' | 'wishModeration' | 'emailNow' | 'emailChristmas' | 'santaBooking', c = CAMPAIGN) {
  const enabled = {
    onlinePayment: c.livePayments, cashDonation: c.volunteerCashDonations && !c.demo,
    purchaseWishQR: c.volunteerPurchaseWishQR && !c.demo, wishModeration: c.wishModeration && !c.demo,
    emailNow: c.liveEmailSending, emailChristmas: c.liveEmailScheduling, santaBooking: c.santaHomeVisitsOperational,
  };
  if (!enabled[action]) throw new Error('Servizio non disponibile: configurazione e verifica operativa necessarie.');
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