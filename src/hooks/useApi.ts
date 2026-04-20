'use client';

import { useAppStore, dbToFrontend, frontendToDb } from './useAppStore';
import { resolveAllDates } from '@/lib/helpers';
import type { Activity, ActivityDB, LinkedItemRef, LinkType, AppUser } from '@/types';

const API_BASE = '/api/activities';

export function useApi() {
  const { setActivities, setActivityLinks, activities, setUsers } = useAppStore();

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

      const allLinks: { id: string; predecessor_id: string; successor_id: string; link_type: string; lag_days: number }[] = linksResp.ok ? await linksResp.json() : [];
      const allItems = itemsResp.ok ? await itemsResp.json() : [];

      const predMap: Record<string, string[]> = {};
      const succMap: Record<string, string[]> = {};
      allLinks.forEach((l) => {
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

      // Resolve all dates against the full link graph so every activity that
      // has multiple predecessors starts after the latest one finishes.
      const typedLinks = allLinks.map((l) => ({
        id: l.id,
        predecessor_id: l.predecessor_id,
        successor_id: l.successor_id,
        link_type: l.link_type as 'FS' | 'FF' | 'SS' | 'SF',
        lag_days: l.lag_days,
      }));
      const resolved = resolveAllDates(mapped, typedLinks);

      setActivities(resolved);
      setActivityLinks(typedLinks);
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
      // Read the freshest activities list from the store — closing over the
      // hook-captured `activities` would persist a stale row when saves fire
      // after multiple rapid updates (e.g. swap partner writes).
      const fresh = useAppStore.getState().activities;
      const a = fresh.find((x) => x.id === id);
      if (!a) return false;
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

  async function addLink(predecessorId: string, successorId: string, linkType: LinkType = 'FS', lagDays = 0): Promise<boolean> {
    try {
      const resp = await fetch('/api/activity-links', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ predecessor_id: predecessorId, successor_id: successorId, link_type: linkType, lag_days: lagDays }),
      });
      return resp.ok;
    } catch { return false; }
  }

  async function updateLinkType(predecessorId: string, successorId: string, linkType: LinkType): Promise<boolean> {
    try {
      const resp = await fetch('/api/activity-links');
      if (!resp.ok) return false;
      const links: { id: string; predecessor_id: string; successor_id: string }[] = await resp.json();
      const link = links.find((l) => l.predecessor_id === predecessorId && l.successor_id === successorId);
      if (!link) return false;
      const patch = await fetch(`/api/activity-links/${link.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ link_type: linkType }),
      });
      return patch.ok;
    } catch { return false; }
  }

  async function removeLink(predecessorId: string, successorId: string): Promise<boolean> {
    try {
      // fetch all links, find the matching one, delete by id
      const resp = await fetch('/api/activity-links');
      if (!resp.ok) return false;
      const links: { id: string; predecessor_id: string; successor_id: string }[] = await resp.json();
      const link = links.find((l) => l.predecessor_id === predecessorId && l.successor_id === successorId);
      if (!link) return false;
      const del = await fetch(`/api/activity-links/${link.id}`, { method: 'DELETE' });
      return del.ok;
    } catch { return false; }
  }

  async function patchOne(id: string, updates: Record<string, unknown>): Promise<boolean> {
    try {
      const resp = await fetch(`${API_BASE}/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      return resp.ok;
    } catch { return false; }
  }

  async function loadUsers(): Promise<void> {
    try {
      const resp = await fetch('/api/users');
      if (!resp.ok) return;
      const data: AppUser[] = await resp.json();
      setUsers(data);
    } catch {/* ignore */}
  }

  async function createUser(user: Omit<AppUser, 'id' | 'created_at'>): Promise<AppUser | null> {
    try {
      const resp = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(user),
      });
      if (!resp.ok) return null;
      return await resp.json();
    } catch { return null; }
  }

  async function updateUser(id: string, updates: Partial<Omit<AppUser, 'id' | 'created_at'>>): Promise<boolean> {
    try {
      const resp = await fetch(`/api/users/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      return resp.ok;
    } catch { return false; }
  }

  async function deleteUser(id: string): Promise<boolean> {
    try {
      const resp = await fetch(`/api/users/${id}`, { method: 'DELETE' });
      return resp.ok;
    } catch { return false; }
  }

  return { loadAll, saveAll, saveOne, createOne, deleteOne, addLink, removeLink, updateLinkType, patchOne, loadUsers, createUser, updateUser, deleteUser };
}

// Per-key debounced save. Each activity id gets its own timer so rapid
// drags on different bars don't cancel each other.
const _saveTimers: Record<string, ReturnType<typeof setTimeout>> = {};
export function debouncedSave(fn: () => Promise<boolean>, delay = 300, key = '__default__') {
  if (_saveTimers[key]) clearTimeout(_saveTimers[key]);
  _saveTimers[key] = setTimeout(() => {
    delete _saveTimers[key];
    fn();
  }, delay);
}
