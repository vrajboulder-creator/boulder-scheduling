'use client';

import { useAppStore } from '@/hooks/useAppStore';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { ViewType } from '@/types';
import {
  LayoutGrid, Clock, CalendarDays, List, BarChart3, Calendar, Eye, Flag,
  Wrench, LayoutDashboard, Users, AlertTriangle, Ban, Play, CheckCircle2,
  CheckSquare, Package, FileText, ClipboardCheck, Home, FolderOpen, Settings,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface NavItem {
  view: ViewType;
  label: string;
  icon: LucideIcon;
  badge?: string;
  badgeVariant?: 'destructive' | 'warning';
}

const navGroups: { label: string; items: NavItem[] }[] = [
  {
    label: 'Dashboard',
    items: [
      { view: 'dashboard', label: 'Overview', icon: LayoutGrid },
      { view: 'today', label: 'Today', icon: Clock, badge: '7', badgeVariant: 'destructive' },
      { view: 'this-week', label: 'This Week', icon: CalendarDays },
    ],
  },
  {
    label: 'Schedule Views',
    items: [
      { view: 'master', label: 'Master Schedule', icon: List },
      { view: 'gantt', label: 'Timeline / Gantt', icon: BarChart3 },
      { view: 'calendar', label: 'Calendar', icon: Calendar },
      { view: 'lookahead-6', label: '6-Week Lookahead', icon: Eye },
      { view: 'lookahead-3', label: '3-Week Lookahead', icon: Eye },
      { view: 'milestones', label: 'Milestones', icon: Flag },
    ],
  },
  {
    label: 'Coordination',
    items: [
      { view: 'by-trade', label: 'By Trade', icon: Wrench },
      { view: 'by-area', label: 'By Area / Floor', icon: LayoutDashboard },
      { view: 'by-sub', label: 'By Subcontractor', icon: Users },
    ],
  },
  {
    label: 'Status',
    items: [
      { view: 'delayed', label: 'Delayed', icon: AlertTriangle, badge: '4', badgeVariant: 'destructive' },
      { view: 'blocked', label: 'Blocked', icon: Ban, badge: '6', badgeVariant: 'warning' },
      { view: 'in-progress', label: 'In Progress', icon: Play },
      { view: 'ready', label: 'Ready to Start', icon: CheckCircle2 },
      { view: 'completed', label: 'Completed', icon: CheckSquare },
    ],
  },
  {
    label: 'Tracking',
    items: [
      { view: 'procurement', label: 'Procurement', icon: Package },
      { view: 'inspections', label: 'Inspections', icon: FileText },
      { view: 'punch', label: 'Punch / Closeout', icon: ClipboardCheck },
      { view: 'turnover', label: 'Area Turnover', icon: Home },
    ],
  },
  {
    label: 'System',
    items: [
      { view: 'projects', label: 'Projects', icon: FolderOpen },
      { view: 'settings', label: 'Settings', icon: Settings },
    ],
  },
];

export default function Sidebar() {
  const { currentView, setView } = useAppStore();

  return (
    <>
      <nav className="w-[232px] min-w-[232px] h-screen bg-card border-r border-border flex flex-col z-20 max-md:fixed max-md:left-0 max-md:top-0 max-md:bottom-0 max-md:-translate-x-full max-md:shadow-xl max-md:transition-transform max-md:z-50" id="sidebar">
        {/* Brand */}
        <div className="px-5 py-4 border-b border-border text-center">
          <h1 className="text-sm font-bold text-primary tracking-tight">Boulder Construction</h1>
          <span className="text-[11px] text-muted-foreground font-medium">Schedule Command Center</span>
        </div>

        {/* Nav */}
        <ScrollArea className="flex-1">
          <div className="py-2">
            {navGroups.map((group) => (
              <div key={group.label} className="mb-1">
                <div className="px-5 pt-3 pb-1 text-[10px] font-bold uppercase tracking-wider text-foreground">
                  {group.label}
                </div>
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = currentView === item.view;
                  return (
                    <button
                      key={item.view}
                      onClick={() => setView(item.view)}
                      className={cn(
                        "w-full flex items-center gap-2.5 px-5 py-[7px] text-[13px] font-normal border-l-2 border-transparent transition-all cursor-pointer",
                        isActive
                          ? "bg-sidebar-accent text-sidebar-accent-foreground font-semibold border-l-primary"
                          : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-foreground"
                      )}
                    >
                      <Icon className={cn("h-4 w-4 shrink-0", isActive ? "text-primary opacity-100" : "opacity-50")} />
                      <span className="truncate">{item.label}</span>
                      {item.badge && (
                        <span className={cn(
                          "ml-auto text-[10px] font-semibold px-1.5 py-0.5 rounded-full leading-none",
                          item.badgeVariant === 'destructive' ? "bg-destructive text-white" :
                          item.badgeVariant === 'warning' ? "bg-orange-500 text-white" :
                          "bg-muted text-muted-foreground"
                        )}>
                          {item.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </ScrollArea>
      </nav>
      {/* Mobile overlay */}
      <div className="hidden max-md:block fixed inset-0 bg-black/30 z-40" id="sidebarOverlay" />
    </>
  );
}
