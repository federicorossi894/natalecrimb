import { donationAccessSchema } from './payment-policy';
const KEY = 'cri-live-donation-';
export function newDonationAccess() {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return { id: crypto.randomUUID(), accessToken: Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('') };
}
export function saveDonationAccess(access: { id: string; accessToken: string }) {
  localStorage.setItem(KEY + access.id, JSON.stringify(access));
}
export function loadDonationAccess(id: string) {
  try { return donationAccessSchema.parse(JSON.parse(localStorage.getItem(KEY + id) ?? 'null')); } catch { return null; }
}