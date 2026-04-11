'use client';

import { memo } from 'react';
import type { Activity } from '@/types';
import { useAppStore } from '@/hooks/useAppStore';
import { fmt, isOverdue, getTradeColor } from '@/lib/helpers';
import { cn } from '@/lib/utils';
import StatusBadge from './StatusBadge';
import PctBar from './PctBar';
import { Badge } from './badge';
import { Card } from './card';
import { Calendar, Clock, MapPin } from 'lucide-react';

interface Props {
  items: Activity[];
  mode?: 'list' | 'grid';
}

// Memoized so unrelated store churn (drag, zoom, sidebar open) can't re-
// render the 1000+ rows. Re-renders only when `items` or `mode` change.
function ActivityTableInner({ items, mode = 'list' }: Props) {
  // Narrow selector — the function ref is stable in Zustand, so this does
  // not cause re-renders when selection changes.
  const setSelectedActivity = useAppStore((s) => s.setSelectedActivity);

  if (!items.length) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground text-sm">
        No activities match your filters.
      </div>
    );
  }

  // ─── CARD / GRID VIEW ───
  if (mode === 'grid') {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {items.map((a) => {
          const color = getTradeColor(a.trade);
          return (
            <Card
              key={a.id}
              onClick={() => setSelectedActivity(a.id)}
              className={cn(
                "p-4 cursor-pointer hover:shadow-md hover:-translate-y-0.5 transition-all border-l-[3px] relative overflow-hidden",
                isOverdue(a) ? "border-l-red-500 bg-red-50/50" : ""
              )}
              style={{ borderLeftColor: isOverdue(a) ? undefined : color }}
            >
              {/* Header */}
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-mono text-muted-foreground">{a.id}</p>
                  <h4 className="text-[13px] font-semibold leading-tight truncate mt-0.5">
                    {a.milestone && <span className="text-primary mr-1">◆</span>}
                    {a.name}
                  </h4>
                </div>
                <StatusBadge status={a.status} />
              </div>

              {/* Trade badge */}
              <div className="flex items-center gap-1.5 mb-2">
                <span
                  className="inline-block w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: color }}
                />
                <span className="text-[11px] font-medium text-muted-foreground truncate">{a.trade}</span>
                {a.sub && <span className="text-[10px] text-muted-foreground/70 truncate">· {a.sub}</span>}
              </div>

              {/* Dates */}
              <div className="flex items-center gap-3 text-[10.5px] text-muted-foreground mb-2">
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {fmt(a.start)} – {fmt(a.finish)}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {a.duration}d
                </span>
              </div>

              {/* Area */}
              {a.area && (
                <div className="flex items-center gap-1 text-[10px] text-muted-foreground mb-2">
                  <MapPin className="h-3 w-3" />
                  {a.area}{a.floor ? ` · ${a.floor}` : ''}
                </div>
              )}

              {/* Progress bar */}
              <PctBar pct={a.pct} />

              {/* Blocker */}
              {a.blocker && (
                <Badge variant="danger" className="mt-2 text-[9px]">{a.blocker}</Badge>
              )}

              {/* Priority dot */}
              <div className="absolute top-3 right-3">
                <span className={cn("h-2 w-2 rounded-full block", `priority-${a.priority.toLowerCase()}`)} title={a.priority} />
              </div>
            </Card>
          );
        })}
      </div>
    );
  }

  // ─── TABLE / LIST VIEW ───
  return (
    <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-[12.5px]">
          <thead>
            <tr className="bg-muted/50 border-b">
              <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">ID</th>
              <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Activity</th>
              <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Trade</th>
              <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground hidden lg:table-cell">Area</th>
              <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Start</th>
              <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Finish</th>
              <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground hidden md:table-cell">Dur</th>
              <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Status</th>
              <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Progress</th>
              <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground hidden xl:table-cell">Priority</th>
            </tr>
          </thead>
          <tbody>
            {items.map((a) => (
              <tr
                key={a.id}
                onClick={() => setSelectedActivity(a.id)}
                className={cn(
                  "border-b border-border/50 cursor-pointer transition-colors hover:bg-primary/5 hover:shadow-[inset_3px_0_0_hsl(var(--primary))]",
                  isOverdue(a) && "bg-red-50 hover:bg-red-100"
                )}
              >
                <td className="px-3 py-2 font-mono text-[11px] text-muted-foreground">{a.id}</td>
                <td className="px-3 py-2 font-medium min-w-[200px] max-w-[280px]">
                  {a.milestone && <span className="text-primary mr-1">◆</span>}
                  {a.name}
                  {a.blocker && (
                    <Badge variant="danger" className="ml-1.5 text-[9px] px-1.5 py-0">{a.blocker}</Badge>
                  )}
                </td>
                <td className="px-3 py-2">
                  <span className="inline-flex items-center text-[10.5px] font-medium pl-2 border-l-2" style={{ borderColor: getTradeColor(a.trade) }}>
                    {a.trade}
                  </span>
                </td>
                <td className="px-3 py-2 hidden lg:table-cell text-muted-foreground">{a.area}</td>
                <td className="px-3 py-2 whitespace-nowrap">{fmt(a.start)}</td>
                <td className="px-3 py-2 whitespace-nowrap">{fmt(a.finish)}</td>
                <td className="px-3 py-2 hidden md:table-cell text-muted-foreground">{a.duration}d</td>
                <td className="px-3 py-2"><StatusBadge status={a.status} /></td>
                <td className="px-3 py-2"><PctBar pct={a.pct} /></td>
                <td className="px-3 py-2 hidden xl:table-cell">
                  <div className="flex items-center gap-1.5">
                    <span className={cn("h-2 w-2 rounded-full", `priority-${a.priority.toLowerCase()}`)} />
                    <span className="text-[11px]">{a.priority}</span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const ActivityTable = memo(ActivityTableInner);
export default ActivityTable;
