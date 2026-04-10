'use client';

import { useAppStore } from '@/hooks/useAppStore';

interface FilterBarProps {
  section: string;
  activities: { trade: string; area: string; status: string; phase: string; floor: string }[];
}

export default function FilterBar({ section, activities }: FilterBarProps) {
  const { getSectionState, setSectionFilter, setSectionMode, clearSectionFilters } = useAppStore();
  const st = getSectionState(section);
  const mode = st.mode;

  const dynTrades = [...new Set(activities.map((a) => a.trade).filter(Boolean))].sort();
  const dynAreas = [...new Set(activities.map((a) => a.area).filter(Boolean))].sort();
  const dynStatuses = [...new Set(activities.map((a) => a.status).filter(Boolean))].sort();
  const dynPhases = [...new Set(activities.map((a) => a.phase).filter(Boolean))].sort();
  const dynFloors = [...new Set(activities.map((a) => a.floor).filter(Boolean))].sort();

  return (
    <div className="filter-bar" data-section={section}>
      <select value={st.trade} onChange={(e) => setSectionFilter(section, 'trade', e.target.value)}>
        <option value="">All Trades ({dynTrades.length})</option>
        {dynTrades.map((t) => <option key={t} value={t}>{t}</option>)}
      </select>
      <select value={st.area} onChange={(e) => setSectionFilter(section, 'area', e.target.value)}>
        <option value="">All Areas ({dynAreas.length})</option>
        {dynAreas.map((a) => <option key={a} value={a}>{a}</option>)}
      </select>
      <select value={st.status} onChange={(e) => setSectionFilter(section, 'status', e.target.value)}>
        <option value="">All Statuses</option>
        {dynStatuses.map((s) => <option key={s} value={s}>{s}</option>)}
      </select>
      {dynPhases.length > 1 && (
        <select value={st.phase} onChange={(e) => setSectionFilter(section, 'phase', e.target.value)}>
          <option value="">All Phases</option>
          {dynPhases.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
      )}
      {dynFloors.length > 1 && (
        <select value={st.floor} onChange={(e) => setSectionFilter(section, 'floor', e.target.value)}>
          <option value="">All Floors</option>
          {dynFloors.map((f) => <option key={f} value={f}>{f}</option>)}
        </select>
      )}
      <div className="view-tabs" style={{ marginLeft: 'auto' }}>
        <button className={`view-tab${mode === 'list' ? ' active' : ''}`} onClick={() => setSectionMode(section, 'list')}>
          &#9776; List
        </button>
        <button className={`view-tab${mode === 'grid' ? ' active' : ''}`} onClick={() => setSectionMode(section, 'grid')}>
          &#9638; Grid
        </button>
      </div>
      <button className="btn-secondary" onClick={() => clearSectionFilters(section)}>Clear</button>
    </div>
  );
}
