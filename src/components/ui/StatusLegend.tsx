'use client';

import { cn } from '@/lib/utils';

// Legend matching the app's six activity states + Milestone. The labels here
// are the display labels the user sees; the `value` is what gets sent to the
// parent (empty string = clear the filter).
//
// Colors track the rest of the UI: slate=idle, emerald=on-track, amber=at-risk,
// red=behind, green=complete, orange=milestone.
const ITEMS: { label: string; value: string; dot: string }[] = [
  { label: 'Not Started', value: 'Not Started',    dot: 'bg-slate-400' },
  { label: 'On Track',    value: 'In Progress',    dot: 'bg-emerald-500' },
  { label: 'At Risk',     value: 'At Risk',        dot: 'bg-amber-400' },
  { label: 'Behind',      value: 'Delayed',        dot: 'bg-red-500' },
  { label: 'Completed',   value: 'Complete',       dot: 'bg-green-500' },
  { label: 'Milestone',   value: 'Milestone',      dot: 'bg-orange-500' },
];

interface Props {
  className?: string;
  active?: string;                         // current filter value ('' = none)
  onChange?: (value: string) => void;      // click handler — pass same value to toggle off
}

export default function StatusLegend({ className, active = '', onChange }: Props) {
  const interactive = !!onChange;

  return (
    <div className={cn('flex items-center gap-1.5 flex-wrap', className)}>
      {ITEMS.map((it) => {
        const isActive = active === it.value;
        const Comp = interactive ? 'button' : 'span';
        return (
          <Comp
            key={it.label}
            type={interactive ? 'button' : undefined}
            onClick={interactive ? () => onChange!(isActive ? '' : it.value) : undefined}
            className={cn(
              'inline-flex items-center gap-1 border rounded-md px-1.5 py-0.5 text-[10px] font-medium whitespace-nowrap transition-all',
              interactive && 'cursor-pointer hover:border-primary/40 hover:bg-muted',
              isActive
                ? 'bg-primary/10 border-primary/50 text-primary shadow-sm'
                : 'bg-muted/60 border-border text-muted-foreground',
            )}
            title={interactive ? (isActive ? `Clear ${it.label} filter` : `Filter by ${it.label}`) : it.label}
          >
            <span className={cn('w-2 h-2 rounded-sm', it.dot)} />
            {it.label}
          </Comp>
        );
      })}
      {interactive && active && (
        <button
          type="button"
          onClick={() => onChange!('')}
          className="text-[10px] text-muted-foreground hover:text-primary underline ml-1"
        >
          clear
        </button>
      )}
    </div>
  );
}
