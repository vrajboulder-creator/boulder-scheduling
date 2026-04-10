// ─── API PERSISTENCE LAYER ───
// Syncs frontend state with Supabase backend.
// Maps DB column names (start_date/finish_date) ↔ frontend names (start/finish).

const API_BASE = '/api/activities';
let _currentProjectId = null; // set after first load from DB

// DB → Frontend field mapping
function dbToFrontend(row) {
  return {
    id: row.id,
    name: row.name,
    trade: row.trade || 'General / GC',
    sub: row.sub || '',
    area: row.area || 'Tower A',
    floor: row.floor || '',
    phase: row.phase || '',
    start: row.start_date ? new Date(row.start_date) : null,
    finish: row.finish_date ? new Date(row.finish_date) : null,
    duration: row.duration || 1,
    hasDate: !!(row.start_date || row.finish_date),
    status: row.status || 'Not Started',
    pct: row.pct || 0,
    priority: row.priority || 'Normal',
    blocker: row.blocker || '',
    milestone: row.milestone || false,
    lookahead: row.lookahead || false,
    notes: row.notes || '',
    predecessors: row._predecessors || [],
    successors: row._successors || [],
    linked: row._linked || [],
    attachments: row._attachments || [],
    project_id: row.project_id || null
  };
}

// Frontend → DB field mapping
function frontendToDb(a) {
  return {
    id: a.id,
    project_id: a.project_id || null,
    name: a.name,
    trade: a.trade,
    sub: a.sub,
    area: a.area,
    floor: a.floor,
    phase: a.phase,
    start_date: a.start instanceof Date ? a.start.toISOString().slice(0, 10) : a.start,
    finish_date: a.finish instanceof Date ? a.finish.toISOString().slice(0, 10) : a.finish,
    duration: a.duration,
    status: a.status,
    pct: a.pct,
    priority: a.priority,
    blocker: a.blocker || '',
    milestone: a.milestone || false,
    lookahead: a.lookahead || false,
    notes: a.notes || ''
  };
}

// ─── LOAD ALL FROM SUPABASE (3 bulk fetches, fast) ───
async function apiLoadAll(projectId) {
  try {
    const actUrl = projectId ? `${API_BASE}?project_id=${projectId}` : API_BASE;
    const [actResp, linksResp, itemsResp] = await Promise.all([
      fetch(actUrl),
      fetch('/api/activity-links'),
      fetch('/api/linked-items')
    ]);

    if (!actResp.ok) throw new Error(actResp.statusText);
    const rows = await actResp.json();
    if (!Array.isArray(rows) || rows.length === 0) return false;

    const allLinks = linksResp.ok ? await linksResp.json() : [];
    const allItems = itemsResp.ok ? await itemsResp.json() : [];

    // Build predecessor/successor maps from bulk links
    const predMap = {};
    const succMap = {};
    allLinks.forEach(l => {
      if (!succMap[l.predecessor_id]) succMap[l.predecessor_id] = [];
      succMap[l.predecessor_id].push(l.successor_id);
      if (!predMap[l.successor_id]) predMap[l.successor_id] = [];
      predMap[l.successor_id].push(l.predecessor_id);
    });

    // Build linked items map from bulk items
    const linkedByActivity = {};
    allItems.forEach(i => {
      if (!linkedByActivity[i.activity_id]) linkedByActivity[i.activity_id] = [];
      linkedByActivity[i.activity_id].push({ type: i.item_type, ref: i.reference });
    });

    // Map to frontend format
    const mapped = rows.map(row => {
      row._predecessors = predMap[row.id] || [];
      row._successors = succMap[row.id] || [];
      row._linked = linkedByActivity[row.id] || [];
      return dbToFrontend(row);
    });

    activities.length = 0;
    mapped.forEach(a => activities.push(a));

    // Store project_id from first activity
    if (activities.length && activities[0].project_id) {
      _currentProjectId = activities[0].project_id;
    }

    // Update nextId
    const maxNum = activities.reduce((max, a) => {
      const num = parseInt(a.id.replace('ACT-', ''));
      return num > max ? num : max;
    }, 0);
    nextId = maxNum + 1;

    return true;
  } catch (e) {
    console.warn('API load failed:', e.message);
    return false;
  }
}

// ─── SAVE ALL TO SUPABASE ───
async function apiSaveAll() {
  try {
    const dbRows = activities.map(frontendToDb);
    const resp = await fetch(API_BASE + '/bulk/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dbRows)
    });
    if (!resp.ok) throw new Error(resp.statusText);
    return true;
  } catch (e) {
    console.warn('API save failed:', e.message);
    return false;
  }
}

// ─── SAVE SINGLE ACTIVITY ───
async function apiSaveOne(id) {
  try {
    const a = activities.find(x => x.id === id);
    if (!a) return false;
    const resp = await fetch(`${API_BASE}/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(frontendToDb(a))
    });
    if (!resp.ok) throw new Error(resp.statusText);
    return true;
  } catch (e) {
    console.warn('API save one failed:', e.message);
    return false;
  }
}

// Debounced save — waits 500ms after last change
let _saveTimer = null;
function debouncedSave(activityId) {
  clearTimeout(_saveTimer);
  if (activityId) {
    _saveTimer = setTimeout(() => apiSaveOne(activityId), 300);
  } else {
    _saveTimer = setTimeout(() => apiSaveAll(), 500);
  }
}
