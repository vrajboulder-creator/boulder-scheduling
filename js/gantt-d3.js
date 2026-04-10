// ─── GANTT D3 RENDERER ───
// P6/MS-Project style Gantt using D3.js v7.
// Bars drag horizontally (date shift) AND vertically (trade reassignment).
// Native document-level mouse events prevent row-stealing during drag.

const G_ROW_H   = 26;
const G_TRADE_H = 28;
const G_MONTH_H = 24;
const G_WEEK_H  = 20;
const G_BAR_H   = 18;
const G_BAR_Y   = 4;

// ─── ENTRY POINT ─────────────────────────────────────────────────────────────
function drawGanttD3() {
  const wrap = document.getElementById('ganttD3Wrap');
  if (!wrap || typeof d3 === 'undefined') return;

  const pxDay = window._ganttPxPerDay || 18;

  // ── Derive date range from ALL activities with dates ──
  const datedActs = activities.filter(a => a.start || a.finish);
  if (!datedActs.length) return;

  const allT = datedActs.flatMap(a => {
    const s = _gS(a).getTime(), f = _gF(a).getTime();
    return [s, f];
  }).filter(t => t > 0 && t < 9e15);

  const fullStart = addDays(new Date(Math.min(...allT)), -7);
  const fullEnd   = addDays(new Date(Math.max(...allT)),  14);

  const projStart = window._ganttFrom ? parseDate(window._ganttFrom) : fullStart;
  const projEnd   = window._ganttTo   ? parseDate(window._ganttTo)   : fullEnd;
  const totalDays = Math.max(7, diffDays(projStart, projEnd));
  const timelineW = totalDays * pxDay;

  // ── Group ALL dated activities by trade ──
  // Use custom order if set by drag-reorder, otherwise sort by start date
  const customOrd = window._ganttCustomOrder || {};
  const hasCustom = Object.keys(customOrd).length > 0;
  const sorted = [...datedActs].sort((a, b) => {
    if (hasCustom && customOrd[a.id] != null && customOrd[b.id] != null) {
      return customOrd[a.id] - customOrd[b.id];
    }
    return _gS(a) - _gS(b);
  });
  const grouped = {};
  sorted.forEach(a => { (grouped[a.trade] = grouped[a.trade] || []).push(a); });
  const trades = Object.keys(grouped);

  const critIds = new Set(
    activities.filter(a => a.priority === 'Critical' && a.status !== 'Complete').map(a => a.id)
  );

  // ── X scale ──
  const xScale = d3.scaleTime().domain([projStart, projEnd]).range([0, timelineW]);

  // ── Header height ──
  const weekColW = 7 * pxDay;
  const headerH  = weekColW >= 55 ? G_MONTH_H + G_WEEK_H : G_MONTH_H;

  if (!window._ganttCollapsed) window._ganttCollapsed = new Set();

  // ── Build row layout: array of { type:'trade'|'row', trade, item?, y } ──
  const rowLayout = [];
  let yOff = headerH;
  trades.forEach(trade => {
    rowLayout.push({ type: 'trade', trade, y: yOff });
    yOff += G_TRADE_H;
    if (!window._ganttCollapsed.has(trade)) {
      grouped[trade].forEach(a => {
        rowLayout.push({ type: 'row', trade, item: a, y: yOff });
        yOff += G_ROW_H;
      });
    }
  });
  const totalH = yOff;

  // Store layout globally so drag can hit-test rows
  window._ganttRowLayout = rowLayout;
  window._ganttHeaderH   = headerH;

  // ── Clear + build SVG ──
  d3.select(wrap).selectAll('*').remove();
  const svg = d3.select(wrap)
    .append('svg')
    .attr('width', timelineW).attr('height', totalH)
    .style('display', 'block')
    .style('font-family', 'var(--font-sans, DM Sans, sans-serif)');

  _g3Weekends(svg, projStart, totalDays, pxDay, totalH, headerH);
  _g3WeekLines(svg, projStart, totalDays, pxDay, totalH, headerH);
  _g3Headers(svg, projStart, projEnd, pxDay, xScale, weekColW, headerH);
  _g3Bars(svg, rowLayout, critIds, xScale, pxDay, wrap, grouped);
  _g3TodayLine(svg, projStart, pxDay, totalH);
  _g3Arrows(svg);
  _g3Tooltip(wrap);

  const leftPanel = document.querySelector('.gantt-left');
  if (leftPanel) leftPanel.style.height = totalH + 'px';
}

// ─── SAFE DATE GETTERS ────────────────────────────────────────────────────────
function _gS(a) {
  const s = parseDate(a.start), f = parseDate(a.finish);
  const dur = Math.max(1, a.duration || 1);
  if (s) return s;
  if (f) return addDays(f, -dur);
  return TODAY;
}
function _gF(a) {
  const s = parseDate(a.start), f = parseDate(a.finish);
  const dur = Math.max(1, a.duration || 1);
  if (f && s && diffDays(s, f) >= 1) return f;
  if (f && s) return addDays(s, dur);
  if (s) return addDays(s, dur);
  if (f) return f;
  return addDays(TODAY, 1);
}

// ─── WEEKEND SHADING ─────────────────────────────────────────────────────────
function _g3Weekends(svg, projStart, totalDays, pxDay, totalH, headerH) {
  const g = svg.append('g').attr('pointer-events', 'none');
  for (let d = 0; d < totalDays; d++) {
    const dow = addDays(projStart, d).getDay();
    if (dow === 0 || dow === 6) {
      g.append('rect')
        .attr('x', d * pxDay).attr('y', headerH)
        .attr('width', pxDay).attr('height', totalH - headerH)
        .attr('fill', 'rgba(0,0,0,0.028)');
    }
  }
}

// ─── WEEK GRID LINES ─────────────────────────────────────────────────────────
function _g3WeekLines(svg, projStart, totalDays, pxDay, totalH, headerH) {
  const g = svg.append('g').attr('pointer-events', 'none');
  for (let d = 0; d < totalDays; d++) {
    if (addDays(projStart, d).getDay() === 1) {
      g.append('line')
        .attr('x1', d * pxDay).attr('x2', d * pxDay)
        .attr('y1', headerH).attr('y2', totalH)
        .attr('stroke', 'var(--border-light, #e2e8f0)').attr('stroke-width', 1);
    }
  }
}

// ─── MONTH + WEEK HEADERS ─────────────────────────────────────────────────────
function _g3Headers(svg, projStart, projEnd, pxDay, xScale, weekColW, headerH) {
  const mBg = svg.append('g').attr('pointer-events', 'none');
  mBg.append('rect').attr('x', 0).attr('y', 0)
    .attr('width', xScale.range()[1]).attr('height', G_MONTH_H)
    .attr('fill', 'var(--bg-input, #f8fafc)');
  mBg.append('line').attr('x1', 0).attr('x2', xScale.range()[1])
    .attr('y1', G_MONTH_H).attr('y2', G_MONTH_H)
    .attr('stroke', 'var(--border, #e2e8f0)').attr('stroke-width', 1);

  d3.timeMonth.range(d3.timeMonth.floor(projStart), projEnd).forEach(m => {
    const mEnd  = d3.timeMonth.offset(m, 1);
    const clipS = new Date(Math.max(m.getTime(), projStart.getTime()));
    const clipE = new Date(Math.min(mEnd.getTime(), projEnd.getTime()));
    const x = xScale(clipS), w = Math.max(2, xScale(clipE) - x);
    const label = w > 140 ? d3.timeFormat('%B %Y')(m)
                : w > 80  ? d3.timeFormat('%b %Y')(m)
                : w > 40  ? d3.timeFormat('%b')(m) : '';
    const cell = mBg.append('g').attr('transform', `translate(${x},0)`);
    cell.append('rect').attr('width', w).attr('height', G_MONTH_H)
      .attr('fill', 'none').attr('stroke', 'var(--border, #e2e8f0)').attr('stroke-width', 1);
    if (label) cell.append('text').attr('x', 6).attr('y', 15)
      .attr('font-size', 11).attr('font-weight', 700)
      .attr('fill', 'var(--text-primary, #1e293b)').text(label);
  });

  if (weekColW < 55) return;
  const wBg = svg.append('g').attr('transform', `translate(0,${G_MONTH_H})`).attr('pointer-events', 'none');
  wBg.append('rect').attr('x', 0).attr('y', 0)
    .attr('width', xScale.range()[1]).attr('height', G_WEEK_H)
    .attr('fill', 'var(--bg-input, #f8fafc)');
  wBg.append('line').attr('x1', 0).attr('x2', xScale.range()[1])
    .attr('y1', G_WEEK_H).attr('y2', G_WEEK_H)
    .attr('stroke', 'var(--border, #e2e8f0)').attr('stroke-width', 1);

  d3.timeMonday.range(d3.timeMonday.floor(projStart), projEnd).forEach(w => {
    const x = xScale(w);
    if (x < 0 || x > xScale.range()[1]) return;
    const isCur = diffDays(w, TODAY) >= 0 && diffDays(w, TODAY) < 7;
    const label = weekColW > 100 ? 'Wk ' + fmt(w) : fmt(w);
    const cell  = wBg.append('g').attr('transform', `translate(${x},0)`);
    cell.append('rect').attr('width', weekColW).attr('height', G_WEEK_H)
      .attr('fill', isCur ? 'var(--accent-light, #eff6ff)' : 'none')
      .attr('stroke', 'var(--border-light, #e2e8f0)').attr('stroke-width', 1);
    cell.append('text').attr('x', weekColW / 2).attr('y', 13)
      .attr('text-anchor', 'middle').attr('font-size', 9).attr('font-weight', 500)
      .attr('fill', isCur ? 'var(--accent, #e8793b)' : '#aaa').text(label);
  });
}

// ─── BARS ─────────────────────────────────────────────────────────────────────
function _g3Bars(svg, rowLayout, critIds, xScale, pxDay, wrap, grouped) {
  rowLayout.forEach(entry => {
    if (entry.type === 'trade') {
      _drawTradeBanner(svg, entry, grouped, xScale);
    } else {
      _drawActivityBar(svg, entry, critIds, xScale, pxDay, wrap);
    }
  });
}

function _drawTradeBanner(svg, entry, grouped, xScale) {
  const { trade, y } = entry;
  const color = TRADE_COLORS[trade] || '#94a3b8';
  const items = grouped[trade];
  const tS = new Date(Math.min(...items.map(a => _gS(a).getTime())));
  const tE = new Date(Math.max(...items.map(a => _gF(a).getTime())));
  const tX = xScale(tS);
  const tW = Math.max(20, xScale(tE) - tX);

  const g = svg.append('g')
    .attr('transform', `translate(0,${y})`)
    .style('cursor', 'pointer')
    .on('click', () => {
      if (!window._ganttCollapsed) window._ganttCollapsed = new Set();
      if (window._ganttCollapsed.has(trade)) window._ganttCollapsed.delete(trade);
      else window._ganttCollapsed.add(trade);
      drawGanttD3();
    });

  g.append('rect')
    .attr('x', tX).attr('y', G_BAR_Y).attr('width', tW).attr('height', 20)
    .attr('fill', color).attr('opacity', 0.15).attr('rx', 4);
  g.append('text')
    .attr('x', tX + 6).attr('y', G_BAR_Y + 13)
    .attr('font-size', 9).attr('font-weight', 700).attr('fill', color)
    .text(trade.toUpperCase());
}

function _drawActivityBar(svg, entry, critIds, xScale, pxDay, wrap) {
  const { item: a, y: rowY } = entry;
  const color = TRADE_COLORS[a.trade] || '#94a3b8';
  const aS    = _gS(a);
  const aF    = _gF(a);
  const barX  = xScale(aS);
  const barW  = Math.max(pxDay * 0.5, xScale(aF) - barX);
  const op    = a.status === 'Complete' ? 0.38 : 1;

  const rowG = svg.append('g')
    .attr('class', 'g3-bar-row')
    .attr('data-id', a.id)
    .attr('transform', `translate(0,${rowY})`);

  // Full-width row background (no pointer events — bar handles mouse)
  rowG.append('rect')
    .attr('x', 0).attr('y', 0)
    .attr('width', xScale.range()[1]).attr('height', G_ROW_H)
    .attr('fill', 'transparent').attr('pointer-events', 'none');

  const barG = rowG.append('g').attr('class', 'g3-bar');

  const barRect = barG.append('rect')
    .attr('class', 'g3-bar-rect').attr('data-actid', a.id)
    .attr('x', barX).attr('y', G_BAR_Y)
    .attr('width', barW).attr('height', G_BAR_H)
    .attr('fill', color).attr('opacity', op).attr('rx', 4)
    .style('cursor', 'grab');

  if (critIds.has(a.id)) {
    barRect.attr('stroke', 'var(--red,#dc2626)').attr('stroke-width', 1.5);
  }

  if (a.pct > 0) {
    barG.append('rect')
      .attr('class', 'g3-bar-pct')
      .attr('x', barX).attr('y', G_BAR_Y)
      .attr('width', barW * (a.pct / 100)).attr('height', G_BAR_H)
      .attr('fill', 'rgba(0,0,0,0.18)').attr('rx', 4)
      .attr('pointer-events', 'none');
  }

  if (barW > 40) {
    const maxChars = Math.floor(barW / 6.5);
    barG.append('text')
      .attr('class', 'g3-bar-label')
      .attr('x', barX + 6).attr('y', G_BAR_Y + 12)
      .attr('font-size', 9).attr('font-weight', 600).attr('fill', '#fff')
      .attr('pointer-events', 'none')
      .style('text-shadow', '0 1px 2px rgba(0,0,0,0.4)')
      .text(a.name.length > maxChars ? a.name.slice(0, maxChars) + '…' : a.name);
  }

  if (a.milestone) {
    rowG.append('text')
      .attr('x', barX - 8).attr('y', G_BAR_Y + 14)
      .attr('font-size', 14).attr('fill', color)
      .attr('pointer-events', 'none').text('◆');
  }

  const HANDLE_W = 8;
  const leftHandle = barG.append('rect')
    .attr('class', 'g3-handle g3-handle-left')
    .attr('x', barX).attr('y', G_BAR_Y)
    .attr('width', HANDLE_W).attr('height', G_BAR_H)
    .attr('fill', 'rgba(255,255,255,0.4)').attr('rx', 3)
    .style('cursor', 'ew-resize').attr('opacity', 0);

  const rightHandle = barG.append('rect')
    .attr('class', 'g3-handle g3-handle-right')
    .attr('x', barX + barW - HANDLE_W).attr('y', G_BAR_Y)
    .attr('width', HANDLE_W).attr('height', G_BAR_H)
    .attr('fill', 'rgba(255,255,255,0.4)').attr('rx', 3)
    .style('cursor', 'ew-resize').attr('opacity', 0);

  barG
    .on('mouseenter', () => { leftHandle.attr('opacity', 0.8); rightHandle.attr('opacity', 0.8); })
    .on('mouseleave', () => { leftHandle.attr('opacity', 0);   rightHandle.attr('opacity', 0); });

  // ── Tooltip ──
  barG
    .on('mouseover.tip', ev => _showTip(ev, a, aS, aF, wrap))
    .on('mousemove.tip', ev => { const el = document.getElementById('g3-tooltip'); if (el) _g3PositionTooltip(ev, el, wrap); })
    .on('mouseout.tip',  ()  => { const el = document.getElementById('g3-tooltip'); if (el) el.style.display = 'none'; });

  // ── Attach drag handlers ──
  _attachMoveDrag(barG, barRect, a, aS, xScale, rowY);
  _attachResizeDrag(leftHandle,  'left',  barRect, a, xScale, pxDay);
  _attachResizeDrag(rightHandle, 'right', barRect, a, xScale, pxDay);
}

// ─── MOVE DRAG — horizontal (date) + vertical (trade reassign) ────────────────
// Convert a clientY coordinate to SVG-local Y, accounting for container scroll.
// Uses #ganttD3Wrap (the SVG parent) as the reference — its getBoundingClientRect().top
// moves as the user scrolls, so adding scrollTop gives the true SVG-absolute Y.
function _clientYtoSvgY(clientY) {
  const container = document.getElementById('ganttTimeline');
  if (!container) return clientY;
  // The SVG is the first child of #ganttD3Wrap which is the first child of #ganttTimeline.
  // The SVG's top in screen coords = container.getBoundingClientRect().top - container.scrollTop
  // So: svgY = clientY - (containerTop - scrollTop) = clientY - containerTop + scrollTop
  const containerRect = container.getBoundingClientRect();
  return clientY - containerRect.top + container.scrollTop;
}

function _attachMoveDrag(barG, barRect, a, aS, xScale, rowY) {
  const svgEl   = barRect.node().closest('svg');
  const barNode = barG.node();

  barNode.addEventListener('mousedown', function(e) {
    if (e.target.classList.contains('g3-handle')) return;
    e.preventDefault();
    e.stopPropagation();

    const startClientX = e.clientX;
    const startBarX    = parseFloat(barRect.attr('x'));
    const startBarW    = parseFloat(barRect.attr('width'));
    const color0       = TRADE_COLORS[a.trade] || '#94a3b8';
    let   moved        = false;
    let   lastTarget   = null;

    const ghost = d3.select(svgEl).append('rect')
      .attr('x', startBarX).attr('y', rowY + G_BAR_Y)
      .attr('width', startBarW).attr('height', G_BAR_H)
      .attr('fill', color0).attr('opacity', 0.55).attr('rx', 4)
      .attr('stroke', color0).attr('stroke-width', 2)
      .attr('stroke-dasharray', '5,3')
      .attr('pointer-events', 'none');

    const dropHl = d3.select(svgEl).append('rect')
      .attr('x', 0).attr('y', rowY)
      .attr('width', xScale.range()[1]).attr('height', G_ROW_H)
      .attr('fill', color0).attr('opacity', 0)
      .attr('pointer-events', 'none');

    const dropLabel = d3.select(svgEl).append('text')
      .attr('font-size', 9).attr('font-weight', 600)
      .attr('pointer-events', 'none').attr('display', 'none')
      .style('text-shadow', '0 1px 3px rgba(0,0,0,0.5)');

    // Vertical guide line — full height, snaps to ghost bar's left edge
    const svgH = parseFloat(d3.select(svgEl).attr('height')) || 800;
    const vLine = d3.select(svgEl).append('line')
      .attr('x1', startBarX).attr('x2', startBarX)
      .attr('y1', 0).attr('y2', svgH)
      .attr('stroke', 'var(--accent, #e8793b)').attr('stroke-width', 1)
      .attr('stroke-dasharray', '4,3').attr('opacity', 0)
      .attr('pointer-events', 'none');

    // Date badge at top of vertical line
    const dateBadgeBg = d3.select(svgEl).append('rect')
      .attr('x', startBarX - 30).attr('y', 2)
      .attr('width', 60).attr('height', 16).attr('rx', 3)
      .attr('fill', 'var(--accent, #e8793b)').attr('opacity', 0)
      .attr('pointer-events', 'none');
    const dateBadge = d3.select(svgEl).append('text')
      .attr('x', startBarX).attr('y', 14)
      .attr('text-anchor', 'middle')
      .attr('font-size', 9).attr('font-weight', 700)
      .attr('fill', '#fff').attr('opacity', 0)
      .attr('pointer-events', 'none');

    barRect.style('cursor', 'grabbing').attr('opacity', 0.25);

    const onMove = ev => {
      const dx = ev.clientX - startClientX;
      const dy = ev.clientY - (e.clientY);
      if (!moved && Math.abs(dx) < 3 && Math.abs(dy) < 3) return;
      moved = true;

      const curSvgY = _clientYtoSvgY(ev.clientY);
      const ghostX = startBarX + dx;
      ghost.attr('x', ghostX).attr('y', curSvgY - G_BAR_H / 2);

      // Vertical guide line at ghost's left edge
      vLine.attr('x1', ghostX).attr('x2', ghostX).attr('opacity', 0.6);

      // Date badge — show the date at the ghost bar's start position
      const snapDate = xScale.invert(ghostX);
      const dateStr = fmt(snapDate);
      dateBadge.attr('x', ghostX).attr('opacity', 1).text(dateStr);
      const textW = dateStr.length * 5.5 + 10;
      dateBadgeBg.attr('x', ghostX - textW / 2).attr('width', textW).attr('opacity', 0.9);

      const hit = _hitTestRow(curSvgY);
      lastTarget = hit;

      if (hit) {
        const isSelf = hit.type === 'row' && hit.item && hit.item.id === a.id;
        const tc = TRADE_COLORS[hit.trade] || '#94a3b8';
        const hlH = hit.type === 'trade' ? G_TRADE_H : G_ROW_H;
        ghost.attr('fill', tc).attr('stroke', tc);
        dropHl.attr('y', hit.y).attr('height', hlH)
          .attr('fill', tc).attr('opacity', isSelf ? 0 : 0.18);

        if (!isSelf) {
          const label = hit.type === 'trade' ? '→ ' + hit.trade
            : (hit.trade !== a.trade ? '→ ' + hit.trade + ': ' : '→ ') + (hit.item ? hit.item.name : '');
          dropLabel.attr('display', null)
            .attr('x', ghostX + startBarW + 6)
            .attr('y', curSvgY + 3).attr('fill', tc).text(label);
        } else {
          dropLabel.attr('display', 'none');
        }
      } else {
        ghost.attr('fill', color0).attr('stroke', color0);
        dropHl.attr('opacity', 0);
        dropLabel.attr('display', 'none');
      }
    };

    const onUp = ev => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup',   onUp);
      ghost.remove();
      dropHl.remove();
      dropLabel.remove();
      vLine.remove();
      dateBadge.remove();
      dateBadgeBg.remove();
      barRect.style('cursor', 'grab').attr('opacity', a.status === 'Complete' ? 0.38 : 1);

      if (!moved) {
        if (typeof ganttSidebarOn !== 'undefined' && ganttSidebarOn) openDetail(a.id);
        return;
      }

      let changed = false;

      // ── Horizontal: date shift ──
      const dx       = ev.clientX - startClientX;
      const pxPerDay = xScale(addDays(aS, 1)) - xScale(aS);
      const daysDelta = Math.round(dx / pxPerDay);
      if (daysDelta !== 0) {
        a.start  = isoDate(addDays(a.start,  daysDelta));
        a.finish = isoDate(addDays(a.finish, daysDelta));
        changed = true;
      }

      // ── Vertical: trade reassignment ──
      const oldTrade = a.trade;
      if (lastTarget && lastTarget.trade && lastTarget.trade !== oldTrade) {
        a.trade = lastTarget.trade;
        if (typeof SUBS !== 'undefined' && SUBS[a.trade]) a.sub = SUBS[a.trade];
        changed = true;
      }

      // ── Vertical: reorder within trade (drop on different activity row) ──
      if (lastTarget && lastTarget.type === 'row' && lastTarget.item && lastTarget.item.id !== a.id) {
        // Build custom sort order: place dragged activity right before/after target
        if (!window._ganttCustomOrder) window._ganttCustomOrder = {};
        const layout = window._ganttRowLayout || [];
        const rows = layout.filter(e => e.type === 'row' && e.item);
        // Re-index all rows, inserting dragged item at target's position
        const ordered = rows.map(r => r.item).filter(item => item.id !== a.id);
        const targetIdx = ordered.findIndex(item => item.id === lastTarget.item.id);
        if (targetIdx !== -1) {
          ordered.splice(targetIdx, 0, a);
        } else {
          ordered.push(a);
        }
        // Assign sort indices
        window._ganttCustomOrder = {};
        ordered.forEach((item, i) => { window._ganttCustomOrder[item.id] = i; });
        changed = true;
      }

      if (!changed) return;

      // Toast
      const tradeChanged = a.trade !== oldTrade;
      if (tradeChanged) {
        showToast(`Moved "${a.name}" → ${a.trade}: ${fmt(a.start)} → ${fmt(a.finish)}`);
      } else if (daysDelta !== 0) {
        showToast(`${a.id}: ${fmt(a.start)} → ${fmt(a.finish)}`);
      } else {
        showToast(`Reordered "${a.name}"`);
      }

      debouncedSave(a.id);

      const tl = document.getElementById('ganttTimeline');
      const sl = tl ? tl.scrollLeft : 0;
      const st = tl ? tl.scrollTop  : 0;
      render();
      requestAnimationFrame(() => {
        const t = document.getElementById('ganttTimeline');
        if (t) { t.scrollLeft = sl; t.scrollTop = st; }
      });
    };

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup',   onUp);
  });
}

// ─── HIT-TEST: which row layout entry is at SVG-Y? ──────────────────────────
function _hitTestRow(svgY) {
  const layout = window._ganttRowLayout;
  if (!layout) return null;
  for (const entry of layout) {
    const h = entry.type === 'trade' ? G_TRADE_H : G_ROW_H;
    if (svgY >= entry.y && svgY < entry.y + h) return entry;
  }
  return null;
}

// ─── RESIZE DRAG (horizontal only) ───────────────────────────────────────────
function _attachResizeDrag(handle, edge, barRect, a, xScale, pxDay) {
  handle.node().addEventListener('mousedown', function(e) {
    e.preventDefault();
    e.stopPropagation();

    const startClientX = e.clientX;
    const startBarX    = parseFloat(barRect.attr('x'));
    const startBarW    = parseFloat(barRect.attr('width'));

    const onMove = ev => {
      const dx = ev.clientX - startClientX;
      if (edge === 'left') {
        const newX = Math.min(startBarX + dx, startBarX + startBarW - pxDay);
        const newW = Math.max(pxDay, startBarW - (newX - startBarX));
        barRect.attr('x', newX).attr('width', newW);
        handle.attr('x', newX);
      } else {
        const newW = Math.max(pxDay, startBarW + dx);
        barRect.attr('width', newW);
        handle.attr('x', startBarX + newW - parseFloat(handle.attr('width')));
      }
    };

    const onUp = () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup',   onUp);

      if (edge === 'left') {
        const finalX  = parseFloat(barRect.attr('x'));
        const snapped = parseDate(isoDate(xScale.invert(finalX)));
        const finish  = parseDate(a.finish) || addDays(parseDate(a.start), a.duration || 1);
        a.start       = isoDate(snapped);
        a.duration    = Math.max(1, diffDays(snapped, finish));
      } else {
        const finalW = parseFloat(barRect.attr('width'));
        const newDur = Math.max(1, Math.round(finalW / pxDay));
        a.finish     = isoDate(addDays(a.start, newDur));
        a.duration   = newDur;
      }

      showToast(`${a.id}: ${fmt(a.start)} → ${fmt(a.finish)} (${a.duration}d)`);
      debouncedSave(a.id);
      const tl = document.getElementById('ganttTimeline');
      const sl = tl ? tl.scrollLeft : 0;
      render();
      requestAnimationFrame(() => { const t = document.getElementById('ganttTimeline'); if (t) t.scrollLeft = sl; });
    };

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup',   onUp);
  });
}

// ─── TOOLTIP ─────────────────────────────────────────────────────────────────
function _showTip(event, a, aS, aF, wrap) {
  const el = document.getElementById('g3-tooltip');
  if (!el) return;
  const dur = diffDays(aS, aF);
  el.innerHTML =
    `<div style="font-weight:700;font-size:12px;margin-bottom:3px;">${esc(a.name)}</div>` +
    `<div style="color:#94a3b8;font-size:10px;margin-bottom:5px;">${esc(a.trade)} · ${esc(a.status)}</div>` +
    `<div style="display:grid;grid-template-columns:1fr 1fr;gap:4px 10px;font-size:11px;">` +
    `<span style="color:#94a3b8;">Start</span><span>${fmt(aS)}</span>` +
    `<span style="color:#94a3b8;">Finish</span><span>${fmt(aF)}</span>` +
    `<span style="color:#94a3b8;">Duration</span><span>${dur}d</span>` +
    `<span style="color:#94a3b8;">Progress</span><span>${a.pct}%</span>` +
    `</div>`;
  el.style.display = 'block';
  _g3PositionTooltip(event, el, wrap);
}

function _g3PositionTooltip(event, el, wrap) {
  const wRect = wrap.getBoundingClientRect();
  let x = event.clientX - wRect.left + 14;
  let y = event.clientY - wRect.top  - 10;
  if (x + 230 > wRect.width)  x = event.clientX - wRect.left - 240;
  if (y + 130 > wRect.height) y = event.clientY - wRect.top  - 130;
  el.style.left = x + 'px';
  el.style.top  = y + 'px';
}

// ─── TODAY LINE ───────────────────────────────────────────────────────────────
function _g3TodayLine(svg, projStart, pxDay, totalH) {
  const todayX = diffDays(projStart, TODAY) * pxDay;
  if (todayX < 0 || todayX > pxDay * 3000) return;

  svg.append('line')
    .attr('x1', todayX).attr('x2', todayX).attr('y1', 0).attr('y2', totalH)
    .attr('stroke', 'var(--accent,#e8793b)').attr('stroke-width', 2).attr('opacity', 0.65)
    .attr('pointer-events', 'none');

  const pill = svg.append('g').attr('pointer-events', 'none');
  pill.append('rect').attr('x', todayX - 18).attr('y', 1).attr('width', 38).attr('height', 14)
    .attr('fill', 'var(--accent,#e8793b)').attr('rx', 4);
  pill.append('text').attr('x', todayX).attr('y', 11)
    .attr('text-anchor', 'middle').attr('font-size', 8).attr('font-weight', 700).attr('fill', '#fff')
    .text('TODAY');
}

// ─── DEPENDENCY ARROWS ────────────────────────────────────────────────────────
function _g3Arrows(svg) {
  const posMap = {};
  svg.selectAll('.g3-bar-rect').each(function() {
    const el   = d3.select(this);
    const id   = el.attr('data-actid');
    const x    = parseFloat(el.attr('x'));
    const w    = parseFloat(el.attr('width'));
    const rowEl = this.closest('.g3-bar-row');
    const tr   = rowEl ? d3.select(rowEl).attr('transform') : '';
    const m    = tr ? tr.match(/translate\([\d.]+,\s*([\d.]+)\)/) : null;
    const rowY = m ? parseFloat(m[1]) : 0;
    posMap[id] = { left: x, right: x + w, midY: rowY + G_ROW_H / 2 };
  });

  const defs = svg.append('defs');
  defs.append('marker').attr('id', 'g3arrow')
    .attr('markerWidth', 7).attr('markerHeight', 5)
    .attr('refX', 7).attr('refY', 2.5).attr('orient', 'auto')
    .append('polygon').attr('points', '0 0, 7 2.5, 0 5')
    .attr('fill', '#3b82f6').attr('opacity', 0.65);

  const arrowG = svg.append('g').attr('pointer-events', 'none');
  activities.forEach(a => {
    if (!a.successors || !a.successors.length) return;
    const from = posMap[a.id]; if (!from) return;
    a.successors.forEach(sId => {
      const to = posMap[sId]; if (!to) return;
      const cx = (from.right + to.left) / 2;
      arrowG.append('path')
        .attr('d', `M${from.right},${from.midY} C${cx},${from.midY} ${cx},${to.midY} ${to.left},${to.midY}`)
        .attr('fill', 'none').attr('stroke', '#3b82f6')
        .attr('stroke-width', 1.5).attr('stroke-dasharray', '4 3')
        .attr('opacity', 0.55).attr('marker-end', 'url(#g3arrow)');
    });
  });
}

// ─── TOOLTIP DOM ──────────────────────────────────────────────────────────────
function _g3Tooltip(wrap) {
  let el = document.getElementById('g3-tooltip');
  if (!el) {
    el = document.createElement('div');
    el.id = 'g3-tooltip';
    Object.assign(el.style, {
      position: 'absolute', background: 'rgba(15,23,42,0.94)', color: '#f1f5f9',
      padding: '10px 13px', borderRadius: '8px', fontSize: '11px', lineHeight: '1.6',
      pointerEvents: 'none', zIndex: '99', display: 'none', width: '220px',
      boxShadow: '0 8px 24px rgba(0,0,0,0.25)', border: '1px solid rgba(255,255,255,0.08)'
    });
  }
  wrap.appendChild(el);
}
