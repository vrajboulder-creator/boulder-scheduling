alter table activities
  add column if not exists estimated_start  date,
  add column if not exists estimated_finish date;
