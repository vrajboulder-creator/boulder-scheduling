'use client';

import { useAppStore } from '@/hooks/useAppStore';
import { applyFilters } from '@/lib/helpers';
import FilterBar from '@/components/ui/FilterBar';
import ActivityTable from '@/components/ui/ActivityTable';

export default function MasterView() {
  const { activities, searchQuery, getSectionState } = useAppStore();
  const st = getSectionState('master');
  const filtered = applyFilters(activities, st, searchQuery);

  return (
    <>
      <div className="section-header">
        <h2 className="section-title">Master Schedule</h2>
        <span className="section-count">{filtered.length} activities</span>
      </div>
      <FilterBar section="master" activities={activities} />
      <ActivityTable items={filtered} />
    </>
  );
}
