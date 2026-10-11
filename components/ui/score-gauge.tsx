/**
 * Circular 0–100 gauge for the suitability score (pure SVG, no deps).
 */
export default function ScoreGauge({
  score,
  confidence,
  size = 150
}: {
  score: number;
  /** 0..1 data completeness — displayed separately from the score */
  confidence: number;
  size?: number;
}) {
  const r = 42;
  const c = 2 * Math.PI * r;
  const filled = (Math.max(0, Math.min(100, score)) / 100) * c * 0.75;
  const color = score >= 70 ? '#16a34a' : score >= 45 ? '#d97706' : '#dc2626';

  return (
    <div className="flex flex-col items-center" role="img" aria-label={`${score}/100`}>
      <svg width={size} height={size} viewBox="0 0 100 100">
        <g transform="rotate(135 50 50)">
          <circle
            cx="50" cy="50" r={r} fill="none"
            className="stroke-navy-200 dark:stroke-navy-700"
            strokeWidth="8"
            strokeDasharray={`${c * 0.75} ${c}`}
            strokeLinecap="round"
          />
          <circle
            cx="50" cy="50" r={r} fill="none"
            stroke={color} strokeWidth="8"
            strokeDasharray={`${filled} ${c}`}
            strokeLinecap="round"
          />
        </g>
        <text
          x="50" y="47" textAnchor="middle"
          className="fill-navy-900 dark:fill-navy-50"
          style={{ font: '800 20px ui-sans-serif, system-ui' }}
        >
          {score}
        </text>
        <text
          x="50" y="62" textAnchor="middle"
          className="fill-navy-500 dark:fill-navy-400"
          style={{ font: '600 8px ui-sans-serif, system-ui' }}
        >
          /100
        </text>
      </svg>
      {/* confidence is intentionally separate from the score */}
      <div className="mt-1 w-32">
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-navy-200 dark:bg-navy-700">
          <div
            className="h-full rounded-full bg-ocean-500"
            style={{ width: `${Math.round(confidence * 100)}%` }}
          />
        </div>
      </div>
    </div>
  );
}
