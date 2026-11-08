import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { DiplomaView } from '@/components/kids/Diploma';
import { ACADEMY_KEY, EMPTY_ACADEMY, completeMission, parseAcademy } from '@/lib/kids-academy';

afterEach(() => { cleanup(); localStorage.clear(); });
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
});