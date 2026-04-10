'use client';

import { useAppStore } from '@/hooks/useAppStore';
import DashboardView from './DashboardView';
import MasterView from './MasterView';
import FilteredView from './FilteredView';
import GanttView from '@/components/gantt/GanttView';
import WeatherCard from '@/components/ui/WeatherCard';

export default function ViewSwitcher() {
  const { currentView } = useAppStore();

  const renderView = () => {
    switch (currentView) {
      case 'dashboard':
        return <DashboardView />;
      case 'master':
        return <MasterView />;
      case 'gantt':
        return <GanttView />;
      case 'today':
      case 'this-week':
      case 'delayed':
      case 'blocked':
      case 'in-progress':
      case 'ready':
      case 'completed':
      case 'milestones':
      case 'lookahead-6':
      case 'lookahead-3':
      case 'by-trade':
      case 'by-area':
      case 'by-sub':
      case 'procurement':
      case 'inspections':
      case 'punch':
      case 'turnover':
        return <FilteredView view={currentView} />;
      case 'calendar':
        return <CalendarPlaceholder />;
      case 'projects':
        return <ProjectsPlaceholder />;
      case 'settings':
        return <SettingsPlaceholder />;
      default:
        return <DashboardView />;
    }
  };

  return (
    <div className="schedule-area" id="scheduleArea">
      <WeatherCard />
      {renderView()}
    </div>
  );
}

function CalendarPlaceholder() {
  return (
    <div className="empty-state" style={{ padding: '60px 20px', textAlign: 'center' }}>
      <h3 style={{ fontSize: 18, marginBottom: 8 }}>Calendar View</h3>
      <p style={{ color: 'var(--text-tertiary)' }}>Calendar view coming soon — use Gantt for timeline visualization.</p>
    </div>
  );
}

function ProjectsPlaceholder() {
  return (
    <div className="empty-state" style={{ padding: '60px 20px', textAlign: 'center' }}>
      <h3 style={{ fontSize: 18, marginBottom: 8 }}>Projects</h3>
      <p style={{ color: 'var(--text-tertiary)' }}>Project management view — switch projects using the header dropdown.</p>
    </div>
  );
}

function SettingsPlaceholder() {
  return (
    <div className="empty-state" style={{ padding: '60px 20px', textAlign: 'center' }}>
      <h3 style={{ fontSize: 18, marginBottom: 8 }}>Settings</h3>
      <p style={{ color: 'var(--text-tertiary)' }}>Settings view — configure weather, project, and display preferences.</p>
    </div>
  );
}
