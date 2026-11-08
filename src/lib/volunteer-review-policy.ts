import { z } from 'zod';
export const reviewDecision = z.object({ type: z.enum(['wish','dedication']), id: z.string().uuid(), decision: z.enum(['approved','rejected']) }).strict();
export type ReviewItem = { id: string; type: 'wish'|'dedication'; body: string; nickname: string|null; created_at: string; flags: string[] };
export type ReviewList = { count: number; items: ReviewItem[] };
export function reviewOriginAllowed(origin: string | null, requestUrl: string) {
  if (!origin) return false;
  try { return new URL(origin).origin === new URL(requestUrl).origin; } catch { return false; }
}