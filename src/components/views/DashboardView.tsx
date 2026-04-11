'use client';

import { useState, type ReactNode } from 'react';
import { useAppStore } from '@/hooks/useAppStore';
import { getKPIs, isOverdue, isThisWeek } from '@/lib/helpers';
import KPIRow from '@/components/ui/KPIRow';
import ActivityTable from '@/components/ui/ActivityTable';
import { AlertTriangle, CalendarDays, Zap, List, LayoutGrid } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Activity } from '@/types';

type SectionMode = 'list' | 'grid';

export default function DashboardView() {
  const { activities } = useAppStore();
  const kpis = getKPIs(activities);

  // Each section has its own list/grid toggle so the user can mix modes —
  // e.g. Today in grid, Delayed in list. State is session-only.
  const [overdueMode, setOverdueMode] = useState<SectionMode>('list');
  const [thisWeekMode, setThisWeekMode] = useState<SectionMode>('list');
  const [criticalMode, setCriticalMode] = useState<SectionMode>('list');

  const overdue = activities.filter((a) => isOverdue(a));
  const thisWeek = activities.filter((a) => isThisWeek(a.start) && a.status !== 'Complete');
  const critical = activities.filter((a) => a.priority === 'Critical' && a.status !== 'Complete');

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-4">
        <KPIRow kpis={kpis} />
      </div>

      {overdue.length > 0 && (
        <DashboardSection
          title="Overdue Activities"
          count={overdue.length}
          icon={<AlertTriangle className="h-4 w-4 text-destructive" />}
          mode={overdueMode}
          onModeChange={setOverdueMode}
        >
          <ActivityTable items={overdue.slice(0, 10)} mode={overdueMode} />
        </DashboardSection>
      )}

      <DashboardSection
        title="This Week"
        count={thisWeek.length}
        icon={<CalendarDays className="h-4 w-4 text-primary" />}
        mode={thisWeekMode}
        onModeChange={setThisWeekMode}
        className="mt-6"
      >
        <ActivityTable items={thisWeek.slice(0, 15)} mode={thisWeekMode} />
      </DashboardSection>

      {critical.length > 0 && (
        <DashboardSection
          title="Critical Path"
          count={critical.length}
          icon={<Zap className="h-4 w-4 text-orange-500" />}
          mode={criticalMode}
          onModeChange={setCriticalMode}
          className="mt-6"
        >
          <ActivityTable items={critical.slice(0, 10)} mode={criticalMode} />
        </DashboardSection>
      )}
    </div>
  );
}

// Reusable section wrapper — header row on the left, per-section list/grid
// toggle on the right, content below.
interface SectionProps {
  title: string;
  count: number;
  icon: ReactNode;
  mode: SectionMode;
  onModeChange: (m: SectionMode) => void;
  children: ReactNode;
  className?: string;
}

function DashboardSection({ title, count, icon, mode, onModeChange, children, className }: SectionProps) {
  return (
    <section className={cn('mt-2', className)}>
      <div className="flex items-center gap-2.5 mb-3">
        {icon}
        <h2 className="text-[15px] font-bold tracking-tight">{title}</h2>
        <span className="text-[10.5px] text-muted-foreground bg-muted px-2.5 py-0.5 rounded-full font-semibold">
          {count}
        </span>
        <div className="ml-auto flex items-center bg-muted rounded-lg p-0.5 gap-0.5">
          <button
            onClick={() => onModeChange('list')}
            className={cn(
              'p-1.5 rounded-md transition-all',
              mode === 'list' ? 'bg-card shadow-sm text-primary' : 'text-muted-foreground hover:text-primary'
            )}
            aria-label="List view"
            title="List view"
          >
            <List className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => onModeChange('grid')}
            className={cn(
              'p-1.5 rounded-md transition-all',
              mode === 'grid' ? 'bg-card shadow-sm text-primary' : 'text-muted-foreground hover:text-primary'
            )}
            aria-label="Grid view"
            title="Grid view"
          >
            <LayoutGrid className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
      {children}
    </section>
  );
}

// Avoid unused-import lint when Activity type is not referenced directly.
export type { Activity };
