const rnd = (i: number, s: number) => {
  const x = Math.sin(i * 9301 + s * 49297) * 233280;
  return x - Math.floor(x);
};

export function Snow({ count = 40, className = "" }: { count?: number; className?: string }) {
  return (
    <div className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`} aria-hidden>
      {Array.from({ length: count }).map((_, i) => {
        const size = 2 + rnd(i, 1) * 4;
        return (
          <span
            key={i}
            className="absolute rounded-full bg-snow"
            style={{
              left: `${rnd(i, 2) * 100}%`,
              top: 0,
              width: size,
              height: size,
              opacity: 0.25 + rnd(i, 3) * 0.55,
              filter: size > 4 ? "blur(1px)" : undefined,
              animation: `snowfall ${10 + rnd(i, 4) * 14}s linear ${-rnd(i, 5) * 20}s infinite`,
            }}
          />
        );
      })}
    </div>
  );
}
