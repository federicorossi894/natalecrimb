import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { DiplomaView } from '@/components/kids/Diploma';
import { ACADEMY_KEY, EMPTY_ACADEMY, completeMission, parseAcademy } from '@/lib/kids-academy';
import { CAMPAIGN, campaignCapabilities } from '@/lib/campaign';
import * as experience from '@/lib/site-experience';
vi.mock('@/components/kids/AttestatoDownload', () => ({ AttestatoDownload: () => null }));

vi.mock('@/lib/site-experience', async importOriginal => {
  const actual = await importOriginal<typeof import('@/lib/site-experience')>();
  return { ...actual, ONLINE_GIFT: false };
});

vi.mock('@/lib/campaign', async importOriginal => {
  const actual = await importOriginal<typeof import('@/lib/campaign')>();
  return { ...actual, CAMPAIGN: { ...actual.CAMPAIGN } };
});

afterEach(() => { cleanup(); localStorage.clear(); Object.assign(CAMPAIGN, campaignCapabilities('DEMO')); vi.mocked(experience).ONLINE_GIFT = false; });
describe('Local biscuit acknowledgement', () => {
  it.each(['stella','pupazzo','lanterna','pettirosso'] as const)('ONLINE_GIFT name stays page-only and chosen instructor %s is explicit',helper=>{
    vi.mocked(experience).ONLINE_GIFT=true;
    const state={...completeMission(EMPTY_ACADEMY,'citta',new Date('2026-12-01T10:00:00Z'),new Uint8Array([1,2,3,4,5,6])),helper};
    const update=vi.fn();const view=render(<DiplomaView state={state} update={update} onExit={()=>undefined}/>);
    fireEvent.change(screen.getByLabelText('Nome del bambino'),{target:{value:'Giulia <123>'}});
    expect(screen.getByTestId('diploma-name')).toHaveTextContent('Giulia');expect(screen.getByTestId('diploma-name')).not.toHaveTextContent('123');
    expect(screen.getByText(`Il mio istruttore: ${helper==='stella'?'Stellina':helper==='pupazzo'?'Pupazzo di neve':helper==='lanterna'?'Lanterna':'Pettirosso'}`)).toBeInTheDocument();
    expect(update).not.toHaveBeenCalled();expect(localStorage.length).toBe(0);expect(JSON.stringify(state)).not.toContain('Giulia');
    view.unmount();render(<DiplomaView state={state} update={update} onExit={()=>undefined}/>);expect(screen.getByLabelText('Nome del bambino')).toHaveValue('');
  });
  it.each([null, '2026-12-02T10:00:00Z'])('ONLINE_GIFT cannot redeem or replay physical rewards (%s)', claimedAt => {
    vi.mocked(experience).ONLINE_GIFT = true;
    const state = completeMission(EMPTY_ACADEMY, 'citta', new Date('2026-12-01T10:00:00Z'), new Uint8Array([1, 2, 3, 4, 5, 6]));
    if (state.diploma) state.diploma.claimedAt = claimedAt;
    const update = vi.fn();
    render(<DiplomaView state={state} update={update} onExit={() => undefined} />);
    expect(screen.queryByTestId('volunteer-check')).toBeNull();
    expect(screen.queryByTestId('claimed-stamp')).toBeNull();
    expect(update).not.toHaveBeenCalled();
    expect(state.diploma?.claimedAt).toBe(claimedAt);
  });
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