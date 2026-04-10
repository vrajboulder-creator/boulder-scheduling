'use client';

import { useState } from 'react';
import { useAppStore } from '@/hooks/useAppStore';
import { useApi } from '@/hooks/useApi';
import { isoDate, addDays, diffDays, parseDate, TODAY } from '@/lib/helpers';
import { SUBS } from '@/data/constants';
import type { Activity } from '@/types';

export default function ActivityModal() {
  const { modalOpen, setModalOpen, activities, addActivity, genId, currentProjectId, showToast } = useAppStore();
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
  const [blocker, setBlocker] = useState('');
  const [milestone, setMilestone] = useState(false);
  const [lookahead, setLookahead] = useState(false);
  const [notes, setNotes] = useState('');

  const dynTrades = [...new Set(activities.map((a) => a.trade).filter(Boolean))].sort();
  const dynAreas = [...new Set(activities.map((a) => a.area).filter(Boolean))].sort();
  const dynFloors = [...new Set(activities.map((a) => a.floor).filter(Boolean))].sort();
  const dynPhases = [...new Set(activities.map((a) => a.phase).filter(Boolean))].sort();

  const handleSave = async () => {
    if (!name.trim()) { showToast('Activity name is required'); return; }
    if (parseDate(finish)! < parseDate(start)!) { showToast('Finish date must be after start date'); return; }

    const a: Activity = {
      id: genId(),
      name: name.trim(),
      trade: trade || 'General / GC',
      sub: sub || SUBS[trade] || '',
      area: area || 'Tower A',
      floor,
      phase,
      start,
      finish,
      duration: diffDays(start, finish),
      hasDate: true,
      status: status as Activity['status'],
      pct,
      priority: priority as Activity['priority'],
      blocker,
      milestone,
      lookahead,
      notes,
      predecessors: [],
      successors: [],
      linked: [],
      attachments: [],
      project_id: currentProjectId,
    };

    addActivity(a);
    setModalOpen(false);
    showToast(`Activity ${a.id} created`);

    const ok = await createOne(a);
    if (ok) showToast(`${a.id} saved to database`);
    else showToast(`${a.id} created locally — DB save failed`);

    // Reset form
    setName(''); setTrade(''); setSub(''); setArea(''); setFloor('');
    setPhase(''); setStart(isoDate(TODAY)); setFinish(isoDate(addDays(TODAY, 14)));
    setStatus('Not Started'); setPriority('Normal'); setPct(0); setBlocker('');
    setMilestone(false); setLookahead(false); setNotes('');
  };

  if (!modalOpen) return null;

  return (
    <div className="modal-overlay open" onClick={(e) => { if (e.target === e.currentTarget) setModalOpen(false); }}>
      <div className="modal">
        <div className="modal-header">
          <h3>New Activity</h3>
          <button className="btn-icon" onClick={() => setModalOpen(false)}>✕</button>
        </div>
        <div className="modal-body">
          <div className="form-group">
            <label className="form-label">Activity Name *</label>
            <input className="form-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g., Framing — 2nd Floor" />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Trade</label>
              <select className="form-select" value={trade} onChange={(e) => { setTrade(e.target.value); setSub(SUBS[e.target.value] || ''); }}>
                <option value="">-- Select Trade --</option>
                {dynTrades.map((t) => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Subcontractor</label>
              <input className="form-input" value={sub} onChange={(e) => setSub(e.target.value)} />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Area</label>
              <select className="form-select" value={area} onChange={(e) => setArea(e.target.value)}>
                <option value="">-- Select Area --</option>
                {dynAreas.map((a) => <option key={a}>{a}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Floor</label>
              <select className="form-select" value={floor} onChange={(e) => setFloor(e.target.value)}>
                <option value="">-- Select Floor --</option>
                {dynFloors.map((f) => <option key={f}>{f}</option>)}
              </select>
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Start Date</label>
              <input className="form-input" type="date" value={start} onChange={(e) => setStart(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Finish Date</label>
              <input className="form-input" type="date" value={finish} onChange={(e) => setFinish(e.target.value)} />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Status</label>
              <select className="form-select" value={status} onChange={(e) => setStatus(e.target.value)}>
                {['Not Started', 'In Progress', 'Complete', 'Delayed', 'Blocked', 'Ready to Start'].map((s) => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Priority</label>
              <select className="form-select" value={priority} onChange={(e) => setPriority(e.target.value)}>
                {['Critical', 'High', 'Normal', 'Low'].map((p) => <option key={p}>{p}</option>)}
              </select>
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Phase</label>
              <select className="form-select" value={phase} onChange={(e) => setPhase(e.target.value)}>
                <option value="">-- Select Phase --</option>
                {dynPhases.map((p) => <option key={p}>{p}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">% Complete</label>
              <input className="form-input" type="number" min={0} max={100} value={pct} onChange={(e) => setPct(parseInt(e.target.value) || 0)} />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Notes</label>
            <textarea className="form-textarea" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional field notes…" />
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn-secondary" onClick={() => setModalOpen(false)}>Cancel</button>
          <button className="btn-primary" onClick={handleSave}>Create Activity</button>
        </div>
      </div>
    </div>
  );
}
