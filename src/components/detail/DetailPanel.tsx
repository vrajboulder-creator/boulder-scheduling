'use client';

import { useAppStore } from '@/hooks/useAppStore';
import { useApi, debouncedSave } from '@/hooks/useApi';
import { isoDate, fmt, diffDays, isOverdue, TODAY } from '@/lib/helpers';
import type { Activity, ActivityStatus, ActivityPriority } from '@/types';
import { useState } from 'react';

const STATUSES: ActivityStatus[] = ['Not Started', 'In Progress', 'Complete', 'Delayed', 'Blocked', 'Ready to Start'];
const PRIORITIES: ActivityPriority[] = ['Critical', 'High', 'Normal', 'Low'];
const PHASES = ['Sitework', 'Foundation', 'Structure', 'Rough-In', 'Close-In', 'Finishes', 'Punch / Closeout', 'Turnover'];
const BLOCKERS = [
  '', 'Predecessor not complete', 'Material not on site', 'RFI pending', 'Submittal pending',
  'Inspection required', 'Permit required', 'Owner decision pending', 'Weather delay',
  'Manpower shortage', 'Design clarification',
];

export default function DetailPanel() {
  const { activities, selectedActivityId, setSelectedActivity, setDetailOpen, detailOpen, updateActivity, showToast } = useAppStore();
  const { saveOne } = useApi();
  const [newNote, setNewNote] = useState('');

  const a = activities.find((x) => x.id === selectedActivityId);

  const close = () => {
    setDetailOpen(false);
    setSelectedActivity(null);
  };

  const update = (field: keyof Activity, value: unknown) => {
    if (!a) return;
    updateActivity(a.id, { [field]: value } as Partial<Activity>);
    debouncedSave(() => saveOne(a.id));
  };

  const quickUpdate = (field: 'status' | 'pct' | 'blocker', value: string | number) => {
    if (!a) return;
    const updates: Partial<Activity> = {};
    if (field === 'pct') {
      const pct = Math.min(100, Math.max(0, Number(value)));
      updates.pct = pct;
      if (pct === 100) updates.status = 'Complete';
      else if (pct > 0 && a.status === 'Not Started') updates.status = 'In Progress';
    } else if (field === 'status') {
      updates.status = value as ActivityStatus;
      if (value === 'Complete') updates.pct = 100;
      if (value === 'In Progress' && a.pct === 0) updates.pct = 5;
    } else if (field === 'blocker') {
      updates.blocker = value as string;
      if (value && a.status !== 'Delayed') updates.status = 'Blocked';
      if (!value && a.status === 'Blocked') updates.status = a.pct > 0 ? 'In Progress' : 'Not Started';
    }
    updateActivity(a.id, updates);
    showToast(`${a.id} updated — ${field}: ${value}`);
    debouncedSave(() => saveOne(a.id));
  };

  const addNote = () => {
    if (!a || !newNote.trim()) return;
    fetch('/api/notes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ activity_id: a.id, note: newNote.trim(), author: 'Field' }),
    }).catch(() => {});
    updateActivity(a.id, { notes: newNote.trim() + (a.notes ? '\n\n' + a.notes : '') });
    setNewNote('');
    showToast('Note saved');
  };

  const deleteActivity = () => {
    if (!a || !confirm(`Delete ${a.name}?`)) return;
    fetch(`/api/activities/${a.id}`, { method: 'DELETE' }).catch(() => {});
    useAppStore.getState().removeActivity(a.id);
    close();
    showToast(`${a.id} deleted`);
  };

  const trades = [...new Set(activities.map((x) => x.trade).filter(Boolean))].sort();
  const areas = [...new Set(activities.map((x) => x.area).filter(Boolean))].sort();
  const floors = ['', ...new Set(activities.map((x) => x.floor).filter(Boolean))];

  return (
    <div className={`detail-panel${!detailOpen || !a ? ' closed' : ''}`} id="detailPanel">
      {a && (
        <>
          <div className="detail-header">
            <h3 id="detailTitle">{a.name}</h3>
            <button className="btn-icon" onClick={close}>✕</button>
          </div>

          {/* Progress slider */}
          <div className="detail-progress-update">
            <span style={{ fontSize: 12, fontWeight: 500 }}>Progress</span>
            <input
              type="range"
              className="progress-slider"
              min={0}
              max={100}
              value={a.pct}
              onChange={(e) => quickUpdate('pct', parseInt(e.target.value))}
            />
            <span className="progress-val">{a.pct}%</span>
          </div>

          <div className="detail-inner" id="detailInner">
            {/* Activity Summary */}
            <div className="detail-section">
              <div className="detail-section-title">Activity Summary</div>
              <div className="detail-field">
                <div className="detail-label">Activity Name</div>
                <input
                  className="form-input"
                  value={a.name}
                  onChange={(e) => update('name', e.target.value)}
                  style={{ fontSize: 13, fontWeight: 600 }}
                />
              </div>
              <div className="detail-row">
                <div className="detail-field">
                  <div className="detail-label">ID</div>
                  <div className="detail-value" style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{a.id}</div>
                </div>
                <div className="detail-field">
                  <div className="detail-label">Status</div>
                  <select className="form-select" value={a.status} onChange={(e) => quickUpdate('status', e.target.value)} style={{ fontSize: 12 }}>
                    {STATUSES.map((s) => <option key={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              <div className="detail-row">
                <div className="detail-field">
                  <div className="detail-label">Priority</div>
                  <select className="form-select" value={a.priority} onChange={(e) => update('priority', e.target.value)} style={{ fontSize: 12 }}>
                    {PRIORITIES.map((p) => <option key={p}>{p}</option>)}
                  </select>
                </div>
                <div className="detail-field">
                  <div className="detail-label">Phase</div>
                  <select className="form-select" value={a.phase} onChange={(e) => update('phase', e.target.value)} style={{ fontSize: 12 }}>
                    {PHASES.map((p) => <option key={p}>{p}</option>)}
                  </select>
                </div>
              </div>
            </div>

            {/* Schedule */}
            <div className="detail-section">
              <div className="detail-section-title">Schedule</div>
              <div className="detail-row">
                <div className="detail-field">
                  <div className="detail-label">Start Date</div>
                  <input className="form-input" type="date" value={isoDate(a.start)} onChange={(e) => update('start', e.target.value)} style={{ fontSize: 12 }} />
                </div>
                <div className="detail-field">
                  <div className="detail-label">Finish Date</div>
                  <input className="form-input" type="date" value={isoDate(a.finish)} onChange={(e) => update('finish', e.target.value)} style={{ fontSize: 12 }} />
                </div>
              </div>
              <div className="detail-row">
                <div className="detail-field">
                  <div className="detail-label">Duration</div>
                  <div className="detail-value">{a.duration} days</div>
                </div>
                <div className="detail-field">
                  <div className="detail-label">% Complete</div>
                  <input className="form-input" type="number" min={0} max={100} value={a.pct} onChange={(e) => quickUpdate('pct', parseInt(e.target.value))} style={{ fontSize: 12, width: 70 }} />
                </div>
              </div>
              {isOverdue(a) && (
                <div style={{ color: 'var(--red)', fontSize: 12, fontWeight: 600, marginTop: 4 }}>
                  ⚠ Overdue by {diffDays(a.finish, TODAY)} days
                </div>
              )}
            </div>

            {/* Location & Trade */}
            <div className="detail-section">
              <div className="detail-section-title">Location & Trade</div>
              <div className="detail-row">
                <div className="detail-field">
                  <div className="detail-label">Trade</div>
                  <select className="form-select" value={a.trade} onChange={(e) => update('trade', e.target.value)} style={{ fontSize: 12 }}>
                    {trades.map((t) => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div className="detail-field">
                  <div className="detail-label">Subcontractor</div>
                  <input className="form-input" value={a.sub} onChange={(e) => update('sub', e.target.value)} style={{ fontSize: 12 }} />
                </div>
              </div>
              <div className="detail-row">
                <div className="detail-field">
                  <div className="detail-label">Area</div>
                  <select className="form-select" value={a.area} onChange={(e) => update('area', e.target.value)} style={{ fontSize: 12 }}>
                    {areas.map((o) => <option key={o}>{o}</option>)}
                  </select>
                </div>
                <div className="detail-field">
                  <div className="detail-label">Floor</div>
                  <select className="form-select" value={a.floor} onChange={(e) => update('floor', e.target.value)} style={{ fontSize: 12 }}>
                    {floors.map((o) => <option key={o} value={o}>{o || '(none)'}</option>)}
                  </select>
                </div>
              </div>
            </div>

            {/* Blocker */}
            <div className="detail-section">
              <div className="detail-section-title">Assign Blocker</div>
              <select className="form-select" value={a.blocker} onChange={(e) => quickUpdate('blocker', e.target.value)} style={{ fontSize: 12 }}>
                {BLOCKERS.map((b) => <option key={b} value={b}>{b || 'None'}</option>)}
              </select>
            </div>

            {/* Notes */}
            <div className="detail-section">
              <div className="detail-section-title">Notes & Updates</div>
              {a.notes ? (
                <div className="detail-note">
                  <div className="note-meta">Field note · {fmt(TODAY)}</div>
                  <div className="note-text">{a.notes}</div>
                </div>
              ) : (
                <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>No notes yet.</div>
              )}
              <div style={{ marginTop: 8 }}>
                <textarea
                  className="form-textarea"
                  placeholder="Add a field note or update…"
                  style={{ fontSize: 12, minHeight: 48 }}
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                />
                <button className="btn-secondary" style={{ marginTop: 4 }} onClick={addNote}>Add Note</button>
              </div>
            </div>

            {/* Quick Updates */}
            <div className="detail-section">
              <div className="detail-section-title">Quick Field Updates</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                <button className="quick-btn" onClick={() => quickUpdate('status', 'In Progress')}>▶ Mark In Progress</button>
                <button className="quick-btn" onClick={() => quickUpdate('status', 'Complete')}>✓ Mark Complete</button>
                <button className="quick-btn danger" onClick={() => quickUpdate('status', 'Delayed')}>⚠ Mark Delayed</button>
                <button className="quick-btn danger" onClick={() => quickUpdate('status', 'Blocked')}>✗ Mark Blocked</button>
                {[25, 50, 75, 100].map((p) => (
                  <button key={p} className="quick-btn" onClick={() => quickUpdate('pct', p)}>{p}%</button>
                ))}
              </div>
            </div>

            {/* Danger Zone */}
            <div className="detail-section" style={{ borderTop: '2px solid var(--red-light)', marginTop: 8 }}>
              <div className="detail-section-title" style={{ color: 'var(--red)' }}>Danger Zone</div>
              <button className="quick-btn danger" onClick={deleteActivity}>🗑 Delete Activity</button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
