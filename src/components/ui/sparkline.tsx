/**
 * A minimal inline trend line for a card-grid context — single series, so no
 * legend/axes (see dataviz guidance: a sparkline-in-context is the one chart
 * form that legitimately skips them). Color follows direction (first vs last
 * point), never an arbitrary categorical hue.
 */
export function Sparkline({
  points,
  width = 56,
  height = 20,
}: {
  points: number[];
  width?: number;
  height?: number;
}) {
  if (points.length < 2) return null;

  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;
  const stepX = width / (points.length - 1);

  const coords = points.map((p, i) => ({
    x: i * stepX,
    y: height - ((p - min) / range) * (height - 4) - 2, // 2px inset top/bottom so the line never clips
  }));

  const path = coords.map((c, i) => `${i === 0 ? "M" : "L"}${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(" ");
  const isUp = points[points.length - 1] >= points[0];
  const color = isUp ? "var(--sparkline-up, #4ade80)" : "var(--sparkline-down, #f87171)";
  const last = coords[coords.length - 1];

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} role="img" aria-label={isUp ? "Price trending up" : "Price trending down"}>
      <path d={path} fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={last.x} cy={last.y} r={2} fill={color} />
    </svg>
  );
}
