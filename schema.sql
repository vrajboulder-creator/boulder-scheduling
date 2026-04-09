-- ═══════════════════════════════════════════════════
-- Boulder Construction — Schedule Command Center
-- Supabase PostgreSQL Schema
-- Run this in Supabase SQL Editor
-- ═══════════════════════════════════════════════════

-- ─── PROJECTS ───
CREATE TABLE IF NOT EXISTS projects (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT UNIQUE NOT NULL,
  location TEXT,
  weather_info TEXT DEFAULT '',
  status TEXT DEFAULT 'Active' CHECK (status IN ('Active', 'On Hold', 'Complete', 'Archived')),
  start_date DATE,
  target_completion DATE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ─── ACTIVITIES ───
CREATE TABLE IF NOT EXISTS activities (
  id TEXT PRIMARY KEY,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  trade TEXT DEFAULT 'General / GC',
  sub TEXT DEFAULT '',
  area TEXT DEFAULT 'Tower A',
  floor TEXT DEFAULT '',
  phase TEXT DEFAULT '',
  start_date DATE,
  finish_date DATE,
  duration INTEGER DEFAULT 0,
  status TEXT DEFAULT 'Not Started' CHECK (status IN ('Not Started', 'In Progress', 'Complete', 'Delayed', 'Blocked', 'Ready to Start')),
  pct INTEGER DEFAULT 0 CHECK (pct >= 0 AND pct <= 100),
  priority TEXT DEFAULT 'Normal' CHECK (priority IN ('Critical', 'High', 'Normal', 'Low')),
  blocker TEXT DEFAULT '',
  milestone BOOLEAN DEFAULT FALSE,
  lookahead BOOLEAN DEFAULT FALSE,
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ─── ACTIVITY RELATIONSHIPS (predecessor/successor) ───
CREATE TABLE IF NOT EXISTS activity_links (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  predecessor_id TEXT REFERENCES activities(id) ON DELETE CASCADE,
  successor_id TEXT REFERENCES activities(id) ON DELETE CASCADE,
  link_type TEXT DEFAULT 'FS' CHECK (link_type IN ('FS', 'FF', 'SS', 'SF')),
  lag_days INTEGER DEFAULT 0,
  UNIQUE(predecessor_id, successor_id)
);

-- ─── LINKED ITEMS (RFIs, submittals, inspections, procurement) ───
CREATE TABLE IF NOT EXISTS linked_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  activity_id TEXT REFERENCES activities(id) ON DELETE CASCADE,
  item_type TEXT NOT NULL CHECK (item_type IN ('RFI', 'Submittal', 'Inspection', 'Procurement', 'Permit', 'Punch', 'CO')),
  reference TEXT NOT NULL,
  status TEXT DEFAULT 'Open',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ─── ATTACHMENTS ───
CREATE TABLE IF NOT EXISTS attachments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  activity_id TEXT REFERENCES activities(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_size INTEGER DEFAULT 0,
  file_type TEXT DEFAULT '',
  uploaded_at TIMESTAMPTZ DEFAULT now()
);

-- ─── ACTIVITY NOTES / LOG ───
CREATE TABLE IF NOT EXISTS activity_notes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  activity_id TEXT REFERENCES activities(id) ON DELETE CASCADE,
  note TEXT NOT NULL,
  author TEXT DEFAULT 'Field',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ─── USERS (Supabase Auth extends this) ───
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  full_name TEXT,
  role TEXT DEFAULT 'Field' CHECK (role IN ('Admin', 'PM', 'Superintendent', 'Field', 'Subcontractor', 'Viewer')),
  company TEXT DEFAULT '',
  phone TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ─── INDEXES ───
CREATE INDEX IF NOT EXISTS idx_activities_project ON activities(project_id);
CREATE INDEX IF NOT EXISTS idx_activities_status ON activities(status);
CREATE INDEX IF NOT EXISTS idx_activities_trade ON activities(trade);
CREATE INDEX IF NOT EXISTS idx_activities_phase ON activities(phase);
CREATE INDEX IF NOT EXISTS idx_activity_links_pred ON activity_links(predecessor_id);
CREATE INDEX IF NOT EXISTS idx_activity_links_succ ON activity_links(successor_id);
CREATE INDEX IF NOT EXISTS idx_linked_items_activity ON linked_items(activity_id);
CREATE INDEX IF NOT EXISTS idx_attachments_activity ON attachments(activity_id);
CREATE INDEX IF NOT EXISTS idx_activity_notes_activity ON activity_notes(activity_id);

-- ─── AUTO-UPDATE updated_at ───
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_projects_updated
  BEFORE UPDATE ON projects FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE OR REPLACE TRIGGER trg_activities_updated
  BEFORE UPDATE ON activities FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ─── ROW LEVEL SECURITY (enable for production) ───
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE linked_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Allow public read/write for now (tighten in production)
CREATE POLICY "Allow all on projects" ON projects FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on activities" ON activities FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on activity_links" ON activity_links FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on linked_items" ON linked_items FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on attachments" ON attachments FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on activity_notes" ON activity_notes FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on user_profiles" ON user_profiles FOR ALL USING (true) WITH CHECK (true);

-- ─── SEED: Default Projects ───
INSERT INTO projects (name, code, location, weather_info, start_date, target_completion) VALUES
  ('Hampton Inn — Beaumont, TX', 'hampton-inn', 'Beaumont, TX', '⛅ 94°F — Heat Advisory Thu-Fri', '2026-01-05', '2026-07-24'),
  ('Fairfield Inn — Midland, TX', 'fairfield-inn', 'Midland, TX', '⛅ 102°F — Extreme Heat Warning', '2026-02-15', '2026-09-30'),
  ('Holiday Inn Express — Tyler, TX', 'holiday-inn', 'Tyler, TX', '⛅ 78°F — Rain likely Wed', '2026-03-01', '2026-10-15')
ON CONFLICT (code) DO NOTHING;
