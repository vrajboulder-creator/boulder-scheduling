'use client';

export default function PctBar({ pct }: { pct: number }) {
  const cls = pct >= 75 ? 'high' : pct >= 40 ? 'mid' : 'low';
  return (
    <div className="pct-bar">
      <div className="pct-track">
        <div className={`pct-fill ${cls}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="pct-text">{pct}%</span>
    </div>
  );
}
