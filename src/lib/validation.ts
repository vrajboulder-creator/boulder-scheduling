import type { ActivityStatus, ActivityPriority } from '@/types';

const VALID_STATUSES: ActivityStatus[] = ['Not Started', 'In Progress', 'Complete', 'Delayed', 'Blocked', 'Ready to Start'];
const VALID_PRIORITIES: ActivityPriority[] = ['Critical', 'High', 'Normal', 'Low'];

// Fields clients are allowed to send — everything else is stripped before hitting the DB
export const ALLOWED_ACTIVITY_FIELDS = [
  'id', 'project_id', 'parent_id', 'name', 'trade', 'sub', 'area', 'floor',
  'phase', 'start_date', 'finish_date', 'duration', 'status', 'pct',
  'priority', 'blocker', 'milestone', 'lookahead', 'notes', 'sort_order',
] as const;

/** Strip any fields not in the allowlist — prevents mass assignment */
export function allowlistActivity(body: Record<string, unknown>): Record<string, unknown> {
  const safe: Record<string, unknown> = {};
  for (const key of ALLOWED_ACTIVITY_FIELDS) {
    if (key in body) safe[key] = body[key];
  }
  return safe;
}

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function validateActivity(body: Record<string, unknown>, isUpdate: boolean): string[] {
  const errors: string[] = [];

  if (!isUpdate && !body.name) errors.push('name is required');
  if (body.name !== undefined && (typeof body.name !== 'string' || body.name.length === 0 || body.name.length > 200))
    errors.push('name must be a non-empty string under 200 chars');

  if (body.status !== undefined && !VALID_STATUSES.includes(body.status as ActivityStatus))
    errors.push('invalid status');
  if (body.priority !== undefined && !VALID_PRIORITIES.includes(body.priority as ActivityPriority))
    errors.push('invalid priority');

  if (body.pct !== undefined && (typeof body.pct !== 'number' || body.pct < 0 || body.pct > 100))
    errors.push('pct must be a number 0–100');
  if (body.duration !== undefined && (typeof body.duration !== 'number' || body.duration < 0 || body.duration > 9999))
    errors.push('duration must be a number 0–9999');

  if (body.start_date !== undefined && body.start_date !== null && !ISO_DATE_RE.test(String(body.start_date)))
    errors.push('start_date must be YYYY-MM-DD');
  if (body.finish_date !== undefined && body.finish_date !== null && !ISO_DATE_RE.test(String(body.finish_date)))
    errors.push('finish_date must be YYYY-MM-DD');

  if (body.notes !== undefined && (typeof body.notes !== 'string' || body.notes.length > 5000))
    errors.push('notes must be a string under 5000 chars');

  if (body.milestone !== undefined && typeof body.milestone !== 'boolean')
    errors.push('milestone must be a boolean');
  if (body.lookahead !== undefined && typeof body.lookahead !== 'boolean')
    errors.push('lookahead must be a boolean');

  return errors;
}

export function validateProject(body: Record<string, unknown>): string[] {
  const errors: string[] = [];
  if (!body.name || typeof body.name !== 'string') errors.push('name required');
  if (!body.code || typeof body.code !== 'string') errors.push('code required');
  if (body.name && typeof body.name === 'string' && body.name.length > 200) errors.push('name too long');
  return errors;
}

export function safeError(err: unknown): string {
  const msg = (err instanceof Error ? err.message : String(err)).toLowerCase();
  if (msg.includes('duplicate') || msg.includes('unique')) return 'Duplicate entry';
  if (msg.includes('not found') || msg.includes('no rows')) return 'Not found';
  if (msg.includes('violates') || msg.includes('constraint')) return 'Validation error';
  if (msg.includes('connect') || msg.includes('timeout')) return 'Database unavailable';
  return 'Server error';
}
