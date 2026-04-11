'use client';

import { useAppStore } from '@/hooks/useAppStore';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { SelectNative } from '@/components/ui/select-native';
import { Slider } from '@/components/ui/slider';
import { Settings2, Folder, LayoutGrid, Calendar, MapPin, CloudSun, Trash2, Thermometer, Wind, Droplets } from 'lucide-react';
import { WeatherIcon } from '@/components/ui/WeatherCard';
import { fmt } from '@/lib/helpers';

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
