import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { assertGiftEmailService, type GiftEmailOutcome } from './gift-email-policy';

/** No recipient input or side effects until sender setup and verified paid-gift ownership exist. */
export const giftEmailAvailability = createServerFn({ method: 'POST' })
  .inputValidator((data) => z.object({ mode: z.enum(['now', 'christmas']) }).strict().parse(data))
  .handler(async ({ data }): Promise<GiftEmailOutcome> => {
    try { assertGiftEmailService(data.mode); }
    catch { return { state: 'unavailable', reason: 'sender_not_configured' }; }
    // Readiness flags alone must never turn a missing integration into success.
    return { state: 'unavailable', reason: 'live_service_not_implemented' };
  });