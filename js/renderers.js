// ─── REUSABLE RENDER COMPONENTS ───
function renderStatusBadge(a) {
  const cls = a.status === 'In Progress' ? 'in-progress' : a.status === 'Complete' ? 'complete' : a.status === 'Delayed' ? 'delayed' : a.status === 'Blocked' ? 'blocked' : a.status === 'Ready to Start' ? 'ready' : 'not-started';
  return `<span class="status ${cls}">${esc(a.status)}</span>`;
}

function renderPctBar(pct) {
  const cls = pct >= 75 ? 'high' : pct >= 40 ? 'mid' : 'low';
  return `<div class="pct-bar"><div class="pct-track"><div class="pct-fill ${cls}" style="width:${parseInt(pct)}%"></div></div><span class="pct-text">${parseInt(pct)}%</span></div>`;
}

let _filterBarCounter = 0;
function renderFilterBar(section) {
  const sec = section || ('sec-' + (_filterBarCounter++));
  const st = _getState(sec);
  const mode = st.mode;

  // Dynamic filter options from actual activity data
  const dynTrades = [...new Set(activities.map(a => a.trade).filter(Boolean))].sort();
  const dynAreas = [...new Set(activities.map(a => a.area).filter(Boolean))].sort();
  const dynPhases = [...new Set(activities.map(a => a.phase).filter(Boolean))].sort();
  const dynStatuses = [...new Set(activities.map(a => a.status).filter(Boolean))].sort();
  const dynFloors = [...new Set(activities.map(a => a.floor).filter(Boolean))].sort();

  return `<div class="filter-bar" data-section="${esc(sec)}">
    <select class="filter-trade" onchange="setFilter('${esc(sec)}','trade',this.value)">
      <option value="">All Trades (${dynTrades.length})</option>${dynTrades.map(t => `<option ${st.trade===t?'selected':''}>${esc(t)}</option>`).join('')}
    </select>
    <select class="filter-area" onchange="setFilter('${esc(sec)}','area',this.value)">
      <option value="">All Areas (${dynAreas.length})</option>${dynAreas.map(a => `<option ${st.area===a?'selected':''}>${esc(a)}</option>`).join('')}
    </select>
    <select class="filter-status" onchange="setFilter('${esc(sec)}','status',this.value)">
      <option value="">All Statuses</option>${dynStatuses.map(s => `<option ${st.status===s?'selected':''}>${esc(s)}</option>`).join('')}
    </select>
    ${dynPhases.length > 1 ? `<select onchange="setFilter('${esc(sec)}','phase',this.value)">
      <option value="">All Phases</option>${dynPhases.map(p => `<option ${st.phase===p?'selected':''}>${esc(p)}</option>`).join('')}
    </select>` : ''}
    ${dynFloors.length > 1 ? `<select onchange="setFilter('${esc(sec)}','floor',this.value)">
      <option value="">All Floors</option>${dynFloors.map(f => `<option ${st.floor===f?'selected':''}>${esc(f)}</option>`).join('')}
    </select>` : ''}
    <div class="view-tabs" style="margin-left:auto;">
      <button class="view-tab ${mode==='list'?'active':''}" onclick="setViewMode('${esc(sec)}','list')">&#9776; List</button>
      <button class="view-tab ${mode==='grid'?'active':''}" onclick="setViewMode('${esc(sec)}','grid')">&#9638; Grid</button>
    </div>
    <button class="btn-secondary" onclick="clearFilters('${esc(sec)}')">Clear</button>
  </div>`;
}

function renderItems(items, section) {
  const mode = getViewMode(section || '');
  if (mode === 'grid') {
    let html = '<div class="lookahead-grid">';
    items.forEach(a => { html += renderLookaheadCard(a); });
    html += '</div>';
    return html;
  }
  return renderTable(items);
}

function renderTable(items, compact) {
  if (!items.length) return `<div class="empty-state"><h3>No activities found</h3><p>Adjust filters or add new activities.</p></div>`;
  let html = `<div class="schedule-table-wrap"><div class="table-scroll"><table class="schedule-table"><thead><tr>
    <th>ID</th><th>Activity</th><th>Trade</th>
    <th class="col-hide-mobile">Area</th>
    <th>Start</th><th>Finish</th>
    <th class="col-hide-mobile">Duration</th>
    <th>Status</th><th>Progress</th>
    <th class="col-hide-mobile">Priority</th>
    <th class="col-hide-mobile">Blocker</th>
  </tr></thead><tbody>`;
  items.forEach(a => {
    const overdueCls = isOverdue(a) ? ' overdue' : '';
    html += `<tr class="${overdueCls}" data-id="${esc(a.id)}">
      <td><span class="activity-id">${esc(a.id)}</span></td>
      <td><span class="activity-name">${a.milestone ? '&#9670; ' : ''}${esc(a.name)}</span></td>
      <td><span class="trade-badge">${esc(a.trade)}</span></td>
      <td class="col-hide-mobile">${esc(a.area)}${a.floor ? ' &middot; '+esc(a.floor) : ''}</td>
      <td>${fmt(a.start)}</td>
      <td>${fmt(a.finish)}</td>
      <td class="col-hide-mobile">${parseInt(a.duration)}d</td>
      <td>${renderStatusBadge(a)}</td>
      <td>${renderPctBar(a.pct)}</td>
      <td class="col-hide-mobile"><span class="priority-dot ${esc(a.priority).toLowerCase()}"></span>${esc(a.priority)}</td>
      <td class="col-hide-mobile">${a.blocker ? `<span class="blocker-tag">${esc(a.blocker)}</span>` : '&mdash;'}</td>
    </tr>`;
  });
  html += `</tbody></table></div></div>`;
  return html;
}

function renderLookaheadCard(a) {
  const hasBl = a.blocker || a.status === 'Blocked' || a.status === 'Delayed';
  const cls = hasBl ? 'has-blocker' : (a.status === 'Not Started' && !a.blocker && new Date(a.start) <= addDays(TODAY, 7)) ? 'ready-soon' : '';
  const daysOut = diffDays(TODAY, a.start);
  const daysLabel = daysOut === 0 ? 'Today' : daysOut === 1 ? 'Tomorrow' : daysOut < 0 ? `${Math.abs(daysOut)}d ago` : `In ${daysOut} days`;
  return `<div class="lookahead-card ${cls}" data-id="${esc(a.id)}">
    <div class="la-top"><div><div class="la-name"><span class="priority-dot ${esc(a.priority).toLowerCase()}"></span>${a.milestone ? '&#9670; ' : ''}${esc(a.name)}</div><div class="la-id">${esc(a.id)} &middot; ${esc(a.sub)}</div></div>${renderStatusBadge(a)}</div>
    <div class="la-meta"><span class="la-tag">${esc(a.trade)}</span><span class="la-tag">${esc(a.area)}</span>${a.floor ? `<span class="la-tag">${esc(a.floor)}</span>` : ''}<span class="la-tag">${daysLabel}</span></div>
    <div class="la-dates">${fmt(a.start)} &rarr; ${fmt(a.finish)} &middot; ${parseInt(a.duration)}d &middot; ${parseInt(a.pct)}% complete</div>
    ${a.blocker ? `<div class="la-blocker">&#9888; ${esc(a.blocker)}</div>` : ''}
    ${a.linked && a.linked.length ? a.linked.map(l => `<div style="font-size:10.5px;color:var(--text-secondary);margin-top:2px;">&#128279; ${esc(l.type)}: ${esc(l.ref)}</div>`).join('') : ''}
    <div class="la-actions">
      <button onclick="event.stopPropagation();quickUpdate('${esc(a.id)}','pct',Math.min(100,${parseInt(a.pct)}+25))">+25%</button>
      <button onclick="event.stopPropagation();quickUpdate('${esc(a.id)}','status','In Progress')">&#9654; Start</button>
      <button class="quick-complete" onclick="event.stopPropagation();quickUpdate('${esc(a.id)}','status','Complete')">&#10003; Complete</button>
      <button onclick="event.stopPropagation();quickUpdate('${esc(a.id)}','status','Delayed')" style="color:var(--red);">&#9888; Delay</button>
    </div>
  </div>`;
}

function renderKPIs(k) {
  return `<div class="kpi-row">
    <div class="kpi-card info" data-kpi-filter="today"><div class="kpi-label">Due Today</div><div class="kpi-value">${k.due_today}</div><div class="kpi-sub">${fmt(TODAY)}</div></div>
    <div class="kpi-card info" data-kpi-filter="week"><div class="kpi-label">Starting This Week</div><div class="kpi-value">${k.starting_week}</div></div>
    <div class="kpi-card alert" data-kpi-filter="delayed"><div class="kpi-label">Delayed</div><div class="kpi-value">${k.delayed}</div></div>
    <div class="kpi-card warn" data-kpi-filter="blocked"><div class="kpi-label">Blocked / Constrained</div><div class="kpi-value">${k.blocked}</div></div>
    <div class="kpi-card alert" data-kpi-filter="overdue"><div class="kpi-label">Overdue</div><div class="kpi-value">${k.overdue}</div></div>
    <div class="kpi-card info"><div class="kpi-label">Critical Path</div><div class="kpi-value">${k.critical}</div></div>
    <div class="kpi-card ok" data-kpi-filter="in-progress"><div class="kpi-label">In Progress</div><div class="kpi-value">${k.in_progress}</div></div>
    <div class="kpi-card ok"><div class="kpi-label">Ready to Start</div><div class="kpi-value">${k.ready}</div></div>
    <div class="kpi-card warn"><div class="kpi-label">Inspections Pending</div><div class="kpi-value">${k.inspections}</div></div>
    <div class="kpi-card warn"><div class="kpi-label">Procurement Risks</div><div class="kpi-value">${k.procurement}</div></div>
  </div>`;
}

// ─── VIEW RENDERERS ───
function renderDashboard(k) {
  let html = '';
  const milestones = activities.filter(a => a.milestone).sort((a,b) => new Date(a.finish) - new Date(b.finish));
  html += `<div class="section-header"><div class="section-title">Key Milestones</div><div class="section-count">${milestones.length}</div></div>`;
  html += `<div class="milestone-strip">`;
  milestones.forEach(m => {
    const cls = m.status === 'Complete' ? 'complete' : isOverdue(m) ? 'overdue' : 'upcoming';
    const stLabel = m.status === 'Complete' ? '&#10003; Complete' : isOverdue(m) ? '&#9888; Overdue' : fmt(m.finish);
    html += `<div class="milestone-chip ${cls}" data-id="${esc(m.id)}"><div class="ms-name">${esc(m.name)}</div><div class="ms-date">${fmt(m.start)} &rarr; ${fmt(m.finish)}</div><div class="ms-status">${stLabel}</div></div>`;
  });
  html += `</div>`;
  html += `<div class="scroll-indicator"><div class="scroll-indicator-track"><div class="scroll-indicator-dot" id="msDot"></div></div></div>`;

  const issues = activities.filter(a => a.status === 'Delayed' || a.status === 'Blocked' || (a.blocker && a.status !== 'Complete'));
  if (issues.length) {
    html += `<div class="section-header"><div class="section-title">&#9888; Delays &amp; Blockers</div><div class="section-count">${issues.length}</div></div>`;
    html += renderFilterBar('dash-delays');
    html += renderItems(applyFilters(issues, 'dash-delays'), 'dash-delays');
  }

  const thisWeek = activities.filter(a => (isThisWeek(a.start) || isThisWeek(a.finish)) && a.status !== 'Complete').sort((a,b) => new Date(a.start) - new Date(b.start));
  html += `<div class="section-header"><div class="section-title">This Week's Activities</div><div class="section-count">${thisWeek.length}</div></div>`;
  html += renderFilterBar('dash-week');
  html += renderItems(applyFilters(thisWeek, 'dash-week'), 'dash-week');
  return html;
}

function renderToday() {
  const todayItems = activities.filter(a => {
    const s = parseDate(a.start), f = parseDate(a.finish);
    return s <= TODAY && f >= TODAY && a.status !== 'Complete';
  }).sort((a,b) => a.priority === 'Critical' ? -1 : 1);
  let html = `<div class="section-header"><div class="section-title">Today &mdash; ${fmtFull(TODAY)}</div><div class="section-count">${todayItems.length} active</div></div>`;
  html += renderFilterBar('today');
  html += renderItems(applyFilters(todayItems, 'today'), 'today');
  return html;
}

function renderThisWeek() {
  const items = activities.filter(a => {
    const s = parseDate(a.start), f = parseDate(a.finish);
    const weekStart = addDays(TODAY, -TODAY.getDay());
    const weekEnd = addDays(weekStart, 6);
    return ((s <= weekEnd && f >= weekStart) || isThisWeek(a.start) || isThisWeek(a.finish)) && a.status !== 'Complete';
  }).sort((a,b) => new Date(a.start) - new Date(b.start));
  let html = `<div class="section-header"><div class="section-title">This Week</div><div class="section-count">${items.length}</div></div>`;
  html += renderFilterBar('thisweek');
  html += renderItems(applyFilters(items, 'thisweek'), 'thisweek');
  return html;
}

function renderMaster() {
  let sorted = [...activities].sort((a,b) => new Date(a.start) - new Date(b.start));
  let html = `<div class="section-header"><div class="section-title">Master Schedule</div><div class="section-count">${sorted.length} activities</div></div>`;
  html += renderFilterBar('master');
  html += renderItems(applyFilters(sorted, 'master'), 'master');
  return html;
}

// ─── TRADE COLORS for Gantt bars ───
const TRADE_COLORS = {
  'General / GC':'#e8793b','Concrete':'#64748b','Framing':'#0ea5e9','Drywall':'#a78bfa',
  'Paint':'#f472b6','HVAC':'#ef4444','Plumbing':'#3b82f6','Electrical':'#f59e0b',
  'Low Voltage':'#8b5cf6','Fire Alarm':'#dc2626','Flooring':'#84cc16','Sitework':'#78716c',
  'Roofing':'#475569','Glazing':'#06b6d4','Doors/Frames/HW':'#d97706','Specialties':'#ec4899',
  'Casework':'#b45309','Elevator':'#6366f1','Landscaping':'#22c55e','Fire Sprinkler':'#f43f5e',
  'Insulation':'#a3a3a3'
};

function renderGantt() {
  // Zoom state
  if (!window._ganttPxPerDay) window._ganttPxPerDay = 18;
  const pxDay = window._ganttPxPerDay;

  // Date range filter state
  if (!window._ganttFrom) window._ganttFrom = '';
  if (!window._ganttTo) window._ganttTo = '';

  // Full date range from activities (only those with dates)
  const datedActs = activities.filter(a => a.start || a.finish);
  const allStarts = datedActs.map(a => (parseDate(a.start || a.finish) || new Date(0)).getTime()).filter(t => t > 0);
  const allFinishes = datedActs.map(a => (parseDate(a.finish || a.start) || new Date(0)).getTime()).filter(t => t > 0);
  if (!allStarts.length) { return '<div class="empty-state"><h3>No dated activities</h3><p>Add start/finish dates to see Gantt chart.</p></div>'; }
  const fullStart = addDays(new Date(Math.min(...allStarts)), -7);
  const fullEnd = addDays(new Date(Math.max(...allFinishes)), 14);

  // Apply date filter if set — use parseDate to avoid UTC timezone shift
  const projStart = window._ganttFrom ? parseDate(window._ganttFrom) : fullStart;
  const projEnd = window._ganttTo ? parseDate(window._ganttTo) : fullEnd;
  // Filter activities to date range
  // Only show activities with actual dates on Gantt
  const rangeActivities = activities.filter(a => {
    if (!a.start && !a.finish) return false; // no dates = skip on Gantt
    const s = parseDate(a.start || a.finish), f = parseDate(a.finish || a.start);
    return f >= projStart && s <= projEnd;
  });

  // Group by trade
  const grouped = {};
  rangeActivities.sort((a,b) => new Date(a.start) - new Date(b.start)).forEach(a => {
    if (!grouped[a.trade]) grouped[a.trade] = [];
    grouped[a.trade].push(a);
  });
  const trades = Object.keys(grouped);
  const criticalIds = new Set(activities.filter(a => a.priority === 'Critical' && a.status !== 'Complete').map(a => a.id));

  const leftW = 320;
  const weekColW = 7 * pxDay;
  const isFullscreen = !!window._ganttFullscreen;

  // Quick date presets
  const presets = {
    'This Week': [addDays(TODAY, -TODAY.getDay()), addDays(TODAY, 6 - TODAY.getDay())],
    'This Month': [new Date(TODAY.getFullYear(), TODAY.getMonth(), 1), new Date(TODAY.getFullYear(), TODAY.getMonth() + 1, 0)],
    '3 Months': [addDays(TODAY, -7), addDays(TODAY, 90)],
    '6 Months': [addDays(TODAY, -7), addDays(TODAY, 180)],
    'Full Project': [fullStart, fullEnd]
  };

  let html = `<div id="ganttOuter" class="${isFullscreen ? 'gantt-fullscreen' : ''}">`;

  // Toolbar row 1: title + zoom + fullscreen
  html += `<div class="gantt-toolbar">
    <div style="display:flex;align-items:center;gap:10px;">
      <div class="section-title" style="margin:0;">Timeline / Gantt</div>
      <div class="section-count" style="margin:0;">${rangeActivities.length} activities</div>
    </div>
    <div style="display:flex;gap:4px;align-items:center;margin-left:auto;">
      <button class="btn-secondary" onclick="window._ganttPxPerDay=Math.max(2,window._ganttPxPerDay-2);render();" style="padding:3px 8px;font-size:13px;line-height:1;" title="Zoom out">&#8722;</button>
      <span style="font-size:10px;color:var(--text-tertiary);min-width:50px;text-align:center;">${pxDay}px/day</span>
      <button class="btn-secondary" onclick="window._ganttPxPerDay=Math.min(60,window._ganttPxPerDay+2);render();" style="padding:3px 8px;font-size:13px;line-height:1;" title="Zoom in">+</button>
      <div style="width:1px;height:16px;background:var(--border);margin:0 4px;"></div>
      <button class="btn-secondary" onclick="document.getElementById('ganttTimeline').scrollLeft=${Math.max(0,diffDays(projStart,TODAY))*pxDay - 200}" style="padding:3px 8px;font-size:11px;">Today</button>
      <button class="btn-secondary" onclick="ganttSidebarOn=!ganttSidebarOn;if(!ganttSidebarOn)closeDetail();render();" style="padding:3px 8px;font-size:11px;${ganttSidebarOn?'background:var(--accent);color:#fff;border-color:var(--accent);':''}" title="${ganttSidebarOn ? 'Detail panel: ON — click to disable' : 'Detail panel: OFF — click to enable'}">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="15" y1="3" x2="15" y2="21"/></svg>
      </button>
      <button class="btn-secondary" onclick="window._ganttFullscreen=!window._ganttFullscreen;render();" style="padding:3px 8px;font-size:11px;" title="${isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}">
        ${isFullscreen ? '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="4 14 4 20 10 20"/><polyline points="20 10 20 4 14 4"/><line x1="14" y1="10" x2="21" y2="3"/><line x1="3" y1="21" x2="10" y2="14"/></svg>' : '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/></svg>'}
      </button>
    </div>
  </div>`;

  // Toolbar row 2: project + date filter + presets
  const projKeys = Object.keys(PROJECTS);
  html += `<div class="gantt-toolbar" style="gap:6px;border-bottom:1px solid var(--border);">
    <select class="form-select" style="width:auto;padding:4px 28px 4px 8px;font-size:11px;font-weight:600;" onchange="switchProjectFromSettings(this.value);window._ganttScrolled=false;render();">
      ${projKeys.map(k => `<option value="${esc(k)}" ${k===currentProject?'selected':''}>${esc(PROJECTS[k].name)}</option>`).join('')}
    </select>
    <div style="width:1px;height:16px;background:var(--border);margin:0 2px;"></div>
    <span style="font-size:11px;font-weight:600;color:var(--text-secondary);">Range:</span>
    <input type="date" class="form-input" style="width:130px;padding:4px 8px;font-size:11px;" value="${window._ganttFrom}" onchange="window._ganttFrom=this.value;render();">
    <span style="font-size:11px;color:var(--text-tertiary);">to</span>
    <input type="date" class="form-input" style="width:130px;padding:4px 8px;font-size:11px;" value="${window._ganttTo}" onchange="window._ganttTo=this.value;render();">
    <div style="width:1px;height:16px;background:var(--border);margin:0 2px;"></div>
    ${Object.keys(presets).map(label => {
      const [ps, pe] = presets[label];
      const active = window._ganttFrom === isoDate(ps) && window._ganttTo === isoDate(pe);
      return `<button class="btn-secondary${active?' btn-preset-active':''}" onclick="window._ganttFrom='${isoDate(ps)}';window._ganttTo='${isoDate(pe)}';render();" style="padding:3px 8px;font-size:10px;${active?'background:var(--accent);color:#fff;border-color:var(--accent);':''}">${label}</button>`;
    }).join('')}
    <button class="btn-secondary" onclick="window._ganttFrom='';window._ganttTo='';render();" style="padding:3px 8px;font-size:10px;">Clear</button>
  </div>`;

  // Trade legend
  html += `<div style="display:flex;flex-wrap:wrap;gap:8px;padding:6px 12px;border-bottom:1px solid var(--border-light);background:var(--bg-input);">`;
  trades.forEach(t => {
    const c = TRADE_COLORS[t] || '#94a3b8';
    html += `<span style="display:inline-flex;align-items:center;gap:4px;font-size:10px;color:var(--text-secondary);"><span style="width:10px;height:4px;border-radius:2px;background:${c};"></span>${esc(t)}</span>`;
  });
  html += `</div>`;

  // Main container
  html += `<div class="gantt-container" style="display:flex;border:1px solid var(--border);border-radius:${isFullscreen?'0':'12'}px;overflow:hidden;background:var(--bg-card);">`;

  // ─── LEFT PANEL (table) ───
  html += `<div class="gantt-left" style="width:${leftW}px;min-width:${leftW}px;border-right:2px solid var(--border);z-index:5;background:var(--bg-card);">`;
  // Header — height matches timeline headers
  const headerH = weekColW >= 55 ? 44 : 24;
  html += `<div style="display:flex;height:${headerH}px;border-bottom:1px solid var(--border);background:var(--bg-input);align-items:flex-end;padding-bottom:6px;">
    <div style="flex:1;padding:0 10px;font-size:10px;font-weight:700;text-transform:uppercase;color:var(--text-tertiary);letter-spacing:.5px;">Title</div>
    <div style="width:70px;padding:0 6px;font-size:10px;font-weight:700;text-transform:uppercase;color:var(--text-tertiary);">Start</div>
    <div style="width:70px;padding:0 6px;font-size:10px;font-weight:700;text-transform:uppercase;color:var(--text-tertiary);">End</div>
  </div>`;

  // Rows grouped by trade
  trades.forEach(trade => {
    const color = TRADE_COLORS[trade] || '#94a3b8';
    const items = grouped[trade];
    // Trade header row
    html += `<div class="gantt-trade-header" style="display:flex;align-items:center;height:28px;background:${color};color:#fff;font-size:11px;font-weight:700;padding:0 10px;cursor:pointer;" onclick="this.nextElementSibling.classList.toggle('gantt-collapsed');this.querySelector('.gantt-chevron').classList.toggle('collapsed')">
      <svg class="gantt-chevron" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="margin-right:6px;transition:transform .2s;"><polyline points="6 9 12 15 18 9"/></svg>
      ${esc(trade)} <span style="margin-left:auto;font-weight:400;font-size:10px;opacity:.8;">${items.length}</span>
    </div>`;
    // Activity rows
    html += `<div class="gantt-trade-group">`;
    items.forEach(a => {
      const isCrit = criticalIds.has(a.id);
      // Derive display dates — same logic as _gS/_gF in gantt-d3.js
      const dur = Math.max(1, a.duration || 1);
      const ds = parseDate(a.start), df = parseDate(a.finish);
      const dispStart  = ds || (df ? addDays(df, -dur) : null);
      const dispFinish = df || (ds ? addDays(ds,  dur) : null);
      html += `<div class="gantt-left-row${isCrit ? ' gantt-critical' : ''}" data-id="${esc(a.id)}" style="display:flex;align-items:center;height:26px;border-bottom:1px solid var(--border-light);cursor:pointer;font-size:11px;">
        <div style="flex:1;padding:0 10px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">
          ${a.milestone ? '<span style="color:'+color+';margin-right:3px;">&#9670;</span>' : ''}
          ${esc(a.name)}
          ${isCrit ? '<span style="font-size:8px;color:var(--red);font-weight:700;margin-left:3px;">CRIT</span>' : ''}
        </div>
        <div style="width:75px;padding:0 6px;font-size:10px;color:var(--text-tertiary);font-family:var(--font-mono);">${fmt(dispStart)}</div>
        <div style="width:75px;padding:0 6px;font-size:10px;color:var(--text-tertiary);font-family:var(--font-mono);">${fmt(dispFinish)}</div>
      </div>`;
    });
    html += `</div>`;
  });
  html += `</div>`;

  // ─── RIGHT PANEL (D3 renders inside #ganttD3Wrap) ───
  html += `<div class="gantt-timeline" id="ganttTimeline" style="flex:1;overflow-x:auto;overflow-y:auto;position:relative;">`;
  html += `<div id="ganttD3Wrap" style="position:relative;display:inline-block;min-width:100%;"></div>`;
  html += `</div>`; // gantt-timeline
  html += `</div>`; // gantt-container
  html += `</div>`; // ganttOuter

  return html;
}

// ─── CALENDAR VIEW ───
function renderCalendar() {
  // Get current month or offset
  const calMonth = TODAY.getMonth();
  const calYear = TODAY.getFullYear();
  const firstDay = new Date(calYear, calMonth, 1);
  const lastDay = new Date(calYear, calMonth + 1, 0);
  const startPad = firstDay.getDay(); // 0=Sun
  const totalCells = startPad + lastDay.getDate();
  const rows = Math.ceil(totalCells / 7);
  const monthName = firstDay.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  // Build day → activities map
  const dayMap = {};
  activities.forEach(a => {
    const s = parseDate(a.start), f = parseDate(a.finish);
    if (!s || !f) return;
    for (let d = new Date(Math.max(s, firstDay)); d <= Math.min(f, lastDay); d.setDate(d.getDate() + 1)) {
      const key = d.getDate();
      if (!dayMap[key]) dayMap[key] = [];
      dayMap[key].push(a);
    }
  });

  let html = `<div class="section-header"><div class="section-title">Calendar &mdash; ${monthName}</div><div class="section-count">${activities.filter(a=>a.status!=='Complete').length} active</div></div>`;

  // Calendar grid
  html += `<div class="cal-grid">`;
  // Day names
  ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].forEach(d => {
    html += `<div class="cal-day-name">${d}</div>`;
  });

  // Cells
  for (let i = 0; i < rows * 7; i++) {
    const dayNum = i - startPad + 1;
    const isValid = dayNum >= 1 && dayNum <= lastDay.getDate();
    const isToday = isValid && dayNum === TODAY.getDate() && calMonth === TODAY.getMonth();
    const dayActs = isValid ? (dayMap[dayNum] || []) : [];

    html += `<div class="cal-cell${isValid ? '' : ' cal-empty'}${isToday ? ' cal-today' : ''}">`;
    if (isValid) {
      html += `<div class="cal-date${isToday ? ' cal-date-today' : ''}">${dayNum}</div>`;
      dayActs.slice(0, 3).forEach(a => {
        const color = TRADE_COLORS[a.trade] || '#94a3b8';
        const isStart = new Date(a.start).getDate() === dayNum;
        const isEnd = new Date(a.finish).getDate() === dayNum;
        html += `<div class="cal-event" style="border-left:3px solid ${color};${a.status==='Delayed'||a.status==='Blocked'?'opacity:.6;':''}cursor:pointer;" onclick="openDetail('${esc(a.id)}')" title="${esc(a.name)}">
          <span style="font-size:9px;font-weight:600;color:${color};">${isStart?'S':isEnd?'E':''}</span>
          ${esc(a.name.length > 18 ? a.name.slice(0,18)+'...' : a.name)}
        </div>`;
      });
      if (dayActs.length > 3) {
        html += `<div style="font-size:9px;color:var(--text-tertiary);padding:1px 4px;">+${dayActs.length - 3} more</div>`;
      }
    }
    html += `</div>`;
  }
  html += `</div>`;
  return html;
}

function renderLookahead(days) {
  const items = activities.filter(a => {
    const s = new Date(a.start);
    return s >= TODAY && s <= addDays(TODAY, days) && a.status !== 'Complete';
  }).sort((a,b) => new Date(a.start) - new Date(b.start));
  const blocked = items.filter(a => a.blocker);
  const label = days === 42 ? '6-Week' : '3-Week';
  let html = `<div class="section-header"><div class="section-title">${label} Lookahead</div><div class="section-count">${items.length} activities &middot; ${blocked.length} blocked</div></div>`;
  html += renderFilterBar('lookahead');
  html += renderItems(applyFilters(items, 'lookahead'), 'lookahead');
  return html;
}

function renderMilestones() {
  const items = activities.filter(a => a.milestone).sort((a,b) => new Date(a.finish) - new Date(b.finish));
  let html = `<div class="section-header"><div class="section-title">Milestones</div><div class="section-count">${items.length}</div></div>`;
  html += `<div class="milestone-strip" style="flex-wrap:wrap;">`;
  items.forEach(m => {
    const cls = m.status === 'Complete' ? 'complete' : isOverdue(m) ? 'overdue' : 'upcoming';
    const stLabel = m.status === 'Complete' ? '&#10003; Complete' : isOverdue(m) ? '&#9888; Overdue' : `Target: ${fmt(m.finish)}`;
    html += `<div class="milestone-chip ${cls}" data-id="${esc(m.id)}" style="min-width:220px;"><div class="ms-name">${esc(m.name)}</div><div class="ms-date">${fmt(m.start)} &rarr; ${fmt(m.finish)}</div><div class="ms-status">${stLabel}</div></div>`;
  });
  html += `</div>`;
  html += renderFilterBar('milestones');
  html += renderItems(applyFilters(items, 'milestones'), 'milestones');
  return html;
}

function renderByTrade() {
  const grouped = {};
  activities.forEach(a => { if (!grouped[a.trade]) grouped[a.trade] = []; grouped[a.trade].push(a); });
  let html = `<div class="section-header"><div class="section-title">Schedule by Trade</div></div>`;
  html += renderFilterBar('by-trade');
  const trades = Object.keys(grouped).sort();
  trades.forEach(t => {
    const items = grouped[t].sort((a,b) => new Date(a.start) - new Date(b.start));
    const active = items.filter(a => a.status !== 'Complete');
    const delayed = items.filter(a => a.status === 'Delayed' || a.status === 'Blocked');
    const st = _getState('by-trade');
    if (st.trade && t !== st.trade) return;
    const filtered = applyFilters(items, 'by-trade');
    if (!filtered.length) return;
    html += `<div class="trade-group"><div class="trade-group-header"><h4>&#9874; ${esc(t)}</h4><span class="trade-count">${active.length} active &middot; ${delayed.length} issues</span><span style="margin-left:auto;font-size:11px;color:var(--text-tertiary);">${esc(SUBS[t] || '')}</span></div>`;
    html += renderItems(filtered, 'by-trade');
    html += `</div>`;
  });
  return html;
}

function renderByArea() {
  const grouped = {};
  activities.forEach(a => { const key = `${a.area} \u2014 ${a.floor}`; if (!grouped[key]) grouped[key] = []; grouped[key].push(a); });
  let html = `<div class="section-header"><div class="section-title">Schedule by Area / Floor</div></div>`;
  html += renderFilterBar('by-area');
  Object.keys(grouped).sort().forEach(key => {
    const items = grouped[key].sort((a,b) => new Date(a.start) - new Date(b.start));
    const stA = _getState('by-area');
    if (stA.area && !key.includes(stA.area)) return;
    const filtered = applyFilters(items, 'by-area');
    if (!filtered.length) return;
    const active = filtered.filter(a => a.status !== 'Complete');
    html += `<div class="trade-group"><div class="trade-group-header"><h4>&#9635; ${esc(key)}</h4><span class="trade-count">${active.length} active</span></div>`;
    html += renderItems(filtered, 'by-area');
    html += `</div>`;
  });
  return html;
}

function renderBySub() {
  const grouped = {};
  activities.forEach(a => { if (!grouped[a.sub]) grouped[a.sub] = []; grouped[a.sub].push(a); });
  let html = `<div class="section-header"><div class="section-title">Schedule by Subcontractor</div></div>`;
  html += renderFilterBar('by-sub');
  Object.keys(grouped).sort().forEach(sub => {
    const items = grouped[sub].sort((a,b) => new Date(a.start) - new Date(b.start));
    const active = items.filter(a => a.status !== 'Complete');
    const delayed = items.filter(a => a.status === 'Delayed' || a.status === 'Blocked');
    const filtered = applyFilters(items, 'by-sub');
    if (!filtered.length) return;
    html += `<div class="trade-group"><div class="trade-group-header"><h4>&#8862; ${esc(sub)}</h4><span class="trade-count">${active.length} active &middot; ${delayed.length} issues</span></div>`;
    html += renderItems(filtered, 'by-sub');
    html += `</div>`;
  });
  return html;
}

function renderFiltered(status) {
  const sec = 'filtered-' + status.toLowerCase().replace(/\s/g,'-');
  const items = activities.filter(a => a.status === status).sort((a,b) => new Date(a.start) - new Date(b.start));
  let html = `<div class="section-header"><div class="section-title">${esc(status)} Activities</div><div class="section-count">${items.length}</div></div>`;
  html += renderFilterBar(sec);
  html += renderItems(applyFilters(items, sec), sec);
  return html;
}

function renderReady() {
  const items = activities.filter(a => a.status === 'Ready to Start' || (a.status === 'Not Started' && !a.blocker && new Date(a.start) <= addDays(TODAY, 7))).sort((a,b) => new Date(a.start) - new Date(b.start));
  let html = `<div class="section-header"><div class="section-title">Ready to Start</div><div class="section-count">${items.length}</div></div>`;
  html += renderFilterBar('ready');
  html += renderItems(applyFilters(items, 'ready'), 'ready');
  return html;
}

function renderProcurement() {
  const items = activities.filter(a => a.linked && a.linked.some(l => l.type === 'Procurement') && a.status !== 'Complete');
  let html = `<div class="section-header"><div class="section-title">Procurement &amp; Long Lead Items</div><div class="section-count">${items.length}</div></div>`;
  html += renderFilterBar('procurement');
  html += renderItems(applyFilters(items, 'procurement'), 'procurement');
  return html;
}

function renderInspections() {
  const items = activities.filter(a => a.linked && a.linked.some(l => l.type === 'Inspection') && a.status !== 'Complete');
  let html = `<div class="section-header"><div class="section-title">Inspections &amp; Permits</div><div class="section-count">${items.length}</div></div>`;
  html += renderFilterBar('inspections');
  html += renderItems(applyFilters(items, 'inspections'), 'inspections');
  return html;
}

function renderPunch() {
  const items = activities.filter(a => a.phase === 'Punch / Closeout' || a.phase === 'Turnover').sort((a,b) => new Date(a.start) - new Date(b.start));
  let html = `<div class="section-header"><div class="section-title">Punch &amp; Closeout</div><div class="section-count">${items.length}</div></div>`;
  html += renderFilterBar('punch');
  html += renderItems(applyFilters(items, 'punch'), 'punch');
  return html;
}

function renderTurnover() {
  const areas = ['Tower A \u2014 Level 2','Tower A \u2014 Level 3','Tower A \u2014 Level 4','Tower A \u2014 Level 5','Lobby / Front Desk','Back of House','Amenity Area','Breakfast Area','Pool Deck','Exterior / Site'];
  let html = `<div class="section-header"><div class="section-title">Area Turnover Tracker</div></div>`;
  html += renderFilterBar('turnover');
  html += `<div class="turnover-grid">`;
  areas.forEach(area => {
    const parts = area.split(' \u2014 ');
    const areaActs = activities.filter(a => {
      if (parts.length === 2) return a.area === parts[0].trim() && a.floor === parts[1].trim();
      return a.area === parts[0].trim();
    });
    const total = areaActs.length || 1;
    const done = areaActs.filter(a => a.status === 'Complete').length;
    const pct = Math.round(done / total * 100);
    const ip = areaActs.filter(a => a.status === 'In Progress').length;
    const delayed = areaActs.filter(a => a.status === 'Delayed' || a.status === 'Blocked').length;
    const color = pct === 100 ? 'var(--green)' : pct > 50 ? 'var(--accent)' : pct > 20 ? 'var(--yellow)' : 'var(--orange)';
    html += `<div class="turnover-card"><div class="turnover-area">${esc(area)}</div><div class="turnover-bar"><div class="turnover-fill" style="width:${pct}%;background:${color};"></div></div><div class="turnover-pct">${pct}% complete &middot; ${done}/${total} activities</div><div class="turnover-items">${ip} in progress &middot; ${delayed} issues</div></div>`;
  });
  html += `</div>`;
  return html;
}

// ─── SVG WEATHER ICONS (premium bold-line style) ───
function weatherSvg(code, size) {
  const s = size || 20;
  const v = `width="${s}" height="${s}" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg"`;
  // Clear / Sunny — thermometer + sun (svgrepo style)
  if (code === 0) return `<svg width="${s}" height="${s}" viewBox="0 0 96 96" fill="#e8793b"><path d="M50,58.4V47a2,2,0,0,0-4,0V58.4a5,5,0,1,0,4,0ZM48,64a1,1,0,1,1,1-1A1,1,0,0,1,48,64Z"/><path d="M56,55.5,56,30a8,8,0,0,0-16,0l0,25.5A11,11,0,1,0,56,55.5ZM48,70a7,7,0,0,1-4.7-12.2A2,2,0,0,0,44,56.3L44,30a4,4,0,0,1,8,0l0,26.3a2,2,0,0,0,.7,1.5A7,7,0,0,1,48,70Z"/><g><circle cx="72" cy="30" r="6"/><line x1="72" y1="18" x2="72" y2="22" stroke="#e8793b" stroke-width="3" stroke-linecap="round"/><line x1="72" y1="38" x2="72" y2="42" stroke="#e8793b" stroke-width="3" stroke-linecap="round"/><line x1="60" y1="30" x2="64" y2="30" stroke="#e8793b" stroke-width="3" stroke-linecap="round"/><line x1="80" y1="30" x2="84" y2="30" stroke="#e8793b" stroke-width="3" stroke-linecap="round"/><line x1="63.5" y1="21.5" x2="66.3" y2="24.3" stroke="#e8793b" stroke-width="3" stroke-linecap="round"/><line x1="77.7" y1="35.7" x2="80.5" y2="38.5" stroke="#e8793b" stroke-width="3" stroke-linecap="round"/><line x1="63.5" y1="38.5" x2="66.3" y2="35.7" stroke="#e8793b" stroke-width="3" stroke-linecap="round"/><line x1="77.7" y1="24.3" x2="80.5" y2="21.5" stroke="#e8793b" stroke-width="3" stroke-linecap="round"/></g></svg>`;
  // Partly cloudy
  if (code <= 2) return `<svg ${v}><g stroke="#e8793b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="14" cy="10" r="4"/><line x1="14" y1="3" x2="14" y2="5"/><line x1="14" y1="15" x2="14" y2="17"/><line x1="7" y1="10" x2="9" y2="10"/><line x1="19" y1="10" x2="21" y2="10"/><line x1="9.3" y1="5.3" x2="10.8" y2="6.8"/><line x1="17.2" y1="13.2" x2="18.7" y2="14.7"/><line x1="9.3" y1="14.7" x2="10.8" y2="13.2"/><line x1="17.2" y1="6.8" x2="18.7" y2="5.3"/></g><path d="M25 17h-1a6 6 0 0 0-11.5 1H12a4 4 0 0 0 0 8h13a4 4 0 0 0 0-8z" stroke="#94a3b8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/></svg>`;
  // Overcast
  if (code === 3) return `<svg ${v}><path d="M25 14h-1a7 7 0 0 0-13.5 1H10a5 5 0 0 0 0 10h15a5 5 0 0 0 0-10z" stroke="#94a3b8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  // Fog
  if (code >= 45 && code <= 48) return `<svg ${v}><g stroke="#94a3b8" stroke-width="2" stroke-linecap="round"><path d="M25 12h-1a7 7 0 0 0-13.5 1H10a5 5 0 0 0 0 10h15a5 5 0 0 0 0-10z"/><line x1="6" y1="26" x2="26" y2="26" opacity=".5"/><line x1="8" y1="29" x2="24" y2="29" opacity=".35"/></g></svg>`;
  // Rain / Drizzle / Showers
  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) return `<svg ${v}><g stroke="#3b82f6" stroke-width="2" stroke-linecap="round"><path d="M25 12h-1a7 7 0 0 0-13.5 1H10a5 5 0 0 0-.3 10" stroke="#94a3b8"/><line x1="10" y1="24" x2="10" y2="28"/><line x1="16" y1="22" x2="16" y2="28"/><line x1="22" y1="24" x2="22" y2="28"/></g></svg>`;
  // Snow
  if (code >= 71 && code <= 77) return `<svg ${v}><g stroke="#64748b" stroke-width="2" stroke-linecap="round"><path d="M25 12h-1a7 7 0 0 0-13.5 1H10a5 5 0 0 0-.3 10" stroke="#94a3b8"/></g><g fill="#64748b"><circle cx="10" cy="25" r="1.2"/><circle cx="16" cy="23" r="1.2"/><circle cx="22" cy="25" r="1.2"/><circle cx="13" cy="28" r="1.2"/><circle cx="19" cy="28" r="1.2"/></g></svg>`;
  // Thunderstorm
  if (code >= 95) return `<svg ${v}><g stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M25 12h-1a7 7 0 0 0-13.5 1H10a5 5 0 0 0 0 10h2" stroke="#94a3b8"/><polyline points="18 17 14 23 20 23 15 30" stroke="#e8793b" fill="none"/></g></svg>`;
  // Default cloud
  return `<svg ${v}><path d="M25 14h-1a7 7 0 0 0-13.5 1H10a5 5 0 0 0 0 10h15a5 5 0 0 0 0-10z" stroke="#94a3b8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
}

// ─── PROJECTS PAGE ───
function renderProjects() {
  const projKeys = Object.keys(PROJECTS);
  let html = `<div class="section-header"><div class="section-title">Projects</div><div class="section-count">${projKeys.length} projects</div></div>`;

  // Active project selector
  html += `<div class="settings-card">
    <div class="settings-card-header"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg><h3>Active Project</h3></div>
    <div class="settings-card-body">
      <select class="form-select" id="settingsProjectPicker" onchange="switchProjectFromSettings(this.value)" style="font-size:14px;font-weight:600;padding:10px 14px;">
        ${projKeys.map(k => `<option value="${esc(k)}" ${k===currentProject?'selected':''}>${esc(PROJECTS[k].name)}</option>`).join('')}
      </select>
    </div>
  </div>`;

  // All projects list
  html += `<div class="settings-card">
    <div class="settings-card-header"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg><h3>All Projects</h3></div>
    <div class="settings-card-body">
      ${projKeys.map(k => {
        const p = PROJECTS[k];
        return `<div style="display:flex;align-items:center;gap:10px;padding:10px 12px;border:1px solid var(--border-light);border-radius:10px;margin-bottom:8px;transition:all .15s;${k===currentProject?'background:var(--accent-light);border-color:var(--accent);':''}">
          <div style="width:4px;height:36px;border-radius:2px;background:${k===currentProject?'var(--accent)':'var(--border)'};flex-shrink:0;"></div>
          <div style="flex:1;">
            <div style="font-size:13px;font-weight:600;">${esc(p.name)}</div>
            <div style="font-size:10px;color:var(--text-tertiary);">${esc(k)}${p.lat ? ' &middot; '+p.lat.toFixed(2)+', '+p.lon.toFixed(2) : ''}</div>
          </div>
          ${k===currentProject?'<span style="font-size:10px;font-weight:600;color:var(--accent);background:#fff;padding:2px 8px;border-radius:20px;border:1px solid var(--accent);">Active</span>':'<button class="btn-secondary" onclick="switchProjectFromSettings(\''+esc(k)+'\')" style="font-size:10px;padding:3px 10px;">Switch</button>'}
          <button class="btn-icon" onclick="editProjectModal('${esc(k)}')" title="Edit"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>
          <button class="btn-icon" onclick="if(confirm('Delete ${esc(p.name)}? All activities will be removed.'))deleteProject('${esc(k)}')" title="Delete" style="color:var(--red);"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></button>
        </div>`;
      }).join('')}
    </div>
  </div>`;

  // Create new project
  html += `<div class="settings-card">
    <div class="settings-card-header"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg><h3>Create New Project</h3></div>
    <div class="settings-card-body">
      <div class="settings-row">
        <div class="form-group" style="flex:1;"><label class="form-label">Project Name *</label><input class="form-input" id="newProjName" placeholder="e.g. Hilton Garden Inn \u2014 Austin, TX"></div>
        <div class="form-group" style="width:140px;"><label class="form-label">Code * (unique)</label><input class="form-input" id="newProjCode" placeholder="hilton-austin"></div>
      </div>
      <div class="settings-row">
        <div class="form-group" style="flex:1;"><label class="form-label">Location</label><input class="form-input" id="newProjLocation" placeholder="Austin, TX"></div>
        <div class="form-group" style="width:90px;"><label class="form-label">Lat</label><input class="form-input" id="newProjLat" type="number" step="0.01" placeholder="30.27"></div>
        <div class="form-group" style="width:90px;"><label class="form-label">Lon</label><input class="form-input" id="newProjLon" type="number" step="0.01" placeholder="-97.74"></div>
        <div class="form-group" style="width:auto;align-self:flex-end;"><button class="btn-secondary" onclick="lookupNewProjCoords()" style="font-size:10px;white-space:nowrap;"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align:-1px;margin-right:3px;"><circle cx="12" cy="10" r="3"/><path d="M12 21.7C17.3 17 20 13 20 10a8 8 0 1 0-16 0c0 3 2.7 7 8 11.7z"/></svg>Auto</button></div>
      </div>
      <div class="settings-row">
        <div class="form-group" style="flex:1;"><label class="form-label">Start Date</label><input class="form-input" id="newProjStart" type="date"></div>
        <div class="form-group" style="flex:1;"><label class="form-label">Target Completion</label><input class="form-input" id="newProjEnd" type="date"></div>
      </div>
      <button class="btn-primary" onclick="createProject()" style="margin-top:8px;">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="vertical-align:-1px;margin-right:4px;"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        Create Project
      </button>
    </div>
  </div>`;

  return html;
}

// ─── SETTINGS PAGE ───
function renderSettings() {
  const proj = PROJECTS[currentProject] || PROJECTS['hampton-inn'];
  const settings = loadSettings();
  const wd = proj.weatherDetail;

  let html = `<div class="section-header"><div class="section-title">Settings</div></div>`;

  // WEATHER
  html += `<div class="settings-card">
    <div class="settings-card-header"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2"/></svg><h3>Weather &amp; Location</h3></div>
    <div class="settings-card-body">
      <div class="settings-row">
        <div class="form-group" style="flex:1;"><label class="form-label">City</label><input class="form-input" id="settingsCity" value="${esc(settings.city || 'Beaumont')}" placeholder="Beaumont"></div>
        <div class="form-group" style="flex:1;"><label class="form-label">State</label><input class="form-input" id="settingsState" value="${esc(settings.state || 'TX')}" placeholder="TX"></div>
        <div class="form-group" style="width:90px;"><label class="form-label">Lat</label><input class="form-input" id="settingsLat" type="number" step="0.01" value="${proj.lat}"></div>
        <div class="form-group" style="width:90px;"><label class="form-label">Lon</label><input class="form-input" id="settingsLon" type="number" step="0.01" value="${proj.lon}"></div>
      </div>
      <div class="settings-row">
        <div class="form-group" style="flex:1;"><label class="form-label">Temp Unit</label><select class="form-select" id="settingsTempUnit"><option value="fahrenheit" ${settings.tempUnit!=='celsius'?'selected':''}>Fahrenheit</option><option value="celsius" ${settings.tempUnit==='celsius'?'selected':''}>Celsius</option></select></div>
        <div class="form-group" style="flex:1;"><label class="form-label">Wind Unit</label><select class="form-select" id="settingsWindUnit"><option value="mph" ${settings.windUnit!=='kmh'?'selected':''}>mph</option><option value="kmh" ${settings.windUnit==='kmh'?'selected':''}>km/h</option></select></div>
      </div>
      <div style="display:flex;gap:8px;margin-top:8px;">
        <button class="btn-primary" onclick="saveWeatherSettings()">Save &amp; Refresh</button>
        <button class="btn-secondary" onclick="lookupCoordinates()">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-1px;margin-right:4px;"><circle cx="12" cy="10" r="3"/><path d="M12 21.7C17.3 17 20 13 20 10a8 8 0 1 0-16 0c0 3 2.7 7 8 11.7z"/></svg>
          Auto-detect from City
        </button>
      </div>
      ${wd ? `<div style="margin-top:14px;padding:14px 18px;background:var(--bg-input);border-radius:12px;display:flex;align-items:center;gap:14px;">
        <div style="flex-shrink:0;">${weatherSvg(wd.code || 0)}</div>
        <div style="flex:1;">
          <div style="font-size:20px;font-weight:700;color:var(--text-primary);">${wd.temp}\u00B0F <span style="font-size:12px;font-weight:400;color:var(--text-tertiary);">${esc(wd.desc)}</span></div>
          <div style="font-size:11px;color:var(--text-tertiary);display:flex;gap:12px;margin-top:2px;">
            <span><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align:-1px;"><path d="M9.59 4.59A2 2 0 1 1 11 8H2m10.59 11.41A2 2 0 1 0 14 16H2"/></svg> ${wd.wind} mph</span>
            <span><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align:-1px;"><path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/></svg> ${wd.humidity}%</span>
          </div>
          ${wd.alerts&&wd.alerts.length?`<div style="margin-top:4px;"><span style="font-size:10px;font-weight:600;color:#fff;background:var(--red);padding:2px 8px;border-radius:20px;">${esc(wd.alerts.join(', '))}</span></div>`:''}</div>
        <div style="display:flex;gap:12px;">
          ${wd.forecast?wd.forecast.map(f=>`<div style="text-align:center;"><div style="font-size:10px;font-weight:600;color:var(--text-secondary);">${f.day}</div><div style="margin:3px 0;">${weatherSvg(f.code)}</div><div style="font-size:11px;font-weight:600;">${f.hi}\u00B0</div><div style="font-size:10px;color:var(--text-tertiary);">${f.lo}\u00B0</div>${f.rain>30?`<div style="font-size:9px;color:var(--blue);font-weight:600;">${f.rain}%</div>`:''}</div>`).join(''):''}
        </div>
      </div>` : '<div style="margin-top:10px;font-size:12px;color:var(--text-tertiary);">Save settings to load weather data.</div>'}
    </div>
  </div>`;

  // PROJECT CONFIG
  const settingsProjKeys = Object.keys(PROJECTS);
  html += `<div class="settings-card">
    <div class="settings-card-header"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg><h3>Project Configuration</h3></div>
    <div class="settings-card-body">
      <div class="settings-row" style="margin-bottom:14px;">
        <div class="form-group" style="flex:1;">
          <label class="form-label" style="font-weight:600;">Select Project</label>
          <select class="form-select" onchange="switchProjectFromSettings(this.value)" style="font-size:13px;font-weight:600;padding:8px 12px;">
            ${settingsProjKeys.map(k => `<option value="${esc(k)}" ${k===currentProject?'selected':''}>${esc(PROJECTS[k].name)}</option>`).join('')}
          </select>
        </div>
      </div>
      <div class="settings-row">
        <div class="form-group" style="flex:1;"><label class="form-label">Project Name</label><input class="form-input" id="settingsProjName" value="${esc(proj.name)}"></div>
        <div class="form-group" style="width:150px;"><label class="form-label">Code</label><input class="form-input" value="${esc(currentProject)}" disabled style="opacity:.5;"></div>
      </div>
      <div class="settings-row">
        <div class="form-group" style="flex:1;"><label class="form-label">Default View</label><select class="form-select" id="settingsDefaultView"><option value="dashboard" ${settings.defaultView==='dashboard'||!settings.defaultView?'selected':''}>Dashboard</option><option value="today" ${settings.defaultView==='today'?'selected':''}>Today</option><option value="master" ${settings.defaultView==='master'?'selected':''}>Master Schedule</option><option value="gantt" ${settings.defaultView==='gantt'?'selected':''}>Gantt Timeline</option></select></div>
        <div class="form-group" style="flex:1;"><label class="form-label">Work Week</label><select class="form-select" id="settingsWorkWeek"><option value="mon-fri" ${settings.workWeek!=='mon-sat'?'selected':''}>Mon \u2013 Fri</option><option value="mon-sat" ${settings.workWeek==='mon-sat'?'selected':''}>Mon \u2013 Sat</option></select></div>
        <div class="form-group" style="flex:1;"><label class="form-label">Timezone</label><select class="form-select" id="settingsTimezone"><option value="America/Chicago" ${!settings.timezone||settings.timezone==='America/Chicago'?'selected':''}>Central</option><option value="America/New_York" ${settings.timezone==='America/New_York'?'selected':''}>Eastern</option><option value="America/Denver" ${settings.timezone==='America/Denver'?'selected':''}>Mountain</option><option value="America/Los_Angeles" ${settings.timezone==='America/Los_Angeles'?'selected':''}>Pacific</option></select></div>
      </div>
      <button class="btn-primary" onclick="saveProjectSettings()" style="margin-top:8px;">Save Project Settings</button>
    </div>
  </div>`;

  // NOTIFICATIONS
  html += `<div class="settings-card">
    <div class="settings-card-header"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg><h3>Notifications</h3></div>
    <div class="settings-card-body">
      <label class="settings-toggle"><input type="checkbox" id="settingsNotifyOverdue" ${settings.notifyOverdue!==false?'checked':''}><span class="toggle-slider"></span><span>Notify overdue activities</span></label>
      <label class="settings-toggle"><input type="checkbox" id="settingsNotifyWeather" ${settings.notifyWeather!==false?'checked':''}><span class="toggle-slider"></span><span>Weather alerts for outdoor work</span></label>
      <label class="settings-toggle"><input type="checkbox" id="settingsNotifyBlocked" ${settings.notifyBlocked!==false?'checked':''}><span class="toggle-slider"></span><span>Alert when activity blocked</span></label>
      <label class="settings-toggle"><input type="checkbox" id="settingsAutoSave" ${settings.autoSave!==false?'checked':''}><span class="toggle-slider"></span><span>Auto-save to database</span></label>
    </div>
  </div>`;

  // DATA
  html += `<div class="settings-card">
    <div class="settings-card-header"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg><h3>Data Management</h3></div>
    <div class="settings-card-body">
      <div style="display:flex;flex-wrap:wrap;gap:8px;">
        <button class="btn-secondary" onclick="exportJSON()"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align:-1px;margin-right:4px;"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>Export JSON</button>
        <button class="btn-secondary" onclick="exportCSV()"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align:-1px;margin-right:4px;"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>Export CSV</button>
        <button class="btn-secondary" onclick="document.getElementById('importInput').click()"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align:-1px;margin-right:4px;"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>Import JSON</button>
        <button class="btn-secondary" onclick="apiSaveAll().then(()=>showToast('Synced to database'))" style="color:var(--accent);border-color:var(--accent);"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align:-1px;margin-right:4px;"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>Sync to DB</button>
      </div>
      <div style="margin-top:10px;font-size:11px;color:var(--text-tertiary);">Activities: ${activities.length} &middot; Database: Supabase &middot; Last sync: ${settings.lastSync ? new Date(settings.lastSync).toLocaleString() : 'Never'}</div>
    </div>
  </div>`;

  // ABOUT
  html += `<div class="settings-card" style="opacity:.6;">
    <div class="settings-card-body" style="text-align:center;padding:20px;">
      <img src="assets/boulder-logo.png" alt="Boulder" style="width:100px;margin-bottom:6px;">
      <div style="font-size:11px;color:var(--text-tertiary);">Schedule Command Center v1.0 &middot; Supabase + Open-Meteo</div>
    </div>
  </div>`;

  return html;
}
