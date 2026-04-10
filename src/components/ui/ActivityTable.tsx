'use client';

import type { Activity } from '@/types';
import { useAppStore } from '@/hooks/useAppStore';
import { fmt, isOverdue, getTradeColor } from '@/lib/helpers';
import { cn } from '@/lib/utils';
import StatusBadge from './StatusBadge';
import PctBar from './PctBar';
import { Badge } from './badge';

export default function ActivityTable({ items }: { items: Activity[] }) {
  const { setSelectedActivity } = useAppStore();

  if (!items.length) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground text-sm">
        No activities match your filters.
      </div>
    );
  }

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
