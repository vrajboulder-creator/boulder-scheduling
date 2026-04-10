'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { useAppStore } from '@/hooks/useAppStore';
import { useApi, debouncedSave } from '@/hooks/useApi';
import { parseDate, addDays, diffDays, isoDate, fmt, TODAY, getTradeColor, applyFilters } from '@/lib/helpers';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { SelectNative } from '@/components/ui/select-native';
import { Minus, Plus, Maximize2, Minimize2, BarChart3, PanelRightOpen, PanelRightClose, X, CalendarRange } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SUBS } from '@/data/constants';
import type { Activity } from '@/types';

const ROW_H = 28;
const BAR_H = 20;
const BAR_Y = 4;
const TRADE_H = 30;

// ─── DATE RANGE PRESETS ───
type DatePreset = 'all' | 'this-week' | 'this-month' | '3-months' | 'custom';
function getPresetRange(preset: DatePreset, allActs: Activity[]): { from: Date; to: Date } | null {
  const now = new Date(); now.setHours(0, 0, 0, 0);
  switch (preset) {
    case 'this-week': {
      const start = addDays(now, -now.getDay());
      return { from: start, to: addDays(start, 6) };
    }
    case 'this-month': {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      return { from: start, to: end };
    }
    case '3-months': {
      return { from: addDays(now, -7), to: addDays(now, 90) };
    }
    case 'all':
    default:
      return null; // use full project range
  }
}

export default function GanttView() {
  const {
    activities, ganttPxPerDay, setGanttPxPerDay,
    ganttFullscreen, setGanttFullscreen,
    ganttSidebarOn, setGanttSidebarOn,
    setSelectedActivity, updateActivity, showToast,
    getSectionState, setSectionFilter, clearSectionFilters, searchQuery,
  } = useAppStore();
  const { saveOne } = useApi();
  const timelineRef = useRef<HTMLDivElement>(null);
  const leftPanelRef = useRef<HTMLDivElement>(null);
  const dateGuideRef = useRef<HTMLDivElement>(null);
  const dateLabelRef = useRef<HTMLDivElement>(null);
  const pxDay = ganttPxPerDay;

  // ─── DATE RANGE STATE ───
  const [datePreset, setDatePreset] = useState<DatePreset>('all');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');

  // ─── FILTERS ───
  const st = getSectionState('gantt');
  const allFiltered = applyFilters(activities, st, searchQuery).filter((a) => a.start || a.finish);

  // Apply date range filter
  const presetRange = datePreset === 'custom'
    ? (customFrom && customTo ? { from: parseDate(customFrom)!, to: parseDate(customTo)! } : null)
    : getPresetRange(datePreset, allFiltered);

  const filtered = presetRange
    ? allFiltered.filter((a) => {
        const s = parseDate(a.start || a.finish);
        const f = parseDate(a.finish || a.start);
        if (!s || !f) return false;
        return f >= presetRange.from && s <= presetRange.to;
      })
    : allFiltered;

  const dynTrades = [...new Set(activities.map((a) => a.trade).filter(Boolean))].sort();
  const dynAreas = [...new Set(activities.map((a) => a.area).filter(Boolean))].sort();
  const dynStatuses = [...new Set(activities.map((a) => a.status).filter(Boolean))].sort();
  const dynPhases = [...new Set(activities.map((a) => a.phase).filter(Boolean))].sort();

  // Group by trade
  const grouped: Record<string, Activity[]> = {};
  [...filtered].sort((a, b) => {
    const sa = parseDate(a.start || a.finish)?.getTime() || 0;
    const sb = parseDate(b.start || b.finish)?.getTime() || 0;
    return sa - sb;
  }).forEach((a) => { (grouped[a.trade] = grouped[a.trade] || []).push(a); });
  const trades = Object.keys(grouped);

  // Date range for timeline
  const allTimes = filtered.flatMap((a) => [parseDate(a.start || a.finish)?.getTime() || 0, parseDate(a.finish || a.start)?.getTime() || 0]).filter((t) => t > 0);
  const hasData = allTimes.length > 0;

  const projStart = hasData ? (presetRange ? addDays(presetRange.from, -3) : addDays(new Date(Math.min(...allTimes)), -7)) : TODAY;
  const projEnd = hasData ? (presetRange ? addDays(presetRange.to, 3) : addDays(new Date(Math.max(...allTimes)), 14)) : addDays(TODAY, 30);
  const totalDays = Math.max(7, diffDays(projStart, projEnd));
  const timelineW = totalDays * pxDay;

  // Flat rows
  interface RowData { type: 'trade' | 'activity'; trade: string; activity?: Activity; idx: number }
  const rows: RowData[] = [];
  let flatIdx = 0;
  trades.forEach((trade) => {
    rows.push({ type: 'trade', trade, idx: flatIdx++ });
    grouped[trade].forEach((act) => { rows.push({ type: 'activity', trade, activity: act, idx: flatIdx++ }); });
  });

  // ─── DATE GUIDE HELPERS ───
  function showDateGuideAtPx(xPos: number) {
    try {
      const guide = dateGuideRef.current;
      const label = dateLabelRef.current;
      if (!guide || !label || !hasData) return;
      const dayOffset = Math.round(xPos / pxDay);
      const snappedX = dayOffset * pxDay;
      const guideDate = addDays(projStart, dayOffset);

      guide.style.display = 'block';
      guide.style.left = `${snappedX}px`;
      label.style.display = 'block';
      label.style.left = `${snappedX - 30}px`;
      label.textContent = guideDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch { /* ignore — guide is non-critical */ }
  }

  function showDateGuide(clientX: number) {
    try {
      const tl = timelineRef.current;
      if (!tl || !hasData) return;
      const rect = tl.getBoundingClientRect();
      const xInTimeline = clientX - rect.left + tl.scrollLeft;
      showDateGuideAtPx(xInTimeline);
    } catch { /* ignore */ }
  }

  function hideDateGuide() {
    try {
      if (dateGuideRef.current) dateGuideRef.current.style.display = 'none';
      if (dateLabelRef.current) dateLabelRef.current.style.display = 'none';
    } catch { /* ignore */ }
  }

  // Scroll to today on mount
  useEffect(() => {
    if (timelineRef.current) {
      timelineRef.current.scrollLeft = Math.max(0, diffDays(projStart, TODAY) * pxDay - 200);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Ctrl+wheel zoom
  const handleWheel = useCallback((e: WheelEvent) => {
    if (e.ctrlKey || e.metaKey) { e.preventDefault(); setGanttPxPerDay(pxDay + (e.deltaY > 0 ? -2 : 2)); }
  }, [pxDay, setGanttPxPerDay]);

  useEffect(() => {
    const el = timelineRef.current;
    if (el) { el.addEventListener('wheel', handleWheel, { passive: false }); return () => el.removeEventListener('wheel', handleWheel); }
  }, [handleWheel]);

  // Sync vertical scroll
  useEffect(() => {
    const left = leftPanelRef.current;
    const right = timelineRef.current;
    if (!left || !right) return;
    let syncing = false;
    const sync = (src: HTMLDivElement, dst: HTMLDivElement) => () => {
      if (!syncing) { syncing = true; dst.scrollTop = src.scrollTop; syncing = false; }
    };
    left.addEventListener('scroll', sync(left, right));
    right.addEventListener('scroll', sync(right, left));
    return () => { left.removeEventListener('scroll', sync(left, right)); right.removeEventListener('scroll', sync(right, left)); };
  }, []);

  // Esc to exit fullscreen
  useEffect(() => {
    if (!ganttFullscreen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setGanttFullscreen(false); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [ganttFullscreen, setGanttFullscreen]);

  // ─── DRAG-TO-PAN ───
  const handlePanMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('[data-bar]') || (e.target as HTMLElement).dataset.handle) return;
    const el = timelineRef.current;
    if (!el) return;
    e.preventDefault();
    const startX = e.clientX;
    const startY = e.clientY;
    const scrollLeft = el.scrollLeft;
    const scrollTop = el.scrollTop;
    el.style.cursor = 'grabbing';
    const onMove = (ev: MouseEvent) => {
      el.scrollLeft = scrollLeft - (ev.clientX - startX);
      el.scrollTop = scrollTop - (ev.clientY - startY);
    };
    const onUp = () => { document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp); el.style.cursor = ''; };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  };

  // ─── BAR DRAG (with date guide) ───
  const handleBarMouseDown = (e: React.MouseEvent, actId: string) => {
    const target = e.currentTarget as HTMLDivElement;
    if ((e.target as HTMLElement).dataset.handle) return;
    e.preventDefault();
    e.stopPropagation();

    const a = activities.find((x) => x.id === actId);
    if (!a) return;

    const startX = e.clientX;
    const startY = e.clientY;
    const barRect = target.getBoundingClientRect();
    const cursorToLeftEdge = startX - barRect.left;
    let dragged = false;

    document.body.style.overflow = 'hidden';
    target.style.zIndex = '100';
    target.style.opacity = '0.75';
    target.style.boxShadow = '0 4px 16px rgba(0,0,0,0.2)';
    target.style.transition = 'none';
    target.style.position = 'absolute';

    // Collect drop targets from BOTH left panel and right panel rows
    const leftRows = Array.from(document.querySelectorAll('[data-left-row]')) as HTMLDivElement[];
    const rightRows = Array.from(document.querySelectorAll('[data-gantt-row]')) as HTMLDivElement[];
    let dropTargetId: string | null = null;

    const onMove = (ev: MouseEvent) => {
      const dx = ev.clientX - startX;
      const dy = ev.clientY - startY;
      if (Math.abs(dx) < 3 && Math.abs(dy) < 3) return;
      dragged = true;
      target.style.transform = `translate(${dx}px, ${dy}px)`;

      showDateGuide(ev.clientX - cursorToLeftEdge);

      // Clear all highlights
      leftRows.forEach((r) => (r.style.background = ''));
      rightRows.forEach((r) => (r.style.background = ''));
      dropTargetId = null;

      // Check both left and right panel rows for drop target
      const allTargets = [...leftRows, ...rightRows];
      for (const r of allTargets) {
        const rowId = r.dataset.leftRow || r.dataset.ganttRow;
        if (!rowId || rowId === actId) continue;
        const rect = r.getBoundingClientRect();
        if (ev.clientY >= rect.top && ev.clientY <= rect.bottom) {
          dropTargetId = rowId;
          // Highlight both left and right rows for this ID
          leftRows.filter(lr => lr.dataset.leftRow === rowId).forEach(lr => lr.style.background = 'rgba(232,121,59,0.12)');
          rightRows.filter(rr => rr.dataset.ganttRow === rowId).forEach(rr => rr.style.background = 'rgba(232,121,59,0.08)');
          break;
        }
      }
    };

    const onUp = (ev: MouseEvent) => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      document.body.style.overflow = '';
      target.style.zIndex = '';
      target.style.opacity = '';
      target.style.boxShadow = '';
      target.style.transition = '';
      target.style.transform = '';
      leftRows.forEach((r) => (r.style.background = ''));
      rightRows.forEach((r) => (r.style.background = ''));
      hideDateGuide();

      if (!dragged) { if (ganttSidebarOn) setSelectedActivity(actId); return; }

      const dx = ev.clientX - startX;
      const daysDelta = Math.round(dx / pxDay);
      const updates: Partial<Activity> = {};

      // Trade/sub reassignment
      if (dropTargetId) {
        const targetAct = activities.find((x) => x.id === dropTargetId);
        if (targetAct && targetAct.id !== a.id) {
          const oldTrade = a.trade;
          const oldSub = a.sub;
          updates.trade = targetAct.trade;
          updates.sub = targetAct.sub || SUBS[targetAct.trade] || '';
          updates.area = targetAct.area;
          updates.floor = targetAct.floor;
          if (targetAct.trade !== oldTrade) {
            showToast(`${a.id} → ${targetAct.trade} (was ${oldTrade})`);
          } else if (targetAct.sub !== oldSub) {
            showToast(`${a.id} → sub: ${updates.sub} (was ${oldSub})`);
          }
        }
      }

      // Date shift
      if (daysDelta !== 0) {
        updates.start = isoDate(addDays(a.start, daysDelta));
        updates.finish = isoDate(addDays(a.finish, daysDelta));
      }

      if (Object.keys(updates).length > 0) {
        updateActivity(a.id, updates);
        showToast(`${a.id}: ${fmt(updates.start || a.start)} – ${fmt(updates.finish || a.finish)} | ${updates.trade || a.trade}`);
        debouncedSave(() => saveOne(a.id));
      }
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  };

  // ─── RESIZE HANDLE (with date guide) ───
  const handleResizeMouseDown = (e: React.MouseEvent, actId: string, edge: 'left' | 'right') => {
    e.preventDefault();
    e.stopPropagation();

    const a = activities.find((x) => x.id === actId);
    if (!a) return;

    const bar = (e.currentTarget as HTMLElement).parentElement as HTMLDivElement;
    const startX = e.clientX;
    const startWidth = bar.offsetWidth;
    const startLeft = bar.offsetLeft;
    let dragged = false;
    bar.style.transition = 'none';
    bar.style.zIndex = '10';

    const onMove = (ev: MouseEvent) => {
      const dx = ev.clientX - startX;
      if (Math.abs(dx) < 2) return;
      dragged = true;
      if (edge === 'right') {
        const newW = Math.max(pxDay, startWidth + dx);
        bar.style.width = `${newW}px`;
        // Guide at the right edge of the bar (absolute px in timeline)
        showDateGuideAtPx(startLeft + newW);
      } else {
        const newLeft = startLeft + dx;
        const newW = Math.max(pxDay, startWidth - dx);
        bar.style.left = `${newLeft}px`;
        bar.style.width = `${newW}px`;
        // Guide at the left edge of the bar
        showDateGuideAtPx(newLeft);
      }
    };

    const onUp = () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      bar.style.transition = '';
      bar.style.zIndex = '';
      hideDateGuide();
      if (!dragged) return;

      const finalWidth = bar.offsetWidth;
      const newDurationDays = Math.max(1, Math.round(finalWidth / pxDay));
      const updates: Partial<Activity> = { duration: newDurationDays };
      if (edge === 'right') { updates.finish = isoDate(addDays(a.start, newDurationDays)); }
      else { updates.start = isoDate(addDays(a.finish, -newDurationDays)); }

      updateActivity(a.id, updates);
      showToast(`${a.id}: ${fmt(updates.start || a.start)} – ${fmt(updates.finish || a.finish)} (${newDurationDays}d)`);
      debouncedSave(() => saveOne(a.id));
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  };

  // ─── HEADERS ───
  const monthHeaders: { label: string; x: number; w: number }[] = [];
  const weekHeaders: { label: string; x: number; w: number }[] = [];
  const d = new Date(projStart);
  while (d <= projEnd) {
    const dayOffset = diffDays(projStart, d);
    const x = dayOffset * pxDay;
    if (d.getDate() === 1 || dayOffset === 0) {
      const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0);
      monthHeaders.push({ label: d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }), x, w: Math.min(diffDays(d, monthEnd) + 1, diffDays(d, projEnd)) * pxDay });
    }
    if (d.getDay() === 1) weekHeaders.push({ label: d.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' }), x, w: 7 * pxDay });
    d.setDate(d.getDate() + 1);
  }
  const todayX = diffDays(projStart, TODAY) * pxDay;

  const hasActiveFilters = st.trade || st.area || st.status || st.phase || datePreset !== 'all';

  return (
    <div className={cn("animate-fade-in flex flex-col", ganttFullscreen && "fixed inset-0 z-[999] bg-background p-4")}>
      {/* ── TOOLBAR ── */}
      <div className="flex items-center justify-between mb-2 gap-2 flex-wrap">
        <div className="flex items-center gap-2.5">
          <BarChart3 className="h-4 w-4 text-primary" />
          <h2 className="text-[15px] font-bold tracking-tight">Timeline / Gantt</h2>
          <span className="text-[10.5px] text-muted-foreground bg-muted px-2.5 py-0.5 rounded-full font-semibold">{filtered.length}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setGanttPxPerDay(pxDay - 3)}><Minus className="h-3.5 w-3.5" /></Button>
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setGanttPxPerDay(pxDay + 3)}><Plus className="h-3.5 w-3.5" /></Button>
          <Button variant={ganttSidebarOn ? 'default' : 'outline'} size="sm" className="h-8 gap-1 text-xs" onClick={() => setGanttSidebarOn(!ganttSidebarOn)} title="Toggle: open detail on bar click">
            {ganttSidebarOn ? <PanelRightOpen className="h-3.5 w-3.5" /> : <PanelRightClose className="h-3.5 w-3.5" />}
            Detail
          </Button>
          <Button variant="outline" size="sm" className="h-8 gap-1 text-xs" onClick={() => setGanttFullscreen(!ganttFullscreen)}>
            {ganttFullscreen ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
            {ganttFullscreen ? 'Exit' : 'Fullscreen'}
          </Button>
          {ganttFullscreen && (
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setGanttFullscreen(false)}><X className="h-4 w-4" /></Button>
          )}
        </div>
      </div>

      {/* ── FILTERS + DATE RANGE ── */}
      <div className="flex items-center gap-2 mb-2 flex-wrap">
        <SelectNative value={st.trade} onChange={(e) => setSectionFilter('gantt', 'trade', e.target.value)} className="w-auto min-w-[120px] text-xs h-8">
          <option value="">All Trades</option>
          {dynTrades.map((t) => <option key={t}>{t}</option>)}
        </SelectNative>
        <SelectNative value={st.area} onChange={(e) => setSectionFilter('gantt', 'area', e.target.value)} className="w-auto min-w-[100px] text-xs h-8">
          <option value="">All Areas</option>
          {dynAreas.map((a) => <option key={a}>{a}</option>)}
        </SelectNative>
        <SelectNative value={st.status} onChange={(e) => setSectionFilter('gantt', 'status', e.target.value)} className="w-auto min-w-[100px] text-xs h-8">
          <option value="">All Statuses</option>
          {dynStatuses.map((s) => <option key={s}>{s}</option>)}
        </SelectNative>
        {dynPhases.length > 1 && (
          <SelectNative value={st.phase} onChange={(e) => setSectionFilter('gantt', 'phase', e.target.value)} className="w-auto min-w-[100px] text-xs h-8">
            <option value="">All Phases</option>
            {dynPhases.map((p) => <option key={p}>{p}</option>)}
          </SelectNative>
        )}

        {/* Date range separator */}
        <div className="h-5 w-px bg-border mx-1 hidden sm:block" />

        <div className="flex items-center gap-1.5">
          <CalendarRange className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          <SelectNative value={datePreset} onChange={(e) => setDatePreset(e.target.value as DatePreset)} className="w-auto min-w-[120px] text-xs h-8">
            <option value="all">Whole Project</option>
            <option value="this-week">This Week</option>
            <option value="this-month">This Month</option>
            <option value="3-months">Next 3 Months</option>
            <option value="custom">Custom Range</option>
          </SelectNative>
          {datePreset === 'custom' && (
            <>
              <Input type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} className="h-8 w-[130px] text-xs" />
              <span className="text-xs text-muted-foreground">–</span>
              <Input type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)} className="h-8 w-[130px] text-xs" />
            </>
          )}
        </div>

        {hasActiveFilters && (
          <Button variant="ghost" size="sm" className="h-8 text-xs gap-1 text-muted-foreground" onClick={() => { clearSectionFilters('gantt'); setDatePreset('all'); setCustomFrom(''); setCustomTo(''); }}>
            <X className="h-3 w-3" /> Clear All
          </Button>
        )}
      </div>

      {/* ── GANTT CHART ── */}
      {!hasData ? (
        <Card className="flex items-center justify-center h-[300px] text-muted-foreground text-sm">
          No dated activities to display.
        </Card>
      ) : (
      <Card className={cn("flex overflow-hidden flex-1", ganttFullscreen ? "h-0" : "h-[500px]")}>
        {/* LEFT PANEL */}
        <div ref={leftPanelRef} className="w-[220px] min-w-[220px] border-r overflow-y-auto scrollbar-hide">
          <div className="h-[44px] border-b bg-muted/50 flex items-center px-3 sticky top-0 z-10 bg-card">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Activity</span>
          </div>
          {rows.map((row, i) =>
            row.type === 'trade' ? (
              <div key={`t-${i}`} className="flex items-center px-3 font-bold text-[11px] bg-muted/50 border-b border-border/50" style={{ height: TRADE_H, color: getTradeColor(row.trade) }}>
                {row.trade} <span className="ml-1.5 text-[9px] font-normal text-muted-foreground">({grouped[row.trade].length})</span>
              </div>
            ) : (
              <div key={`a-${row.activity!.id}`} data-left-row={row.activity!.id} className="flex items-center px-3 text-[11px] cursor-pointer border-b border-border/30 hover:bg-primary/5 truncate" style={{ height: ROW_H }} onClick={() => { if (ganttSidebarOn) setSelectedActivity(row.activity!.id); }}>
                <span className="opacity-40 font-mono text-[10px] mr-1.5 shrink-0">{row.activity!.id}</span>
                <span className="truncate">{row.activity!.name}</span>
              </div>
            )
          )}
        </div>

        {/* RIGHT PANEL */}
        <div ref={timelineRef} className="flex-1 overflow-auto scrollbar-thin cursor-grab active:cursor-grabbing relative" onMouseDown={handlePanMouseDown}>
          {/* Date guide line (hidden by default, shown during drag/resize) */}
          <div ref={dateGuideRef} className="absolute top-0 bottom-0 w-[1px] z-[15] pointer-events-none" style={{ display: 'none', background: 'hsl(var(--primary))', opacity: 0.7 }}>
            <div className="w-1.5 h-1.5 rounded-full bg-primary absolute -top-0.5 -left-[2px]" />
          </div>
          <div ref={dateLabelRef} className="absolute top-1 z-[16] pointer-events-none text-[9px] font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded whitespace-nowrap" style={{ display: 'none' }} />

          {/* Month + week headers */}
          <div className="sticky top-0 z-10" style={{ width: timelineW }}>
            <div className="flex h-[24px] bg-muted/80 border-b border-border/40">
              {monthHeaders.map((m, i) => (
                <div key={i} className="border-r border-border/30 text-[10px] font-semibold text-muted-foreground px-1.5 flex items-center shrink-0" style={{ width: m.w, marginLeft: i === 0 ? m.x : 0 }}>{m.label}</div>
              ))}
            </div>
            <div className="flex h-[20px] bg-background border-b border-border/40">
              {weekHeaders.map((w, i) => (
                <div key={i} className="border-r border-border/20 text-[9px] text-muted-foreground px-1 flex items-center shrink-0" style={{ width: w.w, marginLeft: i === 0 ? w.x : 0 }}>{w.label}</div>
              ))}
            </div>
          </div>

          {/* Bar rows */}
          <div className="relative" style={{ width: timelineW, minHeight: rows.length * ROW_H }}>
            {/* Today line */}
            <div className="absolute top-0 bottom-0 w-[2px] z-[5] pointer-events-none" style={{ left: todayX, background: 'hsl(var(--destructive))', opacity: 0.4 }}>
              <div className="absolute -top-0.5 -left-[5px] w-3 h-3 rounded-full bg-destructive opacity-60" />
            </div>

            {/* Weekend shading */}
            {Array.from({ length: totalDays }).map((_, i) => {
              const dayDate = addDays(projStart, i);
              const dow = dayDate.getDay();
              if (dow !== 0 && dow !== 6) return null;
              return <div key={i} className="absolute top-0 bottom-0 bg-muted/30 pointer-events-none" style={{ left: i * pxDay, width: pxDay }} />;
            })}

            {/* Activity rows */}
            {rows.map((row, ri) => {
              if (row.type === 'trade') return <div key={`tr-${ri}`} className="flex items-center bg-muted/30 border-b border-border/40" style={{ height: TRADE_H, width: timelineW }} />;

              const a = row.activity!;
              const s = parseDate(a.start || a.finish);
              const f = parseDate(a.finish || a.start);
              if (!s || !f) return <div key={a.id} style={{ height: ROW_H }} />;

              const barX = diffDays(projStart, s) * pxDay;
              const barW = Math.max(pxDay, diffDays(s, f) * pxDay);
              const color = getTradeColor(a.trade);
              const pctW = (a.pct / 100) * barW;

              return (
                <div key={a.id} data-gantt-row={a.id} className="relative border-b border-border/20" style={{ height: ROW_H, width: timelineW }}>
                  <div data-bar="true" className="absolute cursor-grab active:cursor-grabbing group" style={{ left: barX, top: BAR_Y, width: barW, height: BAR_H, borderRadius: 4 }} onMouseDown={(e) => handleBarMouseDown(e, a.id)}>
                    <div className="absolute inset-0 rounded" style={{ background: color, opacity: 0.15 }} />
                    <div className="absolute top-0 bottom-0 left-0 rounded-l" style={{ width: pctW, background: color, opacity: 0.65 }} />
                    <div className="absolute inset-0 rounded border" style={{ borderColor: color, opacity: 0.5 }} />
                    {barW > 50 && <span className="absolute left-1.5 top-1/2 -translate-y-1/2 text-[9px] font-semibold text-white pointer-events-none truncate" style={{ maxWidth: barW - 20 }}>{a.name}</span>}

                    {/* Resize handles */}
                    <div data-handle="left" className="absolute left-0 top-0 bottom-0 w-2 cursor-w-resize opacity-0 group-hover:opacity-100 transition-opacity z-10" style={{ background: `linear-gradient(to right, ${color}, transparent)` }} onMouseDown={(e) => handleResizeMouseDown(e, a.id, 'left')} />
                    <div data-handle="right" className="absolute right-0 top-0 bottom-0 w-2 cursor-e-resize opacity-0 group-hover:opacity-100 transition-opacity z-10" style={{ background: `linear-gradient(to left, ${color}, transparent)` }} onMouseDown={(e) => handleResizeMouseDown(e, a.id, 'right')} />

                    {/* Tooltip */}
                    <div className="absolute -top-8 left-0 hidden group-hover:flex items-center bg-foreground text-background text-[9px] font-medium px-2 py-0.5 rounded shadow-lg whitespace-nowrap pointer-events-none z-20">
                      {a.id} · {fmt(a.start)} – {fmt(a.finish)} · {a.duration}d · {a.pct}%
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </Card>
      )}

      {/* Legend */}
      <div className="flex items-center gap-4 mt-2 text-[10px] text-muted-foreground flex-wrap">
        <span>Grab background → pan</span>
        <span>Drag bar → shift dates</span>
        <span>Drag to row → reassign</span>
        <span>Drag edges → resize</span>
        <span>Ctrl+scroll → zoom</span>
        {ganttFullscreen && <span>Esc → exit</span>}
      </div>
    </div>
  );
}
