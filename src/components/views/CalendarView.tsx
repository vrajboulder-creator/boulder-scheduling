'use client';

import { useMemo, useState } from 'react';
import { useAppStore } from '@/hooks/useAppStore';
import { applyFilters, parseDate, addDays, diffDays, getTradeColor, TODAY } from '@/lib/helpers';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Activity } from '@/types';

const DOW_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MAX_PILLS_PER_CELL = 3;

// Resolve an activity's effective start/finish, deriving the missing endpoint
// from `duration` the same way the Gantt does.
function resolveRange(a: Activity): { s: Date; f: Date } | null {
  const dur = Math.max(1, a.duration || 1);
  let s = parseDate(a.start);
  let f = parseDate(a.finish);
  if (s && !f) f = addDays(s, dur - 1);
  else if (f && !s) s = addDays(f, -(dur - 1));
  if (!s || !f) return null;
  return { s, f };
}

export default function CalendarView() {
  const { activities, searchQuery, getSectionState, setSelectedActivity } = useAppStore();
  const st = getSectionState('calendar');

  // Anchor month — first of month shown in header.
  const [anchor, setAnchor] = useState<Date>(() => {
    const d = new Date(TODAY);
    d.setDate(1);
    return d;
  });

  const monthLabel = anchor.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  // Grid spans: first visible Sunday → last visible Saturday.
  // Always 6 rows × 7 cols = 42 cells for a stable layout.
  const gridStart = useMemo(() => {
    const d = new Date(anchor);
    d.setDate(1);
    d.setDate(d.getDate() - d.getDay()); // back to Sunday
    return d;
  }, [anchor]);

  const filtered = useMemo(
    () => applyFilters(activities, st, searchQuery).filter((a) => a.start || a.finish),
    [activities, st, searchQuery]
  );

  // Bucket activities into each day cell they overlap.
  const cells = useMemo(() => {
    const result: { date: Date; inMonth: boolean; items: Activity[] }[] = [];
    for (let i = 0; i < 42; i++) {
      const d = addDays(gridStart, i);
      result.push({ date: d, inMonth: d.getMonth() === anchor.getMonth(), items: [] });
    }

    const gridFirst = result[0].date;
    const gridLast = result[41].date;

    filtered.forEach((a) => {
      const r = resolveRange(a);
      if (!r) return;
      if (r.f < gridFirst || r.s > gridLast) return;
      const startIdx = Math.max(0, diffDays(gridFirst, r.s));
      const endIdx = Math.min(41, diffDays(gridFirst, r.f));
      for (let i = startIdx; i <= endIdx; i++) {
        result[i].items.push(a);
      }
    });

    return result;
  }, [gridStart, anchor, filtered]);

  const monthCount = useMemo(
    () => filtered.filter((a) => {
      const r = resolveRange(a);
      if (!r) return false;
      const monthStart = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
      const monthEnd = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0);
      return r.f >= monthStart && r.s <= monthEnd;
    }).length,
    [filtered, anchor]
  );

  function shiftMonth(delta: number) {
    setAnchor((prev) => new Date(prev.getFullYear(), prev.getMonth() + delta, 1));
  }
  function goToday() {
    const d = new Date(TODAY);
    d.setDate(1);
    setAnchor(d);
  }

  const isToday = (d: Date) =>
    d.getFullYear() === TODAY.getFullYear() &&
    d.getMonth() === TODAY.getMonth() &&
    d.getDate() === TODAY.getDate();

  return (
    <div className="animate-fade-in flex flex-col">
      {/* Toolbar */}
      <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
        <div className="flex items-center gap-2.5">
          <CalendarIcon className="h-4 w-4 text-primary" />
          <h2 className="text-[15px] font-bold tracking-tight">Calendar</h2>
          <span className="text-[10.5px] text-muted-foreground bg-muted px-2.5 py-0.5 rounded-full font-semibold">
            {monthCount} this month
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => shiftMonth(-1)} title="Previous month">
            <ChevronLeft className="h-3.5 w-3.5" />
          </Button>
          <div className="min-w-[140px] text-center text-[13px] font-semibold">{monthLabel}</div>
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => shiftMonth(1)} title="Next month">
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>
          <Button variant="outline" size="sm" className="h-8 text-xs ml-1" onClick={goToday}>
            Today
          </Button>
        </div>
      </div>

      {/* Grid */}
      <Card className="overflow-hidden">
        {/* DOW header */}
        <div className="grid grid-cols-7 border-b bg-muted/50">
          {DOW_LABELS.map((d) => (
            <div key={d} className="px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground text-center">
              {d}
            </div>
          ))}
        </div>

        {/* 6 week rows */}
        <div className="grid grid-cols-7 auto-rows-[minmax(110px,1fr)]">
          {cells.map((cell, i) => {
            const today = isToday(cell.date);
            const overflow = cell.items.length - MAX_PILLS_PER_CELL;
            return (
              <div
                key={i}
                className={cn(
                  'relative border-r border-b border-border/40 p-1.5 flex flex-col gap-1 overflow-hidden',
                  !cell.inMonth && 'bg-muted/20',
                  i % 7 === 6 && 'border-r-0',
                  i >= 35 && 'border-b-0'
                )}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={cn(
                      'text-[11px] font-semibold',
                      cell.inMonth ? 'text-foreground' : 'text-muted-foreground/60',
                      today && 'bg-primary text-primary-foreground rounded-full h-5 w-5 flex items-center justify-center text-[10px]'
                    )}
                  >
                    {cell.date.getDate()}
                  </span>
                </div>

                {/* Activity pills */}
                <div className="flex flex-col gap-0.5 overflow-hidden">
                  {cell.items.slice(0, MAX_PILLS_PER_CELL).map((a) => {
                    const color = getTradeColor(a.trade);
                    return (
                      <button
                        key={a.id}
                        onClick={() => setSelectedActivity(a.id)}
                        className="text-left text-[9px] truncate px-1.5 py-0.5 rounded cursor-pointer hover:brightness-95 transition-all"
                        style={{ background: `${color}22`, borderLeft: `2px solid ${color}`, color }}
                        title={`${a.id} · ${a.name}`}
                      >
                        <span className="font-semibold">{a.name}</span>
                      </button>
                    );
                  })}
                  {overflow > 0 && (
                    <span className="text-[9px] text-muted-foreground px-1.5">+{overflow} more</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
