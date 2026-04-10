// ─── MODAL ───
function openModal() {
  document.getElementById('modalOverlay').classList.add('open');
  document.getElementById('fName').value = '';
  document.getElementById('fNotes').value = '';
  document.getElementById('fPct').value = '0';
  document.getElementById('fStart').value = isoDate(TODAY);
  document.getElementById('fFinish').value = isoDate(addDays(TODAY, 14));

  // Populate dynamic dropdowns from current activities
  const populateSelect = (id, vals, placeholder) => {
    const sel = document.getElementById(id);
    if (!sel) return;
    sel.innerHTML = `<option value="">${placeholder}</option>` + vals.map(v => `<option>${v}</option>`).join('');
  };
  populateSelect('fTrade', [...new Set(activities.map(a=>a.trade).filter(Boolean))].sort(), '-- Select Trade --');
  populateSelect('fArea', [...new Set(activities.map(a=>a.area).filter(Boolean))].sort(), '-- Select Area --');
  populateSelect('fFloor', ['', ...new Set(activities.map(a=>a.floor).filter(Boolean))].filter(Boolean).sort(), '-- Select Floor --');
  populateSelect('fPhase', [...new Set(activities.map(a=>a.phase).filter(Boolean))].sort(), '-- Select Phase --');
}

function closeModal() {
  document.getElementById('modalOverlay').classList.remove('open');
}

function saveActivity() {
  const name = document.getElementById('fName').value.trim();
  if (!name) { showToast('Activity name is required'); return; }
  const trade = document.getElementById('fTrade').value;
  const startVal = document.getElementById('fStart').value || isoDate(TODAY);
  const finishVal = document.getElementById('fFinish').value || isoDate(addDays(TODAY, 14));
  if (new Date(finishVal) < new Date(startVal)) { showToast('Finish date must be after start date'); return; }
  const a = {
    id: genId(),
    name,
    trade: trade || 'General / GC',
    sub: document.getElementById('fSub').value || SUBS[trade] || '',
    area: document.getElementById('fArea').value || 'Tower A',
    floor: document.getElementById('fFloor').value || '',
    phase: document.getElementById('fPhase').value || '',
    start: new Date(startVal),
    finish: new Date(finishVal),
    duration: diffDays(startVal, finishVal),
    status: document.getElementById('fStatus').value || 'Not Started',
    pct: parseInt(document.getElementById('fPct').value) || 0,
    priority: document.getElementById('fPriority').value || 'Normal',
    blocker: document.getElementById('fBlocker').value || '',
    milestone: document.getElementById('fMilestone').value === 'Yes',
    lookahead: document.getElementById('fLookahead').value === 'Yes',
    predecessors: [],
    successors: [],
    notes: document.getElementById('fNotes').value || '',
    linked: [],
    project_id: _currentProjectId || null
  };
  activities.push(a);
  closeModal();
  showToast(`Activity ${a.id} created`);
  render();

  // Save new activity directly to DB via POST
  fetch('/api/activities', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(frontendToDb(a))
  }).then(r => {
    if (r.ok) showToast(`${a.id} saved to database`);
    else showToast(`${a.id} created locally — DB save failed`);
  }).catch(() => showToast(`${a.id} created locally — offline`));
}

function deleteActivity(id) {
  const idx = activities.findIndex(x => x.id === id);
  if (idx === -1) return;
  const name = activities[idx].name;
  activities.splice(idx, 1);
  closeDetail();
  showToast(`${id} deleted — ${name}`);
  render();

  // Delete from DB
  fetch(`/api/activities/${id}`, { method: 'DELETE' })
    .then(r => { if (!r.ok) showToast('DB delete failed'); })
    .catch(() => {});
}
