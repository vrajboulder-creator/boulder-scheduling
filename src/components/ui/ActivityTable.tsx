'use client';

import { memo, useState, useMemo, Fragment, useRef, useEffect } from 'react';
import type { Activity, ActivityDB } from '@/types';
import { useAppStore } from '@/hooks/useAppStore';
import { useApi } from '@/hooks/useApi';
import { fmt, isOverdue, getTradeColor, isoDate, addDays, diffDays, TODAY } from '@/lib/helpers';
import { cn } from '@/lib/utils';
import StatusBadge from './StatusBadge';
import PctBar from './PctBar';
import { Badge } from './badge';
import { Card } from './card';
import { Calendar, Clock, MapPin, ChevronRight, ChevronDown, Plus, Check, X, Link2, Layers } from 'lucide-react';
import { AssignButton } from './AssignPopover';

interface Props {
  items: Activity[];
  mode?: 'list' | 'grid';
}

// Extract the phase label from notes field: "Phase: Framing - 1st Floor" → "Framing - 1st Floor"
function getPhaseLabel(a: Activity): string {
  if (a.notes?.startsWith('Phase: ')) return a.notes.slice(7).trim();
  return a.phase || 'Other';
}

// Canonical phase order from CSV (Project Schedule column, [TPSJ] suffix stripped)
const PHASE_ORDER: string[] = [
  'Owner Request for Proposal',
  'Bid Preparation',
  'Bid Submission to Owner',
  'Notice to Proceed',
  'Pre-Construction (2-3 months before Start)',
  'Pre-Mobilization Requirements',
  'Earthwork - Preconstruction',
  'Job Mobilization',
  'Earthwork - Site Prep',
  'Earthwork - Rough Paving',
  'Earthwork - Building Pad',
  'Concrete - Building Pad Form',
  'Plumbing - Underground',
  'Electrical - Underground',
  'Fire Sprinkler -  Fire Riser',
  'Concrete - Footings to Pour',
  'Onsite Utility Pre-Construction Meeting',
  'Utility - Sanitary Sewer',
  'Utility - Irrigation',
  'Utility - Fire Line',
  'Utility - Gas Line',
  'Utility - Sleeves',
  'Utility - Electrical',
  'Earthwork - Final Grading',
  'Concrete - Paving',
  'CMU',
  'Mockup Wall Started',
  'Structural Steel',
  '"Locations Finalized for Framing, MEP Rough"',
  'Framing - 1st Floor',
  'Framing - 2nd Floor',
  'Framing - 3rd Floor',
  'Framing - 4th Floor',
  'Blocking Locations',
  'Framing - Roof',
  'Roof - TPO',
  'Insulate Corridor - 1st Floor',
  'Insulate Corridor - 2nd Floor',
  'Insulate Corridor - 3rd Floor',
  'Insulate Corridor - 4th Floor',
  'Prerock Corridor and Furdown Areas - 1st Floor',
  'Prerock Corridor and Fur Down Areas - 2nd Floor',
  'Prerock Corridor and Fur Down Areas - 3rd Floor',
  'Prerock Corridor and Fur Down Areas - 4th Floor',
  'Swimming Pool Rough to Gunite',
  'Plumbing 1st Floor Top Out',
  'Plumbing - 2nd Floor Top Out',
  'Plumbing - 3rd Floor Top Out',
  'Plumbing - 4th Floor Top Out',
  'Plumbing  - Roof Top Out',
  'Plumbing - Outdoor Top Out (Roof / Canopy Drains)',
  'Plumbing - Dumpster Pad / Work Shop',
  'Gas Rough In - 1st Floor',
  'Gas - Outdoor Rough In',
  'Gas Line',
  'Mechanical 1st Floor Rough',
  'Mechanical 2nd Floor Rough In',
  'Mechanical 3rd Floor Rough In',
  'Mechanical 4th Floor Rough In',
  'Mechanical Roof Rough In',
  'Mechanical Outdoor Rough In',
  'Fire Sprinkler 1st Floor Rough In',
  'Fire Sprinkler 2nd Floor Rough In',
  'Fire Sprinkler 3rd Floor Rough In',
  'Fire Sprinkler 4th Floor Rough In',
  'Fire Sprinkler Roof Concealed Space',
  'Fire Sprinkler Dry System',
  'Fire Sprinkler Stand Alone Pool Equipment / Pool Bathroom',
  'Electrical 1st Floor Rough In',
  'Electrical 2nd Floor Rough In',
  'Electrical 3rd Floor Rough In',
  'Electrical 4th Floor Rough In',
  'Electrical Roof Rough In',
  'Electrical Outdoor Rough In',
  'Structured Cabling 1st Floor Rough',
  'Structured Cabling 2nd Floor Rough',
  'Structured Cabling 3rd Floor Rough',
  'Structured Cabling 4th Floor Rough',
  'Structured Cabling Roof Rough',
  'Fire Alarm 1st Floor Rough In',
  'Fire Alarm 2nd Floor Rough',
  'Fire Alarm 3rd Floor Rough',
  'Fire Alarm 4th Floor Rough',
  'Fire Alarm Roof Rough',
  'Insulation 1st Floor Walls / Ceilings',
  'Insulation - 2nd Floor',
  'Insulation - 3rd Floor',
  'Insulation - 4th Floor',
  'Drywall (Tape/Bed/Sand) - 1st Floor',
  'Drywall (Tape/Bed/Sand) - 2nd Floor',
  'Drywall (Tape/Bed/Sand) - 3rd Floor',
  'Drywall (Tape/Bed/Sand) - 4th Floor',
  'Swimming Pool - Finish Out',
  'Sports Court Install',
  'Wallpaper Corridor - 1st Floor',
  'Tile - Flooring 1st Floor',
  'Tile - Flooring 2nd Floor',
  'Tile - Flooring 3rd Floor',
  'Tile - Flooring 4th Floor',
  'Millwork Install',
  'Fire Sprinkler  - Trim Out 1st Floor',
  'Fire Sprinkler - Trim Out 2nd Floor',
  'Fire Sprinkler - Trim Out 3rd Floor',
  'Fire Sprinkler - Trim Out 4th Floor',
  'Fire Alarm - Trim Out 1st Floor',
  'Fire Alarm - Trim Out 2nd Floor',
  'Fire Alarm - Trim Out 3rd Floor',
  'Fire Alarm - Trim Out 4th Floor',
  'Vanity / Kitchen Cabinets Install - 4th Floor',
  'Vanity / Kitchen Cabinets Install - 3rd Floor',
  'Vanity / Kitchen Cabinets Install - 2nd Floor',
  'Vanity / Kitchen Cabinets Install - 1st Floor',
  'Vanity / Kitchen / Window Sill Granite - 4th Floor',
  'Vanity / Kitchen / Window Sill Granite - 3rd Floor',
  'Vanity / Kitchen / Window Sill Granite - 2nd Floor',
  'Vanity / Kitchen / Window Sill Granite - 1st Floor',
  'Mechanical Trim Out 1st Floor',
  'Mechanical Trim Out 2nd Floor',
  'Mechanical - Trim Out 3rd Floor',
  'Mechanical - Trim Out 4th Floor',
  'FFE Hang Install - 4th Floor',
  'Plumbing Trim Out - 1st Floor',
  'Plumbing Trim Out - 2nd Floor',
  'Plumbing Trim Out - 3rd Floor',
  'Plumbing Trim Out - 4th Floor',
  'Gas Line Trim Out',
  'Electrical - Signage Install',
  'Swimming Pool',
  'FFE Install - 4th Floor',
  'FFE Install - 3rd Floor',
  'FFE Install - 2nd Floor',
  'FFE Install - 1st Floor',
];
const PHASE_RANK = new Map(PHASE_ORDER.map((p, i) => [p, i]));

function ActivityTableInner({ items, mode = 'list' }: Props) {
  const [expandedPhases, setExpandedPhases] = useState<Set<string>>(new Set());
  // id of the activity row that has its subtask panel expanded
  const [expandedActivity, setExpandedActivity] = useState<string | null>(null);
  const [subtaskName, setSubtaskName] = useState('');
  const [savedCount, setSavedCount] = useState(0);
  const [applyAllStatus, setApplyAllStatus] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const [depSearch, setDepSearch] = useState('');
  const [depActivityId, setDepActivityId] = useState<string | null>(null);

  // Predecessor dropdown state: which activity's predecessor cell is open
  const [predDropdownId, setPredDropdownId] = useState<string | null>(null);
  const [predSearch, setPredSearch] = useState('');
  const predDropdownRef = useRef<HTMLTableCellElement>(null);

  useEffect(() => {
    if (!predDropdownId) return;
    const handler = (e: MouseEvent) => {
      if (predDropdownRef.current && !predDropdownRef.current.contains(e.target as Node)) {
        setPredDropdownId(null);
        setPredSearch('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [predDropdownId]);

  const setSelectedActivity = useAppStore((s) => s.setSelectedActivity);
  const openModalWithDefaults = useAppStore((s) => s.openModalWithDefaults);
  const allActivities = useAppStore((s) => s.activities);
  const activityLinks = useAppStore((s) => s.activityLinks);
  const { addActivity, genId, genSubtaskId, currentProjectId, linkActivities, unlinkActivities, updateLinkType, projects } = useAppStore();
  const { createOne, addLink, removeLink, saveOne, updateLinkType: apiUpdateLinkType } = useApi();

  const depResults = useMemo(() => {
    if (!depActivityId || !depSearch.trim()) return [];
    const q = depSearch.toLowerCase();
    const current = allActivities.find((a) => a.id === depActivityId);
    const excluded = new Set([depActivityId, ...(current?.predecessors || [])]);
    return allActivities
      .filter((a) => !excluded.has(a.id) && !a.parent_id &&
        (a.id.toLowerCase().includes(q) || a.name.toLowerCase().includes(q)))
      .slice(0, 6);
  }, [depSearch, depActivityId, allActivities]);

  // Save changed activities with limited concurrency so we never flood the
  // network when a single link shifts hundreds of downstream dates.
  const saveChangedWithLimit = async (ids: string[]) => {
    if (ids.length === 0) return;
    const CONCURRENCY = 5;
    let idx = 0;
    const worker = async () => {
      while (idx < ids.length) {
        const id = ids[idx++];
        try { await saveOne(id); } catch {/* ignore */}
      }
    };
    await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  };

  const diffChangedIds = (before: Activity[], after: Activity[]): string[] => {
    const beforeMap = new Map(before.map((a) => [a.id, a]));
    return after
      .filter((a) => {
        const b = beforeMap.get(a.id);
        return b && (b.start !== a.start || b.finish !== a.finish);
      })
      .map((a) => a.id);
  };

  const handleAddDep = async (activityId: string, predecessorId: string) => {
    const before = useAppStore.getState().activities;
    linkActivities(predecessorId, activityId);
    await addLink(predecessorId, activityId);
    const after = useAppStore.getState().activities;
    await saveChangedWithLimit(diffChangedIds(before, after));
    setDepSearch('');
  };

  const handleRemoveDep = async (activityId: string, predecessorId: string) => {
    const before = useAppStore.getState().activities;
    unlinkActivities(predecessorId, activityId);
    await removeLink(predecessorId, activityId);
    const after = useAppStore.getState().activities;
    await saveChangedWithLimit(diffChangedIds(before, after));
  };

  // Cycle FS → SS → FF → SF → FS on click
  const LINK_CYCLE: Array<'FS' | 'SS' | 'FF' | 'SF'> = ['FS', 'SS', 'FF', 'SF'];
  const handleCycleLinkType = async (activityId: string, predecessorId: string, currentType: 'FS' | 'SS' | 'FF' | 'SF') => {
    const before = useAppStore.getState().activities;
    const idx = LINK_CYCLE.indexOf(currentType);
    const nextType = LINK_CYCLE[(idx + 1) % LINK_CYCLE.length];
    updateLinkType(predecessorId, activityId, nextType);
    await apiUpdateLinkType(predecessorId, activityId, nextType);
    const after = useAppStore.getState().activities;
    await saveChangedWithLimit(diffChangedIds(before, after));
  };

  const getLinkType = (predId: string, succId: string): 'FS' | 'SS' | 'FF' | 'SF' => {
    const link = activityLinks.find((l) => l.predecessor_id === predId && l.successor_id === succId);
    return (link?.link_type as 'FS' | 'SS' | 'FF' | 'SF') || 'FS';
  };

  const toggleActivity = (activityId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (expandedActivity === activityId) {
      setExpandedActivity(null);
      setSubtaskName('');
      setSavedCount(0);
    } else {
      setExpandedActivity(activityId);
      setSubtaskName('');
      setSavedCount(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  };

  const closePanel = () => {
    setExpandedActivity(null);
    setSubtaskName('');
    setSavedCount(0);
  };

  const commitInline = async (parentActivity: Activity) => {
    const trimmed = subtaskName.trim();
    if (!trimmed) { closePanel(); return; }

    const start = isoDate(TODAY);
    const finish = isoDate(addDays(TODAY, 1));
    const newActivity: Activity = {
      id: genSubtaskId(parentActivity.id),
      name: trimmed,
      trade: parentActivity.trade,
      sub: parentActivity.sub,
      area: parentActivity.area,
      floor: parentActivity.floor,
      phase: parentActivity.phase,
      notes: parentActivity.notes,
      start,
      finish,
      duration: diffDays(start, finish),
      hasDate: false,
      status: 'Not Started',
      pct: 0,
      priority: 'Normal',
      blocker: '',
      milestone: false,
      lookahead: false,
      predecessors: [],
      successors: [],
      linked: [],
      attachments: [],
      project_id: currentProjectId,
      parent_id: parentActivity.id,
    };

    addActivity(newActivity);
    setSubtaskName('');
    setSavedCount((n) => n + 1);
    inputRef.current?.focus();
    createOne(newActivity);
  };

  const applyToAllProjects = async (parentActivity: Activity) => {
    const trimmed = subtaskName.trim();
    if (!trimmed) return;
    const otherProjects = Object.values(projects).filter((p) => p.id !== currentProjectId);
    if (!otherProjects.length) { setApplyAllStatus('No other projects'); return; }
    setApplyAllStatus('Applying…');
    let applied = 0;
    for (const proj of otherProjects) {
      try {
        const resp = await fetch(`/api/activities?project_id=${proj.id}`);
        if (!resp.ok) continue;
        const rows: ActivityDB[] = await resp.json();
        const match = rows.find((r) => r.name === parentActivity.name);
        if (!match) continue;
        const existingSubtasks = rows.filter((r) => r.parent_id === match.id).length;
        const newId = `${match.id}-ST-${existingSubtasks + 1}`;
        const start = isoDate(TODAY);
        const finish = isoDate(addDays(TODAY, 1));
        await fetch('/api/activities', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: newId, name: trimmed, trade: match.trade, sub: match.sub,
            area: match.area, floor: match.floor, phase: match.phase,
            start_date: start, finish_date: finish, duration: 1,
            status: 'Not Started', pct: 0, priority: 'Normal',
            project_id: proj.id, parent_id: match.id,
          }),
        });
        applied++;
      } catch { /* skip */ }
    }
    setApplyAllStatus(`Applied to ${applied}/${otherProjects.length} project${otherProjects.length !== 1 ? 's' : ''}`);
    setTimeout(() => setApplyAllStatus(null), 3000);
  };

  // Group by Master Schedule phase — subtasks (parent_id set) excluded from top-level
  const groups = useMemo(() => {
    const topLevel = items.filter((a) => !a.parent_id);
    const map: Record<string, Activity[]> = {};
    topLevel.forEach((a) => {
      const phase = getPhaseLabel(a);
      if (!map[phase]) map[phase] = [];
      map[phase].push(a);
    });
    // Within each phase, sort activities by CSV row order (id numeric suffix)
    // so rows match the source spreadsheet sequence — same as Gantt.
    const csvRowRank = (id: string): number => {
      const m = id.match(/-(\d{3,})(?:-|$)/);
      return m ? parseInt(m[1], 10) : Number.POSITIVE_INFINITY;
    };
    Object.values(map).forEach((arr) =>
      arr.sort((a, b) => {
        const ra = csvRowRank(a.id);
        const rb = csvRowRank(b.id);
        if (ra !== rb) return ra - rb;
        return a.id.localeCompare(b.id);
      })
    );
    // Sort phases by canonical CSV order; unknown phases fall to the end
    // Normalize by stripping trailing " [TPSJ]" in case some DB rows still have it
    const normalize = (p: string) => p.replace(/ \[TPSJ\]$/, '').trim();
    const sorted = Object.keys(map).sort((a, b) => {
      const ra = PHASE_RANK.get(normalize(a)) ?? 9999;
      const rb = PHASE_RANK.get(normalize(b)) ?? 9999;
      return ra - rb;
    });
    return sorted.map((phase) => ({ phase, activities: map[phase] }));
  }, [items]);

  // Map: activity.id → display label like "2-A"
  const labelMap = useMemo(() => {
    const map: Record<string, string> = {};
    groups.forEach(({ activities }, phaseIdx) => {
      activities.forEach((a, actIdx) => {
        const letter = actIdx < 26
          ? String.fromCharCode(65 + actIdx)
          : String.fromCharCode(65 + Math.floor(actIdx / 26) - 1) + String.fromCharCode(65 + (actIdx % 26));
        map[a.id] = `${phaseIdx + 1}-${letter}`;
      });
    });
    return map;
  }, [groups]);

  // Predecessor dropdown filtered results
  const predResults = useMemo(() => {
    if (!predDropdownId) return [];
    const q = predSearch.toLowerCase();
    const current = allActivities.find((a) => a.id === predDropdownId);
    const excluded = new Set([predDropdownId, ...(current?.predecessors || [])]);
    const filtered = allActivities.filter((a) =>
      !excluded.has(a.id) && !a.parent_id && (
        !q ||
        (labelMap[a.id] || '').toLowerCase().includes(q) ||
        a.name.toLowerCase().includes(q)
      )
    );
    return filtered.slice(0, 8);
  }, [predSearch, predDropdownId, allActivities, labelMap]);

  const togglePhase = (phase: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedPhases((prev) => {
      const next = new Set(prev);
      next.has(phase) ? next.delete(phase) : next.add(phase);
      return next;
    });
  };

  if (!items.length) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground text-sm">
        No activities match your filters.
      </div>
    );
  }

  // ─── CARD / GRID VIEW ───
  if (mode === 'grid') {
    // Use the same phase-sorted order as the list view (flattened from groups)
    const gridItems = groups.flatMap(({ activities }) => activities);
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {gridItems.map((a) => {
          const color = getTradeColor(a.trade);
          const actLabel = labelMap[a.id] ?? a.id;
          return (
            <Card
              key={a.id}
              onClick={() => setSelectedActivity(a.id)}
              className={cn(
                'p-3 cursor-pointer hover:shadow-md hover:-translate-y-0.5 transition-all border-l-[3px] relative overflow-hidden',
                isOverdue(a) ? 'border-l-red-500 bg-red-50/50' : ''
              )}
              style={{ borderLeftColor: isOverdue(a) ? undefined : color }}
            >
              {/* Priority dot */}
              <span className={cn('absolute top-3 right-3 h-2 w-2 rounded-full block', `priority-${a.priority.toLowerCase()}`)} title={a.priority} />

              {/* Header: label + name + status */}
              <div className="flex items-start justify-between gap-2 mb-1.5 pr-4">
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-mono text-muted-foreground">{actLabel}</p>
                  <h4 className="text-[12.5px] font-semibold leading-tight truncate mt-0.5">
                    {a.milestone && <span className="text-primary mr-1">◆</span>}
                    {a.name}
                  </h4>
                </div>
                <StatusBadge status={a.status} />
              </div>

              {/* Trade */}
              <div className="flex items-center gap-1.5 mb-1.5">
                <span className="inline-block w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
                <span className="text-[11px] font-medium text-muted-foreground truncate">{a.trade}</span>
                {a.sub && <span className="text-[10px] text-muted-foreground/60 truncate">· {a.sub}</span>}
              </div>

              {/* Predecessor */}
              {(a.predecessors || []).length > 0 && (
                <div className="flex items-center gap-1 mb-1.5 flex-wrap">
                  <Link2 className="h-3 w-3 text-blue-400 shrink-0" />
                  {(a.predecessors).map((pid) => (
                    <span
                      key={pid}
                      className="text-[10px] font-mono bg-blue-50 text-blue-700 border border-blue-200 rounded px-1.5 py-0.5"
                      title={allActivities.find((x) => x.id === pid)?.name ?? pid}
                    >
                      {labelMap[pid] ?? pid}
                    </span>
                  ))}
                </div>
              )}

              {/* Dates + Duration */}
              <div className="flex items-center gap-3 text-[10.5px] text-muted-foreground mb-1.5">
                <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{fmt(a.start)} – {fmt(a.finish)}</span>
                <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{a.duration}d</span>
              </div>

              {/* Area + Floor */}
              {(a.area || a.floor) && (
                <div className="flex items-center gap-1 text-[10px] text-muted-foreground mb-1.5">
                  <MapPin className="h-3 w-3" />
                  {a.area}{a.floor ? ` · ${a.floor}` : ''}
                </div>
              )}

              {/* Progress */}
              <PctBar pct={a.pct} />

              {/* Blocker */}
              {a.blocker && <Badge variant="danger" className="mt-1.5 text-[9px]">{a.blocker}</Badge>}
            </Card>
          );
        })}
      </div>
    );
  }

  // ─── TABLE / LIST VIEW ───
  return (
    <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-[12.5px]">
          <thead>
            <tr className="bg-muted/50 border-b">
              <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">ID</th>
              <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Activity / Sub-Task</th>
              <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground hidden lg:table-cell">Predecessor</th>
              <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground hidden lg:table-cell" title="Link Types: FS=Finish-to-Start, SS=Start-to-Start, FF=Finish-to-Finish, SF=Start-to-Finish">Link Type</th>
              <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Trade</th>
              <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground hidden lg:table-cell">Area</th>
              <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Start</th>
              <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Finish</th>
              <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground hidden md:table-cell">Dur</th>
              <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Status</th>
              <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Progress</th>
              <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground hidden xl:table-cell">Priority</th>
            </tr>
          </thead>
          <tbody>
            {groups.map(({ phase, activities }, phaseIdx) => {
              const isPhaseOpen = expandedPhases.has(phase);
              const color = getTradeColor(activities[0]?.trade ?? '');

              return (
                <Fragment key={phase}>
                  {/* ── Level 1: Phase group header row ── */}
                  <tr
                    onClick={(e) => togglePhase(phase, e)}
                    className="border-b border-border/50 cursor-pointer select-none bg-muted/40 hover:bg-muted/70 transition-colors"
                  >
                    <td className="px-3 py-2.5 font-mono text-[10px] text-muted-foreground/50">
                      {phaseIdx + 1}
                    </td>
                    <td className="px-3 py-2.5" colSpan={11}>
                      <div className="flex items-center gap-2">
                        <ChevronRight
                          className={cn(
                            'h-3.5 w-3.5 text-muted-foreground shrink-0 transition-transform duration-150',
                            isPhaseOpen && 'rotate-90'
                          )}
                        />
                        <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
                        <span className="text-[12px] font-semibold text-foreground">{phase}</span>
                        <span className="text-[10px] text-muted-foreground ml-1">
                          {activities.length} activit{activities.length !== 1 ? 'ies' : 'y'}
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            openModalWithDefaults({ notes: `Phase: ${phase}`, phase });
                          }}
                          className="ml-auto flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium text-primary hover:bg-primary/10 transition-colors"
                          title={`Add activity to ${phase}`}
                        >
                          <Plus className="h-3 w-3" /> Add Activity
                        </button>
                      </div>
                    </td>
                  </tr>

                  {/* ── Level 2: Activity rows ── */}
                  {isPhaseOpen && activities.map((a, actIdx) => {
                    const subtasks = allActivities.filter((s) => s.parent_id === a.id);
                    const isExpanded = expandedActivity === a.id;
                    // Label: phase number + letter (A, B, C... Z, AA, AB...)
                    const letterIdx = actIdx;
                    const letter = letterIdx < 26
                      ? String.fromCharCode(65 + letterIdx)
                      : String.fromCharCode(65 + Math.floor(letterIdx / 26) - 1) + String.fromCharCode(65 + (letterIdx % 26));
                    const actLabel = `${phaseIdx + 1}-${letter}`;

                    return (
                      <Fragment key={a.id}>
                        {/* Activity row */}
                        <tr
                          onClick={() => setSelectedActivity(a.id)}
                          className={cn(
                            'border-b border-border/40 cursor-pointer transition-colors hover:bg-primary/5 hover:shadow-[inset_3px_0_0_hsl(var(--primary))]',
                            isOverdue(a) && 'bg-red-50 hover:bg-red-100',
                            isExpanded && 'bg-primary/5 border-b-0'
                          )}
                        >
                          <td className="pl-8 pr-1 py-2 font-mono text-[11px] text-muted-foreground whitespace-nowrap">
                            <div className="flex items-center gap-1.5">
                              {/* Arrow to expand/collapse subtasks */}
                              <button
                                onClick={(e) => toggleActivity(a.id, e)}
                                className={cn(
                                  'p-0.5 rounded transition-all shrink-0',
                                  subtasks.length > 0 || isExpanded
                                    ? 'text-primary hover:bg-primary/10'
                                    : 'text-muted-foreground/30 hover:bg-muted hover:text-muted-foreground'
                                )}
                                title={isExpanded ? 'Collapse subtasks' : 'Expand subtasks'}
                              >
                                {isExpanded
                                  ? <ChevronDown className="h-3 w-3" />
                                  : <ChevronRight className="h-3 w-3" />
                                }
                              </button>
                              <span>{actLabel}</span>
                              {subtasks.length > 0 && (
                                <span className="text-[9px] font-semibold text-primary bg-primary/10 rounded-full px-1.5 py-0.5 leading-none">
                                  {subtasks.length}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-3 py-2 font-medium min-w-[200px] max-w-[360px]">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="truncate">
                                {a.milestone && <span className="text-primary mr-1">◆</span>}
                                {a.name}
                              </span>
                            </div>
                            {a.blocker && (
                              <Badge variant="danger" className="mt-0.5 text-[9px] px-1.5 py-0">{a.blocker}</Badge>
                            )}
                          </td>
                          <td
                            className="px-3 py-2 hidden lg:table-cell max-w-[140px] relative"
                            onClick={(e) => e.stopPropagation()}
                            ref={predDropdownId === a.id ? predDropdownRef : undefined}
                          >
                            {/* Show existing predecessor labels as removable pills with link type badge */}
                            <div className="flex flex-wrap gap-0.5 mb-0.5">
                              {(a.predecessors || []).map((pid) => {
                                const lt = getLinkType(pid, a.id);
                                return (
                                  <span
                                    key={pid}
                                    className="inline-flex items-center gap-0.5 text-[10px] bg-blue-50 text-blue-700 border border-blue-200 rounded px-1 py-0.5 font-mono"
                                    title={`${allActivities.find((x) => x.id === pid)?.name ?? pid} • ${lt} (click badge to cycle type)`}
                                  >
                                    <span>{labelMap[pid] ?? pid}</span>
                                    <button
                                      onClick={(e) => { e.stopPropagation(); handleCycleLinkType(a.id, pid, lt); }}
                                      className="ml-0.5 px-1 rounded bg-blue-100 hover:bg-blue-200 text-[9px] font-bold transition-colors"
                                    >
                                      {lt}
                                    </button>
                                    <button
                                      onClick={() => handleRemoveDep(a.id, pid)}
                                      className="ml-0.5 hover:text-red-500 transition-colors"
                                    >
                                      <X className="h-2 w-2" />
                                    </button>
                                  </span>
                                );
                              })}
                            </div>
                            {/* Trigger button */}
                            <button
                              onClick={() => { setPredDropdownId(predDropdownId === a.id ? null : a.id); setPredSearch(''); }}
                              className="text-[10px] text-muted-foreground/50 hover:text-primary transition-colors flex items-center gap-0.5"
                            >
                              <Plus className="h-2.5 w-2.5" />
                              <span>{(a.predecessors || []).length === 0 ? 'Add' : 'Edit'}</span>
                            </button>
                            {/* Dropdown */}
                            {predDropdownId === a.id && (
                              <div className="absolute z-30 left-0 top-full mt-1 w-64 bg-background border border-border rounded-lg shadow-xl overflow-hidden">
                                <div className="px-2 py-1.5 border-b border-border/60">
                                  <input
                                    autoFocus
                                    value={predSearch}
                                    onChange={(e) => setPredSearch(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Escape' && setPredDropdownId(null)}
                                    placeholder="Search ID or name…"
                                    className="w-full text-[11px] bg-transparent outline-none text-foreground placeholder:text-muted-foreground/40"
                                  />
                                </div>
                                <div className="max-h-48 overflow-y-auto">
                                  {predResults.length === 0 ? (
                                    <div className="px-3 py-2 text-[11px] text-muted-foreground/50">No results</div>
                                  ) : predResults.map((r) => (
                                    <button
                                      key={r.id}
                                      onClick={() => { handleAddDep(a.id, r.id); setPredDropdownId(null); }}
                                      className="w-full flex items-center gap-2 px-3 py-1.5 text-left hover:bg-primary/5 transition-colors border-b border-border/30 last:border-0"
                                    >
                                      <span className="font-mono text-[10px] text-blue-600 shrink-0 w-8">{labelMap[r.id] ?? r.id}</span>
                                      <span className="flex-1 text-[11px] truncate">{r.name}</span>
                                    </button>
                                  ))}
                                </div>
                              </div>
                            )}
                          </td>
                          <td className="px-3 py-2 hidden lg:table-cell" onClick={(e) => e.stopPropagation()}>
                            {(a.predecessors || []).length === 0 ? (
                              <span className="text-[10px] text-muted-foreground/40">—</span>
                            ) : (
                              <div className="flex flex-wrap gap-0.5">
                                {(a.predecessors || []).map((pid) => {
                                  const lt = getLinkType(pid, a.id);
                                  return (
                                    <button
                                      key={pid}
                                      onClick={() => handleCycleLinkType(a.id, pid, lt)}
                                      className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 transition-colors"
                                      title={`${labelMap[pid] ?? pid} → ${labelMap[a.id] ?? a.id}: ${lt}. Click to cycle FS → SS → FF → SF.`}
                                    >
                                      {lt}
                                    </button>
                                  );
                                })}
                              </div>
                            )}
                          </td>
                          <td className="px-3 py-2">
                            <span className="inline-flex items-center text-[10.5px] font-medium pl-2 border-l-2" style={{ borderColor: getTradeColor(a.trade) }}>
                              {a.trade}
                            </span>
                          </td>
                          <td className="px-3 py-2 hidden lg:table-cell text-muted-foreground">
                            {a.area && a.area !== phase ? a.area : <span className="text-muted-foreground/30">—</span>}
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap">{fmt(a.start)}</td>
                          <td className="px-3 py-2 whitespace-nowrap">{fmt(a.finish)}</td>
                          <td className="px-3 py-2 hidden md:table-cell text-muted-foreground">{a.duration}d</td>
                          <td className="px-3 py-2"><StatusBadge status={a.status} /></td>
                          <td className="px-3 py-2"><PctBar pct={a.pct} /></td>
                          <td className="px-3 py-2 hidden xl:table-cell">
                            <div className="flex items-center gap-1.5">
                              <span className={cn('h-2 w-2 rounded-full', `priority-${a.priority.toLowerCase()}`)} />
                              <span className="text-[11px]">{a.priority}</span>
                            </div>
                          </td>
                        </tr>

                        {/* ── Subtask panel — shown when arrow is clicked ── */}
                        {isExpanded && (
                          <tr className="border-b border-primary/20 bg-primary/[0.03]">
                            <td className="pl-8 pr-1 py-0" />
                            <td className="px-3 py-3" colSpan={11}>
                              {/* Existing subtasks list */}
                              {subtasks.length > 0 && (
                                <div className="mb-3 space-y-1">
                                  {subtasks.map((s, sIdx) => (
                                    <div
                                      key={s.id}
                                      onClick={(e) => { e.stopPropagation(); setSelectedActivity(s.id); }}
                                      className="flex items-center gap-2 text-[11.5px] py-1 px-2 rounded hover:bg-primary/10 cursor-pointer transition-colors group/sub"
                                    >
                                      <span className="w-0.5 h-4 bg-primary/30 rounded-full shrink-0" />
                                      <span className="font-mono text-[10px] text-primary/70 shrink-0">{actLabel}.{sIdx + 1}</span>
                                      <span className="flex-1 truncate font-medium">{s.name}</span>
                                      <div className="flex-1 flex justify-center">
                                        <AssignButton subtaskId={s.id} assigneeId={s.assignee_id} />
                                      </div>
                                      <StatusBadge status={s.status} />
                                      <span className="text-[10px] text-muted-foreground shrink-0">{fmt(s.start)} – {fmt(s.finish)}</span>
                                    </div>
                                  ))}
                                </div>
                              )}

                              {/* ── Dependencies section ── */}
                              <div className="mb-3">
                                <div className="flex items-center gap-1.5 mb-1.5">
                                  <Link2 className="h-3 w-3 text-muted-foreground/60" />
                                  <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">Predecessors</span>
                                </div>
                                {/* Existing predecessor chips */}
                                {(a.predecessors || []).length > 0 && (
                                  <div className="flex flex-wrap gap-1.5 mb-2">
                                    {(a.predecessors || []).map((pid) => {
                                      const pred = allActivities.find((x) => x.id === pid);
                                      return (
                                        <span key={pid} className="inline-flex items-center gap-1 text-[10.5px] bg-blue-50 text-blue-700 border border-blue-200 rounded-full px-2 py-0.5">
                                          <span className="font-mono text-[9.5px] text-blue-500">{pid}</span>
                                          {pred && <span className="truncate max-w-[120px]">{pred.name}</span>}
                                          {pred && <span className="text-blue-400 text-[9px]">→ {fmt(pred.finish)}</span>}
                                          <button
                                            onClick={(e) => { e.stopPropagation(); handleRemoveDep(a.id, pid); }}
                                            className="ml-0.5 hover:text-red-500 transition-colors"
                                            title="Remove dependency"
                                          >
                                            <X className="h-2.5 w-2.5" />
                                          </button>
                                        </span>
                                      );
                                    })}
                                  </div>
                                )}
                                {/* Search to add predecessor */}
                                <div className="relative">
                                  <div className="flex items-center gap-2 bg-background border border-border/60 rounded-lg px-3 py-1.5">
                                    <Link2 className="h-3 w-3 text-muted-foreground/40 shrink-0" />
                                    <input
                                      value={depActivityId === a.id ? depSearch : ''}
                                      onFocus={() => setDepActivityId(a.id)}
                                      onChange={(e) => { setDepActivityId(a.id); setDepSearch(e.target.value); }}
                                      onKeyDown={(e) => e.key === 'Escape' && setDepSearch('')}
                                      placeholder="Search activity ID or name to add predecessor…"
                                      className="flex-1 text-[11.5px] bg-transparent border-none outline-none text-foreground placeholder:text-muted-foreground/40"
                                    />
                                  </div>
                                  {depActivityId === a.id && depResults.length > 0 && (
                                    <div className="absolute z-20 left-0 right-0 mt-1 bg-background border border-border rounded-lg shadow-lg overflow-hidden">
                                      {depResults.map((r) => (
                                        <button
                                          key={r.id}
                                          onClick={(e) => { e.stopPropagation(); handleAddDep(a.id, r.id); }}
                                          className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-primary/5 transition-colors border-b border-border/40 last:border-0"
                                        >
                                          <span className="font-mono text-[10px] text-muted-foreground shrink-0">{r.id}</span>
                                          <span className="flex-1 text-[11.5px] truncate">{r.name}</span>
                                          <span className="text-[10px] text-muted-foreground shrink-0">{fmt(r.finish)}</span>
                                        </button>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* Add subtask input */}
                              <div className="flex items-center gap-2 bg-background border border-border/60 rounded-lg px-3 py-2">
                                <Plus className="h-3.5 w-3.5 text-primary/60 shrink-0" />
                                <input
                                  ref={inputRef}
                                  value={subtaskName}
                                  onChange={(e) => setSubtaskName(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') commitInline(a);
                                    if (e.key === 'Escape') closePanel();
                                  }}
                                  placeholder="New subtask name — Enter to add, Esc to close…"
                                  className="flex-1 text-[12px] bg-transparent border-none outline-none text-foreground placeholder:text-muted-foreground/40"
                                />
                                {savedCount > 0 && (
                                  <span className="text-[10px] text-emerald-600 font-semibold shrink-0 bg-emerald-50 px-2 py-0.5 rounded-full">
                                    +{savedCount} added
                                  </span>
                                )}
                                {applyAllStatus && (
                                  <span className="text-[10px] text-blue-600 font-semibold shrink-0 bg-blue-50 px-2 py-0.5 rounded-full whitespace-nowrap">
                                    {applyAllStatus}
                                  </span>
                                )}
                                <button
                                  onClick={() => commitInline(a)}
                                  className="p-1 rounded hover:bg-primary/20 text-primary transition-colors shrink-0"
                                  title="Save subtask to this project"
                                >
                                  <Check className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  onClick={() => applyToAllProjects(a)}
                                  disabled={!subtaskName.trim()}
                                  className="flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded bg-orange-50 text-orange-600 border border-orange-200 hover:bg-orange-100 transition-colors shrink-0 disabled:opacity-30 disabled:cursor-not-allowed"
                                  title="Add this subtask to all projects"
                                >
                                  <Layers className="h-3 w-3" />
                                  All Projects
                                </button>
                                <button
                                  onClick={closePanel}
                                  className="p-1 rounded hover:bg-muted text-muted-foreground transition-colors shrink-0"
                                  title="Close"
                                >
                                  <X className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const ActivityTable = memo(ActivityTableInner);
export default ActivityTable;
