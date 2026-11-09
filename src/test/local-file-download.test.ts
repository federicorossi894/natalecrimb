import { afterEach, describe, expect, it, vi } from 'vitest';
import { deliverLocalFile } from '@/lib/local-file-download';

afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.useRealTimers(); });
describe('Local attestato delivery', () => {
  const file = new File(['png'], 'attestato.png', { type: 'image/png' });
  it('offers the prepared local file to touch-device sharing without upload', async () => {
    vi.stubGlobal('matchMedia', () => ({ matches: true }));
    const share = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', { canShare: () => true, share });
    await deliverLocalFile(file);
    expect(share).toHaveBeenCalledWith({ files: [file], title: 'attestato.png' });
  });
  it('does not trigger a fallback download after share cancellation', async () => {
    vi.stubGlobal('matchMedia', () => ({ matches: true }));
    vi.stubGlobal('navigator', { canShare: () => true, share: vi.fn().mockRejectedValue(new DOMException('Cancel', 'AbortError')) });
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);
    await deliverLocalFile(file);
    expect(click).not.toHaveBeenCalled();
  });
  it('downloads the PNG on desktop and revokes only after 30 seconds', async () => {
    vi.useFakeTimers();
    vi.stubGlobal('matchMedia', () => ({ matches: false }));
    const revoke = vi.fn();
    vi.stubGlobal('URL', { createObjectURL: vi.fn(() => 'blob:local'), revokeObjectURL: revoke });
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function(this: HTMLAnchorElement) {
      expect(this.download).toBe('attestato.png'); expect(this.href).toBe('blob:local');
    });
    await deliverLocalFile(file);
    expect(click).toHaveBeenCalledOnce(); expect(revoke).not.toHaveBeenCalled();
    vi.advanceTimersByTime(30_000); expect(revoke).toHaveBeenCalledWith('blob:local');
  });
});