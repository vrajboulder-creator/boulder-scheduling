'use client';

import { cn } from '@/lib/utils';

interface Props {
  pct: number;
  compact?: boolean;
}

export default function PctBar({ pct, compact }: Props) {
  if (compact) {
    return (
      <div className="flex items-center gap-1">
        <div className="h-1 w-12 rounded-full bg-muted overflow-hidden">
          <div
            className={cn(
              "h-full rounded-full transition-all",
              pct >= 75 ? "bg-emerald-500" : pct >= 40 ? "bg-amber-500" : "bg-primary"
            )}
            style={{ width: `${pct}%` }}
          />
        </div>
        <span className="text-[9px] font-semibold text-muted-foreground tabular-nums w-6">{pct}%</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-16 rounded-full bg-muted overflow-hidden">
        <div
          className={cn(
            "h-full rounded-full transition-all",
            pct >= 75 ? "bg-emerald-500" : pct >= 40 ? "bg-amber-500" : "bg-primary"
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-[11px] font-semibold text-muted-foreground tabular-nums w-8">{pct}%</span>
    </div>
  );
}
