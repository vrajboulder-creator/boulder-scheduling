import type { ActivityStatus, ActivityPriority } from '@/types';

const VALID_STATUSES: ActivityStatus[] = ['Not Started', 'In Progress', 'Complete', 'Delayed', 'Blocked', 'Ready to Start'];
const VALID_PRIORITIES: ActivityPriority[] = ['Critical', 'High', 'Normal', 'Low'];

export function validateActivity(body: Record<string, unknown>, isUpdate: boolean): string[] {
  const errors: string[] = [];
  if (!isUpdate && !body.name) errors.push('name is required');
  if (body.name && (typeof body.name !== 'string' || body.name.length > 200)) errors.push('name must be string under 200 chars');
  if (body.status && !VALID_STATUSES.includes(body.status as ActivityStatus)) errors.push('invalid status');
  if (body.priority && !VALID_PRIORITIES.includes(body.priority as ActivityPriority)) errors.push('invalid priority');
  if (body.pct !== undefined && (typeof body.pct !== 'number' || body.pct < 0 || body.pct > 100)) errors.push('pct must be 0-100');
  if (body.duration !== undefined && (typeof body.duration !== 'number' || body.duration < 0 || body.duration > 999)) errors.push('invalid duration');
  if (body.notes && typeof body.notes !== 'string') errors.push('notes must be string');
  if (body.notes && typeof body.notes === 'string' && body.notes.length > 5000) errors.push('notes too long (max 5000)');
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
  const msg = err instanceof Error ? err.message : 'Unknown error';
  if (msg.includes('duplicate') || msg.includes('unique')) return 'Duplicate entry';
  if (msg.includes('not found') || msg.includes('no rows')) return 'Not found';
  if (msg.includes('violates')) return 'Validation error';
  return 'Server error';
}
