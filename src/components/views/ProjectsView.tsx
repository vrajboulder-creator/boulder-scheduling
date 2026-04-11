'use client';

import { useEffect, useMemo, useState } from 'react';
import { useAppStore } from '@/hooks/useAppStore';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { SelectNative } from '@/components/ui/select-native';
import { FolderKanban, Plus, MapPin, Calendar, CheckCircle2, X, Loader2 } from 'lucide-react';
import { fmt } from '@/lib/helpers';
import { cn } from '@/lib/utils';
import type { Project, ProjectConfig } from '@/types';

// Reuse the same coord table from app/page.tsx for weather on new projects.
const PROJECT_COORDS: Record<string, { lat: number; lon: number }> = {
  tpsj: { lat: 30.08, lon: -94.10 },
  'hampton-inn': { lat: 30.08, lon: -94.10 },
  'fairfield-inn': { lat: 31.99, lon: -102.08 },
  'holiday-inn': { lat: 32.35, lon: -95.30 },
};

export default function ProjectsView() {
  const projects = useAppStore((s) => s.projects);
  const currentProject = useAppStore((s) => s.currentProject);
  const setProjects = useAppStore((s) => s.setProjects);
  const setCurrentProject = useAppStore((s) => s.setCurrentProject);
  const showToast = useAppStore((s) => s.showToast);

  const [rows, setRows] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    name: '',
    code: '',
    location: '',
    status: 'Active' as Project['status'],
    start_date: '',
    target_completion: '',
  });

  // Load DB projects
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch('/api/projects')
      .then((r) => (r.ok ? r.json() : Promise.reject(r.statusText)))
      .then((data: Project[]) => { if (!cancelled) setRows(data); })
      .catch((e) => showToast(`Failed to load projects: ${e}`))
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [showToast]);

  const total = rows.length;
  const active = useMemo(() => rows.filter((p) => p.status === 'Active').length, [rows]);

  function switchTo(p: Project) {
    // Mirror the DB row into the store's projects map if missing, then switch.
    if (!projects[p.code]) {
      const coords = PROJECT_COORDS[p.code] || { lat: 30.08, lon: -94.10 };
      const next: Record<string, ProjectConfig> = { ...projects };
      next[p.code] = {
        id: p.id,
        code: p.code,
        name: p.name,
        lat: coords.lat,
        lon: coords.lon,
        weather: 'Loading weather...',
        weatherLoaded: false,
      };
      setProjects(next);
    }
    setCurrentProject(p.code);
    showToast(`Switched to ${p.name}`);
  }

  async function createProject() {
    if (!form.name.trim() || !form.code.trim()) {
      showToast('Name and code required');
      return;
    }
    setCreating(true);
    try {
      const resp = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name.trim(),
          code: form.code.trim().toLowerCase().replace(/\s+/g, '-'),
          location: form.location.trim() || null,
          status: form.status,
          start_date: form.start_date || null,
          target_completion: form.target_completion || null,
        }),
      });
      if (!resp.ok) throw new Error(await resp.text());
      const saved: Project = await resp.json();
      setRows((prev) => [...prev, saved]);
      setForm({ name: '', code: '', location: '', status: 'Active', start_date: '', target_completion: '' });
      setShowForm(false);
      showToast(`Created ${saved.name}`);
    } catch (e) {
      showToast(`Create failed: ${(e as Error).message}`);
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="animate-fade-in">
      {/* Toolbar */}
      <div className="flex items-center justify-between mb-4 gap-2 flex-wrap">
        <div className="flex items-center gap-2.5">
          <FolderKanban className="h-4 w-4 text-primary" />
          <h2 className="text-[15px] font-bold tracking-tight">Projects</h2>
          <span className="text-[10.5px] text-muted-foreground bg-muted px-2.5 py-0.5 rounded-full font-semibold">
            {total} total · {active} active
          </span>
        </div>
        <Button size="sm" className="gap-1" onClick={() => setShowForm(true)}>
          <Plus className="h-3.5 w-3.5" />
          New Project
        </Button>
      </div>

      {/* Create form (inline) */}
      {showForm && (
        <Card className="p-4 mb-4 border-primary/40">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold">Create Project</h3>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setShowForm(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Name *">
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Riverside Plaza" />
            </FormField>
            <FormField label="Code (slug) *">
              <Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="e.g. riverside-plaza" />
            </FormField>
            <FormField label="Location">
              <Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="e.g. Dallas, TX" />
            </FormField>
            <FormField label="Status">
              <SelectNative value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as Project['status'] })}>
                <option value="Active">Active</option>
                <option value="On Hold">On Hold</option>
                <option value="Complete">Complete</option>
                <option value="Archived">Archived</option>
              </SelectNative>
            </FormField>
            <FormField label="Start Date">
              <Input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} />
            </FormField>
            <FormField label="Target Completion">
              <Input type="date" value={form.target_completion} onChange={(e) => setForm({ ...form, target_completion: e.target.value })} />
            </FormField>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" size="sm" onClick={() => setShowForm(false)} disabled={creating}>Cancel</Button>
            <Button size="sm" onClick={createProject} disabled={creating}>
              {creating && <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />}
              Create
            </Button>
          </div>
        </Card>
      )}

      {/* Project cards */}
      {loading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground text-sm gap-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading projects…
        </div>
      ) : rows.length === 0 ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground text-sm">
          No projects yet. Click <strong className="mx-1">New Project</strong> to create one.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {rows.map((p) => {
            const isCurrent = p.code === currentProject;
            return (
              <Card
                key={p.id}
                onClick={() => switchTo(p)}
                className={cn(
                  'p-4 cursor-pointer transition-all hover:shadow-md hover:-translate-y-0.5 relative overflow-hidden border-l-[3px]',
                  isCurrent ? 'border-l-primary bg-primary/5 ring-1 ring-primary/30' : 'border-l-border'
                )}
              >
                {/* Current badge */}
                {isCurrent && (
                  <span className="absolute top-3 right-3 flex items-center gap-1 text-[9px] font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                    <CheckCircle2 className="h-3 w-3" />
                    Current
                  </span>
                )}

                {/* Name + code */}
                <h3 className="text-[13px] font-semibold leading-tight pr-16 truncate">{p.name}</h3>
                <p className="text-[10px] font-mono text-muted-foreground mt-0.5">{p.code}</p>

                {/* Location */}
                {p.location && (
                  <div className="flex items-center gap-1 text-[11px] text-muted-foreground mt-2">
                    <MapPin className="h-3 w-3 shrink-0" />
                    <span className="truncate">{p.location}</span>
                  </div>
                )}

                {/* Status pill */}
                <div className="mt-2">
                  <StatusPill status={p.status} />
                </div>

                {/* Dates */}
                {(p.start_date || p.target_completion) && (
                  <div className="flex items-center gap-1 text-[10.5px] text-muted-foreground mt-2">
                    <Calendar className="h-3 w-3 shrink-0" />
                    <span>{fmt(p.start_date)} – {fmt(p.target_completion)}</span>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[11px] text-muted-foreground mb-1 font-medium">{label}</p>
      {children}
    </div>
  );
}

function StatusPill({ status }: { status: Project['status'] }) {
  const colors: Record<Project['status'], string> = {
    Active: 'text-emerald-700 bg-emerald-50 ring-emerald-200',
    'On Hold': 'text-amber-700 bg-amber-50 ring-amber-200',
    Complete: 'text-sky-700 bg-sky-50 ring-sky-200',
    Archived: 'text-slate-600 bg-slate-100 ring-slate-200',
  };
  return (
    <span className={cn('inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded-full ring-1', colors[status])}>
      {status}
    </span>
  );
}
