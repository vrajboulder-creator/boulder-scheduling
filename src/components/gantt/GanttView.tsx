'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useAppStore } from '@/hooks/useAppStore';
import { parseDate, addDays, diffDays, TODAY, getTradeColor } from '@/lib/helpers';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Minus, Plus, Maximize2, Minimize2, BarChart3 } from 'lucide-react';
import { cn } from '@/lib/utils';
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
  const pxDay = ganttPxPerDay;

  const datedActs = activities.filter((a) => a.start || a.finish);

  // Group by trade
  const grouped: Record<string, Activity[]> = {};
  [...datedActs].sort((a, b) => {
    const sa = parseDate(a.start || a.finish)?.getTime() || 0;
    const sb = parseDate(b.start || b.finish)?.getTime() || 0;
    return sa - sb;
  }).forEach((a) => { (grouped[a.trade] = grouped[a.trade] || []).push(a); });
  const trades = Object.keys(grouped);

  // Date range
  const allTimes = datedActs.flatMap((a) => [parseDate(a.start || a.finish)?.getTime() || 0, parseDate(a.finish || a.start)?.getTime() || 0]).filter((t) => t > 0);
  const projStart = addDays(new Date(Math.min(...allTimes)), -7);
  const projEnd = addDays(new Date(Math.max(...allTimes)), 14);
  const totalDays = Math.max(7, diffDays(projStart, projEnd));
  const timelineW = totalDays * pxDay;

  // Build rows
  const rows: { type: 'trade' | 'activity'; trade?: string; activity?: Activity; y: number }[] = [];
  let y = 0;
  trades.forEach((trade) => {
    rows.push({ type: 'trade', trade, y }); y += TRADE_H;
    grouped[trade].forEach((act) => { rows.push({ type: 'activity', activity: act, y }); y += ROW_H; });
  });
  const totalH = y;

  useEffect(() => {
    if (timelineRef.current) {
      timelineRef.current.scrollLeft = Math.max(0, diffDays(projStart, TODAY) * pxDay - 200);
    }
  }, []);

  const handleWheel = useCallback((e: WheelEvent) => {
    if (e.ctrlKey || e.metaKey) { e.preventDefault(); setGanttPxPerDay(pxDay + (e.deltaY > 0 ? -2 : 2)); }
  }, [pxDay, setGanttPxPerDay]);

  useEffect(() => {
    const el = timelineRef.current;
    if (el) { el.addEventListener('wheel', handleWheel, { passive: false }); return () => el.removeEventListener('wheel', handleWheel); }
  }, [handleWheel]);

  // Month/week headers
  const monthHeaders: { label: string; x: number; w: number }[] = [];
  const weekHeaders: { label: string; x: number; w: number }[] = [];
  const d = new Date(projStart);
  while (d <= projEnd) {
    const dayOffset = diffDays(projStart, d);
    const x = dayOffset * pxDay;
    if (d.getDate() === 1 || dayOffset === 0) {
      const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0);
      monthHeaders.push({ label: d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }), x, w: Math.min(diffDays(d, monthEnd) + 1, diffDays(d, projEnd)) * pxDay });
    }
    if (d.getDay() === 1) weekHeaders.push({ label: d.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' }), x, w: 7 * pxDay });
    d.setDate(d.getDate() + 1);
  }

  const todayX = diffDays(projStart, TODAY) * pxDay;

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <BarChart3 className="h-4 w-4 text-primary" />
          <h2 className="text-[15px] font-bold tracking-tight">Timeline / Gantt</h2>
          <span className="text-[10.5px] text-muted-foreground bg-muted px-2.5 py-0.5 rounded-full font-semibold">{datedActs.length}</span>
        </div>
        <div className="flex gap-1.5">
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setGanttPxPerDay(pxDay - 3)}><Minus className="h-3.5 w-3.5" /></Button>
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setGanttPxPerDay(pxDay + 3)}><Plus className="h-3.5 w-3.5" /></Button>
          <Button variant="outline" size="sm" className="h-8 gap-1 text-xs" onClick={() => setGanttFullscreen(!ganttFullscreen)}>
            {ganttFullscreen ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
            {ganttFullscreen ? 'Exit' : 'Fullscreen'}
          </Button>
        </div>
      </div>

      <Card className={cn("flex overflow-hidden", ganttFullscreen ? "h-[calc(100vh-120px)]" : "h-[500px]")}>
        {/* Left — names */}
        <div className="w-[220px] min-w-[220px] border-r overflow-y-auto scrollbar-hide">
          <div className="h-[44px] border-b bg-muted/50" />
          {rows.map((row, i) =>
            row.type === 'trade' ? (
              <div key={`t-${i}`} className="h-7 px-3 flex items-center font-bold text-[11px] bg-muted/50 border-b border-border/50" style={{ color: getTradeColor(row.trade!) }}>
                {row.trade}
              </div>
            ) : (
              <div key={`a-${row.activity!.id}`} className="h-[26px] px-3 flex items-center text-[11px] cursor-pointer border-b border-border/30 hover:bg-primary/5 truncate" onClick={() => setSelectedActivity(row.activity!.id)}>
                <span className="opacity-40 font-mono text-[10px] mr-1.5">{row.activity!.id}</span>
                {row.activity!.name}
              </div>
            )
          )}
        </div>

        {/* Right — timeline */}
        <div ref={timelineRef} className="flex-1 overflow-auto scrollbar-hide">
          <svg width={timelineW} height={totalH + MONTH_H + WEEK_H} className="block">
            {monthHeaders.map((m, i) => (
              <g key={`m-${i}`}><rect x={m.x} y={0} width={m.w} height={MONTH_H} className="fill-muted/50 stroke-border/30" strokeWidth={0.5} /><text x={m.x + 6} y={16} fontSize={10} fontWeight={600} className="fill-muted-foreground">{m.label}</text></g>
            ))}
            {weekHeaders.map((w, i) => (
              <g key={`w-${i}`}><rect x={w.x} y={MONTH_H} width={w.w} height={WEEK_H} className="fill-background stroke-border/30" strokeWidth={0.5} /><text x={w.x + 4} y={MONTH_H + 14} fontSize={9} className="fill-muted-foreground">{w.label}</text></g>
            ))}
            <line x1={todayX} y1={0} x2={todayX} y2={totalH + MONTH_H + WEEK_H} stroke="hsl(var(--destructive))" strokeWidth={1.5} strokeDasharray="4 3" opacity={0.6} />
            {rows.map((row) => {
              if (row.type !== 'activity' || !row.activity) return null;
              const a = row.activity;
              const s = parseDate(a.start || a.finish);
              const f = parseDate(a.finish || a.start);
              if (!s || !f) return null;
              const barX = diffDays(projStart, s) * pxDay;
              const barW = Math.max(pxDay, diffDays(s, f) * pxDay);
              const barY2 = row.y + MONTH_H + WEEK_H + BAR_Y;
              const color = getTradeColor(a.trade);
              const pctW = (a.pct / 100) * barW;
              return (
                <g key={a.id} className="cursor-pointer" onClick={() => setSelectedActivity(a.id)}>
                  <rect x={barX} y={barY2} width={barW} height={BAR_H} rx={4} fill={color} opacity={0.15} />
                  <rect x={barX} y={barY2} width={pctW} height={BAR_H} rx={4} fill={color} opacity={0.7} />
                  <rect x={barX} y={barY2} width={barW} height={BAR_H} rx={4} fill="none" stroke={color} strokeWidth={1} opacity={0.4} />
                  {barW > 40 && <text x={barX + 4} y={barY2 + 13} fontSize={9} fontWeight={600} fill="#fff" style={{ pointerEvents: 'none' }}>{a.name.length > barW / 6 ? a.name.slice(0, Math.floor(barW / 6)) + '…' : a.name}</text>}
                </g>
              );
            })}
          </svg>
        </div>
      </Card>
    </div>
  );
}
