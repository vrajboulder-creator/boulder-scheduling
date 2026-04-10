// ─── STATE ───
let currentView = 'dashboard';
let selectedActivity = null;
let currentProject = 'tpsj';
let ganttZoom = 'week'; // 'day', 'week', 'month'
let ganttSidebarOn = true; // toggle detail panel on bar click

// ─── PROJECT DATA with coordinates for weather ───
const PROJECTS = {
  'tpsj': { name: 'TownePlace Suites \u2013 TPSJ', lat: 30.08, lon: -94.10, weather: 'Loading weather...', weatherLoaded: false },
  'hampton-inn': { name: 'Hampton Inn \u2013 Beaumont, TX', lat: 30.08, lon: -94.10, weather: 'Loading weather...', weatherLoaded: false },
  'fairfield-inn': { name: 'Fairfield Inn \u2013 Midland, TX', lat: 31.99, lon: -102.08, weather: 'Loading weather...', weatherLoaded: false },
  'holiday-inn': { name: 'Holiday Inn Express \u2013 Tyler, TX', lat: 32.35, lon: -95.30, weather: 'Loading weather...', weatherLoaded: false }
};

// ─── LIVE WEATHER (Open-Meteo API — free, no key) ───
async function fetchWeather(projectKey) {
  const proj = PROJECTS[projectKey];
  if (!proj || proj.weatherLoaded) return;
  try {
    const resp = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${proj.lat}&longitude=${proj.lon}&current=temperature_2m,weather_code,wind_speed_10m,relative_humidity_2m&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&temperature_unit=fahrenheit&wind_speed_unit=mph&timezone=America/Chicago&forecast_days=3`
    );
    if (!resp.ok) throw new Error(resp.statusText);
    const data = await resp.json();
    const cur = data.current;
    const daily = data.daily;

    // Weather code to description + icon
    const weatherDesc = getWeatherDesc(cur.weather_code);
    const temp = Math.round(cur.temperature_2m);
    const wind = Math.round(cur.wind_speed_10m);
    const humidity = cur.relative_humidity_2m;

    // Build forecast summary
    let alerts = [];
    if (temp >= 95) alerts.push('Heat Advisory');
    if (temp >= 105) alerts = ['Extreme Heat Warning'];
    if (cur.weather_code >= 61 && cur.weather_code <= 67) alerts.push('Rain');
    if (cur.weather_code >= 71 && cur.weather_code <= 77) alerts.push('Snow');
    if (cur.weather_code >= 95) alerts.push('Thunderstorm');
    if (wind >= 25) alerts.push('High Wind');

    // 3-day forecast
    const forecast = [];
    const dayNames = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
    for (let i = 0; i < Math.min(3, daily.time.length); i++) {
      const d = new Date(daily.time[i] + 'T12:00');
      forecast.push({
        day: dayNames[d.getDay()],
        hi: Math.round(daily.temperature_2m_max[i]),
        lo: Math.round(daily.temperature_2m_min[i]),
        rain: daily.precipitation_probability_max[i],
        code: daily.weather_code[i]
      });
    }

    proj.weather = `${temp}\u00B0F \u2014 ${weatherDesc.text}`;
    if (alerts.length) proj.weather += ` \u2014 ${alerts.join(', ')}`;
    proj.weatherDetail = {
      temp, wind, humidity,
      desc: weatherDesc.text,
      icon: weatherDesc.icon,
      code: cur.weather_code,
      alerts,
      forecast
    };
    proj.weatherLoaded = true;

    // Update UI
    const weatherEl = document.querySelector('.header-weather');
    if (weatherEl && currentProject === projectKey) {
      weatherEl.textContent = proj.weather;
    }
    if (currentProject === projectKey) render();
  } catch (e) {
    console.warn('Weather fetch failed:', e.message);
    proj.weather = '\u26C5 Weather unavailable';
    proj.weatherLoaded = true;
  }
}

function getWeatherDesc(code) {
  const map = {
    0: { icon: '\u2600\uFE0F', text: 'Clear sky' },
    1: { icon: '\uD83C\uDF24', text: 'Mainly clear' },
    2: { icon: '\u26C5', text: 'Partly cloudy' },
    3: { icon: '\u2601\uFE0F', text: 'Overcast' },
    45: { icon: '\uD83C\uDF2B', text: 'Fog' },
    48: { icon: '\uD83C\uDF2B', text: 'Freezing fog' },
    51: { icon: '\uD83C\uDF26', text: 'Light drizzle' },
    53: { icon: '\uD83C\uDF26', text: 'Drizzle' },
    55: { icon: '\uD83C\uDF27', text: 'Heavy drizzle' },
    61: { icon: '\uD83C\uDF27', text: 'Light rain' },
    63: { icon: '\uD83C\uDF27', text: 'Rain' },
    65: { icon: '\uD83C\uDF27', text: 'Heavy rain' },
    71: { icon: '\uD83C\uDF28', text: 'Light snow' },
    73: { icon: '\uD83C\uDF28', text: 'Snow' },
    75: { icon: '\uD83C\uDF28', text: 'Heavy snow' },
    80: { icon: '\uD83C\uDF26', text: 'Rain showers' },
    81: { icon: '\uD83C\uDF27', text: 'Moderate showers' },
    82: { icon: '\uD83C\uDF27', text: 'Heavy showers' },
    95: { icon: '\u26A1', text: 'Thunderstorm' },
    96: { icon: '\u26A1', text: 'Thunderstorm + hail' },
    99: { icon: '\u26A1', text: 'Severe thunderstorm' }
  };
  return map[code] || { icon: '\u26C5', text: 'Unknown' };
}

// ─── RENDER ENGINE ───
function render() {
  const area = document.getElementById('scheduleArea');
  const kpis = getKPIs();
  let html = '';

  // Compact weather card
  const proj = PROJECTS[currentProject] || PROJECTS['hampton-inn'];
  const wd = proj.weatherDetail;
  if (wd) {
    const hasAlert = wd.alerts && wd.alerts.length;
    html += `<div class="weather-alert" style="padding:10px 16px;gap:10px;">
      <div style="flex-shrink:0;">${weatherSvg(wd.code || 0, 24)}</div>
      <strong style="font-size:15px;color:#1a1d23;white-space:nowrap;">${wd.temp}\u00B0F</strong>
      <span style="font-size:11.5px;color:#666;">${esc(wd.desc)}</span>
      <span style="font-size:10.5px;color:#999;"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align:-1px;"><path d="M9.59 4.59A2 2 0 1 1 11 8H2"/></svg> ${wd.wind}mph &middot; <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align:-1px;"><path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/></svg> ${wd.humidity}%</span>
      ${hasAlert ? `<span style="font-size:10px;font-weight:600;color:#fff;background:var(--red);padding:2px 8px;border-radius:20px;white-space:nowrap;">${esc(wd.alerts.join(', '))}</span>` : ''}
      <div style="display:flex;gap:10px;margin-left:auto;">${wd.forecast ? wd.forecast.map(f => `<div style="text-align:center;line-height:1.3;"><div style="font-size:10px;font-weight:600;color:#555;">${f.day}</div><div style="margin:2px 0;">${weatherSvg(f.code, 16)}</div><div style="font-size:10px;font-weight:600;">${f.hi}\u00B0/${f.lo}\u00B0</div></div>`).join('') : ''}</div>
    </div>`;
  } else {
    html += `<div class="weather-alert" style="padding:10px 16px;"><div style="font-size:12px;">${esc(proj.weather)}</div></div>`;
  }

  // KPI row (always shown on dashboard/today/this-week)
  if (['dashboard','today','this-week'].includes(currentView)) {
    html += renderKPIs(kpis);
  }

  // View content
  switch(currentView) {
    case 'dashboard': html += renderDashboard(kpis); break;
    case 'today': html += renderToday(); break;
    case 'this-week': html += renderThisWeek(); break;
    case 'master': html += renderMaster(); break;
    case 'gantt': html += renderGantt(); break;
    case 'calendar': html += renderCalendar(); break;
    case 'lookahead-6': html += renderLookahead(42); break;
    case 'lookahead-3': html += renderLookahead(21); break;
    case 'milestones': html += renderMilestones(); break;
    case 'by-trade': html += renderByTrade(); break;
    case 'by-area': html += renderByArea(); break;
    case 'by-sub': html += renderBySub(); break;
    case 'delayed': html += renderFiltered('Delayed'); break;
    case 'blocked': html += renderFiltered('Blocked'); break;
    case 'in-progress': html += renderFiltered('In Progress'); break;
    case 'ready': html += renderReady(); break;
    case 'completed': html += renderFiltered('Complete'); break;
    case 'procurement': html += renderProcurement(); break;
    case 'inspections': html += renderInspections(); break;
    case 'punch': html += renderPunch(); break;
    case 'turnover': html += renderTurnover(); break;
    case 'projects': html += renderProjects(); break;
    case 'settings': html += renderSettings(); break;
    default: html += renderDashboard(kpis);
  }

  area.innerHTML = html;
  attachListeners();

  // Gantt: interactions + D3 draw
  if (currentView === 'gantt') {
    initGanttInteractions();
  }
}

// ─── PROJECT DROPDOWN WITH COUNTS ───
function updateProjectDropdown() {
  const sel = document.getElementById('projectSelect');
  if (!sel) return;
  const keys = Object.keys(PROJECTS);
  sel.innerHTML = keys.map(k => {
    const p = PROJECTS[k];
    const cnt = k === currentProject ? activities.length : 0;
    return `<option value="${esc(k)}" ${k === currentProject ? 'selected' : ''}>${esc(p.name)} (${cnt})</option>`;
  }).join('');
}

// ─── GANTT INTERACTIONS ───
function initGanttInteractions() {
  const timeline = document.getElementById('ganttTimeline');
  const leftPanel = document.querySelector('.gantt-left');
  if (!timeline) return;

  // Scroll-wheel zoom on timeline
  timeline.addEventListener('wheel', function(e) {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const oldPx = window._ganttPxPerDay || 18;
      const delta = e.deltaY > 0 ? -2 : 2;
      window._ganttPxPerDay = Math.max(4, Math.min(50, oldPx + delta));
      if (window._ganttPxPerDay !== oldPx) render();
    }
  }, { passive: false });

  // Sync vertical scroll between left panel and timeline
  if (leftPanel) {
    leftPanel.addEventListener('scroll', function() {
      timeline.scrollTop = leftPanel.scrollTop;
    });
    timeline.addEventListener('scroll', function() {
      leftPanel.scrollTop = timeline.scrollTop;
    });
  }

  // Click left panel rows to open detail
  document.querySelectorAll('.gantt-left-row[data-id]').forEach(el => {
    el.addEventListener('click', () => {
      if (ganttSidebarOn) openDetail(el.dataset.id);
    });
  });

  // Draw D3 SVG timeline
  drawGanttD3();

  // Drag to pan timeline (background pan)
  initDragScroll(timeline);

  // Scroll to today on first load
  if (!window._ganttScrolled) {
    window._ganttScrolled = true;
    const pxDay = window._ganttPxPerDay || 18;
    const datedActs = activities.filter(a => a.start || a.finish);
    if (datedActs.length) {
      const allStarts = datedActs.map(a => (parseDate(a.start || a.finish) || new Date(0)).getTime()).filter(t => t > 0);
      const projStart = window._ganttFrom ? parseDate(window._ganttFrom) : addDays(new Date(Math.min(...allStarts)), -7);
      timeline.scrollLeft = Math.max(0, diffDays(projStart, TODAY) * pxDay - 200);
    }
  }

  // Esc to exit fullscreen
  if (window._ganttFullscreen) {
    const escHandler = e => { if (e.key === 'Escape') { window._ganttFullscreen = false; render(); document.removeEventListener('keydown', escHandler); } };
    document.addEventListener('keydown', escHandler);
  }
}

// ─── BAR RESIZE (drag handle elements to change duration) ───
function initBarResize() {
  const pxDay = window._ganttPxPerDay || 18;

  document.querySelectorAll('.gantt-resize-handle').forEach(handle => {
    handle.addEventListener('mousedown', e => {
      e.preventDefault();
      e.stopPropagation();

      const bar = handle.closest('.gantt-bar-v2');
      if (!bar) return;
      const actId = bar.dataset.actid;
      const edge = handle.dataset.edge;
      const startX = e.clientX;
      const startWidth = bar.offsetWidth;
      const startLeft = bar.offsetLeft;
      let dragged = false;

      bar.style.transition = 'none';
      bar.style.zIndex = '10';

      const onMove = ev => {
        const dx = ev.clientX - startX;
        if (Math.abs(dx) < 2) return;
        dragged = true;

        if (edge === 'right') {
          bar.style.width = Math.max(pxDay, startWidth + dx) + 'px';
        } else {
          bar.style.left = (startLeft + dx) + 'px';
          bar.style.width = Math.max(pxDay, startWidth - dx) + 'px';
        }
      };

      const onUp = ev => {
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
        bar.style.transition = '';
        bar.style.zIndex = '';

        if (!dragged) return;

        const a = activities.find(x => x.id === actId);
        if (!a) return;

        // Calculate new width in pixels, convert to days
        const finalWidth = bar.offsetWidth;
        const newDurationDays = Math.max(1, Math.round(finalWidth / pxDay));

        // Get current timeline scroll position to restore after render
        const timeline = document.getElementById('ganttTimeline');
        const scrollPos = timeline ? timeline.scrollLeft : 0;

        if (edge === 'right') {
          // Keep start, change finish
          a.finish = isoDate(addDays(a.start, newDurationDays));
          a.duration = newDurationDays;
        } else {
          // Keep finish, change start
          a.start = isoDate(addDays(a.finish, -newDurationDays));
          a.duration = newDurationDays;
        }

        showToast(`${a.id}: ${fmt(a.start)} \u2013 ${fmt(a.finish)} (${a.duration}d)`);
        debouncedSave(actId);

        // Preserve scroll position so bars don't jump
        render();
        requestAnimationFrame(() => {
          const tl = document.getElementById('ganttTimeline');
          if (tl) tl.scrollLeft = scrollPos;
        });
      };

      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    });
  });
}

// ─── BAR DRAG-TO-MOVE (horizontal = dates, vertical = reassign trade row) ───
function initBarDrag() {
  const pxDay = window._ganttPxPerDay || 18;
  const ROW_H = 26; // match gantt-bar-row height

  // Disable timeline drag-scroll while bar dragging
  let _barDragging = false;
  const timeline = document.getElementById('ganttTimeline');
  if (timeline) {
    timeline.addEventListener('mousedown', e => {
      if (_barDragging) { e.stopPropagation(); e.preventDefault(); }
    }, true);
  }

  // Collect all bar rows for vertical drop targets
  const barRows = [...document.querySelectorAll('.gantt-bar-row[data-id]')];

  document.querySelectorAll('.gantt-bar-v2').forEach(bar => {
    bar.addEventListener('mousedown', e => {
      if (e.target.closest('.gantt-resize-handle')) return;

      const actId = bar.dataset.actid;
      if (!actId) return;

      e.preventDefault();
      e.stopPropagation();
      _barDragging = true;

      // Lock all scrolling while dragging
      document.body.style.overflow = 'hidden';
      const schedArea = document.getElementById('scheduleArea');
      if (schedArea) schedArea.style.overflow = 'hidden';
      if (timeline) timeline.style.overflowY = 'hidden';

      const startX = e.clientX;
      const startY = e.clientY;
      const startLeft = bar.offsetLeft;
      const startTop = bar.offsetTop;
      const barRow = bar.closest('.gantt-bar-row');
      let dragged = false;
      let dropTargetRow = null;

      bar.style.transition = 'none';
      bar.style.zIndex = '100';
      bar.style.cursor = 'grabbing';
      bar.style.opacity = '0.75';
      bar.style.boxShadow = '0 4px 16px rgba(0,0,0,.2)';

      const onMove = ev => {
        const dx = ev.clientX - startX;
        const dy = ev.clientY - startY;
        if (Math.abs(dx) < 3 && Math.abs(dy) < 3) return;
        dragged = true;

        // Move bar horizontally
        bar.style.left = (startLeft + dx) + 'px';
        // Move bar vertically (allow cross-row)
        bar.style.top = (startTop + dy) + 'px';
        bar.style.position = 'absolute';

        // Highlight drop target row
        barRows.forEach(r => r.style.background = '');
        const hoveredRow = barRows.find(r => {
          const rect = r.getBoundingClientRect();
          return ev.clientY >= rect.top && ev.clientY <= rect.bottom && r !== barRow;
        });
        if (hoveredRow) {
          hoveredRow.style.background = 'rgba(232,121,59,.08)';
          dropTargetRow = hoveredRow;
        } else {
          dropTargetRow = null;
        }
      };

      const onUp = ev => {
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
        _barDragging = false;

        // Unlock scrolling
        document.body.style.overflow = '';
        const schedArea2 = document.getElementById('scheduleArea');
        if (schedArea2) schedArea2.style.overflow = '';
        if (timeline) timeline.style.overflowY = '';

        bar.style.transition = '';
        bar.style.zIndex = '';
        bar.style.cursor = '';
        bar.style.opacity = '';
        bar.style.boxShadow = '';
        bar.style.top = '';

        // Clear highlights
        barRows.forEach(r => r.style.background = '');

        if (!dragged) {
          if (ganttSidebarOn) openDetail(actId);
          return;
        }

        const a = activities.find(x => x.id === actId);
        if (!a) return;

        // Horizontal: calculate day shift
        const dx = ev.clientX - startX;
        const daysDelta = Math.round(dx / pxDay);

        // Vertical: if dropped on different row, swap trade/position
        if (dropTargetRow) {
          const targetId = dropTargetRow.dataset.id;
          const targetAct = activities.find(x => x.id === targetId);
          if (targetAct && targetAct.id !== a.id) {
            // Reassign trade to target's trade
            const oldTrade = a.trade;
            a.trade = targetAct.trade;
            a.sub = targetAct.sub || SUBS[a.trade] || '';
            a.area = targetAct.area;
            a.floor = targetAct.floor;
            showToast(`${a.id} moved to ${a.trade} (was ${oldTrade})`);
          }
        }

        if (daysDelta !== 0) {
          a.start = isoDate(addDays(a.start, daysDelta));
          a.finish = isoDate(addDays(a.finish, daysDelta));
        }

        const scrollPos = timeline ? timeline.scrollLeft : 0;

        if (daysDelta !== 0 || dropTargetRow) {
          showToast(`${a.id}: ${fmt(a.start)} \u2013 ${fmt(a.finish)} | ${a.trade}`);
          debouncedSave(actId);
        }

        render();
        requestAnimationFrame(() => {
          const tl = document.getElementById('ganttTimeline');
          if (tl) tl.scrollLeft = scrollPos;
        });
      };

      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    });
  });
}

// ─── EVENT LISTENERS (re-attached after each render) ───
function attachListeners() {
  document.querySelectorAll('.schedule-table tbody tr[data-id], .lookahead-card[data-id], .milestone-chip[data-id], .gantt-row[data-id]').forEach(el => {
    el.addEventListener('click', () => openDetail(el.dataset.id));
  });

  // Drag-to-scroll on horizontal strips
  document.querySelectorAll('.milestone-strip, .table-scroll').forEach(initDragScroll);

  // Scroll indicator dot — sync with milestone strip scroll position
  document.querySelectorAll('.milestone-strip').forEach(strip => {
    const dot = document.getElementById('msDot');
    if (!dot) return;
    const updateDot = () => {
      const maxScroll = strip.scrollWidth - strip.clientWidth;
      if (maxScroll <= 0) { dot.parentElement.parentElement.style.display = 'none'; return; }
      const pct = strip.scrollLeft / maxScroll;
      const trackW = dot.parentElement.offsetWidth - dot.offsetWidth;
      dot.style.left = (pct * trackW) + 'px';
    };
    strip.addEventListener('scroll', updateDot);
    requestAnimationFrame(updateDot);
  });
}

function initDragScroll(el) {
  let isDown = false;
  let startX, scrollLeft;

  el.style.cursor = 'grab';

  el.addEventListener('mousedown', e => {
    if (e.target.closest('button, a, input, select, .gantt-bar-v2, .gantt-resize-handle, .g3-bar, .g3-bar-rect, .g3-bar-row, .g3-handle')) return;
    isDown = true;
    el.style.cursor = 'grabbing';
    startX = e.pageX - el.offsetLeft;
    scrollLeft = el.scrollLeft;
    e.preventDefault();
  });

  el.addEventListener('mouseleave', () => {
    isDown = false;
    el.style.cursor = 'grab';
  });

  el.addEventListener('mouseup', () => {
    isDown = false;
    el.style.cursor = 'grab';
  });

  el.addEventListener('mousemove', e => {
    if (!isDown) return;
    const x = e.pageX - el.offsetLeft;
    const walk = (x - startX) * 2;
    el.scrollLeft = scrollLeft - walk;
  });
}

// ─── GANTT DEPENDENCY ARROWS (Fix #8) ───
function drawGanttArrows() {
  const svg = document.getElementById('ganttArrows');
  if (!svg) return;
  svg.innerHTML = '';

  // Map bar positions — new v2 uses .gantt-bar-v2 inside .gantt-bar-row
  const barRows = document.querySelectorAll('.gantt-bar-row[data-id]');
  const barMap = {};
  barRows.forEach(row => {
    const bar = row.querySelector('.gantt-bar-v2');
    if (bar) {
      barMap[row.dataset.id] = {
        top: row.offsetTop + row.offsetHeight / 2,
        left: bar.offsetLeft,
        right: bar.offsetLeft + bar.offsetWidth
      };
    }
  });

  // Add defs for arrowhead
  const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
  defs.innerHTML = `<marker id="depArrow" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto"><polygon points="0 0, 8 3, 0 6" fill="#1A6FD4" opacity="0.7"/></marker>`;
  svg.appendChild(defs);

  activities.forEach(a => {
    if (!a.successors || !a.successors.length) return;
    const from = barMap[a.id];
    if (!from) return;
    a.successors.forEach(sId => {
      const to = barMap[sId];
      if (!to) return;

      const x1 = from.right;
      const y1 = from.top;
      const x2 = to.left;
      const y2 = to.top;
      const mx = (x1 + x2) / 2;

      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('d', `M${x1},${y1} C${mx},${y1} ${mx},${y2} ${x2},${y2}`);
      path.setAttribute('fill', 'none');
      path.setAttribute('stroke', '#1A6FD4');
      path.setAttribute('stroke-width', '1.5');
      path.setAttribute('stroke-dasharray', '4 3');
      path.setAttribute('opacity', '0.6');
      path.setAttribute('marker-end', 'url(#depArrow)');
      svg.appendChild(path);
    });
  });
}

// ─── MOBILE SIDEBAR ───
function closeSidebar() {
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('sidebarOverlay').classList.remove('open');
}

// ─── BOOT APP (called after all partials are loaded) ───
function bootApp() {
  // Set header date
  document.getElementById('headerDate').textContent = fmtFull(TODAY);

  // Populate project dropdown with activity counts
  updateProjectDropdown();

  // Sidebar nav
  document.querySelectorAll('.nav-item[data-view]').forEach(item => {
    item.addEventListener('click', () => {
      document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
      item.classList.add('active');
      currentView = item.dataset.view;
      _sectionState = {};
      render();
      closeSidebar();
    });
  });

  // Header buttons
  document.getElementById('btnAddActivity').addEventListener('click', openModal);
  document.getElementById('btnCloseModal').addEventListener('click', closeModal);
  document.getElementById('btnCancelModal').addEventListener('click', closeModal);
  document.getElementById('btnSaveActivity').addEventListener('click', saveActivity);
  document.getElementById('btnCloseDetail').addEventListener('click', closeDetail);
  document.getElementById('modalOverlay').addEventListener('click', e => { if (e.target === e.currentTarget) closeModal(); });

  // ─── SEARCH with live dropdown ───
  const searchInput = document.getElementById('globalSearch');
  const searchDropdown = document.getElementById('searchDropdown');

  searchInput.addEventListener('input', e => {
    searchQuery = e.target.value;
    render();
    showSearchDropdown(searchQuery);
  });

  searchInput.addEventListener('focus', () => {
    if (searchQuery) showSearchDropdown(searchQuery);
  });

  document.addEventListener('click', e => {
    if (!e.target.closest('.header-search')) {
      searchDropdown.classList.remove('open');
    }
  });

  searchInput.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      searchDropdown.classList.remove('open');
      searchInput.blur();
    }
  });

  // ─── VOICE SEARCH (Web Speech API) ───
  const voiceBtn = document.getElementById('voiceSearchBtn');
  if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    recognition.maxAlternatives = 1;

    let isListening = false;
    let voiceTimeout = null;
    let finalTranscript = '';

    voiceBtn.addEventListener('click', () => {
      if (isListening) {
        recognition.stop();
        return;
      }
      finalTranscript = '';
      searchInput.value = '';
      searchQuery = '';
      recognition.start();
    });

    recognition.onstart = () => {
      isListening = true;
      voiceBtn.classList.add('listening');
      searchInput.placeholder = 'Listening... speak now';
      searchInput.focus();
    };

    recognition.onresult = (event) => {
      let interim = '';
      finalTranscript = '';
      for (let i = 0; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        } else {
          interim += event.results[i][0].transcript;
        }
      }
      searchInput.value = finalTranscript + interim;
      searchQuery = finalTranscript + interim;
      render();
      showSearchDropdown(searchQuery);

      // Auto-stop after 3s of silence (reset timer on each result)
      clearTimeout(voiceTimeout);
      voiceTimeout = setTimeout(() => {
        if (isListening) recognition.stop();
      }, 3000);
    };

    recognition.onend = () => {
      isListening = false;
      clearTimeout(voiceTimeout);
      voiceBtn.classList.remove('listening');
      searchInput.placeholder = 'Search activities, trades, areas\u2026';
      // Use final transcript
      if (finalTranscript) {
        searchInput.value = finalTranscript;
        searchQuery = finalTranscript;
        render();
        showSearchDropdown(finalTranscript);
      }
    };

    recognition.onerror = (event) => {
      isListening = false;
      clearTimeout(voiceTimeout);
      voiceBtn.classList.remove('listening');
      searchInput.placeholder = 'Search activities, trades, areas\u2026';
      if (event.error === 'no-speech') {
        showToast('No speech detected \u2014 try again');
      } else if (event.error !== 'aborted') {
        showToast('Voice error: ' + event.error);
      }
    };
  } else {
    voiceBtn.style.display = 'none';
  }

  // Project selector (Fix #9)
  document.getElementById('projectSelect').addEventListener('change', function() {
    const idx = this.selectedIndex;
    const keys = Object.keys(PROJECTS);
    switchProjectFromSettings(keys[idx] || keys[0]);
  });

  // Mobile sidebar
  document.getElementById('btnMenu').addEventListener('click', () => {
    document.getElementById('sidebar').classList.toggle('open');
    document.getElementById('sidebarOverlay').classList.toggle('open');
  });
  document.getElementById('sidebarOverlay').addEventListener('click', closeSidebar);

  // Show loading state
  const area = document.getElementById('scheduleArea');
  area.innerHTML = '<div class="empty-state" style="padding:80px 20px;"><h3>Loading schedule data...</h3><p>Connecting to database</p></div>';

  // Load from Supabase API, then render
  apiLoadAll().then(loaded => {
    if (loaded) {
      // Check if loaded data has usable dates (at least 20% with start or finish)
      const datedCount = activities.filter(a => a.start || a.finish).length;
      const usable = datedCount >= Math.max(5, activities.length * 0.2);
      if (usable) {
        console.log(`Loaded ${activities.length} activities from Supabase (${datedCount} dated)`);
      } else {
        console.warn(`DB has ${activities.length} activities but only ${datedCount} have dates — using project data`);
        if (currentProject === 'tpsj') {
          loadTPSJActivities();
        } else {
          loadFallbackActivities();
        }
      }
    } else {
      console.warn('No activities from API — loading project data');
      if (currentProject === 'tpsj') {
        loadTPSJActivities();
      } else {
        loadFallbackActivities();
      }
    }
    updateProjectDropdown();
    render();
    fetchWeather(currentProject);
  });
}
