import type { Activity, KPIs } from '@/types';

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
  return new Date((parseDate(d) || TODAY).getTime() + n * DAY_MS);
}

export function diffDays(a: string | Date | null | undefined, b: string | Date | null | undefined): number {
  return Math.round(((parseDate(b) || new Date()).getTime() - (parseDate(a) || new Date()).getTime()) / DAY_MS);
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
  return items.filter(a => {
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
}

export function getWeatherDesc(code: number): { icon: string; text: string } {
  const map: Record<number, { icon: string; text: string }> = {
    0: { icon: '☀️', text: 'Clear sky' },
    1: { icon: '🌤', text: 'Mainly clear' },
    2: { icon: '⛅', text: 'Partly cloudy' },
    3: { icon: '☁️', text: 'Overcast' },
    45: { icon: '🌫', text: 'Fog' },
    48: { icon: '🌫', text: 'Freezing fog' },
    51: { icon: '🌦', text: 'Light drizzle' },
    53: { icon: '🌦', text: 'Drizzle' },
    55: { icon: '🌧', text: 'Heavy drizzle' },
    61: { icon: '🌧', text: 'Light rain' },
    63: { icon: '🌧', text: 'Rain' },
    65: { icon: '🌧', text: 'Heavy rain' },
    71: { icon: '🌨', text: 'Light snow' },
    73: { icon: '🌨', text: 'Snow' },
    75: { icon: '🌨', text: 'Heavy snow' },
    80: { icon: '🌦', text: 'Rain showers' },
    81: { icon: '🌧', text: 'Moderate showers' },
    82: { icon: '🌧', text: 'Heavy showers' },
    95: { icon: '⚡', text: 'Thunderstorm' },
    96: { icon: '⚡', text: 'Thunderstorm + hail' },
    99: { icon: '⚡', text: 'Severe thunderstorm' },
  };
  return map[code] || { icon: '⛅', text: 'Unknown' };
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
