'use client';

import { useAppStore } from '@/hooks/useAppStore';
import { fmtFull, TODAY } from '@/lib/helpers';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SelectNative } from '@/components/ui/select-native';
import { WeatherIcon } from '@/components/ui/WeatherCard';
import { Plus, Menu, Mic, CloudOff } from 'lucide-react';

export default function Header() {
  const { projects, currentProject, setCurrentProject, searchQuery, setSearchQuery, setModalOpen } = useAppStore();
  const projectKeys = Object.keys(projects);
  const proj = projects[currentProject];

  return (
    <header className="h-[52px] bg-card border-b border-border flex items-center px-6 gap-3.5 shrink-0 shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
      {/* Mobile menu */}
      <Button
        variant="ghost"
        size="icon"
        className="hidden max-md:flex"
        onClick={() => {
          document.getElementById('sidebar')?.classList.toggle('translate-x-0');
          document.getElementById('sidebar')?.classList.toggle('-translate-x-full');
        }}
      >
        <Menu className="h-5 w-5" />
      </Button>

      {/* Project selector */}
      <div className="w-auto min-w-[180px]">
        <SelectNative
          value={currentProject}
          onChange={(e) => setCurrentProject(e.target.value)}
          className="font-semibold text-[13px]"
        >
          {projectKeys.map((key) => (
            <option key={key} value={key}>{projects[key].name}</option>
          ))}
        </SelectNative>
      </div>

      {/* Search */}
      <div className="relative flex-1 max-w-[360px]">
        <Input
          type="text"
          placeholder="Search activities, trades, areas…"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9 pr-9 text-[13px]"
        />
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
        </svg>
        <button className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-full text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors">
          <Mic className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Right section */}
      <div className="ml-auto flex items-center gap-2.5">
        {/* Weather pill — dynamic icon pulled from current weather code */}
        <div className="flex items-center gap-1.5 text-[11px] font-semibold bg-gradient-to-r from-sky-50 via-white to-amber-50 text-slate-700 px-3 py-1 rounded-full shadow-sm ring-1 ring-slate-200 whitespace-nowrap">
          {proj?.weatherDetail ? (
            <WeatherIcon code={proj.weatherDetail.code} className="h-3.5 w-3.5" />
          ) : (
            <CloudOff className="h-3.5 w-3.5 text-slate-400" strokeWidth={1.75} />
          )}
          <span>
            {proj?.weatherDetail
              ? `${proj.weatherDetail.temp}°F · ${proj.weatherDetail.desc}`
              : 'Loading…'}
          </span>
        </div>

        {/* Date */}
        <span className="text-xs text-muted-foreground font-medium hidden sm:block">
          {fmtFull(TODAY)}
        </span>

        {/* Add Activity */}
        <Button size="sm" onClick={() => setModalOpen(true)} className="gap-1">
          <Plus className="h-3.5 w-3.5" />
          Activity
        </Button>
      </div>
    </header>
  );
}
