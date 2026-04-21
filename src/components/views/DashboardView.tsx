'use client';

import { useState, useEffect, type ReactNode } from 'react';
import { useAppStore } from '@/hooks/useAppStore';
import { getKPIs, isOverdue, isThisWeek, fmt, diffDays, TODAY } from '@/lib/helpers';
import ActivityTable from '@/components/ui/ActivityTable';
import { WeatherIcon } from '@/components/ui/WeatherCard';
import {
  AlertTriangle, CalendarDays, Zap, List, LayoutGrid,
  TrendingUp, CheckCircle2, Clock, Ban, MapPin, Building2,
  CloudOff, ChevronRight, Calendar,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Activity, Project } from '@/types';

type SectionMode = 'list' | 'grid';

// ── project thumbnail images — keyed by DB project code ──────────────────────
// Uses Unsplash construction/hotel photos. Add new codes here as projects grow.
const PROJECT_IMAGES: Record<string, string> = {
  // TownePlace Suites — Beaumont TX (construction site)
  tpsj:                  'https://images.unsplash.com/photo-1541888946425-d81bb19240f5?w=600&q=80',
  // Hampton Inn — hotel room
  'hampton-inn':         'https://images.unsplash.com/photo-1590490360182-c33d57733427?w=600&q=80',
  'hampton-inn-beaumont':'https://images.unsplash.com/photo-1590490360182-c33d57733427?w=600&q=80',
  'hampton':             'https://images.unsplash.com/photo-1590490360182-c33d57733427?w=600&q=80',
  // Fairfield Inn — city skyline / midland
  'fairfield-inn':       'https://images.unsplash.com/photo-1486325212027-8081e485255e?w=600&q=80',
  'fairfield':           'https://images.unsplash.com/photo-1486325212027-8081e485255e?w=600&q=80',
  // Holiday Inn Express — Tyler TX
  'holiday-inn':         'https://images.unsplash.com/photo-1563911302283-d2bc129e7570?w=600&q=80',
  'holiday-inn-express': 'https://images.unsplash.com/photo-1563911302283-d2bc129e7570?w=600&q=80',
  'holiday':             'https://images.unsplash.com/photo-1563911302283-d2bc129e7570?w=600&q=80',
  // generic fallback hotel construction
  default:               'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=600&q=80',
};
const FALLBACK_COLORS = [
  'from-blue-500 to-blue-700',
  'from-orange-500 to-orange-700',
  'from-emerald-500 to-emerald-700',
  'from-purple-500 to-purple-700',
];

function statusStyle(status: Project['status']) {
  switch (status) {
    case 'Active':    return { dot: 'bg-emerald-400', text: 'text-emerald-700', bg: 'bg-emerald-50', ring: 'ring-emerald-200' };
    case 'On Hold':   return { dot: 'bg-amber-400',   text: 'text-amber-700',   bg: 'bg-amber-50',   ring: 'ring-amber-200' };
    case 'Complete':  return { dot: 'bg-sky-400',      text: 'text-sky-700',     bg: 'bg-sky-50',     ring: 'ring-sky-200' };
    case 'Archived':  return { dot: 'bg-slate-400',    text: 'text-slate-600',   bg: 'bg-slate-100',  ring: 'ring-slate-200' };
  }
}

// ── top KPI strip ─────────────────────────────────────────────────────────────
function KPIStrip({ projects, activities }: { projects: Project[]; activities: Activity[] }) {
  const kpis = getKPIs(activities);
  const active   = projects.filter((p) => p.status === 'Active').length;
  const onTrack  = activities.filter((a) => a.status === 'In Progress' && !isOverdue(a)).length;
  const delayed  = kpis.delayed;
  const blocked  = kpis.blocked;

  const pills = [
    { label: 'Total Projects', value: projects.length, icon: Building2,   color: 'text-slate-600',  bg: 'bg-slate-100' },
    { label: 'Active',         value: active,          icon: TrendingUp,   color: 'text-emerald-600',bg: 'bg-emerald-50' },
    { label: 'In Progress',    value: onTrack,         icon: Clock,        color: 'text-blue-600',   bg: 'bg-blue-50' },
    { label: 'Delayed',        value: delayed,         icon: AlertTriangle,color: delayed>0?'text-red-600':'text-slate-400', bg: delayed>0?'bg-red-50':'bg-slate-50' },
    { label: 'Blocked',        value: blocked,         icon: Ban,          color: blocked>0?'text-orange-600':'text-slate-400', bg: blocked>0?'bg-orange-50':'bg-slate-50' },
    { label: 'Due This Week',  value: kpis.starting_week, icon: CalendarDays, color: 'text-primary', bg: 'bg-primary/5' },
    { label: 'Critical Path',  value: kpis.critical,   icon: Zap,          color: kpis.critical>0?'text-orange-600':'text-slate-400', bg: kpis.critical>0?'bg-orange-50':'bg-slate-50' },
  ];

  return (
    <div className="grid grid-cols-4 sm:grid-cols-7 gap-2.5 mb-6">
      {pills.map((p) => {
        const Icon = p.icon;
        return (
          <div key={p.label} className={cn('rounded-xl border border-slate-200 px-4 py-3 flex flex-col gap-1 bg-white shadow-sm')}>
            <div className={cn('w-7 h-7 rounded-lg flex items-center justify-center shrink-0', p.bg)}>
              <Icon className={cn('h-3.5 w-3.5', p.color)} />
            </div>
            <p className="text-[22px] font-extrabold leading-none text-slate-900 mt-1">{p.value}</p>
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">{p.label}</p>
          </div>
        );
      })}
    </div>
  );
}

// ── single project card ───────────────────────────────────────────────────────
function ProjectCard({
  project, activities, isCurrent, idx, onClick,
}: {
  project: Project;
  activities: Activity[];
  isCurrent: boolean;
  idx: number;
  onClick: () => void;
}) {
  const store = useAppStore((s) => s.projects);
  const cfg   = store[project.code];
  // Match by exact code, then first word of code, then default
  const img = PROJECT_IMAGES[project.code]
    ?? PROJECT_IMAGES[project.code.split('-')[0]]
    ?? PROJECT_IMAGES.default;
  const fallback = FALLBACK_COLORS[idx % FALLBACK_COLORS.length];
  const style = statusStyle(project.status);

  const total     = activities.length;
  const complete  = activities.filter((a) => a.status === 'Complete').length;
  const delayed   = activities.filter((a) => isOverdue(a)).length;
  const inProg    = activities.filter((a) => a.status === 'In Progress').length;
  const pct       = total > 0 ? Math.round((complete / total) * 100) : 0;
  const daysLeft  = project.target_completion ? diffDays(TODAY, project.target_completion) : null;

  // phase breadcrumb — most common phase among active activities
  const phases = activities.filter((a) => a.status !== 'Complete' && a.phase);
  const phaseCount: Record<string, number> = {};
  phases.forEach((a) => { phaseCount[a.phase] = (phaseCount[a.phase] || 0) + 1; });
  const topPhase = Object.entries(phaseCount).sort((a, b) => b[1] - a[1])[0]?.[0] ?? '—';

  return (
    <div
      onClick={onClick}
      className={cn(
        'bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all cursor-pointer',
        isCurrent && 'ring-2 ring-[#e8793b] border-[#e8793b]/50'
      )}
    >
      {/* Thumbnail */}
      <div className="relative h-[120px] overflow-hidden">
        {img ? (
          <img src={img} alt={project.name} className="w-full h-full object-cover" />
        ) : (
          <div className={cn('w-full h-full bg-gradient-to-br', fallback)} />
        )}
        {/* overlay gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

        {/* status badge top-left */}
        <div className={cn('absolute top-2.5 left-2.5 flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold ring-1 backdrop-blur-sm bg-white/90', style.text, style.ring)}>
          <span className={cn('w-1.5 h-1.5 rounded-full', style.dot)} />
          {project.status}
        </div>

        {/* current badge top-right */}
        {isCurrent && (
          <div className="absolute top-2.5 right-2.5 flex items-center gap-1 px-2 py-1 rounded-full text-[9px] font-bold bg-[#e8793b] text-white shadow">
            <CheckCircle2 className="h-2.5 w-2.5" />
            Active
          </div>
        )}

        {/* name over image */}
        <div className="absolute bottom-2.5 left-3 right-3">
          <p className="text-white font-bold text-[13px] leading-tight truncate drop-shadow">{project.name}</p>
          {project.location && (
            <div className="flex items-center gap-1 mt-0.5">
              <MapPin className="h-2.5 w-2.5 text-white/70" />
              <span className="text-white/70 text-[10px] truncate">{project.location}</span>
            </div>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="p-3.5">
        {/* Progress bar */}
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[10px] font-semibold text-slate-500">Overall Progress</span>
          <span className="text-[11px] font-bold text-slate-700">{pct}%</span>
        </div>
        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden mb-3">
          <div
            className="h-full rounded-full bg-gradient-to-r from-[#e8793b] to-[#f59e0b] transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-1.5 mb-3">
          {[
            { label: 'Activities', value: total,    color: 'text-slate-600' },
            { label: 'In Progress', value: inProg,  color: 'text-blue-600' },
            { label: 'Delayed',     value: delayed, color: delayed > 0 ? 'text-red-600' : 'text-slate-400' },
          ].map((s) => (
            <div key={s.label} className="bg-slate-50 rounded-lg px-2 py-1.5 text-center">
              <p className={cn('text-[15px] font-extrabold leading-none', s.color)}>{s.value}</p>
              <p className="text-[9px] text-slate-400 mt-0.5 font-medium">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Phase + dates row */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-medium truncate max-w-[130px]">{topPhase}</span>
          {daysLeft !== null && (
            <span className={cn('text-[10px] px-2 py-0.5 rounded-full font-semibold flex items-center gap-1',
              daysLeft < 0 ? 'bg-red-50 text-red-600' : daysLeft < 30 ? 'bg-amber-50 text-amber-700' : 'bg-slate-100 text-slate-500'
            )}>
              <Calendar className="h-2.5 w-2.5" />
              {daysLeft < 0 ? `${Math.abs(daysLeft)}d overdue` : `${daysLeft}d left`}
            </span>
          )}
        </div>

        {/* 5-day forecast strip */}
        {cfg?.weatherDetail?.forecast?.length ? (
          <div className="mt-2.5 bg-sky-50 border border-sky-100 rounded-xl p-2">
            {/* Today summary */}
            <div className="flex items-center gap-1.5 mb-2 px-0.5">
              <WeatherIcon code={cfg.weatherDetail.code} className="h-3.5 w-3.5 text-sky-500" />
              <span className="text-[11px] font-bold text-sky-700">{cfg.weatherDetail.temp}°F</span>
              <span className="text-[10px] text-slate-400 truncate">{cfg.weatherDetail.desc}</span>
            </div>
            {/* Forecast days */}
            <div className="grid grid-cols-6 gap-1">
              {cfg.weatherDetail.forecast.slice(0, 6).map((day, i) => (
                <div key={i} className="flex flex-col items-center gap-0.5 bg-white/70 rounded-lg py-1.5 px-0.5">
                  <span className="text-[9px] font-bold text-slate-500 uppercase">{day.day}</span>
                  <WeatherIcon code={day.code} className="h-3.5 w-3.5 text-sky-500 my-0.5" />
                  <span className="text-[9px] font-bold text-slate-700">{day.hi}°</span>
                  <span className="text-[8px] text-slate-400">{day.lo}°</span>
                  {day.rain > 20 && (
                    <span className="text-[8px] text-blue-500 font-semibold">{day.rain}%</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="mt-2.5 flex items-center gap-1.5 text-[10px] text-slate-400 bg-slate-50 rounded-lg px-2.5 py-1.5">
            <CloudOff className="h-3 w-3" />
            <span>{cfg?.weatherLoaded ? 'No weather data' : 'Weather loading…'}</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ── main DashboardView ────────────────────────────────────────────────────────
export default function DashboardView() {
  const { activities, projects: projectCfg, setCurrentProject, setView, showToast } = useAppStore();
  const currentProject = useAppStore((s) => s.currentProject);
  const kpis = getKPIs(activities);

  const [dbProjects, setDbProjects] = useState<Project[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(true);

  // per-section toggle state
  const [overdueMode,  setOverdueMode]  = useState<SectionMode>('list');
  const [thisWeekMode, setThisWeekMode] = useState<SectionMode>('list');
  const [criticalMode, setCriticalMode] = useState<SectionMode>('list');

  const overdue  = activities.filter((a) => isOverdue(a));
  const thisWeek = activities.filter((a) => isThisWeek(a.start) && a.status !== 'Complete');
  const critical = activities.filter((a) => a.priority === 'Critical' && a.status !== 'Complete');

  useEffect(() => {
    let cancelled = false;
    fetch('/api/projects')
      .then((r) => r.ok ? r.json() : Promise.reject())
      .then((data: Project[]) => { if (!cancelled) setDbProjects(data); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoadingProjects(false); });
    return () => { cancelled = true; };
  }, []);

  function switchTo(p: Project) {
    setCurrentProject(p.code);
    showToast(`Switched to ${p.name}`);
  }

  // map activities per project
  function activitiesFor(p: Project) {
    return activities.filter((a) => {
      const cfg = projectCfg[p.code];
      return cfg?.id ? (a as any).project_id === cfg.id : true;
    });
  }

  return (
    <div className="animate-fade-in space-y-8">

      {/* ── KPI strip ── */}
      <KPIStrip projects={dbProjects} activities={activities} />

      {/* ── Active Projects ── */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-primary" />
            <h2 className="text-[15px] font-bold tracking-tight">Active Projects</h2>
            <span className="text-[10.5px] text-muted-foreground bg-muted px-2.5 py-0.5 rounded-full font-semibold">
              {dbProjects.filter((p) => p.status === 'Active').length} projects
            </span>
          </div>
          <button
            onClick={() => setView('projects')}
            className="flex items-center gap-1 text-[11px] text-primary font-semibold hover:underline"
          >
            View all <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>

        {loadingProjects ? (
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {[1,2,3,4].map((i) => (
              <div key={i} className="bg-white rounded-2xl border border-slate-200 h-[300px] animate-pulse" />
            ))}
          </div>
        ) : dbProjects.filter((p) => p.status === 'Active').length === 0 ? (
          <div className="text-center py-12 text-slate-400 text-[13px] bg-slate-50 rounded-xl border border-slate-200">
            No active projects yet.{' '}
            <button onClick={() => setView('projects')} className="text-primary font-semibold underline">Create one →</button>
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {dbProjects
              .filter((p) => p.status === 'Active')
              .map((p, i) => (
                <ProjectCard
                  key={p.id}
                  project={p}
                  activities={activitiesFor(p)}
                  isCurrent={p.code === currentProject}
                  idx={i}
                  onClick={() => switchTo(p)}
                />
              ))}
          </div>
        )}
      </section>

      {/* ── Activity sections ── */}
      {overdue.length > 0 && (
        <DashboardSection
          title="Overdue Activities"
          count={overdue.length}
          icon={<AlertTriangle className="h-4 w-4 text-destructive" />}
          mode={overdueMode}
          onModeChange={setOverdueMode}
        >
          <ActivityTable items={overdue.slice(0, 10)} mode={overdueMode} />
        </DashboardSection>
      )}

      <DashboardSection
        title="This Week"
        count={thisWeek.length}
        icon={<CalendarDays className="h-4 w-4 text-primary" />}
        mode={thisWeekMode}
        onModeChange={setThisWeekMode}
      >
        <ActivityTable items={thisWeek.slice(0, 15)} mode={thisWeekMode} />
      </DashboardSection>

      {critical.length > 0 && (
        <DashboardSection
          title="Critical Path"
          count={critical.length}
          icon={<Zap className="h-4 w-4 text-orange-500" />}
          mode={criticalMode}
          onModeChange={setCriticalMode}
        >
          <ActivityTable items={critical.slice(0, 10)} mode={criticalMode} />
        </DashboardSection>
      )}
    </div>
  );
}

// ── reusable section wrapper ──────────────────────────────────────────────────
interface SectionProps {
  title: string;
  count: number;
  icon: ReactNode;
  mode: SectionMode;
  onModeChange: (m: SectionMode) => void;
  children: ReactNode;
  className?: string;
}

function DashboardSection({ title, count, icon, mode, onModeChange, children, className }: SectionProps) {
  return (
    <section className={cn('mt-2', className)}>
      <div className="flex items-center gap-2.5 mb-3">
        {icon}
        <h2 className="text-[15px] font-bold tracking-tight">{title}</h2>
        <span className="text-[10.5px] text-muted-foreground bg-muted px-2.5 py-0.5 rounded-full font-semibold">
          {count}
        </span>
        <div className="ml-auto flex items-center bg-muted rounded-lg p-0.5 gap-0.5">
          <button
            onClick={() => onModeChange('list')}
            className={cn('p-1.5 rounded-md transition-all',
              mode === 'list' ? 'bg-card shadow-sm text-primary' : 'text-muted-foreground hover:text-primary'
            )}
            title="List view"
          >
            <List className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => onModeChange('grid')}
            className={cn('p-1.5 rounded-md transition-all',
              mode === 'grid' ? 'bg-card shadow-sm text-primary' : 'text-muted-foreground hover:text-primary'
            )}
            title="Grid view"
          >
            <LayoutGrid className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
      {children}
    </section>
  );
}

export type { Activity };
