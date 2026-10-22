import { useEffect, useRef, useState } from "react";
import jsQR from "jsqr";

/** Rear-camera QR reader (getUserMedia + jsQR, works on iOS Safari too). Stops the camera on unmount. */
export default function QrScanner({ onCode }: { onCode: (text: string) => void }) {
  const video = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState("");
  const done = useRef(false);
  useEffect(() => {
    let stream: MediaStream | null = null, raf = 0, alive = true;
    const canvas = document.createElement("canvas"), ctx = canvas.getContext("2d", { willReadFrequently: true });
    const tick = () => {
      const v = video.current;
      if (!alive || !v || !ctx) return;
      if (v.readyState >= 2 && v.videoWidth) {
        const scale = Math.min(1, 640 / v.videoWidth);
        canvas.width = Math.round(v.videoWidth * scale); canvas.height = Math.round(v.videoHeight * scale);
        ctx.drawImage(v, 0, 0, canvas.width, canvas.height);
        const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const hit = jsQR(img.data, img.width, img.height, { inversionAttempts: "dontInvert" });
        if (hit?.data && !done.current) { done.current = true; navigator.vibrate?.(60); onCode(hit.data); return; }
      }
      raf = requestAnimationFrame(tick);
    };
    (async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) throw new Error("unsupported");
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" } }, audio: false });
        if (!alive) { stream.getTracks().forEach((t) => t.stop()); return; }
        const v = video.current;
        if (v) { v.srcObject = stream; await v.play().catch(() => undefined); }
        raf = requestAnimationFrame(tick);
      } catch {
        setError("Fotocamera non disponibile o permesso negato. Inserisci il codice a mano qui sotto.");
      }
    })();
    return () => { alive = false; cancelAnimationFrame(raf); stream?.getTracks().forEach((t) => t.stop()); };
  }, [onCode]);
  return (
    <div className="relative overflow-hidden rounded-3xl bg-night">
      {error ? <p role="alert" className="p-6 text-center text-sm text-gold">{error}</p> : <>
        <video ref={video} playsInline muted className="aspect-square w-full object-cover" aria-label="Inquadratura fotocamera" />
        <div className="pointer-events-none absolute inset-[18%] rounded-2xl border-2 border-gold/80" />
        <p className="absolute inset-x-0 bottom-3 text-center text-xs text-snow">Inquadra il QR sul telefono del donatore</p>
      </>}
    </div>
  );
}
