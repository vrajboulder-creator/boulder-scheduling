'use client';

import { create } from 'zustand';
import { toast } from 'sonner';
import type { Activity, ViewType, ProjectConfig, WeatherDetail, ActivityDB, LinkedItemRef } from '@/types';
import { isoDate, resolveAllDates } from '@/lib/helpers';
import type { ActivityLink } from '@/types';

interface SectionFilters {
  mode: 'list' | 'grid';
  trade: string;
  area: string;
  status: string;
  phase: string;
  floor: string;
}

interface AppState {
  // Core data
  activities: Activity[];
  activityLinks: ActivityLink[];
  setActivities: (acts: Activity[]) => void;
  setActivityLinks: (links: ActivityLink[]) => void;
  addActivity: (a: Activity) => void;
  updateActivity: (id: string, updates: Partial<Activity>) => void;
  removeActivity: (id: string) => void;
  linkActivities: (predecessorId: string, successorId: string, linkType?: 'FS' | 'FF' | 'SS' | 'SF', lagDays?: number) => void;
  unlinkActivities: (predecessorId: string, successorId: string) => void;
  updateLinkType: (predecessorId: string, successorId: string, linkType: 'FS' | 'FF' | 'SS' | 'SF') => void;

  // Navigation
  currentView: ViewType;
  setView: (v: ViewType) => void;

  // Project
  currentProject: string;
  setCurrentProject: (code: string) => void;
  currentProjectId: string | null;
  setCurrentProjectId: (id: string | null) => void;

  // Weather
  projects: Record<string, ProjectConfig>;
  setProjects: (projects: Record<string, ProjectConfig>) => void;
  updateProjectWeather: (code: string, weather: string, detail?: WeatherDetail) => void;

  // Selection
  selectedActivityId: string | null;
  setSelectedActivity: (id: string | null) => void;
  detailOpen: boolean;
  setDetailOpen: (open: boolean) => void;

  // Modal
  modalOpen: boolean;
  setModalOpen: (open: boolean) => void;
  modalDefaults: Partial<{ phase: string; notes: string; area: string; trade: string }>;
  openModalWithDefaults: (defaults: Partial<{ phase: string; notes: string; area: string; trade: string }>) => void;

  // Search
  searchQuery: string;
  setSearchQuery: (q: string) => void;

  // Filters
  sectionState: Record<string, SectionFilters>;
  getSectionState: (sec: string) => SectionFilters;
  setSectionFilter: (sec: string, key: keyof SectionFilters, val: string) => void;
  setSectionMode: (sec: string, mode: 'list' | 'grid') => void;
  clearSectionFilters: (sec: string) => void;

  // Gantt
  ganttPxPerDay: number;
  setGanttPxPerDay: (px: number) => void;
  ganttFullscreen: boolean;
  setGanttFullscreen: (fs: boolean) => void;
  ganttSidebarOn: boolean;
  setGanttSidebarOn: (on: boolean) => void;

  // Global preferences (Settings page)
  defaultViewMode: 'list' | 'grid';
  setDefaultViewMode: (m: 'list' | 'grid') => void;
  dateFormat: 'short' | 'long' | 'iso';
  setDateFormat: (f: 'short' | 'long' | 'iso') => void;
  clearAllFilters: () => void;

  // Next ID
  nextId: number;
  genId: () => string;
  genSubtaskId: (parentId: string) => string;

  // Toast
  toastMessage: string;
  showToast: (msg: string) => void;
}

const defaultFilters = (): SectionFilters => ({
  mode: 'list', trade: '', area: '', status: '', phase: '', floor: '',
});

export const useAppStore = create<AppState>((set, get) => ({
  activities: [],
  activityLinks: [],
  setActivities: (acts) => set({ activities: acts }),
  setActivityLinks: (links) => set({ activityLinks: links }),
  addActivity: (a) => set((s) => ({ activities: [...s.activities, a] })),
  updateActivity: (id, updates) =>
    set((s) => ({
      activities: s.activities.map((a) => (a.id === id ? { ...a, ...updates } : a)),
    })),
  removeActivity: (id) =>
    set((s) => ({ activities: s.activities.filter((a) => a.id !== id) })),

  linkActivities: (predecessorId, successorId, linkType = 'FS', lagDays = 0) =>
    set((s) => {
      const pred = s.activities.find((a) => a.id === predecessorId);
      const succ = s.activities.find((a) => a.id === successorId);
      if (!pred || !succ) return s;

      const wired = s.activities.map((a) => {
        if (a.id === predecessorId) return { ...a, successors: [...(a.successors || []).filter(id => id !== successorId), successorId] };
        if (a.id === successorId) return { ...a, predecessors: [...(a.predecessors || []).filter(id => id !== predecessorId), predecessorId] };
        return a;
      });

      // Merge new link into activityLinks (replace if same pair exists)
      const newLinks: ActivityLink[] = [
        ...s.activityLinks.filter((l) => !(l.predecessor_id === predecessorId && l.successor_id === successorId)),
        { id: `${predecessorId}-${successorId}`, predecessor_id: predecessorId, successor_id: successorId, link_type: linkType, lag_days: lagDays },
      ];

      return { activities: resolveAllDates(wired, newLinks), activityLinks: newLinks };
    }),

  unlinkActivities: (predecessorId, successorId) =>
    set((s) => {
      const unwired = s.activities.map((a) => {
        if (a.id === predecessorId) return { ...a, successors: (a.successors || []).filter((id) => id !== successorId) };
        if (a.id === successorId) return { ...a, predecessors: (a.predecessors || []).filter((id) => id !== predecessorId) };
        return a;
      });
      const newLinks = s.activityLinks.filter((l) => !(l.predecessor_id === predecessorId && l.successor_id === successorId));
      return { activities: resolveAllDates(unwired, newLinks), activityLinks: newLinks };
    }),

  updateLinkType: (predecessorId, successorId, linkType) =>
    set((s) => {
      const newLinks = s.activityLinks.map((l) =>
        l.predecessor_id === predecessorId && l.successor_id === successorId
          ? { ...l, link_type: linkType }
          : l
      );
      return { activities: resolveAllDates(s.activities, newLinks), activityLinks: newLinks };
    }),

  currentView: 'dashboard',
  // Don't wipe sectionState — it's keyed per-view, so Delayed can stay in
  // list mode while Today is in grid mode. Clearing it would make both
  // sections snap back to default every time the user navigates away.
  setView: (v) => set({ currentView: v }),

  currentProject: '',
  setCurrentProject: (code) => {
    const s = get();
    const proj = s.projects[code];
    set({ currentProject: code, currentProjectId: proj?.id ?? null });
  },
  currentProjectId: null,
  setCurrentProjectId: (id) => set({ currentProjectId: id }),

  projects: {},
  setProjects: (projects) => set({ projects }),
  updateProjectWeather: (code, weather, detail) =>
    set((s) => ({
      projects: {
        ...s.projects,
        [code]: { ...s.projects[code], weather, weatherLoaded: true, weatherDetail: detail },
      },
    })),

  selectedActivityId: null,
  setSelectedActivity: (id) => set({ selectedActivityId: id, detailOpen: !!id }),
  detailOpen: false,
  setDetailOpen: (open) => set({ detailOpen: open }),

  modalOpen: false,
  setModalOpen: (open) => set({ modalOpen: open }),
  modalDefaults: {},
  openModalWithDefaults: (defaults) => set({ modalOpen: true, modalDefaults: defaults }),

  searchQuery: '',
  setSearchQuery: (q) => set({ searchQuery: q }),

  sectionState: {},
  getSectionState: (sec) => {
    const st = get().sectionState[sec];
    return st || defaultFilters();
  },
  setSectionFilter: (sec, key, val) =>
    set((s) => ({
      sectionState: {
        ...s.sectionState,
        [sec]: { ...(s.sectionState[sec] || defaultFilters()), [key]: val },
      },
    })),
  setSectionMode: (sec, mode) =>
    set((s) => ({
      sectionState: {
        ...s.sectionState,
        [sec]: { ...(s.sectionState[sec] || defaultFilters()), mode },
      },
    })),
  clearSectionFilters: (sec) =>
    set((s) => ({
      sectionState: { ...s.sectionState, [sec]: defaultFilters() },
      searchQuery: '',
    })),

  ganttPxPerDay: 18,
  setGanttPxPerDay: (px) => set({ ganttPxPerDay: Math.max(4, Math.min(50, px)) }),
  ganttFullscreen: false,
  setGanttFullscreen: (fs) => set({ ganttFullscreen: fs }),
  ganttSidebarOn: true,
  setGanttSidebarOn: (on) => set({ ganttSidebarOn: on }),

  // Global preferences — session-only, consumed by Settings page.
  defaultViewMode: 'list',
  setDefaultViewMode: (m) => set({ defaultViewMode: m }),
  dateFormat: 'short',
  setDateFormat: (f) => set({ dateFormat: f }),
  clearAllFilters: () => set({ sectionState: {}, searchQuery: '' }),

  nextId: 100,
  genId: () => {
    const id = `ACT-${get().nextId}`;
    set((s) => ({ nextId: s.nextId + 1 }));
    return id;
  },
  genSubtaskId: (parentId: string) => {
    const existing = get().activities.filter((a) => a.parent_id === parentId).length;
    return `${parentId}-ST-${existing + 1}`;
  },

  toastMessage: '',
  showToast: (msg) => {
    toast(msg);
    set({ toastMessage: msg });
  },
}));

// ─── DB-to-frontend mapping ───
export function dbToFrontend(row: ActivityDB & { _predecessors?: string[]; _successors?: string[]; _linked?: LinkedItemRef[] }): Activity {
  return {
    id: row.id,
    project_id: row.project_id || null,
    parent_id: row.parent_id ?? null,
    name: row.name,
    trade: row.trade || 'General / GC',
    sub: row.sub || '',
    area: row.area || 'Tower A',
    floor: row.floor || '',
    phase: row.phase || '',
    start: row.start_date || null,
    finish: row.finish_date || null,
    duration: row.duration || 1,
    hasDate: !!(row.start_date || row.finish_date),
    status: row.status || 'Not Started',
    pct: row.pct || 0,
    priority: row.priority || 'Normal',
    blocker: row.blocker || '',
    milestone: row.milestone || false,
    lookahead: row.lookahead || false,
    notes: row.notes || '',
    predecessors: row._predecessors || [],
    successors: row._successors || [],
    linked: row._linked || [],
    attachments: [],
    sort_order: row.sort_order ?? 0,
  };
}

export function frontendToDb(a: Activity): Record<string, unknown> {
  return {
    id: a.id,
    project_id: a.project_id || null,
    name: a.name,
    trade: a.trade,
    sub: a.sub || '',
    area: a.area,
    floor: a.floor || '',
    phase: a.phase || '',
    start_date: isoDate(a.start) || null,
    finish_date: isoDate(a.finish) || null,
    duration: a.duration,
    status: a.status,
    pct: a.pct,
    priority: a.priority,
    blocker: a.blocker || '',
    milestone: a.milestone || false,
    lookahead: a.lookahead || false,
    notes: a.notes || '',
    sort_order: a.sort_order ?? 0,
    parent_id: a.parent_id ?? null,
  };
}
