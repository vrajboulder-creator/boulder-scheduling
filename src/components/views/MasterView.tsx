'use client';

import { useAppStore } from '@/hooks/useAppStore';
import { applyFilters } from '@/lib/helpers';
import FilterBar from '@/components/ui/FilterBar';
import ActivityTable from '@/components/ui/ActivityTable';
import { List } from 'lucide-react';

export default function MasterView() {
  const { activities, searchQuery, getSectionState } = useAppStore();
  const st = getSectionState('master');
  const filtered = applyFilters(activities, st, searchQuery);

  return (
    <div className="animate-fade-in">
      <div className="flex items-center gap-2.5 mb-3">
        <List className="h-4 w-4 text-primary" />
        <h2 className="text-[15px] font-bold tracking-tight">Master Schedule</h2>
        <span className="text-[10.5px] text-muted-foreground bg-muted px-2.5 py-0.5 rounded-full font-semibold">{filtered.length} activities</span>
      </div>
      <FilterBar section="master" activities={activities} />
      <ActivityTable items={filtered} mode={st.mode} />
    </div>
  );
}
