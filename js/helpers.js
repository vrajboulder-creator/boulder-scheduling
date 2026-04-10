// ─── SECTION STATE (filters + view mode per section) ───
let _sectionState = {};
let searchQuery = '';

function _getState(sec) {
  if (!_sectionState[sec]) _sectionState[sec] = { mode: 'list', trade: '', area: '', status: '', phase: '', floor: '' };
  return _sectionState[sec];
}
function getViewMode(sec) { return _getState(sec).mode; }
function setViewMode(sec, mode) { _getState(sec).mode = mode; render(); }
function setFilter(sec, key, val) { _getState(sec)[key] = val; render(); }
function clearFilters(sec) {
  _sectionState[sec] = { mode: _getState(sec).mode, trade: '', area: '', status: '', phase: '', floor: '' };
  searchQuery = '';
  const s = document.getElementById('globalSearch');
  if (s) s.value = '';
  render();
}

// ─── DATE HELPERS ───
const TODAY = new Date(); // Fix #4: use real current date
TODAY.setHours(0, 0, 0, 0);
const DAY_MS = 86400000;
const fmt = d => { const dd = new Date(d); return dd.toLocaleDateString('en-US', {month:'short', day:'numeric'}); };
const fmtFull = d => { const dd = new Date(d); return dd.toLocaleDateString('en-US', {weekday:'short', month:'short', day:'numeric', year:'numeric'}); };
const addDays = (d, n) => new Date(new Date(d).getTime() + n * DAY_MS);
const diffDays = (a, b) => Math.round((new Date(b) - new Date(a)) / DAY_MS);
const isoDate = d => new Date(d).toISOString().slice(0,10);
const isOverdue = a => a.status !== 'Complete' && new Date(a.finish) < TODAY;
const isThisWeek = d => { const s = addDays(TODAY, -TODAY.getDay()); const e = addDays(s,6); return new Date(d) >= s && new Date(d) <= e; };
const isInRange = (d, days) => { const dt = new Date(d); return dt >= TODAY && dt <= addDays(TODAY, days); };

// ─── XSS SANITIZER (Fix #3) ───
function esc(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ─── COMPUTED HELPERS ───
function getKPIs() {
  const due_today = activities.filter(a => isoDate(a.finish) === isoDate(TODAY) && a.status !== 'Complete').length;
  const starting_week = activities.filter(a => isThisWeek(a.start) && a.status !== 'Complete').length;
  const delayed = activities.filter(a => a.status === 'Delayed').length;
  const blocked = activities.filter(a => a.status === 'Blocked' || a.blocker).length;
  const overdue = activities.filter(a => isOverdue(a)).length;
  const critical = activities.filter(a => a.priority === 'Critical' && a.status !== 'Complete').length;
  const in_progress = activities.filter(a => a.status === 'In Progress').length;
  const ready = activities.filter(a => a.status === 'Ready to Start' || (a.status === 'Not Started' && !a.blocker && new Date(a.start) <= addDays(TODAY, 7))).length;
  const inspections = activities.filter(a => a.linked && a.linked.some(l => l.type === 'Inspection') && a.status !== 'Complete').length;
  const procurement = activities.filter(a => a.linked && a.linked.some(l => l.type === 'Procurement') && a.status !== 'Complete').length;
  return { due_today, starting_week, delayed, blocked, overdue, critical, in_progress, ready, inspections, procurement };
}

// ─── FILTER HELPERS (section-aware) ───
function applyFilters(items, section) {
  const st = section ? _getState(section) : { trade: '', area: '', status: '', phase: '', floor: '' };
  return items.filter(a => {
    if (st.trade && a.trade !== st.trade) return false;
    if (st.area && a.area !== st.area) return false;
    if (st.status && a.status !== st.status) return false;
    if (st.phase && a.phase !== st.phase) return false;
    if (st.floor && a.floor !== st.floor) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return a.name.toLowerCase().includes(q) || a.trade.toLowerCase().includes(q) || (a.sub||'').toLowerCase().includes(q) || a.area.toLowerCase().includes(q) || a.id.toLowerCase().includes(q) || (a.phase||'').toLowerCase().includes(q) || (a.notes||'').toLowerCase().includes(q);
    }
    return true;
  });
}

// ─── TOAST ───
function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2500);
}

// ─── SEARCH DROPDOWN ───
function showSearchDropdown(query) {
  const dropdown = document.getElementById('searchDropdown');
  if (!dropdown) return;
  if (!query || query.length < 2) {
    dropdown.classList.remove('open');
    return;
  }
  const q = query.toLowerCase();
  const matches = activities.filter(a =>
    a.name.toLowerCase().includes(q) ||
    a.trade.toLowerCase().includes(q) ||
    a.sub.toLowerCase().includes(q) ||
    a.area.toLowerCase().includes(q) ||
    a.id.toLowerCase().includes(q) ||
    (a.notes && a.notes.toLowerCase().includes(q)) ||
    (a.blocker && a.blocker.toLowerCase().includes(q))
  ).slice(0, 8);

  if (!matches.length) {
    dropdown.innerHTML = '<div class="search-no-results">No results for "' + esc(query) + '"</div>';
    dropdown.classList.add('open');
    return;
  }

  const highlightMatch = (text, q) => {
    const idx = text.toLowerCase().indexOf(q.toLowerCase());
    if (idx === -1) return esc(text);
    return esc(text.slice(0, idx)) + '<mark>' + esc(text.slice(idx, idx + q.length)) + '</mark>' + esc(text.slice(idx + q.length));
  };

  dropdown.innerHTML = matches.map(a => `
    <div class="search-result-item" data-id="${esc(a.id)}">
      <span class="priority-dot ${esc(a.priority).toLowerCase()}"></span>
      <span class="sr-name">${highlightMatch(a.name, q)}</span>
      <span class="sr-meta">${esc(a.trade)} &middot; ${esc(a.status)}</span>
    </div>
  `).join('');

  dropdown.querySelectorAll('.search-result-item').forEach(el => {
    el.addEventListener('click', () => {
      dropdown.classList.remove('open');
      openDetail(el.dataset.id);
    });
  });

  dropdown.classList.add('open');
}

// ─── UNDO SYSTEM (Fix #7) ───
let _undoStack = [];

function pushUndo(activityId, field, oldValue) {
  _undoStack.push({ activityId, field, oldValue, timestamp: Date.now() });
  // Keep max 50 undo entries
  if (_undoStack.length > 50) _undoStack.shift();
}

function popUndo() {
  return _undoStack.pop();
}

function showUndoToast(msg, undoCallback) {
  const t = document.getElementById('toast');
  t.innerHTML = `${esc(msg)} <button onclick="event.stopPropagation();this.parentElement.classList.remove('show');(${undoCallback.toString()})();" style="margin-left:10px;background:#fff;color:#1a1d23;border:none;border-radius:4px;padding:3px 10px;font-weight:600;cursor:pointer;font-size:12px;">Undo</button>`;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 5000);
}

// ─── SETTINGS PERSISTENCE (localStorage) ───
function loadSettings() {
  try { return JSON.parse(localStorage.getItem('boulder_settings') || '{}'); }
  catch (e) { return {}; }
}

function saveSettings(data) {
  const current = loadSettings();
  const merged = { ...current, ...data, lastSync: Date.now() };
  localStorage.setItem('boulder_settings', JSON.stringify(merged));
  return merged;
}

function saveWeatherSettings() {
  const lat = parseFloat(document.getElementById('settingsLat')?.value);
  const lon = parseFloat(document.getElementById('settingsLon')?.value);
  const city = document.getElementById('settingsCity')?.value || '';
  const state = document.getElementById('settingsState')?.value || '';
  const tempUnit = document.getElementById('settingsTempUnit')?.value || 'fahrenheit';
  const windUnit = document.getElementById('settingsWindUnit')?.value || 'mph';

  if (isNaN(lat) || isNaN(lon)) { showToast('Enter valid latitude/longitude'); return; }

  // Update project coordinates
  const proj = PROJECTS[currentProject];
  if (proj) { proj.lat = lat; proj.lon = lon; proj.weatherLoaded = false; proj.weatherDetail = null; }

  saveSettings({ city, state, tempUnit, windUnit, lat, lon });
  showToast('Weather settings saved — fetching new data...');
  fetchWeather(currentProject);
}

function saveProjectSettings() {
  const projName = document.getElementById('settingsProjName')?.value || '';
  const defaultView = document.getElementById('settingsDefaultView')?.value || 'dashboard';
  const workWeek = document.getElementById('settingsWorkWeek')?.value || 'mon-fri';
  const timezone = document.getElementById('settingsTimezone')?.value || 'America/Chicago';

  const proj = PROJECTS[currentProject];
  if (proj && projName) proj.name = projName;

  saveSettings({ defaultView, workWeek, timezone });
  showToast('Project settings saved');
  render();
}

async function switchProjectFromSettings(key) {
  currentProject = key;
  const proj = PROJECTS[key];
  const sel = document.getElementById('projectSelect');
  if (sel) { const keys = Object.keys(PROJECTS); sel.selectedIndex = keys.indexOf(key); }
  fetchWeather(key);

  try {
    const pResp = await fetch(`/api/projects/${key}`);
    if (pResp.ok) {
      const pData = await pResp.json();
      _currentProjectId = pData.id;
      const loaded = await apiLoadAll(pData.id);
      if (loaded) {
        showToast(`${proj.name} \u2014 ${activities.length} activities`);
      } else {
        // No activities for this project — show empty
        activities.length = 0;
        showToast(`${proj.name} \u2014 no activities yet`);
      }
    } else {
      activities.length = 0;
      showToast(`${proj.name} \u2014 project not in database`);
    }
  } catch (e) {
    showToast('Load failed');
  }
  if (typeof updateProjectDropdown === 'function') updateProjectDropdown();
  render();
}

async function lookupCoordinates() {
  const city = document.getElementById('settingsCity')?.value || '';
  const state = document.getElementById('settingsState')?.value || '';
  if (!city) { showToast('Enter a city name first'); return; }

  try {
    showToast('Looking up coordinates...');
    const q = encodeURIComponent(`${city}, ${state}`);
    const resp = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${q}&count=1&language=en&format=json`);
    const data = await resp.json();
    if (data.results && data.results.length) {
      const r = data.results[0];
      document.getElementById('settingsLat').value = r.latitude.toFixed(2);
      document.getElementById('settingsLon').value = r.longitude.toFixed(2);
      showToast(`Found: ${r.name}, ${r.admin1 || ''} (${r.latitude.toFixed(2)}, ${r.longitude.toFixed(2)})`);
    } else {
      showToast('Location not found — try different spelling');
    }
  } catch (e) {
    showToast('Geocoding failed: ' + e.message);
  }
}

async function lookupNewProjCoords() {
  const loc = document.getElementById('newProjLocation')?.value || '';
  if (!loc) { showToast('Enter location first'); return; }
  try {
    const q = encodeURIComponent(loc);
    const resp = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${q}&count=1&language=en&format=json`);
    const data = await resp.json();
    if (data.results && data.results.length) {
      const r = data.results[0];
      document.getElementById('newProjLat').value = r.latitude.toFixed(2);
      document.getElementById('newProjLon').value = r.longitude.toFixed(2);
      showToast(`Found: ${r.name} (${r.latitude.toFixed(2)}, ${r.longitude.toFixed(2)})`);
    } else {
      showToast('Location not found');
    }
  } catch (e) { showToast('Lookup failed'); }
}

// ─── PROJECT CRUD ───
async function createProject() {
  const name = document.getElementById('newProjName')?.value?.trim();
  const code = document.getElementById('newProjCode')?.value?.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-');
  const location = document.getElementById('newProjLocation')?.value?.trim() || '';
  const lat = parseFloat(document.getElementById('newProjLat')?.value) || 0;
  const lon = parseFloat(document.getElementById('newProjLon')?.value) || 0;
  const startDate = document.getElementById('newProjStart')?.value || null;
  const endDate = document.getElementById('newProjEnd')?.value || null;

  if (!name) { showToast('Project name required'); return; }
  if (!code || code.length < 3) { showToast('Code required (min 3 chars)'); return; }
  if (PROJECTS[code]) { showToast('Code already exists'); return; }

  try {
    const resp = await fetch('/api/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, code, location, weather_info: '', start_date: startDate, target_completion: endDate })
    });
    if (!resp.ok) { const e = await resp.json(); showToast('Error: ' + e.error); return; }
    await resp.json();

    // Add to local PROJECTS
    PROJECTS[code] = { name, lat, lon, weather: 'Loading...', weatherLoaded: false };
    showToast(`Project "${name}" created`);
    if (typeof updateProjectDropdown === 'function') updateProjectDropdown();
    render();
  } catch (e) {
    showToast('Create failed');
  }
}

async function deleteProject(code) {
  try {
    // Get project UUID
    const pResp = await fetch(`/api/projects/${code}`);
    if (!pResp.ok) { showToast('Project not found'); return; }
    const pData = await pResp.json();

    const delResp = await fetch(`/api/projects/${pData.id}`, { method: 'DELETE' });
    if (!delResp.ok) { showToast('Delete failed'); return; }

    // Remove from local
    delete PROJECTS[code];

    // If deleted active project, switch to first available
    if (currentProject === code) {
      const remaining = Object.keys(PROJECTS);
      if (remaining.length) {
        await switchProjectFromSettings(remaining[0]);
      } else {
        currentProject = '';
        activities.length = 0;
      }
    }

    showToast(`Project deleted`);
    if (typeof updateProjectDropdown === 'function') updateProjectDropdown();
    render();
  } catch (e) {
    showToast('Delete failed');
  }
}

function editProjectModal(code) {
  const p = PROJECTS[code];
  if (!p) return;

  // Reuse fields in settings — populate and scroll
  const nameEl = document.getElementById('settingsProjName');
  if (nameEl) nameEl.value = p.name;

  // Show inline edit toast
  showToast(`Editing ${p.name} — update fields in Project Configuration below and save`);

  // Scroll to project config section
  const configSection = document.querySelectorAll('.settings-card')[2];
  if (configSection) configSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
}
