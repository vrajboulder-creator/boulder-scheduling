'use client';

import { useState } from 'react';
import { useAppStore } from '@/hooks/useAppStore';
import { useApi, debouncedSave } from '@/hooks/useApi';
import { isoDate, fmt, diffDays, isOverdue, TODAY } from '@/lib/helpers';
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
  const { activities, selectedActivityId, setSelectedActivity, setDetailOpen, detailOpen, updateActivity, showToast } = useAppStore();
  const { saveOne } = useApi();
  const [newNote, setNewNote] = useState('');

  const a = activities.find((x) => x.id === selectedActivityId);

  const close = () => { setDetailOpen(false); setSelectedActivity(null); };
  const update = (field: keyof Activity, value: unknown) => {
    if (!a) return;
    updateActivity(a.id, { [field]: value } as Partial<Activity>);
    debouncedSave(() => saveOne(a.id));
  };
  const quickUpdate = (field: 'status' | 'pct' | 'blocker', value: string | number) => {
    if (!a) return;
    const updates: Partial<Activity> = {};
    if (field === 'pct') { const pct = Math.min(100, Math.max(0, Number(value))); updates.pct = pct; if (pct === 100) updates.status = 'Complete'; else if (pct > 0 && a.status === 'Not Started') updates.status = 'In Progress'; }
    else if (field === 'status') { updates.status = value as ActivityStatus; if (value === 'Complete') updates.pct = 100; if (value === 'In Progress' && a.pct === 0) updates.pct = 5; }
    else if (field === 'blocker') { updates.blocker = value as string; if (value && a.status !== 'Delayed') updates.status = 'Blocked'; if (!value && a.status === 'Blocked') updates.status = a.pct > 0 ? 'In Progress' : 'Not Started'; }
    updateActivity(a.id, updates);
    showToast(`${a.id} updated — ${field}: ${value}`);
    debouncedSave(() => saveOne(a.id));
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
    close(); showToast(`${a.id} deleted`);
  };

  const trades = [...new Set(activities.map((x) => x.trade).filter(Boolean))].sort();
  const areas = [...new Set(activities.map((x) => x.area).filter(Boolean))].sort();
  const floors = ['', ...new Set(activities.map((x) => x.floor).filter(Boolean))];

  return (
    <div className={cn(
      "w-[400px] min-w-[400px] max-h-full h-full bg-card border-l flex flex-col overflow-hidden transition-all duration-300",
      "max-lg:fixed max-lg:right-0 max-lg:top-0 max-lg:bottom-0 max-lg:z-50 max-lg:shadow-xl",
      "max-md:w-full max-md:min-w-full",
      (!detailOpen || !a) && "w-0 min-w-0 border-l-0 max-lg:translate-x-full"
    )}>
      {a && (
        <>
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-3.5 border-b bg-card sticky top-0 z-10">
            <h3 className="text-sm font-semibold truncate">{a.name}</h3>
            <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={close}><X className="h-4 w-4" /></Button>
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
                  <Field label="Duration"><div className="text-sm font-medium">{a.duration} days</div></Field>
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
        </>
      )}
    </div>
  );
}

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
