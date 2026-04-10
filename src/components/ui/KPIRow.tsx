'use client';

import { useAppStore } from '@/hooks/useAppStore';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { KPIs, ViewType } from '@/types';

export default function KPIRow({ kpis }: { kpis: KPIs }) {
  const { setView } = useAppStore();

  const cards: { label: string; value: number; sub: string; accent: string; view: ViewType }[] = [
    { label: 'Due Today', value: kpis.due_today, sub: 'activities due', accent: kpis.due_today > 0 ? 'border-l-red-500' : 'border-l-emerald-500', view: 'today' },
    { label: 'This Week', value: kpis.starting_week, sub: 'starting soon', accent: 'border-l-primary', view: 'this-week' },
    { label: 'In Progress', value: kpis.in_progress, sub: 'active now', accent: 'border-l-blue-500', view: 'in-progress' },
    { label: 'Delayed', value: kpis.delayed, sub: 'behind schedule', accent: kpis.delayed > 0 ? 'border-l-red-500' : 'border-l-emerald-500', view: 'delayed' },
    { label: 'Blocked', value: kpis.blocked, sub: 'need action', accent: kpis.blocked > 0 ? 'border-l-orange-500' : 'border-l-emerald-500', view: 'blocked' },
    { label: 'Critical Path', value: kpis.critical, sub: 'critical items', accent: kpis.critical > 0 ? 'border-l-orange-500' : 'border-l-emerald-500', view: 'master' },
    { label: 'Ready', value: kpis.ready, sub: 'can begin', accent: 'border-l-emerald-500', view: 'ready' },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-7 gap-2.5 mb-4">
      {cards.map((c) => (
        <Card
          key={c.label}
          className={cn("border-l-[3px] p-4 cursor-pointer hover:shadow-md hover:-translate-y-0.5 transition-all", c.accent)}
          onClick={() => setView(c.view)}
        >
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-1">{c.label}</p>
          <p className="text-2xl font-extrabold tracking-tight leading-none">{c.value}</p>
          <p className="text-[10.5px] text-muted-foreground mt-1">{c.sub}</p>
        </Card>
      ))}
    </div>
  );
}
