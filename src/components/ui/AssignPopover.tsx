'use client';

import { useState, useRef, useEffect } from 'react';
import { useAppStore } from '@/hooks/useAppStore';
import { useApi } from '@/hooks/useApi';
import { cn } from '@/lib/utils';
import { UserPlus, User, X, Check, Plus, Pencil, Trash2, ChevronLeft } from 'lucide-react';
import type { AppUser, UserRole } from '@/types';

const ROLES: UserRole[] = ['Admin', 'PM', 'Superintendent', 'Field', 'Subcontractor', 'Viewer'];

function Initials({ name }: { name: string }) {
  const ini = name.split(' ').map((n) => n[0] ?? '').join('').slice(0, 2).toUpperCase();
  return (
    <span className="flex items-center justify-center h-6 w-6 rounded-full bg-primary/20 text-primary text-[9px] font-bold shrink-0">
      {ini}
    </span>
  );
}

interface Props {
  subtaskId: string;
  assigneeId: string | null | undefined;
  onAssign: (userId: string | null) => void;
  onClose: () => void;
}

type View = 'list' | 'add' | 'edit';

export default function AssignPopover({ subtaskId, assigneeId, onAssign, onClose }: Props) {
  const users = useAppStore((s) => s.users);
  const { addUser, updateUser: storeUpdate, removeUser } = useAppStore();
  const { createUser, updateUser: apiUpdate, deleteUser } = useApi();

  const [view, setView] = useState<View>('list');
  const [editTarget, setEditTarget] = useState<AppUser | null>(null);

  // Form fields shared between add and edit
  const [fname, setFname] = useState('');
  const [frole, setFrole] = useState<UserRole>('Field');
  const [fcompany, setFcompany] = useState('');
  const [fphone, setFphone] = useState('');
  const [femail, setFemail] = useState('');
  const [saving, setSaving] = useState(false);

  const firstInputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (view !== 'list') setTimeout(() => firstInputRef.current?.focus(), 30);
  }, [view]);

  function openAdd() {
    setFname(''); setFrole('Field'); setFcompany(''); setFphone(''); setFemail('');
    setEditTarget(null);
    setView('add');
  }

  function openEdit(u: AppUser) {
    setFname(u.full_name); setFrole(u.role); setFcompany(u.company || ''); setFphone(u.phone || ''); setFemail(u.email || '');
    setEditTarget(u);
    setView('edit');
  }

  async function handleSave() {
    if (!fname.trim()) return;
    setSaving(true);
    if (view === 'add') {
      const created = await createUser({ full_name: fname.trim(), role: frole, company: fcompany.trim(), phone: fphone.trim(), email: femail.trim() });
      if (created) addUser(created);
    } else if (view === 'edit' && editTarget) {
      const updates = { full_name: fname.trim(), role: frole, company: fcompany.trim(), phone: fphone.trim(), email: femail.trim() };
      storeUpdate(editTarget.id, updates);
      await apiUpdate(editTarget.id, updates);
    }
    setSaving(false);
    setView('list');
  }

  async function handleDelete(u: AppUser) {
    removeUser(u.id);
    await deleteUser(u.id);
    if (u.id === assigneeId) onAssign(null);
    setView('list');
  }

  // ── List view ──
  if (view === 'list') {
    return (
      <>
        <div className="flex items-center justify-between px-3 py-2 border-b border-border/60">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Assign to</span>
          <button onClick={onClose} className="p-0.5 rounded hover:bg-muted text-muted-foreground transition-colors">
            <X className="h-3 w-3" />
          </button>
        </div>

        <div className="max-h-52 overflow-y-auto">
          {users.length === 0 ? (
            <p className="px-3 py-3 text-[11px] text-muted-foreground">No team members yet.</p>
          ) : (
            <>
              {assigneeId && (
                <button
                  onClick={() => onAssign(null)}
                  className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-red-50 text-[11px] text-red-500 border-b border-border/40 transition-colors"
                >
                  <X className="h-3 w-3" /> Unassign
                </button>
              )}
              {users.map((u) => (
                <div key={u.id} className="group/row flex items-center gap-2 px-3 py-1.5 hover:bg-primary/5 transition-colors border-b border-border/30 last:border-0">
                  <button
                    className="flex items-center gap-2 flex-1 min-w-0 text-left"
                    onClick={() => onAssign(u.id)}
                  >
                    <Initials name={u.full_name} />
                    <div className="flex-1 min-w-0">
                      <div className={cn('text-[11px] truncate', u.id === assigneeId && 'font-semibold text-primary')}>{u.full_name}</div>
                      <div className="text-[9.5px] text-muted-foreground">{u.role}{u.company ? ` · ${u.company}` : ''}</div>
                    </div>
                    {u.id === assigneeId && <Check className="h-3 w-3 text-primary shrink-0" />}
                  </button>
                  <div className="flex gap-0.5 opacity-0 group-hover/row:opacity-100 transition-opacity shrink-0">
                    <button onClick={() => openEdit(u)} className="p-1 rounded hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors" title="Edit">
                      <Pencil className="h-2.5 w-2.5" />
                    </button>
                    <button onClick={() => handleDelete(u)} className="p-1 rounded hover:bg-red-50 text-muted-foreground hover:text-red-500 transition-colors" title="Remove">
                      <Trash2 className="h-2.5 w-2.5" />
                    </button>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>

        <div className="border-t border-border/60 px-3 py-2">
          <button
            onClick={openAdd}
            className="flex items-center gap-1.5 text-[11px] text-primary hover:text-primary/80 font-medium transition-colors"
          >
            <Plus className="h-3 w-3" /> Add team member
          </button>
        </div>
      </>
    );
  }

  // ── Add / Edit form view ──
  return (
    <>
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border/60">
        <button onClick={() => setView('list')} className="p-0.5 rounded hover:bg-muted text-muted-foreground transition-colors">
          <ChevronLeft className="h-3.5 w-3.5" />
        </button>
        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex-1">
          {view === 'add' ? 'Add team member' : 'Edit member'}
        </span>
        <button onClick={onClose} className="p-0.5 rounded hover:bg-muted text-muted-foreground transition-colors">
          <X className="h-3 w-3" />
        </button>
      </div>

      <div className="px-3 py-3 space-y-2">
        <div>
          <label className="text-[10px] text-muted-foreground block mb-0.5">Full name *</label>
          <input
            ref={firstInputRef}
            value={fname}
            onChange={(e) => setFname(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') setView('list'); }}
            placeholder="Jane Smith"
            className="w-full text-[11px] h-7 px-2 rounded border border-border bg-background outline-none focus:ring-1 focus:ring-primary/40"
          />
        </div>
        <div>
          <label className="text-[10px] text-muted-foreground block mb-0.5">Role</label>
          <select
            value={frole}
            onChange={(e) => setFrole(e.target.value as UserRole)}
            className="w-full text-[11px] h-7 px-2 rounded border border-border bg-background outline-none focus:ring-1 focus:ring-primary/40"
          >
            {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-[10px] text-muted-foreground block mb-0.5">Company</label>
            <input value={fcompany} onChange={(e) => setFcompany(e.target.value)} placeholder="Acme GC" className="w-full text-[11px] h-7 px-2 rounded border border-border bg-background outline-none focus:ring-1 focus:ring-primary/40" />
          </div>
          <div>
            <label className="text-[10px] text-muted-foreground block mb-0.5">Phone</label>
            <input value={fphone} onChange={(e) => setFphone(e.target.value)} placeholder="555-1234" className="w-full text-[11px] h-7 px-2 rounded border border-border bg-background outline-none focus:ring-1 focus:ring-primary/40" />
          </div>
        </div>
        <div>
          <label className="text-[10px] text-muted-foreground block mb-0.5">Email</label>
          <input value={femail} onChange={(e) => setFemail(e.target.value)} placeholder="jane@example.com" className="w-full text-[11px] h-7 px-2 rounded border border-border bg-background outline-none focus:ring-1 focus:ring-primary/40" />
        </div>
      </div>

      <div className="flex gap-2 px-3 pb-3">
        <button
          onClick={handleSave}
          disabled={!fname.trim() || saving}
          className="flex-1 flex items-center justify-center gap-1.5 text-[11px] h-7 rounded bg-primary text-white font-medium hover:bg-primary/90 disabled:opacity-40 transition-colors"
        >
          <Check className="h-3 w-3" />
          {saving ? 'Saving…' : view === 'add' ? 'Add' : 'Save'}
        </button>
        <button
          onClick={() => setView('list')}
          className="flex items-center justify-center gap-1 text-[11px] h-7 px-3 rounded border border-border text-muted-foreground hover:bg-muted transition-colors"
        >
          Cancel
        </button>
      </div>
    </>
  );
}

// ── Standalone full-page team manager (used in Settings) ──
export function TeamMembersManager() {
  const users = useAppStore((s) => s.users);
  const { addUser, updateUser: storeUpdate, removeUser } = useAppStore();
  const { createUser, updateUser: apiUpdate, deleteUser } = useApi();

  const [view, setView] = useState<'list' | 'add' | 'edit'>('list');
  const [editTarget, setEditTarget] = useState<AppUser | null>(null);
  const [fname, setFname] = useState('');
  const [frole, setFrole] = useState<UserRole>('Field');
  const [fcompany, setFcompany] = useState('');
  const [fphone, setFphone] = useState('');
  const [femail, setFemail] = useState('');
  const [saving, setSaving] = useState(false);
  const firstInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (view !== 'list') setTimeout(() => firstInputRef.current?.focus(), 30);
  }, [view]);

  function openAdd() {
    setFname(''); setFrole('Field'); setFcompany(''); setFphone(''); setFemail('');
    setEditTarget(null);
    setView('add');
  }

  function openEdit(u: AppUser) {
    setFname(u.full_name); setFrole(u.role); setFcompany(u.company || ''); setFphone(u.phone || ''); setFemail(u.email || '');
    setEditTarget(u);
    setView('edit');
  }

  async function handleSave() {
    if (!fname.trim()) return;
    setSaving(true);
    if (view === 'add') {
      const created = await createUser({ full_name: fname.trim(), role: frole, company: fcompany.trim(), phone: fphone.trim(), email: femail.trim() });
      if (created) addUser(created);
    } else if (view === 'edit' && editTarget) {
      const updates = { full_name: fname.trim(), role: frole, company: fcompany.trim(), phone: fphone.trim(), email: femail.trim() };
      storeUpdate(editTarget.id, updates);
      await apiUpdate(editTarget.id, updates);
    }
    setSaving(false);
    setView('list');
  }

  async function handleDelete(u: AppUser) {
    removeUser(u.id);
    await deleteUser(u.id);
    if (view === 'edit' && editTarget?.id === u.id) setView('list');
  }

  if (view === 'list') {
    return (
      <div>
        {users.length > 0 ? (
          <div className="mb-3 space-y-1">
            {users.map((u) => (
              <div key={u.id} className="group flex items-center gap-2 py-2 px-2.5 rounded-lg border border-border/50 bg-background text-[12px]">
                <Initials name={u.full_name} />
                <div className="flex-1 min-w-0">
                  <span className="font-medium truncate block">{u.full_name}</span>
                  <span className="text-[10px] text-muted-foreground">
                    {u.role}{u.company ? ` · ${u.company}` : ''}{u.phone ? ` · ${u.phone}` : ''}{u.email ? ` · ${u.email}` : ''}
                  </span>
                </div>
                <div className="flex gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity ml-auto">
                  <button onClick={() => openEdit(u)} className="p-1 rounded hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors" title="Edit">
                    <Pencil className="h-3 w-3" />
                  </button>
                  <button onClick={() => handleDelete(u)} className="p-1 rounded hover:bg-red-50 text-muted-foreground hover:text-red-500 transition-colors" title="Remove">
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-[12px] text-muted-foreground mb-3">No team members yet.</p>
        )}
        <button
          onClick={openAdd}
          className="flex items-center gap-1.5 text-[12px] text-primary hover:text-primary/80 font-medium transition-colors border border-primary/30 rounded-lg px-3 py-1.5 hover:bg-primary/5"
        >
          <Plus className="h-3.5 w-3.5" /> Add Team Member
        </button>
      </div>
    );
  }

  return (
    <div className="border border-primary/20 rounded-lg p-3 bg-primary/[0.02] space-y-2">
      <div className="flex items-center gap-2 mb-1">
        <button onClick={() => setView('list')} className="p-0.5 rounded hover:bg-muted text-muted-foreground transition-colors">
          <ChevronLeft className="h-3.5 w-3.5" />
        </button>
        <span className="text-[10px] font-bold uppercase tracking-wider text-primary">
          {view === 'add' ? 'New Team Member' : 'Edit Member'}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="col-span-2">
          <label className="text-[10px] text-muted-foreground block mb-0.5">Full Name *</label>
          <input ref={firstInputRef} value={fname} onChange={(e) => setFname(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') setView('list'); }}
            placeholder="Jane Smith"
            className="w-full text-[11px] h-7 px-2 rounded border border-border bg-background outline-none focus:ring-1 focus:ring-primary/40"
          />
        </div>
        <div>
          <label className="text-[10px] text-muted-foreground block mb-0.5">Role</label>
          <select value={frole} onChange={(e) => setFrole(e.target.value as UserRole)}
            className="w-full text-[11px] h-7 px-2 rounded border border-border bg-background outline-none focus:ring-1 focus:ring-primary/40"
          >
            {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
        <div>
          <label className="text-[10px] text-muted-foreground block mb-0.5">Company</label>
          <input value={fcompany} onChange={(e) => setFcompany(e.target.value)} placeholder="Acme GC"
            className="w-full text-[11px] h-7 px-2 rounded border border-border bg-background outline-none focus:ring-1 focus:ring-primary/40" />
        </div>
        <div>
          <label className="text-[10px] text-muted-foreground block mb-0.5">Phone</label>
          <input value={fphone} onChange={(e) => setFphone(e.target.value)} placeholder="555-1234"
            className="w-full text-[11px] h-7 px-2 rounded border border-border bg-background outline-none focus:ring-1 focus:ring-primary/40" />
        </div>
        <div className="col-span-2">
          <label className="text-[10px] text-muted-foreground block mb-0.5">Email</label>
          <input value={femail} onChange={(e) => setFemail(e.target.value)} placeholder="jane@example.com"
            className="w-full text-[11px] h-7 px-2 rounded border border-border bg-background outline-none focus:ring-1 focus:ring-primary/40" />
        </div>
      </div>
      <div className="flex gap-2 pt-1">
        <button onClick={handleSave} disabled={!fname.trim() || saving}
          className="flex items-center gap-1.5 text-[11px] h-7 px-3 rounded bg-primary text-white font-medium hover:bg-primary/90 disabled:opacity-40 transition-colors"
        >
          <Check className="h-3 w-3" /> {saving ? 'Saving…' : view === 'add' ? 'Add Member' : 'Save Changes'}
        </button>
        <button onClick={() => setView('list')}
          className="flex items-center gap-1 text-[11px] h-7 px-3 rounded border border-border text-muted-foreground hover:bg-muted transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

// ── Trigger button + popover wrapper ──
export function AssignButton({ subtaskId, assigneeId }: { subtaskId: string; assigneeId: string | null | undefined }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const users = useAppStore((s) => s.users);
  const { updateActivity } = useAppStore();
  const { patchOne } = useApi();

  const assignee = users.find((u) => u.id === assigneeId);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  function handleAssign(userId: string | null) {
    updateActivity(subtaskId, { assignee_id: userId });
    setOpen(false);
    patchOne(subtaskId, { assignee_id: userId }).catch(() => {});
  }

  return (
    <div className="relative shrink-0" ref={ref}>
      <button
        onClick={(e) => { e.stopPropagation(); setOpen((o) => !o); }}
        className={cn(
          'flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full border transition-colors',
          assignee
            ? 'bg-primary/10 border-primary/30 text-primary hover:bg-primary/20'
            : 'bg-muted/60 border-border/60 text-muted-foreground hover:bg-primary/10 hover:text-primary hover:border-primary/30'
        )}
        title={assignee ? `Assigned: ${assignee.full_name}` : 'Assign to someone'}
      >
        {assignee ? (
          <><User className="h-2.5 w-2.5" /><span className="max-w-[70px] truncate">{assignee.full_name.split(' ')[0]}</span></>
        ) : (
          <><UserPlus className="h-2.5 w-2.5" /><span>Assign</span></>
        )}
      </button>

      {open && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="absolute right-0 top-full mt-1 z-30 w-60 bg-background border border-border rounded-lg shadow-xl overflow-hidden"
        >
          <AssignPopover
            subtaskId={subtaskId}
            assigneeId={assigneeId}
            onAssign={handleAssign}
            onClose={() => setOpen(false)}
          />
        </div>
      )}
    </div>
  );
}
