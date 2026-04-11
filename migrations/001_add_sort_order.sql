-- Adds a per-activity sort_order tiebreaker so bars with identical dates
-- can be manually reordered in the Gantt. The Gantt sorts by (start_date,
-- sort_order, id) so dates still drive ordering when they differ.
--
-- Run this once in the Supabase SQL editor (Dashboard → SQL).
-- Safe to re-run: guarded by IF NOT EXISTS / idempotent backfill.

-- 1. Add the column (nullable, default 0).
ALTER TABLE activities
  ADD COLUMN IF NOT EXISTS sort_order integer NOT NULL DEFAULT 0;

-- 2. Backfill: within each (project_id, trade) group, assign sequential
--    sort_order values in the current chronological order. Activities
--    with identical dates get arbitrary-but-stable ordering via id.
--    Using * 10 spacing so future inserts can slot between without renumbering.
WITH ordered AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY project_id, trade
      ORDER BY
        COALESCE(start_date, finish_date, '9999-12-31'::date) ASC,
        id ASC
    ) * 10 AS new_order
  FROM activities
)
UPDATE activities a
SET sort_order = ordered.new_order
FROM ordered
WHERE a.id = ordered.id
  AND a.sort_order = 0; -- only touch rows that haven't been set yet

-- 3. Index to keep the Gantt sort fast at scale.
CREATE INDEX IF NOT EXISTS idx_activities_project_trade_order
  ON activities (project_id, trade, start_date, sort_order, id);
