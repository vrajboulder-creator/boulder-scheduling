'use client';

import { useState, useEffect } from 'react';
import { useAppStore } from '@/hooks/useAppStore';
import { useApi } from '@/hooks/useApi';
import { isoDate, addDays, diffDays, parseDate, TODAY } from '@/lib/helpers';
import { SUBS } from '@/data/constants';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { SelectNative } from '@/components/ui/select-native';
import type { Activity } from '@/types';

export default function ActivityModal() {
  const { modalOpen, setModalOpen, modalDefaults, activities, addActivity, genId, currentProjectId, showToast } = useAppStore();
  const { createOne } = useApi();

  const [name, setName] = useState('');
  const [trade, setTrade] = useState('');
  const [sub, setSub] = useState('');
  const [area, setArea] = useState('');
  const [floor, setFloor] = useState('');
  const [phase, setPhase] = useState('');
  const [start, setStart] = useState(isoDate(TODAY));
  const [finish, setFinish] = useState(isoDate(addDays(TODAY, 14)));
  const [status, setStatus] = useState('Not Started');
  const [priority, setPriority] = useState('Normal');
  const [pct, setPct] = useState(0);
  const [notes, setNotes] = useState('');

  // Apply pre-fill defaults whenever the modal opens
  useEffect(() => {
    if (modalOpen) {
      if (modalDefaults.phase) setPhase(modalDefaults.phase);
      if (modalDefaults.notes) setNotes(modalDefaults.notes);
      if (modalDefaults.area)  setArea(modalDefaults.area);
      if (modalDefaults.trade) setTrade(modalDefaults.trade);
    }
  }, [modalOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  const dynTrades = [...new Set(activities.map((a) => a.trade).filter(Boolean))].sort();
  const dynAreas = [...new Set(activities.map((a) => a.area).filter(Boolean))].sort();
  const dynFloors = [...new Set(activities.map((a) => a.floor).filter(Boolean))].sort();
  const dynPhases = [...new Set(activities.map((a) => a.phase).filter(Boolean))].sort();

  const reset = () => {
    setName(''); setTrade(''); setSub(''); setArea(''); setFloor('');
    setPhase(''); setStart(isoDate(TODAY)); setFinish(isoDate(addDays(TODAY, 14)));
    setStatus('Not Started'); setPriority('Normal'); setPct(0); setNotes('');
  };

  const handleSave = async () => {
    if (!name.trim()) { showToast('Activity name is required'); return; }
    if (parseDate(finish)! < parseDate(start)!) { showToast('Finish must be after start'); return; }

    const a: Activity = {
      id: genId(), name: name.trim(), trade: trade || 'General / GC', sub: sub || SUBS[trade] || '',
      area: area || 'Tower A', floor, phase, start, finish, duration: diffDays(start, finish), hasDate: true,
      status: status as Activity['status'], pct, priority: priority as Activity['priority'], blocker: '',
      milestone: false, lookahead: false, notes, predecessors: [], successors: [], linked: [], attachments: [],
      project_id: currentProjectId,
    };

    addActivity(a);
    setModalOpen(false);
    reset();
    showToast(`Activity ${a.id} created`);
    const ok = await createOne(a);
    if (ok) showToast(`${a.id} saved to database`);
  };

  return (
    <Dialog open={modalOpen} onOpenChange={setModalOpen}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            New Activity
            {modalDefaults.notes && (
              <span className="ml-2 text-[12px] font-normal text-muted-foreground">
                under {modalDefaults.notes.replace('Phase: ', '')}
              </span>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <Field label="Activity Name *">
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g., Framing — 2nd Floor" />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Trade">
              <SelectNative value={trade} onChange={(e) => { setTrade(e.target.value); setSub(SUBS[e.target.value] || ''); }}>
                <option value="">-- Select --</option>
                {dynTrades.map(t => <option key={t}>{t}</option>)}
              </SelectNative>
            </Field>
            <Field label="Subcontractor">
              <Input value={sub} onChange={(e) => setSub(e.target.value)} />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Area">
              <SelectNative value={area} onChange={(e) => setArea(e.target.value)}>
                <option value="">-- Select --</option>
                {dynAreas.map(a => <option key={a}>{a}</option>)}
              </SelectNative>
            </Field>
            <Field label="Floor">
              <SelectNative value={floor} onChange={(e) => setFloor(e.target.value)}>
                <option value="">-- Select --</option>
                {dynFloors.map(f => <option key={f}>{f}</option>)}
              </SelectNative>
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Start Date"><Input type="date" value={start} onChange={(e) => setStart(e.target.value)} /></Field>
            <Field label="Finish Date"><Input type="date" value={finish} onChange={(e) => setFinish(e.target.value)} /></Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Status">
              <SelectNative value={status} onChange={(e) => setStatus(e.target.value)}>
                {['Not Started', 'In Progress', 'Complete', 'Delayed', 'Blocked', 'Ready to Start'].map(s => <option key={s}>{s}</option>)}
              </SelectNative>
            </Field>
            <Field label="Priority">
              <SelectNative value={priority} onChange={(e) => setPriority(e.target.value)}>
                {['Critical', 'High', 'Normal', 'Low'].map(p => <option key={p}>{p}</option>)}
              </SelectNative>
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Phase">
              <SelectNative value={phase} onChange={(e) => setPhase(e.target.value)}>
                <option value="">-- Select --</option>
                {dynPhases.map(p => <option key={p}>{p}</option>)}
              </SelectNative>
            </Field>
            <Field label="% Complete">
              <Input type="number" min={0} max={100} value={pct} onChange={(e) => setPct(parseInt(e.target.value) || 0)} />
            </Field>
          </div>

          <Field label="Notes">
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional field notes…" />
          </Field>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button>
          <Button onClick={handleSave}>Create Activity</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-xs font-medium text-muted-foreground mb-1 block">{label}</label>
      {children}
    </div>
  );
}
