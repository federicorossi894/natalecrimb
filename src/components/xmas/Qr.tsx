import { QRCodeSVG } from "qrcode.react";

/** Public home of the campaign site: every QR (phone pages and the casetta TV) points here. */
export const PUBLIC_SITE_URL = "https://natalecrimb.lovable.app/";

/** Real, scannable QR pointing to the site home. */
export function HomeQr({ className = "" }: { className?: string }) {
  return (
    <div className={`bg-paper p-[6%] ${className}`}>
      <QRCodeSVG value={PUBLIC_SITE_URL} className="h-auto w-full" bgColor="transparent" fgColor="#1a1a1a" level="M" aria-label="QR verso la home" />
    </div>
  );
}

/**
 * Large QR for the physical screen: pure black on white, built-in 4-module quiet zone and higher error correction,
 * so phones read it from a few metres away even with glare.
 */
export function TvQr({ className = "" }: { className?: string }) {
  return (
    <div className={`tv-qr ${className}`} data-testid="tv-qr">
      <QRCodeSVG value={PUBLIC_SITE_URL} className="block h-auto w-full" bgColor="#ffffff" fgColor="#000000" level="Q" marginSize={4} aria-label="QR verso il sito della campagna" />
    </div>
  );
}

export const FakeQr = HomeQr;
