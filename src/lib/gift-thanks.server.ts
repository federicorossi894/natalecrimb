import { GatewayError, generateResponse } from '@lovable.dev/ai-gateway';
import type { Project } from './data';
import { GIFT_IMPACT } from './gift-impact';

export function validThankYou(text: string) {
  const clean = text.trim().replace(/\s+/g, ' ');
  return clean.length >= 30 && clean.length <= 210 && !/[<>@]|https?:|www\./i.test(clean) ? clean : null;
}
/** Only approved project facts and amount enter the model; never names, dedications or email addresses. */
export async function generateGiftThanks(project: Project, amount: number): Promise<string> {
  const response = await generateResponse({
    model: 'openai/gpt-6-astra',
    reasoning: { effort: 'low' },
    instructions: 'Scrivi solo un breve ringraziamento italiano, caldo e personale rivolto a chi dona: massimo 180 caratteri, una o due frasi. Ringrazia per il gesto e cita il suo significato concreto per Monza. Usa soltanto i fatti forniti. Non affermare che denaro è già incassato. Non inventare risultati, servizi operativi, quantità o equivalenze euro/oggetti. Niente link, firme, markdown o virgolette.',
    input: JSON.stringify({ progetto: project.title, contributoEuro: amount, significato: GIFT_IMPACT[project.ornament] }),
  });
  const text = response.output.flatMap(item => item.type === 'message' ? item.content.flatMap(c => c.type === 'output_text' ? [c.text] : []) : []).join(' ');
  const result = validThankYou(text);
  if (!result) throw new Error('Invalid thank-you output');
  return result;
}

export function logThankYouFailure(error: unknown) {
  if (error instanceof GatewayError) console.error('Gift thank-you', error.code, error.ids);
  else console.error('Gift thank-you unavailable');
}