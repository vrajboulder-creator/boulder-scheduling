'use client';

import { useMemo } from 'react';
import { useAppStore } from '@/hooks/useAppStore';
import { applyFilters, isThisWeek, isInRange, isoDate, TODAY, parseDate, addDays, getKPIs } from '@/lib/helpers';
import type { Activity, ViewType } from '@/types';
import FilterBar from '@/components/ui/FilterBar';
import ActivityTable from '@/components/ui/ActivityTable';
import KPIRow from '@/components/ui/KPIRow';

const VIEW_TITLES: Record<string, string> = {
  today: "Today's Activities",
  'this-week': 'This Week',
  delayed: 'Delayed Activities',
  blocked: 'Blocked Activities',
  'in-progress': 'In Progress',
  ready: 'Ready to Start',
  completed: 'Completed Activities',
  milestones: 'Milestones',
  'lookahead-6': '6-Week Lookahead',
  'lookahead-3': '3-Week Lookahead',
  'by-trade': 'Activities by Trade',
  'by-area': 'Activities by Area / Floor',
  'by-sub': 'Activities by Subcontractor',
  procurement: 'Procurement / Long Lead',
  inspections: 'Inspections & Permits',
  punch: 'Punch / Closeout',
  turnover: 'Area Turnover',
};

export default function FilteredView({ view }: { view: ViewType }) {
  // Narrow selectors so row clicks (which flip `selectedActivityId`) don't
  // re-run the entire view-filter over 1000+ activities.
  const activities = useAppStore((s) => s.activities);
  const searchQuery = useAppStore((s) => s.searchQuery);
  const sectionState = useAppStore((s) => s.sectionState);
  const st = sectionState[view] || { mode: 'list' as const, trade: '', area: '', status: '', phase: '', floor: '' };
  const title = VIEW_TITLES[view] || 'Activities';

  // View-specific slice of the full activity list. Memoized so it only
  // rebuilds when `activities` (not selection, not store churn) changes.
  const items = useMemo<Activity[]>(() => {
    switch (view) {
      case 'today': return activities.filter(a => (isoDate(a.start) === isoDate(TODAY) || isoDate(a.finish) === isoDate(TODAY)) && a.status !== 'Complete');
      case 'this-week': return activities.filter(a => isThisWeek(a.start) && a.status !== 'Complete');
      case 'delayed': return activities.filter(a => a.status === 'Delayed');
      case 'blocked': return activities.filter(a => a.status === 'Blocked' || a.blocker);
      case 'in-progress': return activities.filter(a => a.status === 'In Progress');
      case 'ready': return activities.filter(a => a.status === 'Ready to Start' || (a.status === 'Not Started' && !a.blocker && parseDate(a.start)! <= addDays(TODAY, 7)));
      case 'completed': return activities.filter(a => a.status === 'Complete');
      case 'milestones': return activities.filter(a => a.milestone);
      case 'lookahead-6': return activities.filter(a => isInRange(a.start, 42) || isInRange(a.finish, 42));
      case 'lookahead-3': return activities.filter(a => isInRange(a.start, 21) || isInRange(a.finish, 21));
      case 'procurement': return activities.filter(a => a.linked?.some(l => l.type === 'Procurement') && a.status !== 'Complete');
      case 'inspections': return activities.filter(a => a.linked?.some(l => l.type === 'Inspection' || l.type === 'Permit') && a.status !== 'Complete');
      case 'punch': return activities.filter(a => a.linked?.some(l => l.type === 'Punch') || a.phase === 'Punch / Closeout');
      case 'turnover': return activities.filter(a => a.phase === 'Turnover');
      default: return activities;
    }
  }, [activities, view]);

  const filtered = useMemo(
    () => applyFilters(items, st, searchQuery),
    [items, st, searchQuery]
  );
  const showKpis = ['today', 'this-week'].includes(view);

  return (
    <div className="animate-fade-in">
      {showKpis && <KPIRow kpis={getKPIs(activities)} />}
      <div className="flex items-center gap-2.5 mb-3">
        <h2 className="text-[15px] font-bold tracking-tight">{title}</h2>
        <span className="text-[10.5px] text-muted-foreground bg-muted px-2.5 py-0.5 rounded-full font-semibold">{filtered.length}</span>
      </div>
      <FilterBar section={view} activities={items} />
      <ActivityTable items={filtered} mode={st.mode} />
    </div>
  );
}
