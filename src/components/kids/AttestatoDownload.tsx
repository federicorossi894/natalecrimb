import { useEffect, useState, type RefObject } from 'react';
import { Download, LoaderCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { deliverLocalFile } from '@/lib/local-file-download';

/** Prepare the PNG before the click so iOS retains user activation for Save to Files. */
export function AttestatoDownload({ target, code, revision }: { target: RefObject<HTMLElement | null>; code: string; revision: string }) {
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState(false);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let cancelled = false;
    setFile(null); setError(false);
    const prepare = async () => {
      try {
        const node = target.current;
        if (!node) throw new Error('Missing diploma');
        await document.fonts?.ready;
        await Promise.all(Array.from(node.querySelectorAll('img')).map(img => img.decode()));
        const { toBlob } = await import('html-to-image');
        const blob = await toBlob(node, {
          pixelRatio: Math.max(3, 2382 / node.getBoundingClientRect().width), cacheBust: false, fontEmbedCSS: '',
          style: { animation: 'none', opacity: '1', transform: 'none' },
        });
        if (!blob) throw new Error('PNG unavailable');
        if (!cancelled) setFile(new File([blob], `attestato-cri-monza-${code}.png`, { type: 'image/png' }));
      } catch { if (!cancelled) setError(true); }
    };
    void prepare();
    return () => { cancelled = true; };
  }, [target, code, revision, retry]);
  return (
    <div className="mt-5 text-center">
      {error ? <><p role="status" className="mb-2 text-sm text-muted-foreground">Non è stato possibile preparare l’attestato.</p><Button variant="outline" onClick={() => setRetry(n => n + 1)}>Riprova</Button></> :
        <Button disabled={!file} onClick={() => { if (file) void deliverLocalFile(file).catch(() => setError(true)); }} className="min-h-12 rounded-full">
          {file ? <Download className="h-5 w-5" /> : <LoaderCircle className="h-5 w-5 animate-spin" />}
          Scarica attestato
        </Button>}
    </div>
  );
}