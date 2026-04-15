'use client';

import { useState, useMemo, memo } from 'react';
import { useAppStore } from '@/hooks/useAppStore';
import { useApi, debouncedSave } from '@/hooks/useApi';
import { isoDate, fmt, diffDays, addDays, isOverdue, TODAY, resolveAllDates } from '@/lib/helpers';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { SelectNative } from '@/components/ui/select-native';
import { Slider } from '@/components/ui/slider';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { X, Play, Check, AlertTriangle, Ban, Trash2 } from 'lucide-react';
import type { Activity, ActivityStatus, ActivityPriority } from '@/types';

const STATUSES: ActivityStatus[] = ['Not Started', 'In Progress', 'Complete', 'Delayed', 'Blocked', 'Ready to Start'];
const PRIORITIES: ActivityPriority[] = ['Critical', 'High', 'Normal', 'Low'];
const PHASES = ['Sitework', 'Foundation', 'Structure', 'Rough-In', 'Close-In', 'Finishes', 'Punch / Closeout', 'Turnover'];
const BLOCKERS = ['', 'Predecessor not complete', 'Material not on site', 'RFI pending', 'Submittal pending', 'Inspection required', 'Permit required', 'Owner decision pending', 'Weather delay', 'Manpower shortage', 'Design clarification'];

export default function DetailPanel() {
  // Use narrow selectors so unrelated store changes (e.g. activities array
  // churn from debounced saves, gantt zoom) don't re-render this panel.
  const detailOpen = useAppStore((s) => s.detailOpen);
  const selectedActivityId = useAppStore((s) => s.selectedActivityId);
  const setSelectedActivity = useAppStore((s) => s.setSelectedActivity);
  const setDetailOpen = useAppStore((s) => s.setDetailOpen);

  // Short-circuit the whole tree when the panel is closed. Keeping the
  // ScrollArea + Sections mounted while hidden was making every row click
  // re-render ~1000 hidden nodes before the panel could flip open.
  if (!detailOpen || !selectedActivityId) {
    return <div className="w-0 min-w-0 border-l-0 max-lg:translate-x-full shrink-0" />;
  }

  return (
    <DetailPanelInner
      activityId={selectedActivityId}
      onClose={() => { setDetailOpen(false); setSelectedActivity(null); }}
    />
  );
}

// Inner component renders only while open. Keyed by activityId so switching
// activities remounts local state (newNote clears instead of leaking).
const DetailPanelInner = memo(function DetailPanelInner({
  activityId,
  onClose,
}: {
  activityId: string;
  onClose: () => void;
}) {
  // Subscribe to just *this* activity — the list reference churns on every
  // save, so find-on-full-array was re-rendering on every keystroke elsewhere.
  const a = useAppStore((s) => s.activities.find((x) => x.id === activityId));
  const updateActivity = useAppStore((s) => s.updateActivity);
  const showToast = useAppStore((s) => s.showToast);
  const { saveOne } = useApi();
  const [newNote, setNewNote] = useState('');

  // Memoize the unique-value dropdown lists. These walked the full 1000+ row
  // array on every single render — now they only rebuild when the activities
  // reference actually changes.
  const activitiesRef = useAppStore((s) => s.activities);
  const trades = useMemo(
    () => [...new Set(activitiesRef.map((x) => x.trade).filter(Boolean))].sort(),
    [activitiesRef]
  );
  const areas = useMemo(
    () => [...new Set(activitiesRef.map((x) => x.area).filter(Boolean))].sort(),
    [activitiesRef]
  );
  const floors = useMemo(
    () => ['', ...new Set(activitiesRef.map((x) => x.floor).filter(Boolean))],
    [activitiesRef]
  );

  // Cascade helper — after any date change on one activity, re-resolve the full
  // graph so every successor waits for its LATEST predecessor (multi-dep aware).
  // `rootStart` / `rootFinish` are the NEW dates for the root activity — we
  // inject them directly so resolveAllDates sees the updated value even before
  // the Zustand updateActivity call has flushed to the store snapshot.
  const cascadeSuccessors = (rootId: string, rootStart?: string | null, rootFinish?: string | null) => {
    const allActs = useAppStore.getState().activities;

    // Build full link map from predecessors arrays
    const allLinks = allActs.flatMap((act) =>
      (act.predecessors || []).map((predId) => ({
        id: `${predId}-${act.id}`,
        predecessor_id: predId,
        successor_id: act.id,
        link_type: 'FS' as const,
        lag_days: 0,
      }))
    );

    // BFS — find all downstream successors of rootId (no cap)
    const reachable = new Set<string>();
    const bfsQ = [rootId];
    while (bfsQ.length) {
      const cur = bfsQ.shift()!;
      for (const lnk of allLinks) {
        if (lnk.predecessor_id === cur && !reachable.has(lnk.successor_id)) {
          reachable.add(lnk.successor_id);
          bfsQ.push(lnk.successor_id);
        }
      }
    }

    // Work only on the root + reachable subgraph — patch root's new dates in
    const subgraphIds = new Set([rootId, ...reachable]);
    const subgraph = allActs
      .filter((a) => subgraphIds.has(a.id))
      .map((act) =>
        act.id === rootId
          ? { ...act, ...(rootStart !== undefined ? { start: rootStart } : {}), ...(rootFinish !== undefined ? { finish: rootFinish } : {}) }
          : act
      );
    const subLinks = allLinks.filter(
      (l) => subgraphIds.has(l.predecessor_id) && subgraphIds.has(l.successor_id)
    );

    const resolved = resolveAllDates(subgraph, subLinks);

    // Batch changed activities — update store immediately, save in one bulk call
    const toSave: string[] = [];
    resolved.forEach((act) => {
      if (act.id === rootId) return;
      const before = allActs.find((x) => x.id === act.id);
      if (!before || (before.start === act.start && before.finish === act.finish)) return;
      updateActivity(act.id, { start: act.start, finish: act.finish });
      toSave.push(act.id);
    });

    // Batch per-row PATCH calls with concurrency limit — the bulk upsert route
    // requires full rows (NOT NULL cols), so we use the partial PATCH route per id.
    if (toSave.length > 0) {
      debouncedSave(async () => {
        const fresh = useAppStore.getState().activities;
        const rows = toSave.map((id) => fresh.find((a) => a.id === id)).filter(Boolean);
        if (rows.length === 0) return true;

        const CONCURRENCY = 5;
        let idx = 0;
        const worker = async () => {
          while (idx < rows.length) {
            const a = rows[idx++]!;
            try {
              await fetch(`/api/activities/${a.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  start_date: a.start ?? null,
                  finish_date: a.finish ?? null,
                  duration: a.duration,
                }),
              });
            } catch {/* ignore individual errors */}
          }
        };
        await Promise.all(Array.from({ length: CONCURRENCY }, worker));
        return true;
      }, 400, `cascade-${rootId}`);
    }
  };

  const update = (field: keyof Activity, value: unknown) => {
    if (!a) return;

    // ── Duration change: recalculate finish = start + duration - 1, then cascade ──
    if (field === 'duration') {
      const dur = Math.max(1, Number(value));
      const actUpdates: Partial<Activity> = { duration: dur };
      if (a.start) {
        const newFinish = isoDate(addDays(a.start, dur - 1));
        actUpdates.finish = newFinish;
        updateActivity(a.id, actUpdates);
        debouncedSave(() => saveOne(a.id), 300, a.id);
        cascadeSuccessors(a.id, a.start, newFinish);
      } else {
        updateActivity(a.id, actUpdates);
        debouncedSave(() => saveOne(a.id), 300, a.id);
      }
      return;
    }

    // ── Start change: recalculate finish = start + duration - 1, then cascade ──
    if (field === 'start' && typeof value === 'string' && value) {
      const newStart = value;
      const dur = a.duration || 1;
      const newFinish = isoDate(addDays(newStart, dur - 1));
      updateActivity(a.id, { start: newStart, finish: newFinish, duration: dur });
      debouncedSave(() => saveOne(a.id), 300, a.id);
      cascadeSuccessors(a.id, newStart, newFinish);
      return;
    }

    // ── Finish change: recalculate duration = finish - start + 1, then cascade ──
    if (field === 'finish' && typeof value === 'string' && value) {
      const newFinish = value;
      const newDur = a.start ? Math.max(1, diffDays(a.start, newFinish) + 1) : a.duration;
      updateActivity(a.id, { finish: newFinish, duration: newDur });
      debouncedSave(() => saveOne(a.id), 300, a.id);
      cascadeSuccessors(a.id, a.start, newFinish);
      return;
    }

    // ── All other fields ─────────────────────────────────────────────────────
    updateActivity(a.id, { [field]: value } as Partial<Activity>);
    debouncedSave(() => saveOne(a.id), 300, a.id);
  };
  const quickUpdate = (field: 'status' | 'pct' | 'blocker', value: string | number) => {
    if (!a) return;
    const updates: Partial<Activity> = {};
    if (field === 'pct') { const pct = Math.min(100, Math.max(0, Number(value))); updates.pct = pct; if (pct === 100) updates.status = 'Complete'; else if (pct > 0 && a.status === 'Not Started') updates.status = 'In Progress'; }
    else if (field === 'status') { updates.status = value as ActivityStatus; if (value === 'Complete') updates.pct = 100; if (value === 'In Progress' && a.pct === 0) updates.pct = 5; }
    else if (field === 'blocker') { updates.blocker = value as string; if (value && a.status !== 'Delayed') updates.status = 'Blocked'; if (!value && a.status === 'Blocked') updates.status = a.pct > 0 ? 'In Progress' : 'Not Started'; }
    updateActivity(a.id, updates);
    showToast(`${a.id} updated — ${field}: ${value}`);
    debouncedSave(() => saveOne(a.id), 300, a.id);
  };
  const addNote = () => {
    if (!a || !newNote.trim()) return;
    fetch('/api/notes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ activity_id: a.id, note: newNote.trim(), author: 'Field' }) }).catch(() => {});
    updateActivity(a.id, { notes: newNote.trim() + (a.notes ? '\n\n' + a.notes : '') });
    setNewNote(''); showToast('Note saved');
  };
  const deleteActivity = () => {
    if (!a || !confirm(`Delete ${a.name}?`)) return;
    fetch(`/api/activities/${a.id}`, { method: 'DELETE' }).catch(() => {});
    useAppStore.getState().removeActivity(a.id);
    onClose(); showToast(`${a.id} deleted`);
  };

  // Activity may have been deleted while panel open — render nothing.
  if (!a) return null;

  return (
    <div className={cn(
      "w-[400px] min-w-[400px] max-h-full h-full bg-card border-l flex flex-col overflow-hidden",
      "max-lg:fixed max-lg:right-0 max-lg:top-0 max-lg:bottom-0 max-lg:z-50 max-lg:shadow-xl",
      "max-md:w-full max-md:min-w-full",
    )}>
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b bg-card sticky top-0 z-10">
        <h3 className="text-sm font-semibold truncate">{a.name}</h3>
        <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={onClose}><X className="h-4 w-4" /></Button>
      </div>

          {/* Progress */}
          <div className="flex items-center gap-3 px-5 py-3 bg-muted/50 border-b">
            <span className="text-xs font-medium">Progress</span>
            <Slider value={[a.pct]} max={100} step={1} onValueChange={([v]) => quickUpdate('pct', v)} className="flex-1" />
            <span className="text-sm font-bold tabular-nums w-10 text-right">{a.pct}%</span>
          </div>

          <ScrollArea className="flex-1">
            <div className="divide-y">
              {/* Summary */}
              <Section title="Activity Summary">
                <Field label="Name"><Input value={a.name} onChange={(e) => update('name', e.target.value)} className="text-sm font-semibold h-8" /></Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="ID"><div className="font-mono text-xs text-muted-foreground">{a.id}</div></Field>
                  <Field label="Status"><SelectNative value={a.status} onChange={(e) => quickUpdate('status', e.target.value)} className="text-xs h-8">{STATUSES.map(s => <option key={s}>{s}</option>)}</SelectNative></Field>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Priority"><SelectNative value={a.priority} onChange={(e) => update('priority', e.target.value)} className="text-xs h-8">{PRIORITIES.map(p => <option key={p}>{p}</option>)}</SelectNative></Field>
                  <Field label="Phase"><SelectNative value={a.phase} onChange={(e) => update('phase', e.target.value)} className="text-xs h-8">{PHASES.map(p => <option key={p}>{p}</option>)}</SelectNative></Field>
                </div>
              </Section>

              {/* Schedule */}
              <Section title="Schedule">
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Start"><Input type="date" value={isoDate(a.start)} onChange={(e) => update('start', e.target.value)} className="text-xs h-8" /></Field>
                  <Field label="Finish"><Input type="date" value={isoDate(a.finish)} onChange={(e) => update('finish', e.target.value)} className="text-xs h-8" /></Field>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Duration (days)"><Input type="number" min={1} value={a.duration} onChange={(e) => update('duration', parseInt(e.target.value) || 1)} className="text-xs h-8 w-20" /></Field>
                  <Field label="% Complete"><Input type="number" min={0} max={100} value={a.pct} onChange={(e) => quickUpdate('pct', parseInt(e.target.value))} className="text-xs h-8 w-20" /></Field>
                </div>
                {isOverdue(a) && <Badge variant="danger" className="mt-1">⚠ Overdue by {diffDays(a.finish, TODAY)} days</Badge>}
              </Section>

              {/* Location */}
              <Section title="Location & Trade">
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Trade"><SelectNative value={a.trade} onChange={(e) => update('trade', e.target.value)} className="text-xs h-8">{trades.map(t => <option key={t}>{t}</option>)}</SelectNative></Field>
                  <Field label="Sub"><Input value={a.sub} onChange={(e) => update('sub', e.target.value)} className="text-xs h-8" /></Field>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Area"><SelectNative value={a.area} onChange={(e) => update('area', e.target.value)} className="text-xs h-8">{areas.map(o => <option key={o}>{o}</option>)}</SelectNative></Field>
                  <Field label="Floor"><SelectNative value={a.floor} onChange={(e) => update('floor', e.target.value)} className="text-xs h-8">{floors.map(o => <option key={o} value={o}>{o || '(none)'}</option>)}</SelectNative></Field>
                </div>
              </Section>

              {/* Blocker */}
              <Section title="Blocker">
                <SelectNative value={a.blocker} onChange={(e) => quickUpdate('blocker', e.target.value)} className="text-xs h-8">{BLOCKERS.map(b => <option key={b} value={b}>{b || 'None'}</option>)}</SelectNative>
              </Section>

              {/* Notes */}
              <Section title="Notes">
                {a.notes ? <div className="bg-muted/50 rounded-lg p-3 mb-2"><p className="text-[10px] text-muted-foreground mb-1">Field note · {fmt(TODAY)}</p><p className="text-xs">{a.notes}</p></div> : <p className="text-xs text-muted-foreground mb-2">No notes yet.</p>}
                <Textarea placeholder="Add a field note…" className="text-xs min-h-[48px]" value={newNote} onChange={(e) => setNewNote(e.target.value)} />
                <Button variant="outline" size="sm" className="mt-2 text-xs" onClick={addNote}>Add Note</Button>
              </Section>

              {/* Quick Updates */}
              <Section title="Quick Updates">
                <div className="flex flex-wrap gap-1.5">
                  <Button variant="outline" size="sm" className="text-xs gap-1" onClick={() => quickUpdate('status', 'In Progress')}><Play className="h-3 w-3" />In Progress</Button>
                  <Button variant="outline" size="sm" className="text-xs gap-1" onClick={() => quickUpdate('status', 'Complete')}><Check className="h-3 w-3" />Complete</Button>
                  <Button variant="outline" size="sm" className="text-xs gap-1 text-destructive" onClick={() => quickUpdate('status', 'Delayed')}><AlertTriangle className="h-3 w-3" />Delayed</Button>
                  <Button variant="outline" size="sm" className="text-xs gap-1 text-destructive" onClick={() => quickUpdate('status', 'Blocked')}><Ban className="h-3 w-3" />Blocked</Button>
                  {[25, 50, 75, 100].map(p => <Button key={p} variant="secondary" size="sm" className="text-xs" onClick={() => quickUpdate('pct', p)}>{p}%</Button>)}
                </div>
              </Section>

              {/* Danger */}
              <Section title="Danger Zone" className="border-t-2 border-destructive/20">
                <Button variant="destructive" size="sm" className="text-xs gap-1" onClick={deleteActivity}><Trash2 className="h-3 w-3" />Delete Activity</Button>
              </Section>
            </div>
          </ScrollArea>
    </div>
  );
});

function Section({ title, children, className }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("px-5 py-4 space-y-3", className)}>
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{title}</p>
      {children}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[11px] text-muted-foreground mb-1">{label}</p>
      {children}
    </div>
  );
}
