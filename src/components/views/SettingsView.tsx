'use client';

import { useAppStore } from '@/hooks/useAppStore';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { SelectNative } from '@/components/ui/select-native';
import { Slider } from '@/components/ui/slider';
import { Settings2, Folder, LayoutGrid, Calendar, MapPin, CloudSun, Trash2, Thermometer, Wind, Droplets, BookOpen, Link2, Users } from 'lucide-react';
import { WeatherIcon } from '@/components/ui/WeatherCard';
import { fmt } from '@/lib/helpers';
import { TeamMembersManager } from '@/components/ui/AssignPopover';

export default function SettingsView() {
  const projects = useAppStore((s) => s.projects);
  const currentProject = useAppStore((s) => s.currentProject);
  const currentProjectId = useAppStore((s) => s.currentProjectId);
  const setProjects = useAppStore((s) => s.setProjects);
  const showToast = useAppStore((s) => s.showToast);

  const defaultViewMode = useAppStore((s) => s.defaultViewMode);
  const setDefaultViewMode = useAppStore((s) => s.setDefaultViewMode);
  const dateFormat = useAppStore((s) => s.dateFormat);
  const setDateFormat = useAppStore((s) => s.setDateFormat);
  const ganttPxPerDay = useAppStore((s) => s.ganttPxPerDay);
  const setGanttPxPerDay = useAppStore((s) => s.setGanttPxPerDay);
  const clearAllFilters = useAppStore((s) => s.clearAllFilters);

  const proj = projects[currentProject];
  const wd = proj?.weatherDetail;

  // Location editing — updates only the local store, not the DB. Coordinates
  // drive the Open-Meteo weather fetch. Changes apply on next reload.
  function updateCoord(key: 'lat' | 'lon', value: number) {
    if (!proj) return;
    const next = { ...projects };
    next[currentProject] = { ...proj, [key]: value, weather: 'Reloading…', weatherLoaded: false };
    setProjects(next);
    showToast(`Updated ${key} — reload page to refetch weather`);
  }

  return (
    <div className="animate-fade-in max-w-3xl">
      <div className="flex items-center gap-2.5 mb-4">
        <Settings2 className="h-4 w-4 text-primary" />
        <h2 className="text-[15px] font-bold tracking-tight">Settings</h2>
      </div>

      {/* ── Current Project (read-only) ── */}
      <SettingSection icon={<Folder className="h-3.5 w-3.5" />} title="Current Project">
        {proj ? (
          <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-[12px]">
            <InfoRow label="Name" value={proj.name} />
            <InfoRow label="Code" value={currentProject} mono />
            <InfoRow label="Project ID" value={currentProjectId || '—'} mono />
            <InfoRow label="Status" value="Active" />
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">No project selected.</p>
        )}
      </SettingSection>

      {/* ── Location ── */}
      <SettingSection icon={<MapPin className="h-3.5 w-3.5" />} title="Location">
        <p className="text-[11px] text-muted-foreground mb-3">
          Coordinates used to fetch weather from Open-Meteo. Reload the page after changing.
        </p>
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Latitude">
            <Input
              type="number"
              step="0.01"
              value={proj?.lat ?? ''}
              onChange={(e) => updateCoord('lat', parseFloat(e.target.value))}
              disabled={!proj}
              className="text-sm h-8"
            />
          </FormField>
          <FormField label="Longitude">
            <Input
              type="number"
              step="0.01"
              value={proj?.lon ?? ''}
              onChange={(e) => updateCoord('lon', parseFloat(e.target.value))}
              disabled={!proj}
              className="text-sm h-8"
            />
          </FormField>
        </div>
      </SettingSection>

      {/* ── Weather preview ── */}
      <SettingSection icon={<CloudSun className="h-3.5 w-3.5" />} title="Weather">
        {wd ? (
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center justify-center h-12 w-12 rounded-xl bg-gradient-to-br from-sky-50 via-white to-amber-50 shadow-sm ring-1 ring-slate-200">
              <WeatherIcon code={wd.code} className="h-7 w-7" />
            </div>
            <div>
              <div className="flex items-center gap-1.5 text-lg font-bold tabular-nums">
                <Thermometer className="h-4 w-4 text-muted-foreground" strokeWidth={1.75} />
                {wd.temp}°F
              </div>
              <div className="text-[11px] text-muted-foreground">{wd.desc}</div>
            </div>
            <div className="flex items-center gap-3 text-[11px] text-muted-foreground ml-auto">
              <span className="flex items-center gap-1">
                <Wind className="h-3.5 w-3.5 text-sky-500" strokeWidth={1.75} />
                {wd.wind} mph
              </span>
              <span className="flex items-center gap-1">
                <Droplets className="h-3.5 w-3.5 text-sky-500" strokeWidth={1.75} />
                {wd.humidity}%
              </span>
            </div>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">Weather data not loaded yet.</p>
        )}
      </SettingSection>

      {/* ── Display Preferences ── */}
      <SettingSection icon={<LayoutGrid className="h-3.5 w-3.5" />} title="Display Preferences">
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Default View Mode">
            <SelectNative
              value={defaultViewMode}
              onChange={(e) => setDefaultViewMode(e.target.value as 'list' | 'grid')}
              className="text-sm h-8"
            >
              <option value="list">List</option>
              <option value="grid">Grid</option>
            </SelectNative>
          </FormField>
          <FormField label="Date Format">
            <SelectNative
              value={dateFormat}
              onChange={(e) => setDateFormat(e.target.value as 'short' | 'long' | 'iso')}
              className="text-sm h-8"
            >
              <option value="short">Short (Jan 5, 2026)</option>
              <option value="long">Long (Monday, January 5, 2026)</option>
              <option value="iso">ISO (2026-01-05)</option>
            </SelectNative>
          </FormField>
        </div>
      </SettingSection>

      {/* ── Gantt ── */}
      <SettingSection icon={<Calendar className="h-3.5 w-3.5" />} title="Gantt Chart">
        <FormField label={`Default zoom (${ganttPxPerDay}px / day)`}>
          <Slider
            value={[ganttPxPerDay]}
            min={4}
            max={50}
            step={1}
            onValueChange={([v]) => setGanttPxPerDay(v)}
            className="max-w-sm"
          />
          <p className="text-[10px] text-muted-foreground mt-1">
            Wider = fewer days visible but more detail per bar. Smaller = full-project overview.
          </p>
        </FormField>
      </SettingSection>

      {/* ── User Manual ── */}
      <SettingSection icon={<BookOpen className="h-3.5 w-3.5" />} title="User Manual — How to Use">
        <div className="space-y-4 text-[12px] leading-relaxed text-foreground/90">
          <ManualBlock title="Activity dates">
            <p>Each activity has a <b>Start</b> and <b>Finish</b> date plus a <b>Duration</b>. Edit any one and the others recalc: Finish = Start + Duration − 1.</p>
          </ManualBlock>

          <ManualBlock title="Adding a predecessor (dependency)">
            <ol className="list-decimal ml-4 space-y-1">
              <li>Open <b>Master Schedule</b> and expand a phase.</li>
              <li>In the <b>Predecessor</b> column of any row, click <b>+ Edit</b> (or <b>+ Add</b>).</li>
              <li>Search by activity name and click to pick one. A pill appears with the predecessor&apos;s label (e.g. <span className="font-mono bg-blue-50 px-1 rounded">2-A</span>).</li>
              <li>The successor&apos;s Start date automatically shifts to (latest predecessor finish + 1).</li>
              <li>Click the <b>×</b> on any pill to remove that dependency.</li>
            </ol>
          </ManualBlock>

          <ManualBlock title="Multi-dependency (MAX logic)" icon={<Link2 className="h-3 w-3" />}>
            <p>When a task has multiple predecessors, it waits for the <b>latest one</b>:</p>
            <pre className="bg-muted/50 p-2 rounded text-[11px] font-mono mt-1">start = MAX(pred.finish for all preds) + 1
finish = start + duration − 1</pre>
            <p className="mt-1">Adding a predecessor whose finish is <i>earlier</i> than an existing one won&apos;t change the date — that&apos;s normal. To see a jump, the new predecessor must finish <i>later</i>.</p>
          </ManualBlock>

          <ManualBlock title="Link types (FS / SS / FF / SF)">
            <p>Each pill has a small badge showing its link type. <b>Click the badge to cycle</b> through the four types:</p>
            <table className="w-full text-[11px] mt-2 border-collapse">
              <thead>
                <tr className="border-b text-left">
                  <th className="py-1 pr-2 font-semibold">Type</th>
                  <th className="py-1 pr-2 font-semibold">Meaning</th>
                  <th className="py-1 pr-2 font-semibold">Effect</th>
                </tr>
              </thead>
              <tbody className="text-muted-foreground">
                <tr className="border-b"><td className="py-1 pr-2 font-mono text-amber-700"><b>FS</b></td><td className="py-1 pr-2">Finish-to-Start (default)</td><td className="py-1 pr-2">Successor starts the day after predecessor finishes.</td></tr>
                <tr className="border-b"><td className="py-1 pr-2 font-mono text-amber-700"><b>SS</b></td><td className="py-1 pr-2">Start-to-Start</td><td className="py-1 pr-2">Both tasks start on the same day.</td></tr>
                <tr className="border-b"><td className="py-1 pr-2 font-mono text-amber-700"><b>FF</b></td><td className="py-1 pr-2">Finish-to-Finish</td><td className="py-1 pr-2">Both tasks finish on the same day.</td></tr>
                <tr><td className="py-1 pr-2 font-mono text-amber-700"><b>SF</b></td><td className="py-1 pr-2">Start-to-Finish (rare)</td><td className="py-1 pr-2">Successor finishes when predecessor starts.</td></tr>
              </tbody>
            </table>
          </ManualBlock>

          <ManualBlock title="Cascade">
            <p>When a predecessor&apos;s dates change, <b>every downstream task</b> shifts automatically (including multi-level chains). Like dominoes falling in order.</p>
          </ManualBlock>

          <ManualBlock title="Cycles">
            <p>If you create a circular dependency (A → B → A), the system breaks it by picking the earliest stored start in the cycle and resolving outward. Dates still cascade but the cycle is logically inconsistent — remove one of the links to clean up.</p>
          </ManualBlock>

          <ManualBlock title="Tips">
            <ul className="list-disc ml-4 space-y-1">
              <li>Click a row to open the detail panel. Edit dates there — cascade fires instantly.</li>
              <li>Drag Gantt bars to reschedule; connected tasks follow.</li>
              <li>Filters don&apos;t affect date calculations — the full graph always resolves.</li>
            </ul>
          </ManualBlock>
        </div>
      </SettingSection>

      {/* ── Team Members ── */}
      <SettingSection icon={<Users className="h-3.5 w-3.5" />} title="Team Members">
        <TeamMembersManager />
      </SettingSection>

      {/* ── Danger / Utilities ── */}
      <SettingSection icon={<Trash2 className="h-3.5 w-3.5" />} title="Utilities">
        <Button
          variant="outline"
          size="sm"
          className="text-xs gap-1.5"
          onClick={() => {
            clearAllFilters();
            showToast('All filters cleared');
          }}
        >
          <Trash2 className="h-3.5 w-3.5" />
          Clear All Filters
        </Button>
        <p className="text-[10px] text-muted-foreground mt-2">
          Resets every section's trade/area/status/phase/floor filters and the search query.
        </p>
      </SettingSection>

      <p className="text-[10px] text-muted-foreground mt-6 text-center">
        Last reload: {fmt(new Date())} · Session-only settings (reset on refresh)
      </p>
    </div>
  );
}

// ─── Building blocks ───

function SettingSection({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="p-4 mb-3">
      <div className="flex items-center gap-2 mb-3 text-primary">
        {icon}
        <h3 className="text-[11px] font-bold uppercase tracking-wider">{title}</h3>
      </div>
      {children}
    </Card>
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

function InfoRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-baseline gap-2">
      <span className="text-[11px] text-muted-foreground min-w-[70px]">{label}</span>
      <span className={mono ? 'font-mono text-[11px] truncate' : 'font-medium truncate'}>{value}</span>
    </div>
  );
}

function ManualBlock({ title, children, icon }: { title: string; children: React.ReactNode; icon?: React.ReactNode }) {
  return (
    <div className="border-l-2 border-primary/30 pl-3">
      <div className="flex items-center gap-1.5 mb-1 text-primary">
        {icon}
        <h4 className="text-[11px] font-bold uppercase tracking-wider">{title}</h4>
      </div>
      <div className="text-foreground/80">{children}</div>
    </div>
  );
}
