'use client';

import { useAppStore } from '@/hooks/useAppStore';
import DashboardView from './DashboardView';
import MasterView from './MasterView';
import FilteredView from './FilteredView';
import GanttView from '@/components/gantt/GanttView';
import CalendarView from './CalendarView';
import WeatherCard from '@/components/ui/WeatherCard';

export default function ViewSwitcher() {
  const { currentView } = useAppStore();

  const renderView = () => {
    switch (currentView) {
      case 'dashboard': return <DashboardView />;
      case 'master': return <MasterView />;
      case 'gantt': return <GanttView />;
      case 'calendar': return <CalendarView />;
      case 'projects': return <Placeholder title="Projects" desc="Project management view — switch projects using the header dropdown." />;
      case 'settings': return <Placeholder title="Settings" desc="Settings view — configure weather, project, and display preferences." />;
      default: return <FilteredView view={currentView} />;
    }
  };

  return (
    <div className="flex-1 overflow-y-auto overflow-x-hidden p-6 pb-10 scrollbar-hide">
      <WeatherCard />
      {renderView()}
    </div>
  );
}

function Placeholder({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center animate-fade-in">
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground max-w-md">{desc}</p>
    </div>
  );
}
