'use client';

import { useEffect, useRef, useCallback, useState, useMemo } from 'react';
import { useAppStore } from '@/hooks/useAppStore';
import { useApi, debouncedSave } from '@/hooks/useApi';
import { parseDate, addDays, diffDays, isoDate, fmt, TODAY, getTradeColor, applyFilters } from '@/lib/helpers';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { SelectNative } from '@/components/ui/select-native';
import { Minus, Plus, Maximize2, Minimize2, BarChart3, PanelRightOpen, PanelRightClose, X, CalendarRange, Download } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SUBS } from '@/data/constants';
import type { Activity } from '@/types';

const ROW_H = 28;
const BAR_H = 20;
const BAR_Y = 4;
const TRADE_H = 30;

// Canonical phase order — same list as ActivityTable.tsx
const PHASE_ORDER_GANTT = [
  'Owner Request for Proposal','Bid Preparation','Bid Submission to Owner','Notice to Proceed',
  'Pre-Construction (2-3 months before Start)','Pre-Mobilization Requirements',
  'Earthwork - Preconstruction','Job Mobilization','Earthwork - Site Prep',
  'Earthwork - Rough Paving','Earthwork - Building Pad','Concrete - Building Pad Form',
  'Plumbing - Underground','Electrical - Underground','Fire Sprinkler -  Fire Riser',
  'Concrete - Footings to Pour','Onsite Utility Pre-Construction Meeting',
  'Utility - Sanitary Sewer','Utility - Irrigation','Utility - Fire Line',
  'Utility - Gas Line','Utility - Sleeves','Utility - Electrical',
  'Earthwork - Final Grading','Concrete - Paving','CMU','Mockup Wall Started',
  'Structural Steel','Locations Finalized for Framing, MEP Rough',
  'Framing - 1st Floor','Framing - 2nd Floor','Framing - 3rd Floor','Framing - 4th Floor',
  'Blocking Locations','Framing - Roof','Roof - TPO',
  'Insulate Corridor - 1st Floor','Insulate Corridor - 2nd Floor',
  'Insulate Corridor - 3rd Floor','Insulate Corridor - 4th Floor',
  'Prerock Corridor and Furdown Areas - 1st Floor','Prerock Corridor and Fur Down Areas - 2nd Floor',
  'Prerock Corridor and Fur Down Areas - 3rd Floor','Prerock Corridor and Fur Down Areas - 4th Floor',
  'Swimming Pool Rough to Gunite','Plumbing 1st Floor Top Out','Plumbing - 2nd Floor Top Out',
  'Plumbing - 3rd Floor Top Out','Plumbing - 4th Floor Top Out','Plumbing  - Roof Top Out',
  'Plumbing - Outdoor Top Out (Roof / Canopy Drains)','Plumbing - Dumpster Pad / Work Shop',
  'Gas Rough In - 1st Floor','Gas - Outdoor Rough In','Gas Line',
  'Mechanical 1st Floor Rough','Mechanical 2nd Floor Rough In','Mechanical 3rd Floor Rough In',
  'Mechanical 4th Floor Rough In','Mechanical Roof Rough In','Mechanical Outdoor Rough In',
  'Fire Sprinkler 1st Floor Rough In','Fire Sprinkler 2nd Floor Rough In',
  'Fire Sprinkler 3rd Floor Rough In','Fire Sprinkler 4th Floor Rough In',
  'Fire Sprinkler Roof Concealed Space','Fire Sprinkler Dry System',
  'Fire Sprinkler Stand Alone Pool Equipment / Pool Bathroom',
  'Electrical 1st Floor Rough In','Electrical 2nd Floor Rough In',
  'Electrical 3rd Floor Rough In','Electrical 4th Floor Rough In',
  'Electrical Roof Rough In','Electrical Outdoor Rough In',
  'Structured Cabling 1st Floor Rough','Structured Cabling 2nd Floor Rough',
  'Structured Cabling 3rd Floor Rough','Structured Cabling 4th Floor Rough',
  'Structured Cabling Roof Rough','Fire Alarm 1st Floor Rough In',
  'Fire Alarm 2nd Floor Rough','Fire Alarm 3rd Floor Rough',
  'Fire Alarm 4th Floor Rough','Fire Alarm Roof Rough',
  'Insulation 1st Floor Walls / Ceilings','Insulation - 2nd Floor',
  'Insulation - 3rd Floor','Insulation - 4th Floor',
  'Drywall (Tape/Bed/Sand) - 1st Floor','Drywall (Tape/Bed/Sand) - 2nd Floor',
  'Drywall (Tape/Bed/Sand) - 3rd Floor','Drywall (Tape/Bed/Sand) - 4th Floor',
  'Swimming Pool - Finish Out','Sports Court Install','Wallpaper Corridor - 1st Floor',
  'Tile - Flooring 1st Floor','Tile - Flooring 2nd Floor','Tile - Flooring 3rd Floor',
  'Tile - Flooring 4th Floor','Millwork Install',
  'Fire Sprinkler  - Trim Out 1st Floor','Fire Sprinkler - Trim Out 2nd Floor',
  'Fire Sprinkler - Trim Out 3rd Floor','Fire Sprinkler - Trim Out 4th Floor',
  'Fire Alarm - Trim Out 1st Floor','Fire Alarm - Trim Out 2nd Floor',
  'Fire Alarm - Trim Out 3rd Floor','Fire Alarm - Trim Out 4th Floor',
  'Vanity / Kitchen Cabinets Install - 4th Floor','Vanity / Kitchen Cabinets Install - 3rd Floor',
  'Vanity / Kitchen Cabinets Install - 2nd Floor','Vanity / Kitchen Cabinets Install - 1st Floor',
  'Vanity / Kitchen / Window Sill Granite - 4th Floor','Vanity / Kitchen / Window Sill Granite - 3rd Floor',
  'Vanity / Kitchen / Window Sill Granite - 2nd Floor','Vanity / Kitchen / Window Sill Granite - 1st Floor',
  'Mechanical Trim Out 1st Floor','Mechanical Trim Out 2nd Floor',
  'Mechanical - Trim Out 3rd Floor','Mechanical - Trim Out 4th Floor',
  'FFE Hang Install - 4th Floor','Plumbing Trim Out - 1st Floor','Plumbing Trim Out - 2nd Floor',
  'Plumbing Trim Out - 3rd Floor','Plumbing Trim Out - 4th Floor','Gas Line Trim Out',
  'Electrical - Signage Install','Swimming Pool',
  'FFE Install - 4th Floor','FFE Install - 3rd Floor','FFE Install - 2nd Floor','FFE Install - 1st Floor',
];
const PHASE_RANK_GANTT = new Map(PHASE_ORDER_GANTT.map((p, i) => [p, i]));
const normalizePhase = (p: string) => p.replace(/ \[TPSJ\]$/, '').trim();

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
  const ganttCardRef = useRef<HTMLDivElement>(null);
  const pxDay = ganttPxPerDay;

  // ─── DATE RANGE STATE ───
  const [datePreset, setDatePreset] = useState<DatePreset>('all');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [hideUndated, setHideUndated] = useState(false);

  // ─── FILTERS ───
  const st = getSectionState('gantt');

  const [downloading, setDownloading] = useState(false);
  const downloadPdf = useCallback(async () => {
    const el = ganttCardRef.current;
    if (!el) return;
    setDownloading(true);
    try {
      const html2canvas = (await import('html2canvas')).default;
      const jsPDF = (await import('jspdf')).default;

      const prevMaxH = el.style.maxHeight;
      const prevH = el.style.height;
      const prevOverflow = el.style.overflow;
      el.style.maxHeight = 'none';
      el.style.height = 'auto';
      el.style.overflow = 'visible';

      const scrollPanels = el.querySelectorAll<HTMLDivElement>('.overflow-y-auto, .overflow-auto, .overflow-x-auto');
      const panelPrevStyles: { el: HTMLDivElement; overflow: string; maxH: string; h: string }[] = [];
      scrollPanels.forEach((p) => {
        panelPrevStyles.push({ el: p, overflow: p.style.overflow, maxH: p.style.maxHeight, h: p.style.height });
        p.style.overflow = 'visible';
        p.style.maxHeight = 'none';
        p.style.height = 'auto';
      });

      await new Promise((r) => setTimeout(r, 150));

      const canvas = await html2canvas(el, {
        scale: 1.5,
        useCORS: true,
        backgroundColor: '#ffffff',
        scrollX: 0,
        scrollY: 0,
        windowWidth: el.scrollWidth,
        windowHeight: el.scrollHeight,
      });

      el.style.maxHeight = prevMaxH;
      el.style.height = prevH;
      el.style.overflow = prevOverflow;
      panelPrevStyles.forEach(({ el: p, overflow, maxH, h }) => {
        p.style.overflow = overflow;
        p.style.maxHeight = maxH;
        p.style.height = h;
      });

      const imgW = canvas.width;
      const imgH = canvas.height;
      const pdfW = 297;
      const pdfH = Math.ceil((imgH / imgW) * pdfW);

      const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: [pdfW, Math.max(pdfH, 100)] });
      pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, pdfW, pdfH);

      const filterLabel = [
        st.trade, st.area, st.status, st.phase,
        hideUndated ? 'dated-only' : '',
        datePreset !== 'all' ? datePreset : '',
      ].filter(Boolean).join('_') || 'all';

      pdf.save(`gantt_${filterLabel}_${new Date().toISOString().slice(0, 10)}.pdf`);
    } catch (e) {
      console.error('PDF export failed:', e);
    } finally {
      setDownloading(false);
    }
  }, [st, hideUndated, datePreset]);

  const allFiltered = useMemo(
    () => {
      const base = applyFilters(activities, st, searchQuery);
      return hideUndated ? base.filter((a) => a.start || a.finish) : base;
    },
    [activities, st, searchQuery, hideUndated]
  );

  // Apply date range filter — undated activities always pass through
  const presetRange = useMemo(() => {
    if (datePreset === 'custom') {
      const from = parseDate(customFrom);
      const to = parseDate(customTo);
      return from && to ? { from, to } : null;
    }
    return getPresetRange(datePreset, allFiltered);
  }, [datePreset, customFrom, customTo, allFiltered]);

  const filtered = useMemo(() => {
    if (!presetRange) return allFiltered;
    return allFiltered.filter((a) => {
      // Undated activities always show regardless of date range filter
      if (!a.start && !a.finish) return true;
      const s = parseDate(a.start || a.finish);
      const f = parseDate(a.finish || a.start);
      if (!s || !f) return true;
      return f >= presetRange.from && s <= presetRange.to;
    });
  }, [allFiltered, presetRange]);

  // Dropdown options narrow as other filters are applied (bug #12).
  // Each list is computed against the *other* filters so choosing one
  // doesn't hide the currently-selected value in its own dropdown.
  const narrowFor = (exclude: keyof typeof st) => {
    const partial = { ...st, [exclude]: '' };
    return applyFilters(activities, partial, searchQuery).filter((a) => a.start || a.finish);
  };
  const dynTrades = useMemo(() => [...new Set(narrowFor('trade').map((a) => a.trade).filter(Boolean))].sort(), [activities, st, searchQuery]); // eslint-disable-line react-hooks/exhaustive-deps
  const dynAreas = useMemo(() => [...new Set(narrowFor('area').map((a) => a.area).filter(Boolean))].sort(), [activities, st, searchQuery]); // eslint-disable-line react-hooks/exhaustive-deps
  const dynStatuses = useMemo(() => [...new Set(narrowFor('status').map((a) => a.status).filter(Boolean))].sort(), [activities, st, searchQuery]); // eslint-disable-line react-hooks/exhaustive-deps
  const dynPhases = useMemo(() => [...new Set(narrowFor('phase').map((a) => a.phase).filter(Boolean))].sort(), [activities, st, searchQuery]); // eslint-disable-line react-hooks/exhaustive-deps

  // Group by phase in CSV order; sort within phase by sort_order then id
  const grouped = useMemo(() => {
    const g: Record<string, Activity[]> = {};
    filtered.forEach((a) => {
      const ph = normalizePhase(a.phase || 'Other');
      (g[ph] = g[ph] || []).push(a);
    });
    // Sort within each phase by sort_order then id
    Object.values(g).forEach((arr) =>
      arr.sort((a, b) => ((a.sort_order ?? 0) - (b.sort_order ?? 0)) || a.id.localeCompare(b.id))
    );
    return g;
  }, [filtered]);

  // Phases sorted by canonical CSV order
  const trades = useMemo(() =>
    Object.keys(grouped).sort((a, b) =>
      (PHASE_RANK_GANTT.get(a) ?? 9999) - (PHASE_RANK_GANTT.get(b) ?? 9999)
    ),
  [grouped]);

  // Label map: activity.id → "N-X" (phase number + letter within phase)
  const labelMap = useMemo(() => {
    const map: Record<string, string> = {};
    trades.forEach((phase, phaseIdx) => {
      (grouped[phase] || []).forEach((a, actIdx) => {
        const letter = actIdx < 26
          ? String.fromCharCode(65 + actIdx)
          : String.fromCharCode(65 + Math.floor(actIdx / 26) - 1) + String.fromCharCode(65 + (actIdx % 26));
        map[a.id] = `${phaseIdx + 1}-${letter}`;
      });
    });
    return map;
  }, [trades, grouped]);

  // Date range for timeline. Mirror the bar-rendering logic so the timeline
  // bounds include synthesized endpoints (duration-derived) — otherwise a
  // finish-only, 8-day activity contributes only one day and the bar would
  // get clipped past projEnd.
  const { projStart, projEnd, totalDays, timelineW, hasData } = useMemo(() => {
    const times: number[] = [];
    filtered.forEach((a) => {
      const dur = Math.max(1, a.duration || 1);
      let s = parseDate(a.start);
      let f = parseDate(a.finish);
      if (s && !f) f = addDays(s, dur - 1);
      else if (f && !s) s = addDays(f, -(dur - 1));
      if (s) times.push(s.getTime());
      if (f) times.push(f.getTime());
    });
    // Undated activities fall back to TODAY — always treat as having data if any activities exist
    const has = filtered.length > 0;
    // Anchor undated-only projects at today so the timeline is still useful
    if (times.length === 0) { times.push(TODAY.getTime()); times.push(addDays(TODAY, 30).getTime()); }
    const ps = presetRange ? addDays(presetRange.from, -3) : addDays(new Date(Math.min(...times)), -7);
    const pe = presetRange ? addDays(presetRange.to, 3) : addDays(new Date(Math.max(...times)), 14);
    const td = Math.max(7, diffDays(ps, pe) + 1);
    return { projStart: ps, projEnd: pe, totalDays: td, timelineW: td * pxDay, hasData: has };
  }, [filtered, presetRange, pxDay]);

  // Flat rows
  interface RowData { type: 'trade' | 'activity'; trade: string; activity?: Activity; idx: number }
  const rows = useMemo(() => {
    const r: RowData[] = [];
    let flatIdx = 0;
    trades.forEach((trade) => {
      r.push({ type: 'trade', trade, idx: flatIdx++ });
      grouped[trade].forEach((act) => { r.push({ type: 'activity', trade, activity: act, idx: flatIdx++ }); });
    });
    return r;
  }, [trades, grouped]);

  // Activity-id → cumulative Y coordinate (top of its row) and total chart height.
  // Needed for dependency arrows (#16) because trade headers (30px) and activity
  // rows (28px) have different heights, so indexing alone can't give pixel Y.
  const { idToRowY, totalRowsHeight } = useMemo(() => {
    const m: Record<string, number> = {};
    let y = 0;
    rows.forEach((r) => {
      if (r.type === 'activity') m[r.activity!.id] = y;
      y += r.type === 'trade' ? TRADE_H : ROW_H;
    });
    return { idToRowY: m, totalRowsHeight: y };
  }, [rows]);

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

  // Scroll to today once — but wait until data actually arrives.
  // Boot renders with 0 activities, so the mount-only version missed.
  const didInitialScroll = useRef(false);
  useEffect(() => {
    if (didInitialScroll.current || !hasData || !timelineRef.current) return;
    const x = Math.max(0, diffDays(projStart, TODAY) * pxDay - 200);
    timelineRef.current.scrollLeft = x;
    didInitialScroll.current = true;
  }, [hasData, projStart, pxDay]);

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

  // ─── BAR DRAG (with date guide + edge auto-scroll) ───
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
    let lastClientX = startX;
    let lastClientY = startY;
    let autoScrollRaf = 0;

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

    // Auto-scroll the timeline when cursor nears an edge (bug #13)
    const AUTO_SCROLL_ZONE = 40;
    const AUTO_SCROLL_MAX = 18;
    function tickAutoScroll() {
      const el = timelineRef.current;
      if (!el) { autoScrollRaf = 0; return; }
      const rect = el.getBoundingClientRect();
      let dxScroll = 0;
      let dyScroll = 0;
      if (lastClientX < rect.left + AUTO_SCROLL_ZONE) {
        dxScroll = -Math.min(AUTO_SCROLL_MAX, (rect.left + AUTO_SCROLL_ZONE) - lastClientX);
      } else if (lastClientX > rect.right - AUTO_SCROLL_ZONE) {
        dxScroll = Math.min(AUTO_SCROLL_MAX, lastClientX - (rect.right - AUTO_SCROLL_ZONE));
      }
      if (lastClientY < rect.top + AUTO_SCROLL_ZONE) {
        dyScroll = -Math.min(AUTO_SCROLL_MAX, (rect.top + AUTO_SCROLL_ZONE) - lastClientY);
      } else if (lastClientY > rect.bottom - AUTO_SCROLL_ZONE) {
        dyScroll = Math.min(AUTO_SCROLL_MAX, lastClientY - (rect.bottom - AUTO_SCROLL_ZONE));
      }
      if (dxScroll !== 0 || dyScroll !== 0) {
        el.scrollLeft += dxScroll;
        el.scrollTop += dyScroll;
      }
      autoScrollRaf = requestAnimationFrame(tickAutoScroll);
    }

    const onMove = (ev: MouseEvent) => {
      lastClientX = ev.clientX;
      lastClientY = ev.clientY;
      const dx = ev.clientX - startX;
      const dy = ev.clientY - startY;
      if (Math.abs(dx) < 3 && Math.abs(dy) < 3) return;
      if (!dragged) {
        dragged = true;
        if (!autoScrollRaf) autoScrollRaf = requestAnimationFrame(tickAutoScroll);
      }
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
          leftRows.filter(lr => lr.dataset.leftRow === rowId).forEach(lr => lr.style.background = 'rgba(232,121,59,0.12)');
          rightRows.filter(rr => rr.dataset.ganttRow === rowId).forEach(rr => rr.style.background = 'rgba(232,121,59,0.08)');
          break;
        }
      }
    };

    const onUp = (ev: MouseEvent) => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      if (autoScrollRaf) { cancelAnimationFrame(autoScrollRaf); autoScrollRaf = 0; }
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

      // Compute current/synthesized span once — used for date math below.
      const dur = Math.max(1, a.duration || 1);
      const curStart = parseDate(a.start) || (parseDate(a.finish) ? addDays(a.finish, -(dur - 1)) : null);
      const curFinish = parseDate(a.finish) || (parseDate(a.start) ? addDays(a.start, dur - 1) : null);
      const span = curStart && curFinish ? diffDays(curStart, curFinish) : dur - 1;

      // Drop onto another row.
      // - Different trade → reassign trade/sub/area/floor, keep dates.
      // - Same trade → POSITIONAL SWAP: the dragged and target activities
      //   swap their start_date, finish_date, duration, and sort_order so
      //   they literally trade places in the Gantt.
      let reordered = false;
      let swapTargetId: string | null = null;
      let swapTargetUpdates: Partial<Activity> | null = null;
      if (dropTargetId) {
        const targetAct = activities.find((x) => x.id === dropTargetId);
        if (targetAct && targetAct.id !== a.id) {
          if (targetAct.trade !== a.trade) {
            // Cross-trade: reassign attributes
            const oldTrade = a.trade;
            updates.trade = targetAct.trade;
            updates.sub = targetAct.sub || SUBS[targetAct.trade] || '';
            updates.area = targetAct.area;
            updates.floor = targetAct.floor;
            showToast(`${a.id} → ${targetAct.trade} (was ${oldTrade})`);
          } else {
            // Same trade: swap positions.
            updates.start = targetAct.start;
            updates.finish = targetAct.finish;
            updates.duration = targetAct.duration;
            updates.sort_order = targetAct.sort_order ?? 0;

            swapTargetId = targetAct.id;
            swapTargetUpdates = {
              start: a.start,
              finish: a.finish,
              duration: a.duration,
              sort_order: a.sort_order ?? 0,
            };
            reordered = true;
            showToast(`Swapped: ${a.id} ↔ ${targetAct.id}`);
          }
        }
      }
      // Silence unused-var warning for span/curFinish when swap path used.
      void span; void curFinish;

      // Horizontal date shift — only if the user didn't already reorder (reorder
      // sets explicit dates; applying delta on top would double-move). Bug #5:
      // shift only date(s) that exist.
      if (!reordered && daysDelta !== 0) {
        if (a.start) updates.start = isoDate(addDays(a.start, daysDelta));
        if (a.finish) updates.finish = isoDate(addDays(a.finish, daysDelta));
      }

      if (Object.keys(updates).length > 0) {
        console.log('[Gantt drag] writing updates', { id: a.id, reordered, daysDelta, dropTargetId, updates });
        updateActivity(a.id, updates);
        if (!reordered) {
          showToast(`${a.id}: ${fmt(updates.start || a.start)} – ${fmt(updates.finish || a.finish)} | ${updates.trade || a.trade}`);
        }
        debouncedSave(() => saveOne(a.id), 300, a.id);

        // Persist the other half of a positional swap.
        if (swapTargetId && swapTargetUpdates) {
          console.log('[Gantt drag] swap partner updates', { id: swapTargetId, updates: swapTargetUpdates });
          updateActivity(swapTargetId, swapTargetUpdates);
          debouncedSave(() => saveOne(swapTargetId!), 300, swapTargetId);
        }
      } else {
        console.log('[Gantt drag] no changes to write', { id: a.id, dropTargetId, daysDelta });
      }
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  };

  // ─── RESIZE HANDLE (with date guide) ───
  // Bar width convention: inclusive-of-both-endpoints.
  //   1-day bar (start == finish) → width = 1 * pxDay
  //   N-day bar (finish = start + N-1) → width = N * pxDay
  // So `durationDays = round(width / pxDay)` and `finish = start + durationDays - 1`.
  const handleResizeMouseDown = (e: React.MouseEvent, actId: string, edge: 'left' | 'right') => {
    e.preventDefault();
    e.stopPropagation();

    console.log('[Gantt resize] mousedown', { actId, edge, clientX: e.clientX });

    const a = activities.find((x) => x.id === actId);
    if (!a) {
      console.warn('[Gantt resize] activity not found', actId);
      return;
    }

    // Synthesize missing endpoint from duration — same rule the render uses.
    const dur = Math.max(1, a.duration || 1);
    const resolvedStart = parseDate(a.start) || (parseDate(a.finish) ? addDays(a.finish, -(dur - 1)) : null);
    const resolvedFinish = parseDate(a.finish) || (parseDate(a.start) ? addDays(a.start, dur - 1) : null);
    if (!resolvedStart || !resolvedFinish) {
      console.warn('[Gantt resize] cannot resolve start/finish', {
        id: a.id, start: a.start, finish: a.finish, duration: a.duration,
      });
      return;
    }
    const baseStart = isoDate(resolvedStart);
    const baseFinish = isoDate(resolvedFinish);
    console.log('[Gantt resize] resolved', { id: a.id, baseStart, baseFinish, dur });

    const bar = (e.currentTarget as HTMLElement).parentElement as HTMLDivElement;
    if (!bar) {
      console.warn('[Gantt resize] bar element not found — handle has no parent');
      return;
    }
    const startX = e.clientX;
    const startWidth = bar.offsetWidth;
    const startLeft = bar.offsetLeft;
    console.log('[Gantt resize] bar rect', { startWidth, startLeft, pxDay });

    let dragged = false;
    bar.style.transition = 'none';
    bar.style.zIndex = '10';

    const onMove = (ev: MouseEvent) => {
      const dx = ev.clientX - startX;
      if (Math.abs(dx) < 2) return;
      if (!dragged) console.log('[Gantt resize] drag start', { edge, dx });
      dragged = true;
      if (edge === 'right') {
        const newW = Math.max(pxDay, startWidth + dx);
        bar.style.width = `${newW}px`;
        showDateGuideAtPx(startLeft + newW - pxDay);
      } else {
        const newLeft = Math.min(startLeft + dx, startLeft + startWidth - pxDay);
        const newW = Math.max(pxDay, startWidth - dx);
        bar.style.left = `${newLeft}px`;
        bar.style.width = `${newW}px`;
        showDateGuideAtPx(newLeft);
      }
    };

    const onUp = () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      bar.style.transition = '';
      bar.style.zIndex = '';
      hideDateGuide();
      console.log('[Gantt resize] mouseup', { dragged });
      if (!dragged) {
        // Restore visual state in case the DOM style lingered
        bar.style.width = `${startWidth}px`;
        bar.style.left = `${startLeft}px`;
        return;
      }

      const finalWidth = bar.offsetWidth;
      const newDurationDays = Math.max(1, Math.round(finalWidth / pxDay));
      const updates: Partial<Activity> = { duration: newDurationDays };
      if (edge === 'right') {
        updates.finish = isoDate(addDays(baseStart, newDurationDays - 1));
        updates.start = baseStart; // persist resolved start if it was null
      } else {
        updates.start = isoDate(addDays(baseFinish, -(newDurationDays - 1)));
        updates.finish = baseFinish;
      }

      console.log('[Gantt resize] writing updates', {
        id: a.id, edge, finalWidth, newDurationDays, updates,
      });

      updateActivity(a.id, updates);
      showToast(`${a.id}: ${fmt(updates.start || a.start)} – ${fmt(updates.finish || a.finish)} (${newDurationDays}d)`);
      debouncedSave(async () => {
        const ok = await saveOne(a.id);
        console.log('[Gantt resize] save result', { id: a.id, ok });
        return ok;
      }, 300, a.id);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  };

  // ─── HEADERS ───
  // Memoized so pan/selection don't rebuild every render.
  const { monthHeaders, weekHeaders, weekendStripes, todayX } = useMemo(() => {
    const mh: { label: string; x: number; w: number }[] = [];
    const wh: { label: string; x: number; w: number }[] = [];
    const ws: { x: number; w: number }[] = [];
    const d = new Date(projStart);
    while (d <= projEnd) {
      const dayOffset = diffDays(projStart, d);
      const x = dayOffset * pxDay;

      // Month header: starts at day 1 of a month OR at the project start.
      // Width = days remaining in this month, but clamped so we never overrun
      // the timeline (bug #9).
      if (d.getDate() === 1 || dayOffset === 0) {
        const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0);
        const daysRemainingInMonth = diffDays(d, monthEnd) + 1;
        const daysRemainingInProject = totalDays - dayOffset;
        const w = Math.max(0, Math.min(daysRemainingInMonth, daysRemainingInProject)) * pxDay;
        if (w > 0) {
          mh.push({ label: d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }), x, w });
        }
      }

      // Week header: every Monday, OR day 0 (so leading partial week is labeled — bug #8).
      // Width is clamped to the end of timeline so trailing partial week fits.
      if (d.getDay() === 1 || dayOffset === 0) {
        const daysToNextMonday = d.getDay() === 1 ? 7 : (8 - d.getDay()) % 7 || 7;
        const daysRemainingInProject = totalDays - dayOffset;
        const w = Math.min(daysToNextMonday, daysRemainingInProject) * pxDay;
        if (w > 0) {
          wh.push({ label: d.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' }), x, w });
        }
      }

      // Weekend stripes (bug #10): collect once instead of an O(days) map per render.
      const dow = d.getDay();
      if (dow === 0 || dow === 6) {
        ws.push({ x, w: pxDay });
      }

      d.setDate(d.getDate() + 1);
    }
    return {
      monthHeaders: mh,
      weekHeaders: wh,
      weekendStripes: ws,
      todayX: diffDays(projStart, TODAY) * pxDay,
    };
  }, [projStart, projEnd, totalDays, pxDay]);

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
          <Button variant="outline" size="sm" className="h-8 gap-1 text-xs" onClick={downloadPdf} disabled={downloading}>
            <Download className="h-3.5 w-3.5" />
            {downloading ? 'Exporting…' : 'PDF'}
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
          <SelectNative value={datePreset} onChange={(e) => {
            const next = e.target.value as DatePreset;
            setDatePreset(next);
            // Reset custom range when leaving custom mode (bug #17)
            if (next !== 'custom') { setCustomFrom(''); setCustomTo(''); }
          }} className="w-auto min-w-[120px] text-xs h-8">
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

        <button
          onClick={() => setHideUndated((v) => !v)}
          className={cn(
            'h-8 px-2.5 rounded text-xs font-medium border transition-colors flex items-center gap-1.5',
            hideUndated
              ? 'bg-primary text-primary-foreground border-primary'
              : 'bg-background text-muted-foreground border-border hover:border-primary hover:text-primary'
          )}
          title={hideUndated ? 'Showing dated only — click to show all' : 'Click to hide undated activities'}
        >
          <CalendarRange className="h-3 w-3" />
          {hideUndated ? 'Dated Only' : 'All Records'}
        </button>

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
      <Card ref={ganttCardRef} className={cn("flex overflow-hidden flex-1", ganttFullscreen ? "h-0" : "h-[500px]")}>
        {/* LEFT PANEL */}
        <div ref={leftPanelRef} className="w-[220px] min-w-[220px] border-r overflow-y-auto scrollbar-hide">
          <div className="h-[44px] border-b bg-muted/50 flex items-center px-3 sticky top-0 z-10 bg-card">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Activity</span>
          </div>
          {rows.map((row, i) =>
            row.type === 'trade' ? (
              <div key={`t-${i}`} className="flex items-center px-3 font-bold text-[11px] bg-muted/50 border-b border-border/50 gap-1.5" style={{ height: TRADE_H }}>
                <span className="font-mono text-[10px] text-muted-foreground shrink-0">
                  {trades.indexOf(row.trade) + 1}
                </span>
                <span className="truncate" style={{ color: getTradeColor(grouped[row.trade]?.[0]?.trade ?? '') }}>{row.trade}</span>
                <span className="ml-auto text-[9px] font-normal text-muted-foreground shrink-0">({grouped[row.trade].length})</span>
              </div>
            ) : (
              <div key={`a-${row.activity!.id}`} data-left-row={row.activity!.id} className="flex items-center px-3 text-[11px] cursor-pointer border-b border-border/30 hover:bg-primary/5 truncate" style={{ height: ROW_H }} onClick={() => { if (ganttSidebarOn) setSelectedActivity(row.activity!.id); }}>
                <span className="font-mono text-[10px] text-blue-500 mr-1.5 shrink-0">{labelMap[row.activity!.id] ?? row.activity!.id}</span>
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
          <div className="relative" style={{ width: timelineW, minHeight: totalRowsHeight }}>
            {/* Today line */}
            <div className="absolute top-0 bottom-0 w-[2px] z-[5] pointer-events-none" style={{ left: todayX, background: 'hsl(var(--destructive))', opacity: 0.4 }}>
              <div className="absolute -top-0.5 -left-[5px] w-3 h-3 rounded-full bg-destructive opacity-60" />
            </div>

            {/* Weekend shading (precomputed — bug #10) */}
            {weekendStripes.map((s, i) => (
              <div key={i} className="absolute top-0 bottom-0 bg-muted/30 pointer-events-none" style={{ left: s.x, width: s.w }} />
            ))}

            {/* Dependency arrows (bug #16) */}
            <svg className="absolute top-0 left-0 pointer-events-none" width={timelineW} height={totalRowsHeight} style={{ zIndex: 2 }}>
              <defs>
                <marker id="gantt-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                  <path d="M 0 0 L 10 5 L 0 10 z" fill="hsl(var(--muted-foreground))" opacity="0.6" />
                </marker>
              </defs>
              {rows.map((row) => {
                if (row.type !== 'activity' || !row.activity!.predecessors?.length) return null;
                const succ = row.activity!;
                const succRowY = idToRowY[succ.id];
                if (succRowY === undefined) return null;
                const succStart = parseDate(succ.start || succ.finish);
                if (!succStart) return null;
                const succX = diffDays(projStart, succStart) * pxDay;
                const succY = succRowY + BAR_Y + BAR_H / 2;

                return succ.predecessors.map((pid) => {
                  const predRowY = idToRowY[pid];
                  if (predRowY === undefined) return null; // predecessor filtered out of view
                  const pred = activities.find((x) => x.id === pid);
                  if (!pred) return null;
                  const predFinish = parseDate(pred.finish || pred.start);
                  if (!predFinish) return null;
                  // Finish-to-Start: right edge of predecessor's last day → left edge of successor.
                  const predX = (diffDays(projStart, predFinish) + 1) * pxDay;
                  const predY = predRowY + BAR_Y + BAR_H / 2;
                  // L-shape routing with a small elbow
                  const elbowX = Math.max(predX + 6, succX - 6);
                  const d = `M ${predX} ${predY} L ${elbowX} ${predY} L ${elbowX} ${succY} L ${succX} ${succY}`;
                  return (
                    <path
                      key={`${pid}->${succ.id}`}
                      d={d}
                      fill="none"
                      stroke="hsl(var(--muted-foreground))"
                      strokeWidth="1"
                      opacity="0.55"
                      markerEnd="url(#gantt-arrow)"
                    />
                  );
                });
              })}
            </svg>

            {/* Activity rows */}
            {rows.map((row, ri) => {
              if (row.type === 'trade') return <div key={`tr-${ri}`} className="flex items-center bg-muted/30 border-b border-border/40" style={{ height: TRADE_H, width: timelineW }} />;

              const a = row.activity!;
              // Resolve start/finish — if only one endpoint exists, derive the
              // other from `duration` so a 5-day activity with only a finish
              // date still renders as a 5-day bar, not collapsed to 1 day.
              const dur = Math.max(1, a.duration || 1);
              let s = parseDate(a.start);
              let f = parseDate(a.finish);
              if (s && !f) f = addDays(s, dur - 1);
              else if (f && !s) s = addDays(f, -(dur - 1));
              // Undated: place a 1-day placeholder bar at today
              if (!s || !f) { s = TODAY; f = TODAY; }

              // Inclusive-of-both-endpoints convention (bug #3):
              //   1-day bar (start == finish) → 1 * pxDay wide
              //   N-day bar (finish = start + N-1) → N * pxDay wide
              const barX = diffDays(projStart, s) * pxDay;
              const barW = Math.max(pxDay, (diffDays(s, f) + 1) * pxDay);
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
