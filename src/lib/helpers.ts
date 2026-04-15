import type { Activity, ActivityLink, KPIs } from '@/types';

const DAY_MS = 86400000;

export const TODAY = (() => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
})();

export function parseDate(d: string | Date | null | undefined): Date | null {
  if (!d) return null;
  if (d instanceof Date) return d;
  const s = String(d);
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m) return new Date(+m[1], +m[2] - 1, +m[3]);
  const dd = new Date(d);
  return isNaN(dd.getTime()) ? null : dd;
}

export function fmt(d: string | Date | null | undefined): string {
  if (!d) return '—';
  const dd = parseDate(d);
  return !dd ? '—' : dd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function fmtFull(d: string | Date | null | undefined): string {
  if (!d) return '—';
  const dd = parseDate(d);
  return !dd ? '—' : dd.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
}

export function addDays(d: string | Date | null | undefined, n: number): Date {
  // Calendar-based: avoids DST drift. setDate() normalizes month/year.
  const base = parseDate(d) || TODAY;
  const out = new Date(base.getFullYear(), base.getMonth(), base.getDate() + n);
  return out;
}

export function diffDays(a: string | Date | null | undefined, b: string | Date | null | undefined): number {
  // Calendar-based: normalize both to local midnight, then divide.
  // Round handles the 23h/25h DST days that would otherwise yield 22.96 / 25.04.
  const pa = parseDate(a); const pb = parseDate(b);
  if (!pa || !pb) return 0;
  const ua = Date.UTC(pa.getFullYear(), pa.getMonth(), pa.getDate());
  const ub = Date.UTC(pb.getFullYear(), pb.getMonth(), pb.getDate());
  return Math.round((ub - ua) / DAY_MS);
}

export function isoDate(d: string | Date | null | undefined): string {
  if (!d) return '';
  const dd = parseDate(d);
  if (!dd) return '';
  return `${dd.getFullYear()}-${String(dd.getMonth() + 1).padStart(2, '0')}-${String(dd.getDate()).padStart(2, '0')}`;
}

export function isOverdue(a: Activity): boolean {
  return a.status !== 'Complete' && !!a.finish && parseDate(a.finish)! < TODAY;
}

export function isThisWeek(d: string | Date | null | undefined): boolean {
  const s = addDays(TODAY, -TODAY.getDay());
  const e = addDays(s, 6);
  const dt = parseDate(d);
  return !!dt && dt >= s && dt <= e;
}

export function isInRange(d: string | Date | null | undefined, days: number): boolean {
  const dt = parseDate(d);
  return !!dt && dt >= TODAY && dt <= addDays(TODAY, days);
}

export function esc(str: string | number | null | undefined): string {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function getKPIs(activities: Activity[]): KPIs {
  const due_today = activities.filter(a => isoDate(a.finish) === isoDate(TODAY) && a.status !== 'Complete').length;
  const starting_week = activities.filter(a => isThisWeek(a.start) && a.status !== 'Complete').length;
  const delayed = activities.filter(a => a.status === 'Delayed').length;
  const blocked = activities.filter(a => a.status === 'Blocked' || a.blocker).length;
  const overdue = activities.filter(a => isOverdue(a)).length;
  const critical = activities.filter(a => a.priority === 'Critical' && a.status !== 'Complete').length;
  const in_progress = activities.filter(a => a.status === 'In Progress').length;
  const ready = activities.filter(a =>
    a.status === 'Ready to Start' ||
    (a.status === 'Not Started' && !a.blocker && parseDate(a.start)! <= addDays(TODAY, 7))
  ).length;
  const inspections = activities.filter(a => a.linked?.some(l => l.type === 'Inspection') && a.status !== 'Complete').length;
  const procurement = activities.filter(a => a.linked?.some(l => l.type === 'Procurement') && a.status !== 'Complete').length;
  return { due_today, starting_week, delayed, blocked, overdue, critical, in_progress, ready, inspections, procurement };
}

export function applyFilters(
  items: Activity[],
  filters: { trade: string; area: string; status: string; phase: string; floor: string },
  searchQuery: string
): Activity[] {
  const filtered = items.filter(a => {
    if (filters.trade && a.trade !== filters.trade) return false;
    if (filters.area && a.area !== filters.area) return false;
    if (filters.status && a.status !== filters.status) return false;
    if (filters.phase && a.phase !== filters.phase) return false;
    if (filters.floor && a.floor !== filters.floor) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        a.name.toLowerCase().includes(q) ||
        a.trade.toLowerCase().includes(q) ||
        (a.sub || '').toLowerCase().includes(q) ||
        a.area.toLowerCase().includes(q) ||
        a.id.toLowerCase().includes(q) ||
        (a.phase || '').toLowerCase().includes(q) ||
        (a.notes || '').toLowerCase().includes(q)
      );
    }
    return true;
  });
  return filtered.sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
}

// ─── Weather code → lucide icon name + label + tailwind color class ───
// Open-Meteo WMO codes: https://open-meteo.com/en/docs
// Returns a lucide *icon name* (string) so consumers can import the icon
// themselves without helpers.ts pulling in React. The `color` value is a
// tailwind text-color class tuned for each condition.
export type WeatherIconName =
  | 'Sun' | 'CloudSun' | 'Cloud' | 'Cloudy' | 'CloudFog'
  | 'CloudDrizzle' | 'CloudRain' | 'CloudRainWind'
  | 'CloudSnow' | 'Snowflake' | 'CloudLightning' | 'CloudOff';

export function getWeatherDesc(code: number): { icon: WeatherIconName; text: string; color: string } {
  const map: Record<number, { icon: WeatherIconName; text: string; color: string }> = {
    0:  { icon: 'Sun',            text: 'Clear sky',          color: 'text-amber-500' },
    1:  { icon: 'Sun',            text: 'Mainly clear',       color: 'text-amber-500' },
    2:  { icon: 'CloudSun',       text: 'Partly cloudy',      color: 'text-amber-400' },
    3:  { icon: 'Cloudy',         text: 'Overcast',           color: 'text-slate-400' },
    45: { icon: 'CloudFog',       text: 'Fog',                color: 'text-slate-400' },
    48: { icon: 'CloudFog',       text: 'Freezing fog',       color: 'text-sky-300' },
    51: { icon: 'CloudDrizzle',   text: 'Light drizzle',      color: 'text-sky-400' },
    53: { icon: 'CloudDrizzle',   text: 'Drizzle',            color: 'text-sky-500' },
    55: { icon: 'CloudRain',      text: 'Heavy drizzle',      color: 'text-sky-600' },
    61: { icon: 'CloudRain',      text: 'Light rain',         color: 'text-sky-500' },
    63: { icon: 'CloudRain',      text: 'Rain',               color: 'text-sky-600' },
    65: { icon: 'CloudRainWind',  text: 'Heavy rain',         color: 'text-sky-700' },
    71: { icon: 'CloudSnow',      text: 'Light snow',         color: 'text-sky-200' },
    73: { icon: 'CloudSnow',      text: 'Snow',               color: 'text-sky-300' },
    75: { icon: 'Snowflake',      text: 'Heavy snow',         color: 'text-sky-400' },
    80: { icon: 'CloudDrizzle',   text: 'Rain showers',       color: 'text-sky-500' },
    81: { icon: 'CloudRain',      text: 'Moderate showers',   color: 'text-sky-600' },
    82: { icon: 'CloudRainWind',  text: 'Heavy showers',      color: 'text-sky-700' },
    95: { icon: 'CloudLightning', text: 'Thunderstorm',       color: 'text-violet-500' },
    96: { icon: 'CloudLightning', text: 'Thunderstorm + hail',color: 'text-violet-600' },
    99: { icon: 'CloudLightning', text: 'Severe thunderstorm',color: 'text-violet-700' },
  };
  return map[code] || { icon: 'CloudSun', text: 'Unknown', color: 'text-slate-400' };
}

// Trade color mapping for consistent badge colors
export function getTradeColor(trade: string): string {
  const colors: Record<string, string> = {
    'General / GC': '#6366f1',
    'Concrete': '#78716c',
    'Framing': '#d97706',
    'Drywall': '#a3a3a3',
    'Paint': '#ec4899',
    'HVAC': '#0891b2',
    'Plumbing': '#2563eb',
    'Electrical': '#eab308',
    'Low Voltage': '#8b5cf6',
    'Fire Alarm': '#dc2626',
    'Flooring': '#84cc16',
    'Sitework': '#65a30d',
    'Roofing': '#92400e',
    'Glazing': '#06b6d4',
    'Doors/Frames/HW': '#f97316',
    'Specialties': '#a855f7',
    'Casework': '#b45309',
    'Elevator': '#4f46e5',
    'Landscaping': '#16a34a',
    'Fire Sprinkler': '#e11d48',
    'Insulation': '#f59e0b',
  };
  return colors[trade] || '#6b7280';
}

// ─── Multi-dependency date resolver ──────────────────────────────────────────
//
// Given a flat list of activities + their links, returns a new activities array
// where every activity with predecessors has its start/finish recalculated:
//
//   start  = MAX(pred.finish for all preds) + 1 day  (FS links)
//   finish = start + duration - 1
//
// Uses Kahn's topological sort so predecessors are always resolved before
// successors. Activities with no predecessors keep their existing dates.
// Cycles are detected and skipped (those activities keep existing dates).
//
export function resolveAllDates(
  activities: Activity[],
  links: ActivityLink[],
): Activity[] {
  if (!links.length) return activities;

  const byId = new Map<string, Activity>(activities.map((a) => [a.id, { ...a }]));

  // Build adjacency: successors of each node, and in-degree count
  const successors = new Map<string, string[]>();
  const predecessors = new Map<string, string[]>();
  for (const a of activities) {
    successors.set(a.id, []);
    predecessors.set(a.id, []);
  }
  for (const lnk of links) {
    const s = successors.get(lnk.predecessor_id);
    if (s) s.push(lnk.successor_id);
    const p = predecessors.get(lnk.successor_id);
    if (p) p.push(lnk.predecessor_id);
  }

  // Kahn's algorithm: start with nodes that have no predecessors
  const inDegree = new Map<string, number>();
  for (const a of activities) inDegree.set(a.id, (predecessors.get(a.id) || []).length);

  const queue: string[] = [];
  for (const [id, deg] of inDegree) if (deg === 0) queue.push(id);

  const resolved = new Set<string>();

  const processNode = (id: string) => {
    resolved.add(id);
    const preds = predecessors.get(id) || [];
    if (preds.length > 0) {
      // Find the latest finish among all predecessors (MAX logic)
      let latestFinish: string | null = null;
      for (const predId of preds) {
        const pred = byId.get(predId);
        if (!pred?.finish) continue;
        if (!latestFinish || pred.finish > latestFinish) latestFinish = pred.finish;
      }
      if (latestFinish) {
        const act = byId.get(id)!;
        const newStart = isoDate(addDays(latestFinish, 1));
        const dur = act.duration || 1;
        const newFinish = isoDate(addDays(newStart, dur - 1));
        byId.set(id, { ...act, start: newStart, finish: newFinish });
      }
    }
    for (const succId of successors.get(id) || []) {
      const deg = (inDegree.get(succId) ?? 1) - 1;
      inDegree.set(succId, deg);
      if (deg === 0) queue.push(succId);
    }
  };

  while (queue.length > 0) processNode(queue.shift()!);

  // Cycle fallback: any node not yet resolved is part of a cycle. Break the
  // cycle by picking the unresolved node with the earliest stored start date
  // (or any if dates missing), treat it as the "root" of the cycle, and
  // process it — which will cascade to the rest of the cycle via successors.
  while (resolved.size < activities.length) {
    const unresolved = activities
      .filter((a) => !resolved.has(a.id))
      .sort((a, b) => (a.start || '').localeCompare(b.start || ''));
    if (unresolved.length === 0) break;
    const next = unresolved[0].id;
    // Force indegree to 0 so Kahn can continue
    inDegree.set(next, 0);
    processNode(next);
    while (queue.length > 0) processNode(queue.shift()!);
  }

  return activities.map((a) => byId.get(a.id) ?? a);
}
