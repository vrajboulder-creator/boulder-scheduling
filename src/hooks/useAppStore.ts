'use client';

import { create } from 'zustand';
import { toast } from 'sonner';
import type { Activity, ViewType, ProjectConfig, WeatherDetail, ActivityDB, LinkedItemRef } from '@/types';
import { isoDate, addDays, TODAY } from '@/lib/helpers';
import { SUBS } from '@/data/constants';

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
  setActivities: (acts: Activity[]) => void;
  addActivity: (a: Activity) => void;
  updateActivity: (id: string, updates: Partial<Activity>) => void;
  removeActivity: (id: string) => void;

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

  // Toast
  toastMessage: string;
  showToast: (msg: string) => void;
}

const defaultFilters = (): SectionFilters => ({
  mode: 'list', trade: '', area: '', status: '', phase: '', floor: '',
});

export const useAppStore = create<AppState>((set, get) => ({
  activities: [],
  setActivities: (acts) => set({ activities: acts }),
  addActivity: (a) => set((s) => ({ activities: [...s.activities, a] })),
  updateActivity: (id, updates) =>
    set((s) => ({
      activities: s.activities.map((a) => (a.id === id ? { ...a, ...updates } : a)),
    })),
  removeActivity: (id) =>
    set((s) => ({ activities: s.activities.filter((a) => a.id !== id) })),

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
    project_id: row.project_id || null,
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
  };
}
