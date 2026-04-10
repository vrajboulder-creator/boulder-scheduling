'use client';

import { useAppStore } from '@/hooks/useAppStore';
import { Button } from '@/components/ui/button';
import { SelectNative } from '@/components/ui/select-native';
import { List, LayoutGrid, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FilterBarProps {
  section: string;
  activities: { trade: string; area: string; status: string; phase: string; floor: string }[];
}

export default function FilterBar({ section, activities }: FilterBarProps) {
  const { getSectionState, setSectionFilter, setSectionMode, clearSectionFilters } = useAppStore();
  const st = getSectionState(section);

  const dynTrades = [...new Set(activities.map((a) => a.trade).filter(Boolean))].sort();
  const dynAreas = [...new Set(activities.map((a) => a.area).filter(Boolean))].sort();
  const dynStatuses = [...new Set(activities.map((a) => a.status).filter(Boolean))].sort();
  const dynPhases = [...new Set(activities.map((a) => a.phase).filter(Boolean))].sort();
  const dynFloors = [...new Set(activities.map((a) => a.floor).filter(Boolean))].sort();

  return (
    <div className="flex items-center gap-2 mb-3.5 flex-wrap">
      <SelectNative value={st.trade} onChange={(e) => setSectionFilter(section, 'trade', e.target.value)} className="w-auto min-w-[130px] text-xs">
        <option value="">All Trades ({dynTrades.length})</option>
        {dynTrades.map((t) => <option key={t}>{t}</option>)}
      </SelectNative>
      <SelectNative value={st.area} onChange={(e) => setSectionFilter(section, 'area', e.target.value)} className="w-auto min-w-[120px] text-xs">
        <option value="">All Areas ({dynAreas.length})</option>
        {dynAreas.map((a) => <option key={a}>{a}</option>)}
      </SelectNative>
      <SelectNative value={st.status} onChange={(e) => setSectionFilter(section, 'status', e.target.value)} className="w-auto min-w-[120px] text-xs">
        <option value="">All Statuses</option>
        {dynStatuses.map((s) => <option key={s}>{s}</option>)}
      </SelectNative>
      {dynPhases.length > 1 && (
        <SelectNative value={st.phase} onChange={(e) => setSectionFilter(section, 'phase', e.target.value)} className="w-auto min-w-[110px] text-xs">
          <option value="">All Phases</option>
          {dynPhases.map((p) => <option key={p}>{p}</option>)}
        </SelectNative>
      )}
      {dynFloors.length > 1 && (
        <SelectNative value={st.floor} onChange={(e) => setSectionFilter(section, 'floor', e.target.value)} className="w-auto min-w-[100px] text-xs">
          <option value="">All Floors</option>
          {dynFloors.map((f) => <option key={f}>{f}</option>)}
        </SelectNative>
      )}

      {/* View toggle */}
      <div className="ml-auto flex items-center bg-muted rounded-lg p-0.5 gap-0.5">
        <button
          onClick={() => setSectionMode(section, 'list')}
          className={cn("p-1.5 rounded-md transition-all text-xs", st.mode === 'list' ? "bg-card shadow-sm text-primary font-semibold" : "text-muted-foreground hover:text-primary")}
        >
          <List className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={() => setSectionMode(section, 'grid')}
          className={cn("p-1.5 rounded-md transition-all text-xs", st.mode === 'grid' ? "bg-card shadow-sm text-primary font-semibold" : "text-muted-foreground hover:text-primary")}
        >
          <LayoutGrid className="h-3.5 w-3.5" />
        </button>
      </div>

      <Button variant="outline" size="sm" onClick={() => clearSectionFilters(section)} className="gap-1 text-xs">
        <X className="h-3 w-3" /> Clear
      </Button>
    </div>
  );
}
