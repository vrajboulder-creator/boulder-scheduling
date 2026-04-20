-- ─── Migration 003: app_users table + assignee_id on activities ───
-- Run this in Supabase SQL editor (Dashboard → SQL Editor → New query)

-- 1. Standalone app_users table (not tied to Supabase Auth)
CREATE TABLE IF NOT EXISTS app_users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  full_name TEXT NOT NULL,
  role TEXT DEFAULT 'Field' CHECK (role IN ('Admin', 'PM', 'Superintendent', 'Field', 'Subcontractor', 'Viewer')),
  company TEXT DEFAULT '',
  phone TEXT DEFAULT '',
  email TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Add assignee_id to activities table
ALTER TABLE activities
  ADD COLUMN IF NOT EXISTS assignee_id UUID REFERENCES app_users(id) ON DELETE SET NULL;

-- 3. Index for fast lookups by assignee
CREATE INDEX IF NOT EXISTS idx_activities_assignee ON activities(assignee_id);
