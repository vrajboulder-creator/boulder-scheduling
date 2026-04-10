'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useAppStore } from '@/hooks/useAppStore';
import { parseDate, addDays, diffDays, fmt, isoDate, TODAY, getTradeColor } from '@/lib/helpers';
import type { Activity } from '@/types';

const ROW_H = 26;
const BAR_H = 18;
const BAR_Y = 4;
const TRADE_H = 28;
const MONTH_H = 24;
const WEEK_H = 20;

export default function GanttView() {
  const { activities, ganttPxPerDay, setGanttPxPerDay, ganttFullscreen, setGanttFullscreen, setSelectedActivity } = useAppStore();
  const timelineRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const datedActs = activities.filter((a) => a.start || a.finish);
  const pxDay = ganttPxPerDay;

  // Group by trade
  const grouped: Record<string, Activity[]> = {};
  datedActs.sort((a, b) => {
    const sa = parseDate(a.start || a.finish)?.getTime() || 0;
    const sb = parseDate(b.start || b.finish)?.getTime() || 0;
    return sa - sb;
  }).forEach((a) => {
    (grouped[a.trade] = grouped[a.trade] || []).push(a);
  });
  const trades = Object.keys(grouped);

  // Date range
  const allTimes = datedActs.flatMap((a) => {
    const s = parseDate(a.start || a.finish)?.getTime() || 0;
    const f = parseDate(a.finish || a.start)?.getTime() || 0;
    return [s, f];
  }).filter((t) => t > 0);

  const projStart = addDays(new Date(Math.min(...allTimes)), -7);
  const projEnd = addDays(new Date(Math.max(...allTimes)), 14);
  const totalDays = Math.max(7, diffDays(projStart, projEnd));
  const timelineW = totalDays * pxDay;

  // Build rows
  const rows: { type: 'trade' | 'activity'; trade?: string; activity?: Activity; y: number }[] = [];
  let y = 0;
  trades.forEach((trade) => {
    rows.push({ type: 'trade', trade, y });
    y += TRADE_H;
    grouped[trade].forEach((act) => {
      rows.push({ type: 'activity', activity: act, y });
      y += ROW_H;
    });
  });
  const totalH = y;

  // Scroll to today on mount
  useEffect(() => {
    if (timelineRef.current) {
      const scrollTo = Math.max(0, diffDays(projStart, TODAY) * pxDay - 200);
      timelineRef.current.scrollLeft = scrollTo;
    }
  }, []);

  // Ctrl+wheel zoom
  const handleWheel = useCallback((e: WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -2 : 2;
      setGanttPxPerDay(pxDay + delta);
    }
  }, [pxDay, setGanttPxPerDay]);

  useEffect(() => {
    const el = timelineRef.current;
    if (el) {
      el.addEventListener('wheel', handleWheel, { passive: false });
      return () => el.removeEventListener('wheel', handleWheel);
    }
  }, [handleWheel]);

  // Generate month/week headers
  const monthHeaders: { label: string; x: number; w: number }[] = [];
  const weekHeaders: { label: string; x: number; w: number }[] = [];
  const d = new Date(projStart);
  while (d <= projEnd) {
    const dayOffset = diffDays(projStart, d);
    const x = dayOffset * pxDay;
    // Month header
    if (d.getDate() === 1 || dayOffset === 0) {
      const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0);
      const daysInView = Math.min(diffDays(d, monthEnd) + 1, diffDays(d, projEnd));
      monthHeaders.push({
        label: d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        x,
        w: daysInView * pxDay,
      });
    }
    // Week header (Monday)
    if (d.getDay() === 1) {
      weekHeaders.push({
        label: d.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' }),
        x,
        w: 7 * pxDay,
      });
    }
    d.setDate(d.getDate() + 1);
  }

  // Today line
  const todayX = diffDays(projStart, TODAY) * pxDay;

  return (
    <div style={{ position: 'relative' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, alignItems: 'center' }}>
        <div className="section-header" style={{ margin: 0 }}>
          <h2 className="section-title">Timeline / Gantt</h2>
          <span className="section-count">{datedActs.length} activities</span>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button className="btn-secondary" onClick={() => setGanttPxPerDay(pxDay - 3)}>−</button>
          <button className="btn-secondary" onClick={() => setGanttPxPerDay(pxDay + 3)}>+</button>
          <button className="btn-secondary" onClick={() => setGanttFullscreen(!ganttFullscreen)}>
            {ganttFullscreen ? '⇲ Exit' : '⇱ Fullscreen'}
          </button>
        </div>
      </div>
      <div
        style={{
          display: 'flex',
          border: '1px solid var(--border)',
          borderRadius: 12,
          overflow: 'hidden',
          background: 'var(--bg-card)',
          height: ganttFullscreen ? 'calc(100vh - 120px)' : 500,
        }}
      >
        {/* Left Panel — activity names */}
        <div
          style={{
            width: 220,
            minWidth: 220,
            borderRight: '1px solid var(--border)',
            overflowY: 'auto',
            overflowX: 'hidden',
          }}
        >
          <div style={{ height: MONTH_H + WEEK_H, borderBottom: '1px solid var(--border)', background: 'var(--bg-input)' }} />
          {rows.map((row, i) =>
            row.type === 'trade' ? (
              <div
                key={`t-${i}`}
                style={{
                  height: TRADE_H,
                  padding: '0 10px',
                  display: 'flex',
                  alignItems: 'center',
                  fontWeight: 700,
                  fontSize: 11,
                  color: getTradeColor(row.trade!),
                  background: 'var(--bg-input)',
                  borderBottom: '1px solid var(--border-light)',
                }}
              >
                {row.trade}
              </div>
            ) : (
              <div
                key={`a-${row.activity!.id}`}
                style={{
                  height: ROW_H,
                  padding: '0 10px',
                  display: 'flex',
                  alignItems: 'center',
                  fontSize: 11,
                  cursor: 'pointer',
                  borderBottom: '1px solid var(--border-light)',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
                onClick={() => setSelectedActivity(row.activity!.id)}
              >
                <span style={{ opacity: 0.5, fontFamily: 'var(--font-mono)', fontSize: 10, marginRight: 6 }}>
                  {row.activity!.id}
                </span>
                {row.activity!.name}
              </div>
            )
          )}
        </div>

        {/* Right Panel — timeline */}
        <div ref={timelineRef} style={{ flex: 1, overflowX: 'auto', overflowY: 'auto', position: 'relative' }}>
          <svg
            ref={svgRef}
            width={timelineW}
            height={totalH + MONTH_H + WEEK_H}
            style={{ display: 'block' }}
          >
            {/* Month headers */}
            {monthHeaders.map((m, i) => (
              <g key={`m-${i}`}>
                <rect x={m.x} y={0} width={m.w} height={MONTH_H} fill="var(--bg-input)" stroke="var(--border-light)" strokeWidth={0.5} />
                <text x={m.x + 6} y={16} fontSize={10} fontWeight={600} fill="var(--text-secondary)">{m.label}</text>
              </g>
            ))}

            {/* Week headers */}
            {weekHeaders.map((w, i) => (
              <g key={`w-${i}`}>
                <rect x={w.x} y={MONTH_H} width={w.w} height={WEEK_H} fill="#fafafa" stroke="var(--border-light)" strokeWidth={0.5} />
                <text x={w.x + 4} y={MONTH_H + 14} fontSize={9} fill="var(--text-tertiary)">{w.label}</text>
              </g>
            ))}

            {/* Today line */}
            <line
              x1={todayX}
              y1={0}
              x2={todayX}
              y2={totalH + MONTH_H + WEEK_H}
              stroke="var(--red)"
              strokeWidth={1.5}
              strokeDasharray="4 3"
              opacity={0.6}
            />

            {/* Bars */}
            {rows.map((row, i) => {
              if (row.type !== 'activity' || !row.activity) return null;
              const a = row.activity;
              const s = parseDate(a.start || a.finish);
              const f = parseDate(a.finish || a.start);
              if (!s || !f) return null;
              const barX = diffDays(projStart, s) * pxDay;
              const barW = Math.max(pxDay, diffDays(s, f) * pxDay);
              const barY = row.y + MONTH_H + WEEK_H + BAR_Y;
              const color = getTradeColor(a.trade);
              const pctW = (a.pct / 100) * barW;

              return (
                <g key={a.id} style={{ cursor: 'pointer' }} onClick={() => setSelectedActivity(a.id)}>
                  {/* Background bar */}
                  <rect x={barX} y={barY} width={barW} height={BAR_H} rx={3} fill={color} opacity={0.2} />
                  {/* Progress fill */}
                  <rect x={barX} y={barY} width={pctW} height={BAR_H} rx={3} fill={color} opacity={0.7} />
                  {/* Border */}
                  <rect x={barX} y={barY} width={barW} height={BAR_H} rx={3} fill="none" stroke={color} strokeWidth={1} opacity={0.5} />
                  {/* Label */}
                  {barW > 40 && (
                    <text
                      x={barX + 4}
                      y={barY + 13}
                      fontSize={9}
                      fontWeight={600}
                      fill="#fff"
                      style={{ pointerEvents: 'none' }}
                    >
                      {a.name.length > barW / 6 ? a.name.slice(0, Math.floor(barW / 6)) + '…' : a.name}
                    </text>
                  )}
                </g>
              );
            })}
          </svg>
        </div>
      </div>
    </div>
  );
}
