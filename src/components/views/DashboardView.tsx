'use client';

import { useAppStore } from '@/hooks/useAppStore';
import { getKPIs, isOverdue, isThisWeek, fmt, applyFilters } from '@/lib/helpers';
import KPIRow from '@/components/ui/KPIRow';
import FilterBar from '@/components/ui/FilterBar';
import ActivityTable from '@/components/ui/ActivityTable';
import StatusBadge from '@/components/ui/StatusBadge';

export default function DashboardView() {
  const { activities, setView, setSelectedActivity, searchQuery, getSectionState } = useAppStore();
  const kpis = getKPIs(activities);

  const overdue = activities.filter((a) => isOverdue(a));
  const thisWeek = activities.filter((a) => isThisWeek(a.start) && a.status !== 'Complete');
  const critical = activities.filter((a) => a.priority === 'Critical' && a.status !== 'Complete');

  return (
    <>
      <KPIRow kpis={kpis} />

      {/* Overdue Section */}
      {overdue.length > 0 && (
        <>
          <div className="section-header">
            <h2 className="section-title">⚠ Overdue Activities</h2>
            <span className="section-count">{overdue.length}</span>
          </div>
          <ActivityTable items={overdue.slice(0, 10)} />
        </>
      )}

      {/* This Week */}
      <div className="section-header">
        <h2 className="section-title">This Week</h2>
        <span className="section-count">{thisWeek.length}</span>
      </div>
      <ActivityTable items={thisWeek.slice(0, 15)} />

      {/* Critical Path */}
      {critical.length > 0 && (
        <>
          <div className="section-header">
            <h2 className="section-title">Critical Path</h2>
            <span className="section-count">{critical.length}</span>
          </div>
          <ActivityTable items={critical.slice(0, 10)} />
        </>
      )}
    </>
  );
}
