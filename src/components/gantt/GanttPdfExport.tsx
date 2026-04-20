'use client';

import { Document, Page, View, Text, StyleSheet, pdf } from '@react-pdf/renderer';
import type { Activity } from '@/types';

// ─── Layout constants ───────────────────────────────────────────────
const LEFT_W   = 200;   // px — left label panel
const ROW_H    = 14;    // px — activity row height
const PHASE_H  = 18;    // px — phase header row height
const HEADER_H = 28;    // px — date header height
const PX_DAY   = 3.5;   // px per calendar day
const PAGE_W   = 1190;  // A3 landscape pt (approx usable after padding)
const TIMELINE_W = PAGE_W - LEFT_W;

const BRAND = '#e8793b';

// ─── Status / trade colours ──────────────────────────────────────────
const STATUS_COLOR: Record<string, string> = {
  'Not Started':    '#94a3b8',
  'In Progress':    '#3b82f6',
  'Complete':       '#22c55e',
  'Delayed':        '#f97316',
  'Blocked':        '#ef4444',
  'Ready to Start': '#a855f7',
};

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
  const key = Object.keys(TRADE_COLORS).find((k) => trade?.includes(k));
  return key ? TRADE_COLORS[key] : '#64748b';
}

function barColor(a: Activity): string {
  if (a.status === 'Complete') return '#22c55e';
  if (a.status === 'Blocked')  return '#ef4444';
  if (a.status === 'Delayed')  return '#f97316';
  if (a.status === 'In Progress') return '#3b82f6';
  return tradeColor(a.trade || '');
}

// ─── Date helpers ────────────────────────────────────────────────────
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
function fmtShort(d: Date): string {
  return d.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' });
}
function fmtMonthYear(d: Date): string {
  return d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
}

// ─── Styles ──────────────────────────────────────────────────────────
const s = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 6,
    backgroundColor: '#ffffff',
    paddingTop: 20,
    paddingBottom: 18,
    paddingHorizontal: 16,
  },
  // Page header
  pageHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  title: { fontSize: 11, fontFamily: 'Helvetica-Bold', color: BRAND },
  subtitle: { fontSize: 6, color: '#64748b', marginTop: 1 },
  exportedAt: { fontSize: 5.5, color: '#94a3b8', textAlign: 'right' },

  // Body row wrapper
  row: { flexDirection: 'row' },

  // Left panel
  leftPanel: { width: LEFT_W, flexShrink: 0 },
  leftPhase: {
    height: PHASE_H,
    backgroundColor: '#f1f5f9',
    borderLeftWidth: 2.5, borderLeftColor: BRAND,
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 4,
  },
  leftPhaseText: { fontSize: 6.5, fontFamily: 'Helvetica-Bold', color: '#334155', flex: 1 },
  leftPhaseCount: { fontSize: 5.5, color: '#94a3b8' },
  leftActivity: {
    height: ROW_H,
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 4, paddingLeft: 8,
  },
  leftLabel: { fontSize: 5.5, color: BRAND, fontFamily: 'Helvetica-Bold', width: 22, flexShrink: 0 },
  leftName: { fontSize: 5.5, color: '#1e293b', flex: 1 },

  // Timeline panel
  timelinePanel: { flex: 1, position: 'relative', overflow: 'hidden' },
  dateHeader: {
    height: HEADER_H,
    flexDirection: 'row',
    borderBottomWidth: 0.5, borderBottomColor: '#e2e8f0',
    marginBottom: 0,
  },
  monthLabel: {
    position: 'absolute', top: 2,
    fontSize: 6, color: '#334155', fontFamily: 'Helvetica-Bold',
  },
  weekTick: {
    position: 'absolute', top: 14,
    fontSize: 5, color: '#94a3b8',
  },
  weekLine: {
    position: 'absolute', top: 14, bottom: 0,
    width: 0.5, backgroundColor: '#e2e8f0',
  },
  phaseStripe: {
    height: PHASE_H,
    backgroundColor: '#f8fafc',
    borderBottomWidth: 0.5, borderBottomColor: '#e2e8f0',
  },
  activityStripeEven: {
    height: ROW_H,
    backgroundColor: '#f8fafc',
  },
  activityStripeOdd: {
    height: ROW_H,
    backgroundColor: '#ffffff',
  },
  todayLine: {
    position: 'absolute',
    top: 0, bottom: 0,
    width: 1, backgroundColor: '#f43f5e',
  },
  bar: {
    position: 'absolute',
    height: 9,
    top: (ROW_H - 9) / 2,
    borderRadius: 2,
  },
  barLabel: {
    position: 'absolute',
    fontSize: 4.5,
    color: '#ffffff',
    top: (ROW_H - 9) / 2 + 1,
  },
  footer: {
    position: 'absolute', bottom: 10, left: 16, right: 16,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    borderTopWidth: 0.5, borderTopColor: '#e2e8f0', paddingTop: 3,
  },
  footerText: { fontSize: 5.5, color: '#94a3b8' },
});

// ─── Types ───────────────────────────────────────────────────────────
interface Group { phase: string; activities: Activity[] }

interface DocProps {
  groups: Group[];
  projectName: string;
  filterLabel: string;
  totalCount: number;
  projStart: Date;
  projEnd: Date;
  labelMap: Record<string, string>;
}

// ─── Build week tick positions ────────────────────────────────────────
function buildTicks(projStart: Date, projEnd: Date) {
  const ticks: { x: number; label: string; isMonthStart: boolean; month?: string; monthX?: number }[] = [];
  const total = diffDays(projStart, projEnd);

  // Month labels
  const months: { x: number; label: string }[] = [];
  let cur = new Date(projStart);
  cur.setDate(1);
  if (cur < projStart) cur.setMonth(cur.getMonth() + 1);
  while (cur <= projEnd) {
    const x = diffDays(projStart, cur) * PX_DAY;
    months.push({ x, label: fmtMonthYear(cur) });
    cur = new Date(cur.getFullYear(), cur.getMonth() + 1, 1);
  }

  // Week ticks every 7 days
  for (let d = 0; d <= total; d += 7) {
    const date = addDaysD(projStart, d);
    const x = d * PX_DAY;
    ticks.push({ x, label: fmtShort(date), isMonthStart: false });
  }

  return { ticks, months };
}

// ─── Document ────────────────────────────────────────────────────────
function GanttPdfDocument({ groups, projectName, filterLabel, totalCount, projStart, projEnd, labelMap }: DocProps) {
  const exportedAt = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  const totalDays = diffDays(projStart, projEnd) + 1;
  const timelineW = totalDays * PX_DAY;

  const todayX = diffDays(projStart, new Date()) * PX_DAY;
  const showToday = todayX >= 0 && todayX <= timelineW;

  const { ticks, months } = buildTicks(projStart, projEnd);

  // Pages: split rows across A3 landscape pages.
  // Usable height per page (pt): A3 landscape ~841pt - 20-18 padding - 28 header - 22 date header = ~753pt
  // But we use fixed layout so we just render one long page — react-pdf will wrap.

  // Flatten all rows: [phase-header, ...activities] per group
  type FlatRow =
    | { kind: 'phase'; phase: string; count: number }
    | { kind: 'activity'; activity: Activity; label: string; rowIdx: number };

  const flatRows: FlatRow[] = [];
  let rowIdx = 0;
  groups.forEach(({ phase, activities }) => {
    flatRows.push({ kind: 'phase', phase, count: activities.length });
    activities.forEach((a) => {
      flatRows.push({ kind: 'activity', activity: a, label: labelMap[a.id] || a.id, rowIdx: rowIdx++ });
    });
  });

  // Compute cumulative Y offsets for bars (needed for absolute positioning per page)
  // We'll use a single long View and let react-pdf page-break it.
  // However react-pdf doesn't support SVG/canvas — we render each bar as an absolute View inside
  // a fixed-height View per row. This means the timeline column for each row must be its own positioned container.

  return (
    <Document title={`${projectName} — Gantt Schedule`} author="Boulder Construction">
      <Page
        size="A3"
        orientation="landscape"
        style={s.page}
        wrap
      >
        {/* ── Page header ── */}
        <View style={s.pageHeader} fixed>
          <View>
            <Text style={s.title}>Boulder Construction — {projectName}</Text>
            <Text style={s.subtitle}>
              Gantt Schedule Export{filterLabel ? `  ·  ${filterLabel}` : ''}  ·  {totalCount} activities
            </Text>
          </View>
          <Text style={s.exportedAt}>Exported {exportedAt}</Text>
        </View>

        {/* ── Date header row (fixed at top of each page) ── */}
        <View style={s.row} fixed>
          {/* Left spacer */}
          <View style={[s.leftPanel, { height: HEADER_H, borderBottomWidth: 0.5, borderBottomColor: '#e2e8f0', backgroundColor: '#fff' }]}>
            <Text style={{ fontSize: 6, color: '#94a3b8', padding: 4, paddingTop: 10 }}>ACTIVITY</Text>
          </View>
          {/* Timeline header */}
          <View style={[s.timelinePanel, { height: HEADER_H, position: 'relative', overflow: 'hidden' }]}>
            {/* Month labels */}
            {months.map((m, i) => (
              <Text key={i} style={[s.monthLabel, { left: Math.max(0, m.x) }]}>{m.label}</Text>
            ))}
            {/* Week ticks */}
            {ticks.map((t, i) => (
              <View key={i}>
                <View style={[s.weekLine, { left: t.x, top: HEADER_H - 10, height: 10 }]} />
                <Text style={[s.weekTick, { left: t.x + 1 }]}>{t.label}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* ── Rows ── */}
        {flatRows.map((row, i) => {
          if (row.kind === 'phase') {
            return (
              <View key={i} style={s.row} wrap={false}>
                {/* Left phase label */}
                <View style={s.leftPhase}>
                  <Text style={s.leftPhaseText}>{row.phase}</Text>
                  <Text style={s.leftPhaseCount}>{row.count} {row.count === 1 ? 'task' : 'tasks'}</Text>
                </View>
                {/* Timeline phase stripe */}
                <View style={[s.phaseStripe, { flex: 1 }]}>
                  {/* week grid lines */}
                  {ticks.map((t, ti) => (
                    <View key={ti} style={[s.weekLine, { left: t.x, top: 0, height: PHASE_H }]} />
                  ))}
                  {showToday && (
                    <View style={[s.todayLine, { left: todayX, top: 0, height: PHASE_H }]} />
                  )}
                </View>
              </View>
            );
          }

          // Activity row
          const { activity: a, label, rowIdx: ri } = row;
          const stripe = ri % 2 === 0 ? s.activityStripeEven : s.activityStripeOdd;

          const dur = Math.max(1, a.duration || 1);
          let startD = parseD(a.start);
          let finishD = parseD(a.finish);
          if (startD && !finishD) finishD = addDaysD(startD, dur - 1);
          else if (finishD && !startD) startD = addDaysD(finishD, -(dur - 1));

          let barX: number | null = null;
          let barW: number | null = null;
          if (startD && finishD) {
            barX = diffDays(projStart, startD) * PX_DAY;
            barW = Math.max(PX_DAY, (diffDays(startD, finishD) + 1) * PX_DAY);
          }

          const color = barColor(a);
          const pct = a.pct ?? 0;

          return (
            <View key={i} style={s.row} wrap={false}>
              {/* Left label */}
              <View style={[s.leftActivity, { backgroundColor: stripe.backgroundColor }]}>
                <Text style={s.leftLabel}>{label}</Text>
                <Text style={s.leftName}>{a.name.length > 30 ? a.name.slice(0, 29) + '…' : a.name}</Text>
              </View>

              {/* Timeline cell */}
              <View style={[stripe, { flex: 1, position: 'relative' }]}>
                {/* week grid lines */}
                {ticks.map((t, ti) => (
                  <View key={ti} style={[s.weekLine, { left: t.x, top: 0, height: ROW_H }]} />
                ))}
                {showToday && (
                  <View style={[s.todayLine, { left: todayX, top: 0, height: ROW_H }]} />
                )}
                {/* Bar */}
                {barX !== null && barW !== null && barX + barW >= 0 && barX <= timelineW && (
                  <>
                    {/* Background (full bar) */}
                    <View style={[s.bar, { left: barX, width: barW, backgroundColor: color, opacity: 0.25 }]} />
                    {/* Progress fill */}
                    {pct > 0 && (
                      <View style={[s.bar, { left: barX, width: barW * (pct / 100), backgroundColor: color }]} />
                    )}
                    {/* Outline */}
                    <View style={[s.bar, { left: barX, width: barW, backgroundColor: 'transparent', borderWidth: 0.75, borderColor: color }]} />
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

// ─── Export function ─────────────────────────────────────────────────
export async function exportGanttPdf(
  groups: Group[],
  projectName: string,
  filterLabel: string,
  totalCount: number,
  labelMap: Record<string, string>,
) {
  // Compute project date range
  const times: number[] = [];
  groups.forEach(({ activities }) => {
    activities.forEach((a) => {
      const dur = Math.max(1, a.duration || 1);
      let s = parseD(a.start);
      let f = parseD(a.finish);
      if (s && !f) f = addDaysD(s, dur - 1);
      else if (f && !s) s = addDaysD(f, -(dur - 1));
      if (s) times.push(s.getTime());
      if (f) times.push(f.getTime());
    });
  });

  const now = new Date();
  if (times.length === 0) { times.push(now.getTime()); times.push(addDaysD(now, 30).getTime()); }

  const projStart = addDaysD(new Date(Math.min(...times)), -7);
  const projEnd   = addDaysD(new Date(Math.max(...times)), 14);

  const doc = (
    <GanttPdfDocument
      groups={groups}
      projectName={projectName}
      filterLabel={filterLabel}
      totalCount={totalCount}
      projStart={projStart}
      projEnd={projEnd}
      labelMap={labelMap}
    />
  );

  const blob = await pdf(doc).toBlob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `gantt_${new Date().toISOString().slice(0, 10)}.pdf`;
  a.click();
  URL.revokeObjectURL(url);
}
