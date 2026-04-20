'use client';

import { Document, Page, View, Text, StyleSheet, pdf } from '@react-pdf/renderer';
import type { Activity } from '@/types';

// ─── Page geometry (all in pt — react-pdf native unit) ──────────────
// A3 landscape = 1190.55 × 841.89 pt. We use 1150 usable after 20pt h-padding each side.
const PAGE_USABLE_W = 1150;
const LEFT_W        = 220;    // left name panel width
const TL_W          = PAGE_USABLE_W - LEFT_W;  // timeline width = 930

const ROW_H    = 16;   // activity row height (pt)
const PHASE_H  = 20;   // phase header height (pt)
const HEADER_H = 32;   // date header height (pt)

// Scale: fit the full project span into TL_W — computed per-export, not constant.
// We pass pxPerDay into the document as a prop.

const BRAND = '#e8793b';

// ─── Colours ─────────────────────────────────────────────────────────
const TRADE_COLORS: Record<string, string> = {
  Framing:          '#6366f1',
  Plumbing:         '#06b6d4',
  Electrical:       '#eab308',
  Mechanical:       '#f97316',
  'Fire Sprinkler': '#ef4444',
  'Fire Alarm':     '#dc2626',
  Drywall:          '#8b5cf6',
  Tile:             '#10b981',
  Concrete:         '#78716c',
  Earthwork:        '#a16207',
  Roofing:          '#0369a1',
  Millwork:         '#854d0e',
  Painting:         '#be185d',
  FFE:              '#0891b2',
  'Structural Steel': '#374151',
};

function tradeColor(trade: string): string {
  const key = Object.keys(TRADE_COLORS).find((k) => (trade || '').includes(k));
  return key ? TRADE_COLORS[key] : '#64748b';
}

function barColor(a: Activity): string {
  if (a.status === 'Complete')    return '#22c55e';
  if (a.status === 'Blocked')     return '#ef4444';
  if (a.status === 'Delayed')     return '#f97316';
  if (a.status === 'In Progress') return '#3b82f6';
  return tradeColor(a.trade || '');
}

// ─── Date helpers ─────────────────────────────────────────────────────
function parseD(d: string | null | undefined): Date | null {
  if (!d) return null;
  const dt = new Date(d + 'T12:00');
  return isNaN(dt.getTime()) ? null : dt;
}
function addDaysD(d: Date, n: number): Date {
  const r = new Date(d); r.setDate(r.getDate() + n); return r;
}
function diffDays(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / 86400000);
}
function fmtTick(d: Date): string {
  return d.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' });
}
function fmtMonth(d: Date): string {
  return d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
}
function truncate(s: string, max: number): string {
  return s.length > max ? s.slice(0, max - 1) + '…' : s;
}

// ─── Types ────────────────────────────────────────────────────────────
interface Group { phase: string; activities: Activity[] }
interface Tick  { x: number; label: string }
interface Month { x: number; label: string }

interface DocProps {
  groups:      Group[];
  projectName: string;
  filterLabel: string;
  totalCount:  number;
  projStart:   Date;
  pxPerDay:    number;   // pt per calendar day — pre-computed to fit TL_W
  ticks:       Tick[];
  months:      Month[];
  todayX:      number | null;
  labelMap:    Record<string, string>;
}

// ─── StyleSheet ───────────────────────────────────────────────────────
const s = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 6,
    backgroundColor: '#fff',
    paddingTop: 18,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },

  // ── Page-level header ──
  pageHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  title:      { fontSize: 12, fontFamily: 'Helvetica-Bold', color: BRAND },
  subtitle:   { fontSize: 6,  color: '#64748b', marginTop: 1 },
  exportedAt: { fontSize: 5.5, color: '#94a3b8' },

  // ── Date header ──
  dateHeaderRow: {
    flexDirection: 'row',
    height: HEADER_H,
    borderBottomWidth: 0.5,
    borderBottomColor: '#cbd5e1',
  },
  dateHeaderLeft: {
    width: LEFT_W,
    flexShrink: 0,
    justifyContent: 'flex-end',
    paddingBottom: 3,
    paddingLeft: 4,
    borderRightWidth: 0.5,
    borderRightColor: '#cbd5e1',
  },
  dateHeaderLeftText: { fontSize: 5.5, color: '#94a3b8', fontFamily: 'Helvetica-Bold' },
  dateHeaderTimeline: {
    width: TL_W,
    flexShrink: 0,
    position: 'relative',
    overflow: 'hidden',
  },

  // ── Month band ──
  monthBand: {
    position: 'absolute',
    top: 0,
    height: 14,
    fontSize: 6,
    color: '#334155',
    fontFamily: 'Helvetica-Bold',
    paddingLeft: 2,
  },

  // ── Week tick ──
  tickLine: {
    position: 'absolute',
    bottom: 0,
    width: 0.5,
    backgroundColor: '#cbd5e1',
    height: 10,
  },
  tickLabel: {
    position: 'absolute',
    bottom: 2,
    fontSize: 5,
    color: '#94a3b8',
  },

  // ── Grid lines (inside timeline cells) ──
  gridLine: {
    position: 'absolute',
    top: 0,
    width: 0.5,
    backgroundColor: '#e2e8f0',
  },
  todayLine: {
    position: 'absolute',
    top: 0,
    width: 1,
    backgroundColor: '#f43f5e',
  },

  // ── Phase row ──
  phaseRow: { flexDirection: 'row' },
  phaseLeft: {
    width: LEFT_W,
    flexShrink: 0,
    height: PHASE_H,
    backgroundColor: '#f1f5f9',
    borderLeftWidth: 2.5,
    borderLeftColor: BRAND,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4,
    borderRightWidth: 0.5,
    borderRightColor: '#cbd5e1',
  },
  phaseLeftText:  { fontSize: 7, fontFamily: 'Helvetica-Bold', color: '#334155', flex: 1 },
  phaseLeftCount: { fontSize: 5.5, color: '#94a3b8', flexShrink: 0 },
  phaseTl: {
    width: TL_W,
    flexShrink: 0,
    height: PHASE_H,
    backgroundColor: '#f1f5f9',
    position: 'relative',
    overflow: 'hidden',
  },

  // ── Activity row ──
  actRow: { flexDirection: 'row' },
  actLeft: {
    width: LEFT_W,
    flexShrink: 0,
    height: ROW_H,
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 10,
    paddingRight: 3,
    borderRightWidth: 0.5,
    borderRightColor: '#e2e8f0',
  },
  actLabel: { fontSize: 5.5, color: BRAND, fontFamily: 'Helvetica-Bold', width: 24, flexShrink: 0 },
  actName:  { fontSize: 5.5, color: '#1e293b' },
  actTl: {
    width: TL_W,
    flexShrink: 0,
    height: ROW_H,
    position: 'relative',
    overflow: 'hidden',
  },

  // ── Bar ──
  bar: {
    position: 'absolute',
    height: 9,
    top: (ROW_H - 9) / 2,
    borderRadius: 2,
  },

  // ── Footer ──
  footer: {
    position: 'absolute',
    bottom: 10, left: 20, right: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 0.5,
    borderTopColor: '#e2e8f0',
    paddingTop: 3,
  },
  footerText: { fontSize: 5.5, color: '#94a3b8' },
});

// ─── Document ─────────────────────────────────────────────────────────
function GanttPdfDocument({
  groups, projectName, filterLabel, totalCount,
  projStart, pxPerDay, ticks, months, todayX, labelMap,
}: DocProps) {
  const exportedAt = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

  type FlatRow =
    | { kind: 'phase'; phase: string; count: number }
    | { kind: 'act';   a: Activity; label: string; ri: number };

  const flatRows: FlatRow[] = [];
  let ri = 0;
  groups.forEach(({ phase, activities }) => {
    flatRows.push({ kind: 'phase', phase, count: activities.length });
    activities.forEach((a) => flatRows.push({ kind: 'act', a, label: labelMap[a.id] || '', ri: ri++ }));
  });

  // Pre-compute bar positions for all activities
  function barPos(a: Activity): { x: number; w: number } | null {
    const dur = Math.max(1, a.duration || 1);
    let sd = parseD(a.start);
    let fd = parseD(a.finish);
    if (sd && !fd) fd = addDaysD(sd, dur - 1);
    else if (fd && !sd) sd = addDaysD(fd, -(dur - 1));
    if (!sd || !fd) return null;
    const x = diffDays(projStart, sd) * pxPerDay;
    const w = Math.max(pxPerDay, (diffDays(sd, fd) + 1) * pxPerDay);
    // clip to timeline
    if (x + w < 0 || x > TL_W) return null;
    const cx = Math.max(0, x);
    const cw = Math.min(w - (cx - x), TL_W - cx);
    if (cw <= 0) return null;
    return { x: cx, w: cw };
  }

  return (
    <Document title={`${projectName} — Gantt Schedule`} author="Boulder Construction">
      <Page size="A3" orientation="landscape" style={s.page} wrap>

        {/* ── Top header ── */}
        <View style={s.pageHeader} fixed>
          <View>
            <Text style={s.title}>Boulder Construction — {projectName}</Text>
            <Text style={s.subtitle}>
              Gantt Schedule{filterLabel ? `  ·  ${filterLabel}` : ''}  ·  {totalCount} activities
            </Text>
          </View>
          <Text style={s.exportedAt}>Exported {exportedAt}</Text>
        </View>

        {/* ── Date header (repeats on every page) ── */}
        <View style={s.dateHeaderRow} fixed>
          <View style={s.dateHeaderLeft}>
            <Text style={s.dateHeaderLeftText}>ACTIVITY</Text>
          </View>
          <View style={s.dateHeaderTimeline}>
            {/* Month labels */}
            {months.map((m, i) => (
              <Text key={`m${i}`} style={[s.monthBand, { left: m.x }]}>{m.label}</Text>
            ))}
            {/* Week ticks */}
            {ticks.map((t, i) => (
              <View key={`t${i}`}>
                <View style={[s.tickLine, { left: t.x }]} />
                <Text style={[s.tickLabel, { left: t.x + 1 }]}>{t.label}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* ── Rows ── */}
        {flatRows.map((row, i) => {
          if (row.kind === 'phase') {
            return (
              <View key={i} style={s.phaseRow} wrap={false}>
                <View style={s.phaseLeft}>
                  <Text style={s.phaseLeftText}>{truncate(row.phase, 28)}</Text>
                  <Text style={s.phaseLeftCount}>{row.count}t</Text>
                </View>
                <View style={s.phaseTl}>
                  {ticks.map((t, ti) => (
                    <View key={ti} style={[s.gridLine, { left: t.x, height: PHASE_H }]} />
                  ))}
                  {todayX !== null && (
                    <View style={[s.todayLine, { left: todayX, height: PHASE_H }]} />
                  )}
                </View>
              </View>
            );
          }

          const { a, label, ri: rowI } = row;
          const bgColor = rowI % 2 === 0 ? '#f8fafc' : '#ffffff';
          const bp = barPos(a);
          const color = barColor(a);
          const pct = Math.min(100, Math.max(0, a.pct ?? 0));

          return (
            <View key={i} style={s.actRow} wrap={false}>
              <View style={[s.actLeft, { backgroundColor: bgColor }]}>
                <Text style={s.actLabel}>{label}</Text>
                <Text style={s.actName}>{truncate(a.name, 32)}</Text>
              </View>
              <View style={[s.actTl, { backgroundColor: bgColor }]}>
                {/* Grid lines */}
                {ticks.map((t, ti) => (
                  <View key={ti} style={[s.gridLine, { left: t.x, height: ROW_H }]} />
                ))}
                {/* Today line */}
                {todayX !== null && (
                  <View style={[s.todayLine, { left: todayX, height: ROW_H }]} />
                )}
                {/* Bar */}
                {bp && (
                  <>
                    {/* Full bar bg */}
                    <View style={[s.bar, { left: bp.x, width: bp.w, backgroundColor: color, opacity: 0.22 }]} />
                    {/* Progress fill */}
                    {pct > 0 && (
                      <View style={[s.bar, { left: bp.x, width: bp.w * pct / 100, backgroundColor: color, opacity: 0.9 }]} />
                    )}
                    {/* Border outline */}
                    <View style={[s.bar, { left: bp.x, width: bp.w, backgroundColor: 'transparent', borderWidth: 0.8, borderColor: color }]} />
                  </>
                )}
              </View>
            </View>
          );
        })}

        {/* ── Footer ── */}
        <View style={s.footer} fixed>
          <Text style={s.footerText}>Boulder Construction Schedule Command Center</Text>
          <Text style={s.footerText} render={({ pageNumber, totalPages }) => `Page ${pageNumber} / ${totalPages}`} />
        </View>

      </Page>
    </Document>
  );
}

// ─── Export entry point ───────────────────────────────────────────────
export async function exportGanttPdf(
  groups:      Group[],
  projectName: string,
  filterLabel: string,
  totalCount:  number,
  labelMap:    Record<string, string>,
) {
  // ── 1. Compute project date span ──
  const times: number[] = [];
  groups.forEach(({ activities }) =>
    activities.forEach((a) => {
      const dur = Math.max(1, a.duration || 1);
      let sd = parseD(a.start);
      let fd = parseD(a.finish);
      if (sd && !fd) fd = addDaysD(sd, dur - 1);
      else if (fd && !sd) sd = addDaysD(fd, -(dur - 1));
      if (sd) times.push(sd.getTime());
      if (fd) times.push(fd.getTime());
    })
  );
  const now = new Date();
  if (times.length === 0) { times.push(now.getTime()); times.push(addDaysD(now, 30).getTime()); }

  const projStart = addDaysD(new Date(Math.min(...times)), -7);
  const projEnd   = addDaysD(new Date(Math.max(...times)), 14);
  const totalDays = diffDays(projStart, projEnd) + 1;

  // ── 2. Scale to fit TL_W ──
  const pxPerDay = TL_W / totalDays;

  // ── 3. Build ticks & months ──
  const ticks: Tick[] = [];
  // Decide week tick interval based on scale
  const tickEvery = pxPerDay * 7 >= 12 ? 7 : pxPerDay * 14 >= 12 ? 14 : 30;
  for (let d = 0; d <= totalDays; d += tickEvery) {
    ticks.push({ x: d * pxPerDay, label: fmtTick(addDaysD(projStart, d)) });
  }

  const months: Month[] = [];
  let cur = new Date(projStart.getFullYear(), projStart.getMonth(), 1);
  if (cur < projStart) cur = new Date(projStart.getFullYear(), projStart.getMonth() + 1, 1);
  while (cur <= projEnd) {
    months.push({ x: diffDays(projStart, cur) * pxPerDay, label: fmtMonth(cur) });
    cur = new Date(cur.getFullYear(), cur.getMonth() + 1, 1);
  }

  // ── 4. Today marker ──
  const todayOffset = diffDays(projStart, now);
  const todayX = todayOffset >= 0 && todayOffset <= totalDays ? todayOffset * pxPerDay : null;

  // ── 5. Render ──
  const doc = (
    <GanttPdfDocument
      groups={groups}
      projectName={projectName}
      filterLabel={filterLabel}
      totalCount={totalCount}
      projStart={projStart}
      pxPerDay={pxPerDay}
      ticks={ticks}
      months={months}
      todayX={todayX}
      labelMap={labelMap}
    />
  );

  const blob = await pdf(doc).toBlob();
  const url  = URL.createObjectURL(blob);
  const el   = document.createElement('a');
  el.href     = url;
  el.download  = `gantt_${new Date().toISOString().slice(0, 10)}.pdf`;
  el.click();
  URL.revokeObjectURL(url);
}
