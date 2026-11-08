import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { DiplomaView } from '@/components/kids/Diploma';
import { ACADEMY_KEY, EMPTY_ACADEMY, completeMission, parseAcademy } from '@/lib/kids-academy';
import { CAMPAIGN, campaignCapabilities } from '@/lib/campaign';

vi.mock('@/lib/campaign', async importOriginal => {
  const actual = await importOriginal<typeof import('@/lib/campaign')>();
  return { ...actual, CAMPAIGN: { ...actual.CAMPAIGN } };
});

afterEach(() => { cleanup(); localStorage.clear(); Object.assign(CAMPAIGN, campaignCapabilities('DEMO')); });
describe('Local biscuit acknowledgement', () => {
  it('one tap persists redemption, retains diploma and prevents a second redemption on reload', () => {
    const original = completeMission(EMPTY_ACADEMY, 'citta', new Date('2026-12-01T10:00:00Z'), new Uint8Array([1, 2, 3, 4, 5, 6]));
    function VisitorPhone() {
      const [state, setState] = useState(() => localStorage.getItem(ACADEMY_KEY) ? parseAcademy(localStorage.getItem(ACADEMY_KEY)) : original);
      return <DiplomaView state={state} update={fn => setState(s => { const next = fn(s); localStorage.setItem(ACADEMY_KEY, JSON.stringify(next)); return next; })} onExit={() => undefined} />;
    }
    const view = render(<VisitorPhone />);
    fireEvent.click(screen.getByRole('button', { name: 'Biscotto ritirato' }));
    const saved = parseAcademy(localStorage.getItem(ACADEMY_KEY));
    expect(saved.diploma?.claimedAt).toEqual(expect.any(String));
    expect(saved.diploma?.code).toBe(original.diploma?.code);
    view.unmount(); render(<VisitorPhone />);
    expect(screen.queryByRole('button', { name: 'Biscotto ritirato' })).toBeNull();
    expect(screen.getByTestId('diploma-code').textContent).toBe(original.diploma?.code);
  });
  it.each(['BASIC', 'ADVANCED_1', 'ADVANCED_2'] as const)('%s reward OFF retains diploma without offering redemption', mode => {
    Object.assign(CAMPAIGN, campaignCapabilities(mode));
    const state = completeMission(EMPTY_ACADEMY, 'citta', new Date('2026-12-01T10:00:00Z'), new Uint8Array([1, 2, 3, 4, 5, 6]));
    const update = vi.fn();
    render(<DiplomaView state={state} update={update} onExit={() => undefined} />);
    expect(screen.queryByRole('button', { name: 'Biscotto ritirato' })).toBeNull();
    expect(screen.getByTestId('diploma-code').textContent).toBe(state.diploma?.code);
    expect(update).not.toHaveBeenCalled();
  });
});