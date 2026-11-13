import { describe, expect, it } from 'vitest';
import { qaRouteAllowed } from '@/lib/qa-route-policy';

describe('final BASIC reserved routes', () => {
  it('closes payment QA in BASIC, including trailing slash', () => {
    expect(qaRouteAllowed('/collaudo-pagamenti', false)).toBe(false);
    expect(qaRouteAllowed('/collaudo-pagamenti/', false)).toBe(false);
  });
  it('closes email QA in BASIC, including descendants', () => {
    expect(qaRouteAllowed('/email-qa', false)).toBe(false);
    expect(qaRouteAllowed('/email-qa/details', false)).toBe(false);
  });
  it('preserves historical DEMO access and ordinary public routes', () => {
    expect(qaRouteAllowed('/email-qa', true)).toBe(true);
    expect(qaRouteAllowed('/collaudo-pagamenti', true)).toBe(true);
    expect(qaRouteAllowed('/pagamento', false)).toBe(true);
    expect(qaRouteAllowed('/regali', false)).toBe(true);
  });
});