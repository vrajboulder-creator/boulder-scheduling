'use client';

import { useState } from 'react';
import { useAppStore } from '@/hooks/useAppStore';
import { getKPIs, isOverdue, isThisWeek } from '@/lib/helpers';
import KPIRow from '@/components/ui/KPIRow';
import ActivityTable from '@/components/ui/ActivityTable';
import { AlertTriangle, CalendarDays, Zap, List, LayoutGrid } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function DashboardView() {
  const { activities } = useAppStore();
  const kpis = getKPIs(activities);
  const [mode, setMode] = useState<'list' | 'grid'>('list');

  const overdue = activities.filter((a) => isOverdue(a));
  const thisWeek = activities.filter((a) => isThisWeek(a.start) && a.status !== 'Complete');
  const critical = activities.filter((a) => a.priority === 'Critical' && a.status !== 'Complete');

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-4">
        <KPIRow kpis={kpis} />
      </div>

      {/* View toggle for dashboard sections */}
      <div className="flex items-center justify-end mb-3 gap-1">
        <div className="flex items-center bg-muted rounded-lg p-0.5 gap-0.5">
          <button onClick={() => setMode('list')} className={cn("p-1.5 rounded-md transition-all", mode === 'list' ? "bg-card shadow-sm text-primary" : "text-muted-foreground hover:text-primary")}>
            <List className="h-3.5 w-3.5" />
          </button>
          <button onClick={() => setMode('grid')} className={cn("p-1.5 rounded-md transition-all", mode === 'grid' ? "bg-card shadow-sm text-primary" : "text-muted-foreground hover:text-primary")}>
            <LayoutGrid className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {overdue.length > 0 && (
        <section className="mt-2">
          <div className="flex items-center gap-2.5 mb-3">
            <AlertTriangle className="h-4 w-4 text-destructive" />
            <h2 className="text-[15px] font-bold tracking-tight">Overdue Activities</h2>
            <span className="text-[10.5px] text-muted-foreground bg-muted px-2.5 py-0.5 rounded-full font-semibold">{overdue.length}</span>
          </div>
          <ActivityTable items={overdue.slice(0, 10)} mode={mode} />
        </section>
      )}

      <section className="mt-6">
        <div className="flex items-center gap-2.5 mb-3">
          <CalendarDays className="h-4 w-4 text-primary" />
          <h2 className="text-[15px] font-bold tracking-tight">This Week</h2>
          <span className="text-[10.5px] text-muted-foreground bg-muted px-2.5 py-0.5 rounded-full font-semibold">{thisWeek.length}</span>
        </div>
        <ActivityTable items={thisWeek.slice(0, 15)} mode={mode} />
      </section>

      {critical.length > 0 && (
        <section className="mt-6">
          <div className="flex items-center gap-2.5 mb-3">
            <Zap className="h-4 w-4 text-orange-500" />
            <h2 className="text-[15px] font-bold tracking-tight">Critical Path</h2>
            <span className="text-[10.5px] text-muted-foreground bg-muted px-2.5 py-0.5 rounded-full font-semibold">{critical.length}</span>
          </div>
          <ActivityTable items={critical.slice(0, 10)} mode={mode} />
        </section>
      )}
    </div>
  );
}
