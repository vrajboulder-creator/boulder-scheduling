'use client';

import { useAppStore, dbToFrontend, frontendToDb } from './useAppStore';
import type { Activity, ActivityDB, LinkedItemRef } from '@/types';

const API_BASE = '/api/activities';

export function useApi() {
  const { setActivities, activities, showToast } = useAppStore();

  async function loadAll(projectId?: string | null): Promise<boolean> {
    try {
      const actUrl = projectId ? `${API_BASE}?project_id=${projectId}` : API_BASE;
      const [actResp, linksResp, itemsResp] = await Promise.all([
        fetch(actUrl),
        fetch('/api/activity-links'),
        fetch('/api/linked-items'),
      ]);

      if (!actResp.ok) throw new Error(actResp.statusText);
      const rows: ActivityDB[] = await actResp.json();
      if (!Array.isArray(rows) || rows.length === 0) return false;

      const allLinks = linksResp.ok ? await linksResp.json() : [];
      const allItems = itemsResp.ok ? await itemsResp.json() : [];

      const predMap: Record<string, string[]> = {};
      const succMap: Record<string, string[]> = {};
      allLinks.forEach((l: { predecessor_id: string; successor_id: string }) => {
        if (!succMap[l.predecessor_id]) succMap[l.predecessor_id] = [];
        succMap[l.predecessor_id].push(l.successor_id);
        if (!predMap[l.successor_id]) predMap[l.successor_id] = [];
        predMap[l.successor_id].push(l.predecessor_id);
      });

      const linkedByActivity: Record<string, LinkedItemRef[]> = {};
      allItems.forEach((i: { activity_id: string; item_type: string; reference: string }) => {
        if (!linkedByActivity[i.activity_id]) linkedByActivity[i.activity_id] = [];
        linkedByActivity[i.activity_id].push({ type: i.item_type as LinkedItemRef['type'], ref: i.reference });
      });

      const mapped = rows.map((row) => {
        const enriched = {
          ...row,
          _predecessors: predMap[row.id] || [],
          _successors: succMap[row.id] || [],
          _linked: linkedByActivity[row.id] || [],
        };
        return dbToFrontend(enriched);
      });

      setActivities(mapped);
      return true;
    } catch (e) {
      console.warn('API load failed:', (e as Error).message);
      return false;
    }
  }

  async function saveAll(): Promise<boolean> {
    try {
      const dbRows = activities.map(frontendToDb);
      const resp = await fetch(`${API_BASE}/bulk/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dbRows),
      });
      if (!resp.ok) throw new Error(resp.statusText);
      return true;
    } catch (e) {
      console.warn('API save failed:', (e as Error).message);
      return false;
    }
  }

  async function saveOne(id: string): Promise<boolean> {
    try {
      const a = activities.find((x) => x.id === id);
      if (!a) return false;
      // Use bulk upsert (insert-or-update) so fallback data that doesn't
      // exist in DB yet gets created on first edit
      const dbRow = frontendToDb(a);
      const resp = await fetch(`${API_BASE}/bulk/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify([dbRow]),
      });
      if (!resp.ok) throw new Error(resp.statusText);
      return true;
    } catch (e) {
      console.warn('API save one failed:', (e as Error).message);
      return false;
    }
  }

  async function createOne(a: Activity): Promise<boolean> {
    try {
      const resp = await fetch(API_BASE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(frontendToDb(a)),
      });
      return resp.ok;
    } catch {
      return false;
    }
  }

  async function deleteOne(id: string): Promise<boolean> {
    try {
      const resp = await fetch(`${API_BASE}/${id}`, { method: 'DELETE' });
      return resp.ok;
    } catch {
      return false;
    }
  }

  return { loadAll, saveAll, saveOne, createOne, deleteOne };
}

// Debounced save helper
let _saveTimer: ReturnType<typeof setTimeout> | null = null;
export function debouncedSave(fn: () => Promise<boolean>, delay = 300) {
  if (_saveTimer) clearTimeout(_saveTimer);
  _saveTimer = setTimeout(fn, delay);
}
