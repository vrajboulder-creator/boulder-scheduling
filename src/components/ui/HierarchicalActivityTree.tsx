'use client';

import { useState, useMemo } from 'react';
import type { Activity } from '@/types';
import { useAppStore } from '@/hooks/useAppStore';
import { fmt, isOverdue, getTradeColor } from '@/lib/helpers';
import { cn } from '@/lib/utils';
import StatusBadge from './StatusBadge';
import PctBar from './PctBar';
import { ChevronDown, Plus, MapPin, Zap } from 'lucide-react';

interface Props {
  items: Activity[];
}

interface HierarchyNode {
  type: 'area' | 'trade' | 'activity';
  label: string;
  key: string;
  children?: HierarchyNode[];
  activity?: Activity;
  count?: number;
}

export default function HierarchicalActivityTree({ items }: Props) {
  const setSelectedActivity = useAppStore((s) => s.setSelectedActivity);
  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(new Set(['root']));
  const [addingToKey, setAddingToKey] = useState<string | null>(null);

  // Build hierarchy: root → areas → trades → activities
  const hierarchy = useMemo(() => {
    const areas: Record<string, Record<string, Activity[]>> = {};

    items.forEach((a) => {
      const area = a.area || 'Unassigned';
      const trade = a.trade || 'General';

      if (!areas[area]) areas[area] = {};
      if (!areas[area][trade]) areas[area][trade] = [];
      areas[area][trade].push(a);
    });

    const root: HierarchyNode[] = Object.entries(areas)
      .sort(([areaA], [areaB]) => areaA.localeCompare(areaB))
      .map(([areaLabel, trades]) => ({
        type: 'area',
        label: areaLabel,
        key: `area_${areaLabel}`,
        count: Object.values(trades).flat().length,
        children: Object.entries(trades)
          .sort(([tradeA], [tradeB]) => tradeA.localeCompare(tradeB))
          .map(([tradeLabel, activities]) => ({
            type: 'trade',
            label: tradeLabel,
            key: `trade_${areaLabel}_${tradeLabel}`,
            count: activities.length,
            children: activities
              .sort((a, b) => (a.name || '').localeCompare(b.name || ''))
              .map((activity) => ({
                type: 'activity' as const,
                label: activity.name,
                key: activity.id,
                activity,
              })),
          })),
      }));

    return root;
  }, [items]);

  const toggleExpanded = (key: string) => {
    const newExpanded = new Set(expandedKeys);
    if (newExpanded.has(key)) {
      newExpanded.delete(key);
    } else {
      newExpanded.add(key);
    }
    setExpandedKeys(newExpanded);
  };

  const isExpanded = (key: string) => expandedKeys.has(key);

  const renderNode = (node: HierarchyNode, depth: number = 0) => {
    const expanded = isExpanded(node.key);
    const hasChildren = node.children && node.children.length > 0;

    if (node.type === 'activity' && node.activity) {
      const a = node.activity;
      const color = getTradeColor(a.trade);

      return (
        <div
          key={node.key}
          onClick={() => setSelectedActivity(a.id)}
          className={cn(
            "flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-all",
            "hover:bg-primary/5 border border-transparent hover:border-primary/20",
            isOverdue(a) && "bg-red-50 hover:bg-red-100"
          )}
          style={{ paddingLeft: `${12 + depth * 20}px` }}
        >
          {/* Trade color dot */}
          <span
            className="h-2 w-2 rounded-full shrink-0"
            style={{ backgroundColor: color }}
          />

          {/* Activity name and ID */}
          <div className="flex-1 min-w-0">
            <span className="text-[12px] font-medium text-foreground truncate">
              {a.milestone && <span className="text-primary mr-1">◆</span>}
              {a.name}
            </span>
            <span className="text-[10px] text-muted-foreground ml-1">
              {a.id}
            </span>
          </div>

          {/* Status and progress */}
          <div className="flex items-center gap-2 shrink-0">
            <StatusBadge status={a.status} />
            <PctBar pct={a.pct} compact />
          </div>
        </div>
      );
    }

    // Area or Trade node
    const isArea = node.type === 'area';
    const isTrade = node.type === 'trade';
    const icon = isTrade ? <Zap className="h-3.5 w-3.5" /> : <MapPin className="h-3.5 w-3.5" />;
    const bgColor = isArea ? 'bg-slate-50 dark:bg-slate-900' : 'bg-slate-100/50 dark:bg-slate-800';

    return (
      <div key={node.key}>
        <div
          onClick={() => toggleExpanded(node.key)}
          className={cn(
            "flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-all",
            "hover:bg-primary/10 font-medium",
            expanded && bgColor
          )}
          style={{ paddingLeft: `${12 + depth * 20}px` }}
        >
          {/* Expand/collapse chevron */}
          <ChevronDown
            className={cn(
              "h-4 w-4 text-muted-foreground shrink-0 transition-transform duration-200",
              expanded ? "rotate-0" : "-rotate-90"
            )}
          />

          {/* Icon */}
          <span className="text-muted-foreground shrink-0">{icon}</span>

          {/* Label and count */}
          <div className="flex-1 min-w-0">
            <span className="text-[13px] font-semibold text-foreground truncate">
              {node.label}
            </span>
          </div>
          <span className="text-[11px] text-muted-foreground bg-muted px-2 py-0.5 rounded shrink-0">
            {node.count}
          </span>

          {/* Add button for trades */}
          {isTrade && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setAddingToKey(addingToKey === node.key ? null : node.key);
              }}
              className="ml-1 p-1 hover:bg-primary/20 rounded transition-colors shrink-0"
              title="Add subtask"
            >
              <Plus className="h-3.5 w-3.5 text-primary" />
            </button>
          )}
        </div>

        {/* Add subtask form */}
        {isTrade && addingToKey === node.key && (
          <div className="px-3 py-2 ml-2 border-l-2 border-primary/30 bg-primary/5">
            <input
              autoFocus
              type="text"
              placeholder="New task name..."
              className={cn(
                "w-full px-3 py-1.5 text-[12px] rounded border border-primary/30",
                "bg-white dark:bg-slate-900 focus:outline-none focus:border-primary",
                "transition-colors"
              )}
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  setAddingToKey(null);
                }
                // TODO: handle Enter to create task
              }}
              onBlur={() => setAddingToKey(null)}
            />
          </div>
        )}

        {/* Expanded children */}
        {expanded && hasChildren && (
          <div className="animate-in slide-in-from-top-0 duration-200">
            {node.children!.map((child) => renderNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  if (!items.length) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground text-sm">
        No activities found.
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <div className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        {items.length} Activities
      </div>
      {hierarchy.map((node) => renderNode(node, 0))}
    </div>
  );
}
