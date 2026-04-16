# Boulder Construction Schedule Command Center

Hotel construction scheduling SaaS. Project: Hampton Inn Beaumont TX.

## Stack

- **Next.js 15** (App Router, `src/app/`)
- **React 19** + **TypeScript**
- **Zustand** for state (`src/hooks/useAppStore.ts`)
- **Supabase** backend (Postgres + REST via `@supabase/supabase-js`)
- **Tailwind + Radix UI** for components
- **Playwright** for e2e tests
- Deploy: **Netlify**

## Repo layout

```
src/
  app/                 Next.js routes (UI pages + API)
    api/               REST endpoints (activities, activity-links, linked-items)
  components/
    ui/                Shared UI (ActivityTable, StatusBadge, etc.)
    views/             Page-level views (MasterView, DashboardView, SettingsView)
    gantt/             Gantt chart
    detail/            Right-side detail panel
    modal/             Activity create/edit modals
  hooks/               useAppStore (Zustand), useApi (REST wrapper)
  lib/                 helpers.ts (date math, resolver), db/ (Supabase clients)
  types/               TypeScript types (Activity, ActivityLink, etc.)
tests/                 Playwright e2e suites
migrations/            SQL schema migrations
scripts/               Python one-offs (CSV import, link wiring)
```

## Scripts

```bash
npm run dev      # Next.js dev server on :3000
npm run build    # Production build
npm run start    # Serve production build
npm run lint     # ESLint
npx tsc --noEmit # Typecheck
```

## Testing — ALWAYS HEADED

Run Playwright with `--headed` so the user can watch the browser live. Never default to headless for this project.

```bash
npx playwright test --headed --reporter=line
npx playwright test tests/link-types.spec.ts --headed --reporter=line
npx playwright test -g "MAX logic" --headed --reporter=line
```

**Existing suites:**
- `tests/dependency-date-propagation.spec.ts` — cascade + MAX logic (8 tests)
- `tests/link-types.spec.ts` — FS/SS/FF/SF + lag + cycle + UI badge (11 tests)

Dev server must run on :3000 (playwright.config reuses existing server).

## Core domain model

### Activity (`src/types/index.ts`)

A scheduled task. Has `start`, `finish`, `duration`, `predecessors[]`, `successors[]`, plus metadata (trade, area, floor, phase, status, priority).

### ActivityLink

Dependency edge. `{ predecessor_id, successor_id, link_type, lag_days }`. Source of truth in Supabase `activity_links` table, mirrored in Zustand store as `activityLinks`.

### Link types (MS Project-parity)

- **FS** (Finish-to-Start, default) — succ.start = pred.finish + 1 + lag
- **SS** (Start-to-Start) — succ.start = pred.start + lag
- **FF** (Finish-to-Finish) — succ.finish = pred.finish + lag
- **SF** (Start-to-Finish) — succ.finish = pred.start + lag

### Multi-dependency rule

```
start  = MAX(constraint from all preds) + 1
finish = start + duration − 1
```

## The resolver — `src/lib/helpers.ts`

`resolveAllDates(activities, links)` is the **cascade engine**. Call whenever predecessors or dates change.

Algorithm:
1. Kahn's topological sort from zero-indegree nodes
2. For each node, compute latest start-constraint + latest finish-constraint across all predecessors honoring link_type + lag
3. Reconcile so BOTH constraints satisfied (pick later start)
4. Cascade to successors via decremented indegree
5. **Cycle fallback**: unresolved nodes processed earliest-stored-start first, forcing indegree=0

Output: new `Activity[]` with updated start/finish. Unchanged nodes keep identity.

## Where dates live

- **DB** (`activities.start_date` / `finish_date`) — source of truth for stored values
- **Store** (`useAppStore.activities`) — in-memory, cascade-resolved on load + on every mutation
- **UI** — read from store, re-render on store change via selectors

Cascade results **are persisted** back to DB via `saveChangedWithLimit` (diff before/after, PATCH changed rows concurrency 5).

## Key files

| Purpose | Path |
|---------|------|
| Date resolver (MAX + cascade + cycles) | `src/lib/helpers.ts` → `resolveAllDates` |
| Store (Zustand) | `src/hooks/useAppStore.ts` |
| API client | `src/hooks/useApi.ts` |
| Master schedule table | `src/components/ui/ActivityTable.tsx` |
| Detail panel | `src/components/detail/DetailPanel.tsx` |
| Settings + User Manual | `src/components/views/SettingsView.tsx` |
| Gantt | `src/components/gantt/GanttView.tsx` |
| Activity CRUD routes | `src/app/api/activities/` |
| Link CRUD routes | `src/app/api/activity-links/` |

## User preferences

- **Premium, polished UI** — "pro max", "stylish", "professional"
- Boulder brand orange `#e8793b` as accent
- White sidebar, clean modern aesthetic
- Thin/minimal scrollbars, line+dot indicators
- SVG icons (lucide-react) — never emoji unless asked
- Both list AND grid views available
- **Caveman mode** speaking style appreciated (concise, no filler)

## UI patterns

- All dates rendered via `fmt()` from `helpers.ts` — "Apr 18" (month + day, NO year in cells). Full year in tooltips via `fmtFull()`.
- Link type badges: amber pill, click cycles FS → SS → FF → SF
- Predecessor pills: blue pill, × button removes link
- Row click opens detail panel; cell-level actions `e.stopPropagation()`

## Gantt expectations

- Fullscreen toggle
- Date range filter
- Resizable bars (drag edges → duration update → cascade)
- Zoom (Ctrl+scroll) with header scaling
- Grouped by phase/trade, collapsible
- Dashed blue dependency arrows
- Weekend shading at day zoom
- Left panel: Title/Start/End table

## Conventions

- Prefer editing existing files over creating new ones
- No comments unless non-obvious WHY (invariant, workaround, surprising behavior)
- Don't add error handling for impossible paths; trust internal guarantees
- `git status` / `git log` for history, not memory
- Zustand slice selectors (`useAppStore((s) => s.activities)`) — narrow to avoid re-renders
- `memo(ActivityTableInner)` on expensive tables — ref-equality on items/mode

## Do NOT

- Skip the `--headed` flag on Playwright runs
- Mock the database in integration tests
- Add emoji or decorative markdown unless asked
- Create planning docs / summary files without user request
- Rewrite when a targeted fix works

## Current state

- Multi-dep MAX logic: working, verified by 19 Playwright tests
- Link types: FS/SS/FF/SF + lag supported end-to-end (resolver, store, API, UI, DB)
- User Manual section in Settings page explains link types + cascade + cycles
- Cycle fallback: best-effort resolve (not block)

Last major feature: link type column + click-to-cycle badge + User Manual section.
