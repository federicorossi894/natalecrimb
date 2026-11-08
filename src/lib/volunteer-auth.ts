// Pure helpers for the shared-password volunteer area. Holds NO secret: the verifier lives server-only.
import { pbkdf2Async } from '@noble/hashes/pbkdf2.js';
import { sha256 } from '@noble/hashes/sha2.js';

export const VOLUNTEER_COOKIE = 'cri_vol';
export const VOLUNTEER_SESSION_HOURS = 12;
export const FAST_ITERATIONS = 100_000; // Cloudflare WebCrypto PBKDF2 ceiling

/** "Nome Cognome": at least two words, letters/apostrophes/dots/hyphens; self-declared, not an identity check. */
export function normalizeVolunteerName(raw: string): string | null {
  const n = raw.normalize('NFC').trim().replace(/\s+/g, ' ');
  if (n.length < 3 || n.length > 80) return null;
  return /^[\p{L}'’.-]+( [\p{L}'’.-]+)+$/u.test(n) ? n : null;
}

export type Verifier = { iterations: number; salt: Uint8Array; hash: Uint8Array };
const b64 = (s: string) => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (s.length % 4)) % 4)), (c) => c.charCodeAt(0));
export const b64url = (b: Uint8Array) => btoa(String.fromCharCode(...b)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

export function parseVerifier(v: string): Verifier | null {
  const m = /^pbkdf2_sha256\$(\d{4,7})\$([A-Za-z0-9._\-/+]{8,128})\$([A-Za-z0-9_\-/+=]{20,128})$/.exec(v.trim());
  if (!m) return null;
  try { return { iterations: Number(m[1]), salt: b64(m[2]!), hash: b64(m[3]!) }; } catch { return null; }
}

// salt = raw bytes (base64url-decoded from the verifier), never the literal text.
async function derive(password: string, salt: Uint8Array, iterations: number, len: number): Promise<Uint8Array> {
  const enc = new TextEncoder();
  try {
    const key = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
    const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: salt as BufferSource, iterations }, key, len * 8);
    return new Uint8Array(bits);
  } catch {
    // Workers reject >100k iterations in WebCrypto; fall back to audited pure-JS PBKDF2.
    return pbkdf2Async(sha256, enc.encode(password), salt, { c: iterations, dkLen: len, asyncTick: 20 });
  }
}

export function constantTimeEqual(a: Uint8Array, b: Uint8Array): boolean {
  let diff = a.length ^ b.length;
  for (let i = 0; i < Math.max(a.length, b.length); i++) diff |= (a[i] ?? 0) ^ (b[i] ?? 0);
  return diff === 0;
}

export async function verifyPassword(password: string, verifier: string): Promise<boolean> {
  const v = parseVerifier(verifier);
  if (!v || password.length === 0 || password.length > 200) return false;
  return constantTimeEqual(await derive(password, v.salt, v.iterations, v.hash.length), v.hash);
}

export async function makeVerifier(password: string, iterations = FAST_ITERATIONS): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(18));
  return `pbkdf2_sha256$${iterations}$${b64url(salt)}$${b64url(await derive(password, salt, iterations, 32))}`;
}

export async function sha256Hex(s: string): Promise<string> {
  const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return [...new Uint8Array(d)].map((x) => x.toString(16).padStart(2, '0')).join('');
}
