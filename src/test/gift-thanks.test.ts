import { beforeEach, expect, it, vi } from 'vitest';
const gateway = vi.hoisted(() => vi.fn());
vi.mock('@lovable.dev/ai-gateway', () => ({ generateResponse: gateway, GatewayError: class extends Error {} }));
import { generateGiftThanks, validThankYou } from '@/lib/gift-thanks.server';
import { PROJECTS } from '@/lib/data';
import { GIFT_IMPACT } from '@/lib/gift-impact';
beforeEach(() => vi.clearAllMocks());
it('uses Gateway with approved facts and amount, never private names or dedications', async () => {
  const project = PROJECTS[0]; if (!project) throw Error('project');
  gateway.mockResolvedValue({ output: [{ type: 'message', content: [{ type: 'output_text', text: 'Grazie: il tuo gesto porta ascolto e vicinanza a Monza.' }] }] });
  expect(await generateGiftThanks(project, 20)).toBe('Grazie: il tuo gesto porta ascolto e vicinanza a Monza.');
  const payload = gateway.mock.calls[0]?.[0];
  expect(payload.model).toBe('openai/gpt-6-astra');
  expect(JSON.parse(payload.input)).toEqual({ progetto: 'Regala calore', contributoEuro: 20, significato: GIFT_IMPACT.calore });
});
it('rejects oversized or unsafe output and does not replay a failed generation', async () => {
  expect(validThankYou('x'.repeat(211))).toBeNull();
  expect(validThankYou('Grazie per il tuo gesto https://spam.it')).toBeNull();
  const project = PROJECTS[0]; if (!project) throw Error('project');
  gateway.mockRejectedValue(new Error('unavailable'));
  await expect(generateGiftThanks(project, 5)).rejects.toThrow('unavailable');
  expect(gateway).toHaveBeenCalledOnce();
});