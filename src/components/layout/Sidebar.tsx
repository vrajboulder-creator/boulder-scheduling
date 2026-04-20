'use client';

import { useRef, useState, useEffect, useCallback } from 'react';
import { useAppStore } from '@/hooks/useAppStore';
import { cn } from '@/lib/utils';
import type { ViewType } from '@/types';
import {
  LayoutGrid, Clock, CalendarDays, List, BarChart3, Calendar, Eye, Flag,
  Wrench, LayoutDashboard, Users, AlertTriangle, Ban, Play, CheckCircle2,
  CheckSquare, Package, FileText, ClipboardCheck, Home, FolderOpen, Settings,
  ChevronDown,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface NavItem {
  view: ViewType;
  label: string;
  icon: LucideIcon;
  badge?: string;
  badgeVariant?: 'destructive' | 'warning';
}

const ALL_ITEMS: NavItem[] = [
  { view: 'dashboard', label: 'Overview', icon: LayoutGrid },
  { view: 'today', label: 'Today', icon: Clock, badge: '7', badgeVariant: 'destructive' },
  { view: 'this-week', label: 'This Week', icon: CalendarDays },
  { view: 'master', label: 'Master Schedule', icon: List },
  { view: 'gantt', label: 'Gantt', icon: BarChart3 },
  { view: 'calendar', label: 'Calendar', icon: Calendar },
  { view: 'lookahead-6', label: '6-Week', icon: Eye },
  { view: 'lookahead-3', label: '3-Week', icon: Eye },
  { view: 'milestones', label: 'Milestones', icon: Flag },
  { view: 'by-trade', label: 'By Trade', icon: Wrench },
  { view: 'by-area', label: 'By Area', icon: LayoutDashboard },
  { view: 'by-sub', label: 'By Sub', icon: Users },
  { view: 'delayed', label: 'Delayed', icon: AlertTriangle, badge: '4', badgeVariant: 'destructive' },
  { view: 'blocked', label: 'Blocked', icon: Ban, badge: '6', badgeVariant: 'warning' },
  { view: 'in-progress', label: 'In Progress', icon: Play },
  { view: 'ready', label: 'Ready', icon: CheckCircle2 },
  { view: 'completed', label: 'Done', icon: CheckSquare },
  { view: 'procurement', label: 'Procurement', icon: Package },
  { view: 'inspections', label: 'Inspections', icon: FileText },
  { view: 'punch', label: 'Punch', icon: ClipboardCheck },
  { view: 'turnover', label: 'Turnover', icon: Home },
  { view: 'projects', label: 'Projects', icon: FolderOpen },
  { view: 'settings', label: 'Settings', icon: Settings },
];

const DEFAULT_PINNED: ViewType[] = [
  'dashboard', 'today', 'this-week', 'master', 'gantt', 'calendar',
  'lookahead-6', 'milestones', 'by-trade', 'delayed', 'blocked',
];
const DEFAULT_OVERFLOW: ViewType[] = ALL_ITEMS
  .map((i) => i.view)
  .filter((v) => !DEFAULT_PINNED.includes(v));

const STORAGE_KEY = 'boulder-nav-layout';
function loadLayout() {
  try { const r = localStorage.getItem(STORAGE_KEY); if (r) return JSON.parse(r); } catch {}
  return { pinned: DEFAULT_PINNED, overflow: DEFAULT_OVERFLOW };
}
function saveLayout(pinned: ViewType[], overflow: ViewType[]) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ pinned, overflow })); } catch {}
}

const itemMap = Object.fromEntries(ALL_ITEMS.map((i) => [i.view, i])) as Record<ViewType, NavItem>;

// Ghost element following the cursor
let ghost: HTMLElement | null = null;
function createGhost(label: string) {
  ghost = document.createElement('div');
  ghost.textContent = label;
  ghost.style.cssText = `position:fixed;pointer-events:none;z-index:9999;padding:4px 10px;border-radius:6px;font-size:11px;font-weight:600;background:#e8793b;color:#fff;white-space:nowrap;box-shadow:0 4px 12px rgba(0,0,0,0.2);transform:translate(-50%,-50%);opacity:0.92;`;
  document.body.appendChild(ghost);
}
function moveGhost(x: number, y: number) { if (ghost) { ghost.style.left = x + 'px'; ghost.style.top = y + 'px'; } }
function removeGhost() { ghost?.remove(); ghost = null; }

export default function Sidebar() {
  const { currentView, setView } = useAppStore();

  const [pinned, setPinned] = useState<ViewType[]>(DEFAULT_PINNED);
  const [overflow, setOverflow] = useState<ViewType[]>(DEFAULT_OVERFLOW);
  const [overflowOpen, setOverflowOpen] = useState(false);
  const overflowRef = useRef<HTMLDivElement>(null);
  const moreButtonRef = useRef<HTMLButtonElement>(null);
  const dropListRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const { pinned: p, overflow: o } = loadLayout();
    setPinned(p); setOverflow(o);
  }, []);

  // Drag state (pointer-based, works cross-zone)
  const dragging = useRef<{ view: ViewType; from: 'pinned' | 'overflow' } | null>(null);
  const [dragOverItem, setDragOverItem] = useState<{ view: ViewType; zone: 'pinned' | 'overflow' } | null>(null);
  const [dragOverZone, setDragOverZone] = useState<'pinned' | 'overflow' | null>(null);
  const autoOpenTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Drag-to-pan for top bar (only when not dragging a nav item)
  const scrollRef = useRef<HTMLDivElement>(null);
  const panning = useRef(false);
  const panStartX = useRef(0);
  const panScrollLeft = useRef(0);

  const commit = useCallback((np: ViewType[], no: ViewType[]) => {
    setPinned(np); setOverflow(no); saveLayout(np, no);
    setDragOverItem(null); setDragOverZone(null);
    dragging.current = null;
    removeGhost();
    if (autoOpenTimer.current) clearTimeout(autoOpenTimer.current);
  }, []);

  // Global pointermove + pointerup during drag
  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      // Activate drag only after 4px movement
      if (!dragging.current && pendingDrag.current) {
        const dx = e.clientX - pendingDrag.current.x;
        const dy = e.clientY - pendingDrag.current.y;
        if (Math.sqrt(dx * dx + dy * dy) > 4) {
          dragging.current = { view: pendingDrag.current.view, from: pendingDrag.current.from };
          createGhost(itemMap[pendingDrag.current.view]?.label ?? pendingDrag.current.view);
          pendingDrag.current = null;
        }
      }
      if (!dragging.current) return;
      moveGhost(e.clientX, e.clientY);

      // Check if hovering over More button → auto-open after 400ms
      const moreRect = moreButtonRef.current?.getBoundingClientRect();
      if (moreRect && e.clientX >= moreRect.left && e.clientX <= moreRect.right &&
          e.clientY >= moreRect.top && e.clientY <= moreRect.bottom) {
        if (!autoOpenTimer.current) {
          autoOpenTimer.current = setTimeout(() => setOverflowOpen(true), 350);
        }
      } else {
        if (autoOpenTimer.current) { clearTimeout(autoOpenTimer.current); autoOpenTimer.current = null; }
      }

      // Detect which zone we're over
      const scrollRect = scrollRef.current?.getBoundingClientRect();
      const dropRect = dropListRef.current?.getBoundingClientRect();
      if (dropRect && e.clientX >= dropRect.left && e.clientX <= dropRect.right &&
          e.clientY >= dropRect.top && e.clientY <= dropRect.bottom) {
        setDragOverZone('overflow');
      } else if (scrollRect && e.clientX >= scrollRect.left && e.clientX <= scrollRect.right &&
          e.clientY >= scrollRect.top && e.clientY <= scrollRect.bottom) {
        setDragOverZone('pinned');
      } else {
        setDragOverZone(null);
      }
    };

    const onUp = (e: PointerEvent) => {
      pendingDrag.current = null;
      const src = dragging.current;
      if (!src) return;

      // Find drop target
      const els = document.elementsFromPoint(e.clientX, e.clientY);
      const targetEl = els.find((el) => (el as HTMLElement).dataset?.navView) as HTMLElement | undefined;
      const targetView = targetEl?.dataset?.navView as ViewType | undefined;
      const targetZone = targetEl?.dataset?.navZone as 'pinned' | 'overflow' | undefined;

      let np = pinned.filter((v) => v !== src.view);
      let no = overflow.filter((v) => v !== src.view);

      if (targetView && targetZone && targetView !== src.view) {
        // Insert before/at target
        if (targetZone === 'pinned') {
          const idx = np.indexOf(targetView);
          np.splice(idx >= 0 ? idx : np.length, 0, src.view);
        } else {
          const idx = no.indexOf(targetView);
          no.splice(idx >= 0 ? idx : no.length, 0, src.view);
        }
      } else {
        // Drop on zone background
        const dropRect = dropListRef.current?.getBoundingClientRect();
        const scrollRect = scrollRef.current?.getBoundingClientRect();
        if (dropRect && e.clientX >= dropRect.left && e.clientX <= dropRect.right &&
            e.clientY >= dropRect.top && e.clientY <= dropRect.bottom) {
          no.push(src.view);
        } else if (scrollRect && e.clientX >= scrollRect.left && e.clientX <= scrollRect.right &&
            e.clientY >= scrollRect.top && e.clientY <= scrollRect.bottom) {
          np.push(src.view);
        } else {
          // Dropped outside — put back
          if (src.from === 'pinned') np.push(src.view); else no.push(src.view);
        }
      }

      commit(np, no);
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => { window.removeEventListener('pointermove', onMove); window.removeEventListener('pointerup', onUp); };
  }, [pinned, overflow, commit]);

  const pendingDrag = useRef<{ view: ViewType; from: 'pinned' | 'overflow'; x: number; y: number } | null>(null);

  const startDrag = (e: React.PointerEvent, view: ViewType, from: 'pinned' | 'overflow') => {
    pendingDrag.current = { view, from, x: e.clientX, y: e.clientY };
  };

  // Pan handlers (only when not dragging a nav item)
  const onPanDown = (e: React.MouseEvent) => {
    if (dragging.current) return;
    panning.current = true;
    panStartX.current = e.pageX;
    panScrollLeft.current = scrollRef.current?.scrollLeft ?? 0;
  };
  const onPanMove = (e: React.MouseEvent) => {
    if (!panning.current || !scrollRef.current || dragging.current) return;
    scrollRef.current.scrollLeft = panScrollLeft.current - (e.pageX - panStartX.current);
  };
  const onPanUp = () => { panning.current = false; };

  const renderBadge = (item: NavItem) => item.badge ? (
    <span className={cn("text-[9px] font-bold px-1 py-0.5 rounded-full leading-none",
      item.badgeVariant === 'destructive' ? "bg-destructive text-white" :
      item.badgeVariant === 'warning' ? "bg-orange-500 text-white" : "bg-muted text-muted-foreground"
    )}>{item.badge}</span>
  ) : null;

  const isDragging = !!dragging.current;

  return (
    <nav className="w-full bg-card border-b border-border shrink-0 z-20 flex items-stretch h-[40px]">
      {/* Logo */}
      <div className="flex items-center px-3 border-r border-border shrink-0">
        <img src="/assets/boulder-logo.png" alt="Boulder" className="h-[22px] w-auto" />
      </div>

      {/* Scrollable pinned items */}
      <div
        ref={scrollRef}
        className={cn("flex-1 flex items-stretch overflow-x-auto scrollbar-hide min-w-0 select-none",
          isDragging ? "cursor-grabbing" : "cursor-grab active:cursor-grabbing",
          dragOverZone === 'pinned' && isDragging ? "bg-primary/5" : ""
        )}
        onMouseDown={onPanDown}
        onMouseMove={onPanMove}
        onMouseUp={onPanUp}
        onMouseLeave={onPanUp}
      >
        {pinned.map((view) => {
          const item = itemMap[view];
          if (!item) return null;
          const Icon = item.icon;
          const isActive = currentView === view;
          const isOver = dragOverItem?.view === view && dragOverItem.zone === 'pinned';
          return (
            <button
              key={view}
              data-nav-view={view}
              data-nav-zone="pinned"
              onPointerDown={(e) => startDrag(e, view, 'pinned')}
              onClick={() => { if (!isDragging) setView(view); }}
              className={cn(
                "flex items-center gap-1.5 px-3 text-[11.5px] font-medium transition-all whitespace-nowrap border-b-2 shrink-0 touch-none",
                isActive ? "border-b-primary text-primary bg-primary/5" : "border-b-transparent text-muted-foreground hover:text-foreground hover:bg-muted/40",
                isOver ? "bg-primary/10 border-b-primary/50" : ""
              )}
              onPointerEnter={() => isDragging && setDragOverItem({ view, zone: 'pinned' })}
              onPointerLeave={() => setDragOverItem(null)}
            >
              <Icon className="h-3.5 w-3.5 shrink-0" />
              <span>{item.label}</span>
              {renderBadge(item)}
            </button>
          );
        })}
      </div>

      {/* More ▾ */}
      <div className="flex items-stretch border-l border-border shrink-0 relative" ref={overflowRef}>
        <button
          ref={moreButtonRef}
          onClick={() => setOverflowOpen((o) => !o)}
          className={cn(
            "flex items-center gap-1 px-3 text-[11.5px] font-medium transition-all border-b-2 whitespace-nowrap",
            overflowOpen ? "border-b-primary text-primary bg-primary/5" : "border-b-transparent text-muted-foreground hover:text-foreground hover:bg-muted/40",
            isDragging ? "ring-2 ring-primary/30" : ""
          )}
        >
          <span>More</span>
          <ChevronDown className={cn("h-3 w-3 transition-transform", overflowOpen && "rotate-180")} />
        </button>

        {overflowOpen && (
          <div
            ref={dropListRef}
            className={cn(
              "absolute top-full right-0 mt-0.5 w-60 bg-card border border-border rounded-lg shadow-xl z-50 py-1 overflow-hidden",
              dragOverZone === 'overflow' && isDragging ? "ring-2 ring-primary/40 bg-primary/5" : ""
            )}
          >
            <div className="px-3 py-1.5 border-b border-border/50">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">More views</span>
              {isDragging && <span className="ml-2 text-[10px] text-primary font-semibold">Drop here ↓</span>}
            </div>
            <div className="py-1 max-h-[320px] overflow-y-auto">
              {overflow.map((view) => {
                const item = itemMap[view];
                if (!item) return null;
                const Icon = item.icon;
                const isActive = currentView === view;
                const isOver = dragOverItem?.view === view && dragOverItem.zone === 'overflow';
                return (
                  <button
                    key={view}
                    data-nav-view={view}
                    data-nav-zone="overflow"
                    onPointerDown={(e) => startDrag(e, view, 'overflow')}
                    onClick={() => { if (!isDragging) { setView(view); setOverflowOpen(false); } }}
                    className={cn(
                      "w-full flex items-center gap-2 px-3 py-2 text-[11.5px] font-medium transition-colors whitespace-nowrap touch-none",
                      isActive ? "text-primary bg-primary/5" : "text-muted-foreground hover:text-foreground hover:bg-muted/50",
                      isOver ? "bg-primary/10" : ""
                    )}
                    onPointerEnter={() => isDragging && setDragOverItem({ view, zone: 'overflow' })}
                    onPointerLeave={() => setDragOverItem(null)}
                  >
                    <Icon className="h-3.5 w-3.5 shrink-0" />
                    <span>{item.label}</span>
                    {renderBadge(item)}
                  </button>
                );
              })}
              {overflow.length === 0 && (
                <div className="px-3 py-3 text-[11px] text-muted-foreground/40 italic text-center">All views are in the top bar</div>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
