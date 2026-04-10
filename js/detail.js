// ─── DETAIL PANEL ───
function openDetail(id) {
  const a = activities.find(x => x.id === id);
  if (!a) return;
  selectedActivity = a;
  const panel = document.getElementById('detailPanel');
  panel.classList.remove('closed');
  // If gantt fullscreen, make detail panel float on top
  if (window._ganttFullscreen) {
    panel.style.zIndex = '1100';
    panel.style.position = 'fixed';
    panel.style.right = '0';
    panel.style.top = '0';
    panel.style.bottom = '0';
    panel.style.boxShadow = '-4px 0 24px rgba(0,0,0,.15)';
  } else {
    panel.style.zIndex = '';
    panel.style.position = '';
    panel.style.right = '';
    panel.style.top = '';
    panel.style.bottom = '';
    panel.style.boxShadow = '';
  }
  document.getElementById('detailTitle').textContent = a.name;
  const inner = document.getElementById('detailInner');

  const _id = esc(a.id);
  const _st = (v, opts) => opts.map(o => `<option ${a[v]===o?'selected':''}>${o}</option>`).join('');

  let html = `
    <div class="detail-progress-update">
      <span style="font-size:12px;font-weight:500;">Progress</span>
      <input type="range" class="progress-slider" min="0" max="100" value="${parseInt(a.pct)}" oninput="document.getElementById('progressVal').textContent=this.value+'%'" onchange="quickUpdate('${_id}','pct',parseInt(this.value))">
      <span class="progress-val" id="progressVal">${parseInt(a.pct)}%</span>
    </div>
    <div class="detail-section">
      <div class="detail-section-title">Activity Summary</div>
      <div class="detail-field"><div class="detail-label">Activity Name</div><input class="form-input" value="${esc(a.name)}" onchange="updateField('${_id}','name',this.value)" style="font-size:13px;font-weight:600;"></div>
      <div class="detail-row">
        <div class="detail-field"><div class="detail-label">ID</div><div class="detail-value" style="font-family:var(--font-mono);font-size:12px;">${_id}</div></div>
        <div class="detail-field"><div class="detail-label">Status</div><select class="form-select" onchange="quickUpdate('${_id}','status',this.value)" style="font-size:12px;">${_st('status',['Not Started','In Progress','Complete','Delayed','Blocked','Ready to Start'])}</select></div>
      </div>
      <div class="detail-row">
        <div class="detail-field"><div class="detail-label">Priority</div><select class="form-select" onchange="updateField('${_id}','priority',this.value)" style="font-size:12px;">${_st('priority',['Critical','High','Normal','Low'])}</select></div>
        <div class="detail-field"><div class="detail-label">Phase</div><select class="form-select" onchange="updateField('${_id}','phase',this.value)" style="font-size:12px;">${['Sitework','Foundation','Structure','Rough-In','Close-In','Finishes','Punch / Closeout','Turnover'].map(o => `<option ${a.phase===o?'selected':''}>${o}</option>`).join('')}</select></div>
      </div>
    </div>
    <div class="detail-section">
      <div class="detail-section-title">Schedule</div>
      <div class="detail-row">
        <div class="detail-field"><div class="detail-label">Start Date</div><input class="form-input" type="date" value="${isoDate(a.start)}" onchange="updateField('${_id}','start',this.value);updateField('${_id}','duration',Math.max(1,diffDays(this.value,activities.find(x=>x.id==='${_id}').finish)))" style="font-size:12px;"></div>
        <div class="detail-field"><div class="detail-label">Finish Date</div><input class="form-input" type="date" value="${isoDate(a.finish)}" onchange="updateField('${_id}','finish',this.value);updateField('${_id}','duration',Math.max(1,diffDays(activities.find(x=>x.id==='${_id}').start,this.value)))" style="font-size:12px;"></div>
      </div>
      <div class="detail-row">
        <div class="detail-field"><div class="detail-label">Duration</div><div class="detail-value">${parseInt(a.duration)} days</div></div>
        <div class="detail-field"><div class="detail-label">% Complete</div><input class="form-input" type="number" min="0" max="100" value="${parseInt(a.pct)}" onchange="quickUpdate('${_id}','pct',parseInt(this.value))" style="font-size:12px;width:70px;"></div>
      </div>
      ${isOverdue(a) ? `<div style="color:var(--red);font-size:12px;font-weight:600;margin-top:4px;">&#9888; Overdue by ${diffDays(a.finish, TODAY)} days</div>` : ''}
    </div>
    <div class="detail-section">
      <div class="detail-section-title">Location &amp; Trade</div>
      <div class="detail-row">
        <div class="detail-field"><div class="detail-label">Trade</div><select class="form-select" onchange="updateField('${_id}','trade',this.value)" style="font-size:12px;">${[...new Set(activities.map(x=>x.trade).filter(Boolean))].sort().map(t => `<option ${a.trade===t?'selected':''}>${esc(t)}</option>`).join('')}</select></div>
        <div class="detail-field"><div class="detail-label">Subcontractor</div><input class="form-input" value="${esc(a.sub)}" onchange="updateField('${_id}','sub',this.value)" style="font-size:12px;"></div>
      </div>
      <div class="detail-row">
        <div class="detail-field"><div class="detail-label">Area</div><select class="form-select" onchange="updateField('${_id}','area',this.value)" style="font-size:12px;">${[...new Set(activities.map(x=>x.area).filter(Boolean))].sort().map(o => `<option ${a.area===o?'selected':''}>${esc(o)}</option>`).join('')}</select></div>
        <div class="detail-field"><div class="detail-label">Floor</div><select class="form-select" onchange="updateField('${_id}','floor',this.value)" style="font-size:12px;">${['', ...new Set(activities.map(x=>x.floor).filter(Boolean))].map(o => `<option ${a.floor===o?'selected':''}>${esc(o) || '(none)'}</option>`).join('')}</select></div>
      </div>
      <div class="detail-row" style="margin-top:6px;">
        <div class="detail-field"><div class="detail-label">Milestone</div><select class="form-select" onchange="updateField('${_id}','milestone',this.value==='Yes')" style="font-size:12px;"><option ${a.milestone?'selected':''}>Yes</option><option ${!a.milestone?'selected':''}>No</option></select></div>
        <div class="detail-field"><div class="detail-label">Lookahead</div><select class="form-select" onchange="updateField('${_id}','lookahead',this.value==='Yes')" style="font-size:12px;"><option ${a.lookahead?'selected':''}>Yes</option><option ${!a.lookahead?'selected':''}>No</option></select></div>
      </div>
    </div>
    ${a.blocker ? `<div class="detail-section"><div class="detail-section-title">Constraint / Blocker</div><div class="detail-field"><div class="detail-value"><span class="blocker-tag">${esc(a.blocker)}</span></div></div></div>` : ''}
    ${a.predecessors && a.predecessors.length ? `<div class="detail-section"><div class="detail-section-title">Predecessors</div>${a.predecessors.map(p => { const pa = activities.find(x=>x.id===p); return pa ? `<div class="detail-linked-item" data-id="${esc(p)}"><span class="link-type">PRED</span>${esc(pa.name)} (${esc(pa.status)})</div>` : ''; }).join('')}</div>` : ''}
    ${a.successors && a.successors.length ? `<div class="detail-section"><div class="detail-section-title">Successors</div>${a.successors.map(s => { const sa = activities.find(x=>x.id===s); return sa ? `<div class="detail-linked-item" data-id="${esc(s)}"><span class="link-type">SUCC</span>${esc(sa.name)} (${esc(sa.status)})</div>` : ''; }).join('')}</div>` : ''}
    <div class="detail-section">
      <div class="detail-section-title">Linked Items (RFIs, Submittals, Inspections)</div>
      ${a.linked && a.linked.length ? a.linked.map((l,i) => `<div class="detail-linked-item" style="justify-content:space-between;"><div><span class="link-type">${esc(l.type)}</span>${esc(l.ref)}</div><button class="btn-icon" style="font-size:10px;color:var(--red);" onclick="event.stopPropagation();removeLinkedItem('${esc(a.id)}',${i})">&#10007;</button></div>`).join('') : '<div style="font-size:12px;color:var(--text-tertiary);margin-bottom:6px;">No linked items.</div>'}
      <div style="display:flex;gap:4px;margin-top:6px;">
        <select class="form-select" id="newLinkedType" style="font-size:11px;width:auto;min-width:100px;">
          <option>RFI</option><option>Submittal</option><option>Inspection</option><option>Procurement</option><option>Permit</option><option>Punch</option><option>CO</option>
        </select>
        <input class="form-input" id="newLinkedRef" placeholder="Reference (e.g. RFI-087)" style="font-size:11px;flex:1;">
        <button class="btn-secondary" style="font-size:11px;" onclick="addLinkedItem('${esc(a.id)}')">Add</button>
      </div>
    </div>
    <div class="detail-section">
      <div class="detail-section-title">Notes &amp; Updates</div>
      ${a.notes ? `<div class="detail-note"><div class="note-meta">Field note &middot; ${fmt(TODAY)}</div><div class="note-text">${esc(a.notes)}</div></div>` : '<div style="font-size:12px;color:var(--text-tertiary);">No notes yet.</div>'}
      <div style="margin-top:8px;">
        <textarea class="form-textarea" id="newNote" placeholder="Add a field note or update&hellip;" style="font-size:12px;min-height:48px;"></textarea>
        <button class="btn-secondary" style="margin-top:4px;" onclick="addNote('${esc(a.id)}')">Add Note</button>
      </div>
    </div>
    <div class="detail-section">
      <div class="detail-section-title">Quick Field Updates</div>
      <div style="display:flex;flex-wrap:wrap;gap:6px;">
        <button class="quick-btn" onclick="quickUpdate('${esc(a.id)}','status','In Progress')">&#9654; Mark In Progress</button>
        <button class="quick-btn" onclick="quickUpdate('${esc(a.id)}','status','Complete')">&#10003; Mark Complete</button>
        <button class="quick-btn danger" onclick="quickUpdate('${esc(a.id)}','status','Delayed')">&#9888; Mark Delayed</button>
        <button class="quick-btn danger" onclick="quickUpdate('${esc(a.id)}','status','Blocked')">&#10007; Mark Blocked</button>
        <button class="quick-btn" onclick="quickUpdate('${esc(a.id)}','pct',25)">25%</button>
        <button class="quick-btn" onclick="quickUpdate('${esc(a.id)}','pct',50)">50%</button>
        <button class="quick-btn" onclick="quickUpdate('${esc(a.id)}','pct',75)">75%</button>
        <button class="quick-btn" onclick="quickUpdate('${esc(a.id)}','pct',100)">100%</button>
      </div>
    </div>
    <div class="detail-section">
      <div class="detail-section-title">Assign Blocker</div>
      <select class="form-select" onchange="quickUpdate('${esc(a.id)}','blocker',this.value)" style="font-size:12px;">
        <option value="" ${!a.blocker?'selected':''}>None</option>
        <option ${a.blocker==='Predecessor not complete'?'selected':''}>Predecessor not complete</option>
        <option ${a.blocker==='Material not on site'?'selected':''}>Material not on site</option>
        <option ${a.blocker==='RFI pending'?'selected':''}>RFI pending</option>
        <option ${a.blocker==='Submittal pending'?'selected':''}>Submittal pending</option>
        <option ${a.blocker==='Inspection required'?'selected':''}>Inspection required</option>
        <option ${a.blocker==='Permit required'?'selected':''}>Permit required</option>
        <option ${a.blocker==='Owner decision pending'?'selected':''}>Owner decision pending</option>
        <option ${a.blocker==='Weather delay'?'selected':''}>Weather delay</option>
        <option ${a.blocker==='Manpower shortage'?'selected':''}>Manpower shortage</option>
        <option ${a.blocker==='Design clarification'?'selected':''}>Design clarification</option>
      </select>
    </div>
    <div class="detail-section">
      <div class="detail-section-title">Attachments</div>
      <div id="attachmentList" style="margin-bottom:8px;">
        ${(a.attachments && a.attachments.length) ? a.attachments.map((att,i) => `<div style="font-size:12px;margin-bottom:4px;">&#128206; <a href="${esc(att.url)}" target="_blank">${esc(att.name)}</a> <button class="btn-icon" style="font-size:10px;" onclick="removeAttachment('${esc(a.id)}',${i})">&#10007;</button></div>`).join('') : '<div style="font-size:12px;color:var(--text-tertiary);">No attachments yet.</div>'}
      </div>
      <input type="file" id="attachmentInput" multiple style="font-size:12px;" onchange="handleAttachment('${esc(a.id)}',this)">
    </div>
    <div class="detail-section">
      <div class="detail-section-title">Export / Import</div>
      <div style="display:flex;flex-wrap:wrap;gap:6px;">
        <button class="quick-btn" onclick="exportJSON()">&#128190; Export JSON</button>
        <button class="quick-btn" onclick="exportCSV()">&#128196; Export CSV</button>
        <button class="quick-btn" onclick="document.getElementById('importInput').click()">&#128194; Import JSON</button>
      </div>
    </div>
    <div class="detail-section" style="border-top:2px solid var(--red-light);margin-top:8px;">
      <div class="detail-section-title" style="color:var(--red);">Danger Zone</div>
      <button class="quick-btn danger" onclick="if(confirm('Delete ${esc(a.name)}?'))deleteActivity('${esc(a.id)}')">&#128465; Delete Activity</button>
    </div>
  `;
  inner.innerHTML = html;

  // Detail linked item clicks
  inner.querySelectorAll('.detail-linked-item[data-id]').forEach(el => {
    el.addEventListener('click', () => openDetail(el.dataset.id));
  });
}

// ─── UPDATE ANY FIELD (generic inline edit) ───
function updateField(id, field, value) {
  const a = activities.find(x => x.id === id);
  if (!a) return;
  a[field] = value;
  // Update title if name changed
  if (field === 'name') {
    const titleEl = document.getElementById('detailTitle');
    if (titleEl) titleEl.textContent = value;
  }
  debouncedSave(id);
}

function closeDetail() {
  document.getElementById('detailPanel').classList.add('closed');
  selectedActivity = null;
}

// ─── QUICK UPDATES (Fix #7: with undo) ───
function quickUpdate(id, field, value) {
  const a = activities.find(x => x.id === id);
  if (!a) return;

  // Save old values for undo
  const oldPct = a.pct;
  const oldStatus = a.status;
  const oldBlocker = a.blocker;

  if (field === 'pct') {
    a.pct = Math.min(100, Math.max(0, parseInt(value)));
    if (a.pct === 100) a.status = 'Complete';
    else if (a.pct > 0 && a.status === 'Not Started') a.status = 'In Progress';
  } else if (field === 'status') {
    a.status = value;
    if (value === 'Complete') a.pct = 100;
    if (value === 'In Progress' && a.pct === 0) a.pct = 5;
  } else if (field === 'blocker') {
    a.blocker = value;
    if (value && a.status !== 'Delayed') a.status = 'Blocked';
    if (!value && a.status === 'Blocked') a.status = a.pct > 0 ? 'In Progress' : 'Not Started';
  }

  // Undo toast
  showUndoToast(`${a.id} updated \u2014 ${field}: ${value}`, function() {
    const act = activities.find(x => x.id === id);
    if (act) {
      act.pct = oldPct;
      act.status = oldStatus;
      act.blocker = oldBlocker;
      render();
      if (selectedActivity && selectedActivity.id === id) openDetail(id);
      showToast('Undo complete');
    }
  });

  render();
  if (selectedActivity && selectedActivity.id === id) openDetail(id);
  debouncedSave(id); // persist single activity to backend
}

function addNote(id) {
  const noteEl = document.getElementById('newNote');
  const note = noteEl?.value?.trim();
  if (!note) return;
  const a = activities.find(x => x.id === id);
  if (!a) return;

  // Save to activity_notes table in DB
  fetch('/api/notes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ activity_id: id, note: note, author: 'Field' })
  }).then(r => {
    if (r.ok) showToast('Note saved to database');
    else showToast('Note saved locally only');
  }).catch(() => {});

  // Also keep in local activity object
  a.notes = note + (a.notes ? '\n\n' + a.notes : '');
  openDetail(id);
  debouncedSave(id);
}

// ─── LINKED ITEMS CRUD ───
function addLinkedItem(activityId) {
  const typeEl = document.getElementById('newLinkedType');
  const refEl = document.getElementById('newLinkedRef');
  if (!typeEl || !refEl) return;
  const itemType = typeEl.value;
  const reference = refEl.value.trim();
  if (!reference) { showToast('Reference required'); return; }

  const a = activities.find(x => x.id === activityId);
  if (!a) return;
  if (!a.linked) a.linked = [];
  a.linked.push({ type: itemType, ref: reference });

  // Save to DB
  fetch('/api/linked-items', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ activity_id: activityId, item_type: itemType, reference: reference })
  }).then(r => {
    if (r.ok) showToast(`${itemType} added`);
    else showToast('Saved locally only');
  }).catch(() => {});

  openDetail(activityId);
}

function removeLinkedItem(activityId, idx) {
  const a = activities.find(x => x.id === activityId);
  if (!a || !a.linked) return;
  const removed = a.linked.splice(idx, 1)[0];
  showToast(`${removed.type} removed`);

  // Reload linked items from DB to get the UUID, then delete
  fetch(`/api/activities/${activityId}/linked-items`)
    .then(r => r.json())
    .then(items => {
      const match = items.find(i => i.item_type === removed.type && i.reference === removed.ref);
      if (match) fetch(`/api/linked-items/${match.id}`, { method: 'DELETE' });
    }).catch(() => {});

  openDetail(activityId);
}

// ─── ATTACHMENTS (Fix #10) ───
function handleAttachment(actId, input) {
  const a = activities.find(x => x.id === actId);
  if (!a || !input.files.length) return;
  if (!a.attachments) a.attachments = [];
  Array.from(input.files).forEach(file => {
    const url = URL.createObjectURL(file);
    a.attachments.push({ name: file.name, url, size: file.size, type: file.type });
  });
  showToast(`${input.files.length} file(s) attached`);
  openDetail(actId);
}

function removeAttachment(actId, idx) {
  const a = activities.find(x => x.id === actId);
  if (!a || !a.attachments) return;
  a.attachments.splice(idx, 1);
  showToast('Attachment removed');
  openDetail(actId);
}

// ─── EXPORT / IMPORT (Fix #6) ───
function exportJSON() {
  const blob = new Blob([JSON.stringify(activities, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `schedule-export-${isoDate(TODAY)}.json`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('Exported as JSON');
}

function exportCSV() {
  const headers = ['ID','Name','Trade','Subcontractor','Area','Floor','Phase','Start','Finish','Duration','Status','% Complete','Priority','Blocker','Milestone','Notes'];
  const rows = activities.map(a => [
    a.id, `"${(a.name||'').replace(/"/g,'""')}"`, `"${a.trade}"`, `"${a.sub}"`, `"${a.area}"`, a.floor, a.phase,
    isoDate(a.start), isoDate(a.finish), a.duration, a.status, a.pct, a.priority,
    `"${(a.blocker||'').replace(/"/g,'""')}"`, a.milestone ? 'Yes' : 'No', `"${(a.notes||'').replace(/"/g,'""').replace(/\n/g,' ')}"`
  ]);
  const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `schedule-export-${isoDate(TODAY)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('Exported as CSV');
}

function importJSON(input) {
  const file = input.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const data = JSON.parse(e.target.result);
      if (!Array.isArray(data)) { showToast('Invalid file: expected array'); return; }
      activities.length = 0;
      data.forEach(a => activities.push(a));
      showToast(`Imported ${data.length} activities — saving to database...`);
      render();
      apiSaveAll().then(ok => {
        if (ok) showToast('Import saved to database');
        else showToast('Import loaded locally — DB save failed');
      });
    } catch (err) {
      showToast('Import failed: invalid JSON');
    }
  };
  reader.readAsText(file);
}
