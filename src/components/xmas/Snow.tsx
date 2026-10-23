const rnd = (i: number, s: number) => {
  const x = Math.sin(i * 9301 + s * 49297) * 233280;
  // Rounded so server and browser render byte-identical styles (no hydration mismatch).
  return Math.round((x - Math.floor(x)) * 1000) / 1000;
};

export function Snow({ count = 40, className = "" }: { count?: number; className?: string }) {
  return (
    <div className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`} aria-hidden>
      {Array.from({ length: count }).map((_, i) => {
        const size = Math.round((2 + rnd(i, 1) * 4) * 10) / 10;
        return (
          <span
            key={i}
            className="absolute rounded-full bg-snow"
            style={{
              left: `${(rnd(i, 2) * 100).toFixed(1)}%`,
              top: 0,
              width: size,
              height: size,
              opacity: Math.round((0.25 + rnd(i, 3) * 0.55) * 100) / 100,
              filter: size > 4 ? "blur(1px)" : undefined,
              animation: `snowfall ${(10 + rnd(i, 4) * 14).toFixed(2)}s linear ${(-rnd(i, 5) * 20).toFixed(2)}s infinite`,
            }}
          />
        );
      })}
    </div>
  );
}
