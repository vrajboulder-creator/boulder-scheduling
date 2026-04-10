'use client';

import { useAppStore } from '@/hooks/useAppStore';
import { applyFilters, isOverdue, isThisWeek, isInRange, isoDate, TODAY, parseDate, addDays } from '@/lib/helpers';
import type { Activity, ViewType } from '@/types';
import FilterBar from '@/components/ui/FilterBar';
import ActivityTable from '@/components/ui/ActivityTable';
import KPIRow from '@/components/ui/KPIRow';
import { getKPIs } from '@/lib/helpers';

interface FilteredViewProps {
  view: ViewType;
}

export default function FilteredView({ view }: FilteredViewProps) {
  const { activities, searchQuery, getSectionState } = useAppStore();
  const st = getSectionState(view);

  let title = '';
  let items: Activity[] = [];

  switch (view) {
    case 'today':
      title = 'Today\'s Activities';
      items = activities.filter((a) =>
        (isoDate(a.start) === isoDate(TODAY) || isoDate(a.finish) === isoDate(TODAY)) && a.status !== 'Complete'
      );
      break;
    case 'this-week':
      title = 'This Week';
      items = activities.filter((a) => isThisWeek(a.start) && a.status !== 'Complete');
      break;
    case 'delayed':
      title = 'Delayed Activities';
      items = activities.filter((a) => a.status === 'Delayed');
      break;
    case 'blocked':
      title = 'Blocked Activities';
      items = activities.filter((a) => a.status === 'Blocked' || a.blocker);
      break;
    case 'in-progress':
      title = 'In Progress';
      items = activities.filter((a) => a.status === 'In Progress');
      break;
    case 'ready':
      title = 'Ready to Start';
      items = activities.filter((a) =>
        a.status === 'Ready to Start' ||
        (a.status === 'Not Started' && !a.blocker && parseDate(a.start)! <= addDays(TODAY, 7))
      );
      break;
    case 'completed':
      title = 'Completed Activities';
      items = activities.filter((a) => a.status === 'Complete');
      break;
    case 'milestones':
      title = 'Milestones';
      items = activities.filter((a) => a.milestone);
      break;
    case 'lookahead-6':
      title = '6-Week Lookahead';
      items = activities.filter((a) => isInRange(a.start, 42) || isInRange(a.finish, 42));
      break;
    case 'lookahead-3':
      title = '3-Week Lookahead';
      items = activities.filter((a) => isInRange(a.start, 21) || isInRange(a.finish, 21));
      break;
    case 'by-trade':
      title = 'Activities by Trade';
      items = activities;
      break;
    case 'by-area':
      title = 'Activities by Area / Floor';
      items = activities;
      break;
    case 'by-sub':
      title = 'Activities by Subcontractor';
      items = activities;
      break;
    case 'procurement':
      title = 'Procurement / Long Lead';
      items = activities.filter((a) => a.linked?.some((l) => l.type === 'Procurement') && a.status !== 'Complete');
      break;
    case 'inspections':
      title = 'Inspections & Permits';
      items = activities.filter((a) =>
        a.linked?.some((l) => l.type === 'Inspection' || l.type === 'Permit') && a.status !== 'Complete'
      );
      break;
    case 'punch':
      title = 'Punch / Closeout';
      items = activities.filter((a) => a.linked?.some((l) => l.type === 'Punch') || a.phase === 'Punch / Closeout');
      break;
    case 'turnover':
      title = 'Area Turnover';
      items = activities.filter((a) => a.phase === 'Turnover');
      break;
    default:
      title = 'Activities';
      items = activities;
  }

  const filtered = applyFilters(items, st, searchQuery);
  const showKpis = ['today', 'this-week'].includes(view);

  return (
    <>
      {showKpis && <KPIRow kpis={getKPIs(activities)} />}
      <div className="section-header">
        <h2 className="section-title">{title}</h2>
        <span className="section-count">{filtered.length}</span>
      </div>
      <FilterBar section={view} activities={items} />
      <ActivityTable items={filtered} />
    </>
  );
}
