'use client';

import { useAppStore } from '@/hooks/useAppStore';
import { applyFilters, isOverdue, isThisWeek, isInRange, isoDate, TODAY, parseDate, addDays, getKPIs } from '@/lib/helpers';
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
  const { activities, searchQuery, getSectionState } = useAppStore();
  const st = getSectionState(view);
  const title = VIEW_TITLES[view] || 'Activities';

  let items: Activity[];
  switch (view) {
    case 'today': items = activities.filter(a => (isoDate(a.start) === isoDate(TODAY) || isoDate(a.finish) === isoDate(TODAY)) && a.status !== 'Complete'); break;
    case 'this-week': items = activities.filter(a => isThisWeek(a.start) && a.status !== 'Complete'); break;
    case 'delayed': items = activities.filter(a => a.status === 'Delayed'); break;
    case 'blocked': items = activities.filter(a => a.status === 'Blocked' || a.blocker); break;
    case 'in-progress': items = activities.filter(a => a.status === 'In Progress'); break;
    case 'ready': items = activities.filter(a => a.status === 'Ready to Start' || (a.status === 'Not Started' && !a.blocker && parseDate(a.start)! <= addDays(TODAY, 7))); break;
    case 'completed': items = activities.filter(a => a.status === 'Complete'); break;
    case 'milestones': items = activities.filter(a => a.milestone); break;
    case 'lookahead-6': items = activities.filter(a => isInRange(a.start, 42) || isInRange(a.finish, 42)); break;
    case 'lookahead-3': items = activities.filter(a => isInRange(a.start, 21) || isInRange(a.finish, 21)); break;
    case 'procurement': items = activities.filter(a => a.linked?.some(l => l.type === 'Procurement') && a.status !== 'Complete'); break;
    case 'inspections': items = activities.filter(a => a.linked?.some(l => l.type === 'Inspection' || l.type === 'Permit') && a.status !== 'Complete'); break;
    case 'punch': items = activities.filter(a => a.linked?.some(l => l.type === 'Punch') || a.phase === 'Punch / Closeout'); break;
    case 'turnover': items = activities.filter(a => a.phase === 'Turnover'); break;
    default: items = activities;
  }

  const filtered = applyFilters(items, st, searchQuery);
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
