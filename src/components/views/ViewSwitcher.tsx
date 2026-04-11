'use client';

import { useAppStore } from '@/hooks/useAppStore';
import DashboardView from './DashboardView';
import MasterView from './MasterView';
import FilteredView from './FilteredView';
import GanttView from '@/components/gantt/GanttView';
import CalendarView from './CalendarView';
import ProjectsView from './ProjectsView';
import SettingsView from './SettingsView';
import WeatherCard from '@/components/ui/WeatherCard';

export default function ViewSwitcher() {
  const { currentView } = useAppStore();

  const renderView = () => {
    switch (currentView) {
      case 'dashboard': return <DashboardView />;
      case 'master': return <MasterView />;
      case 'gantt': return <GanttView />;
      case 'calendar': return <CalendarView />;
      case 'projects': return <ProjectsView />;
      case 'settings': return <SettingsView />;
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

