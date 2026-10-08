import { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";

/** Real, scannable QR pointing to the site home. */
export function HomeQr({ className = "" }: { className?: string }) {
  const [url, setUrl] = useState("https://natalecrimb.lovable.app/");
  useEffect(() => setUrl(window.location.origin + "/"), []);
  return (
    <div className={`bg-paper p-[6%] ${className}`}>
      <QRCodeSVG value={url} className="h-auto w-full" bgColor="transparent" fgColor="#1a1a1a" level="M" aria-label="QR verso la home" />
    </div>
  );
}

export const FakeQr = HomeQr;
