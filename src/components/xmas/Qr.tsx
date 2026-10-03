/** Illustrative (non-functional) QR pattern. */
export function FakeQr({ className = "" }: { className?: string }) {
  const n = 25;
  const cells: [number, number][] = [];
  const finder = (x: number, y: number) =>
    (x < 7 && y < 7) || (x >= n - 7 && y < 7) || (x < 7 && y >= n - 7);
  for (let y = 0; y < n; y++)
    for (let x = 0; x < n; x++) {
      if (finder(x, y)) continue;
      const v = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
      if (v - Math.floor(v) > 0.52) cells.push([x, y]);
    }
  const F = ({ x, y }: { x: number; y: number }) => (
    <g>
      <rect x={x} y={y} width="7" height="7" fill="var(--ink)" />
      <rect x={x + 1} y={y + 1} width="5" height="5" fill="var(--paper)" />
      <rect x={x + 2} y={y + 2} width="3" height="3" fill="var(--primary)" />
    </g>
  );
  return (
    <svg viewBox={`-2 -2 ${n + 4} ${n + 4}`} className={className} role="img" aria-label="QR code illustrativo demo">
      <rect x="-2" y="-2" width={n + 4} height={n + 4} rx="2" fill="var(--paper)" />
      {cells.map(([x, y]) => (
        <rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" fill="var(--ink)" />
      ))}
      <F x={0} y={0} />
      <F x={n - 7} y={0} />
      <F x={0} y={n - 7} />
      <rect x={n / 2 - 2.5} y={n / 2 - 2.5} width="5" height="5" fill="var(--paper)" />
      <rect x={n / 2 - 0.7} y={n / 2 - 2} width="1.4" height="4" fill="var(--primary)" />
      <rect x={n / 2 - 2} y={n / 2 - 0.7} width="4" height="1.4" fill="var(--primary)" />
    </svg>
  );
}
