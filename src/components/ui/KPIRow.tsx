'use client';

import { useAppStore } from '@/hooks/useAppStore';
import type { KPIs, ViewType } from '@/types';

export default function KPIRow({ kpis }: { kpis: KPIs }) {
  const { setView } = useAppStore();

  const cards: { label: string; value: number; sub: string; cls: string; view: ViewType }[] = [
    { label: 'Due Today', value: kpis.due_today, sub: 'activities due', cls: kpis.due_today > 0 ? 'alert' : 'ok', view: 'today' },
    { label: 'Starting This Week', value: kpis.starting_week, sub: 'starting soon', cls: 'info', view: 'this-week' },
    { label: 'In Progress', value: kpis.in_progress, sub: 'active now', cls: 'info', view: 'in-progress' },
    { label: 'Delayed', value: kpis.delayed, sub: 'behind schedule', cls: kpis.delayed > 0 ? 'alert' : 'ok', view: 'delayed' },
    { label: 'Blocked', value: kpis.blocked, sub: 'need action', cls: kpis.blocked > 0 ? 'warn' : 'ok', view: 'blocked' },
    { label: 'Critical Path', value: kpis.critical, sub: 'critical items', cls: kpis.critical > 0 ? 'warn' : 'ok', view: 'master' },
    { label: 'Ready to Start', value: kpis.ready, sub: 'can begin', cls: 'ok', view: 'ready' },
  ];

  return (
    <div className="kpi-row">
      {cards.map((c) => (
        <div key={c.label} className={`kpi-card ${c.cls}`} onClick={() => setView(c.view)}>
          <div className="kpi-label">{c.label}</div>
          <div className="kpi-value">{c.value}</div>
          <div className="kpi-sub">{c.sub}</div>
        </div>
      ))}
    </div>
  );
}
