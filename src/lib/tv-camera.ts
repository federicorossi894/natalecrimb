export type CameraPoint = [number, number, number];
/** Stateless framing shared by the actual camera and numeric tests. Units follow treeHeight. */
export function tvCameraFrame(height: number, seconds: number, anchor: CameraPoint | null, editorial: boolean) {
  const angle = anchor ? Math.atan2(anchor[0], anchor[2]) : seconds * 0.075;
  const breath = anchor ? 0 : Math.sin(seconds * 0.19) * 0.025;
  const radius = anchor ? editorial ? Math.max(2.1, height * 0.68) : Math.max(4, height * 0.95) : height * (1.95 + breath);
  const look: CameraPoint = anchor ?? [Math.sin(seconds * 0.11) * height * 0.018, height * (0.53 + Math.sin(seconds * 0.13) * 0.008), 0];
  const position: CameraPoint = [
    (anchor?.[0] ?? 0) + Math.sin(angle) * radius,
    anchor ? anchor[1] + (editorial ? 0.24 : 0.45) : height * (0.67 + Math.sin(seconds * 0.16) * 0.008),
    (anchor?.[2] ?? 0) + Math.cos(angle) * radius,
  ];
  return { position, look };
}