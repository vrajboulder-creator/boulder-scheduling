import { NextRequest, NextResponse } from 'next/server';
import { UsersDB } from '@/lib/db';
import { safeError } from '@/lib/validation';
import type { UserRole } from '@/types';

const VALID_ROLES: UserRole[] = ['Admin', 'PM', 'Superintendent', 'Field', 'Subcontractor', 'Viewer'];

function allowlistUser(body: Record<string, unknown>) {
  const safe: Record<string, unknown> = {};
  for (const key of ['full_name', 'role', 'company', 'phone', 'email'] as const) {
    if (key in body) safe[key] = body[key];
  }
  return safe;
}

function validateUserUpdate(body: Record<string, unknown>): string[] {
  const errors: string[] = [];
  if (body.full_name !== undefined && (typeof body.full_name !== 'string' || !body.full_name.trim() || body.full_name.length > 200))
    errors.push('full_name must be a non-empty string under 200 chars');
  if (body.role !== undefined && !VALID_ROLES.includes(body.role as UserRole))
    errors.push('invalid role');
  return errors;
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const raw = await req.json();
    const body = allowlistUser(raw);
    const errs = validateUserUpdate(body);
    if (errs.length) return NextResponse.json({ error: errs.join(', ') }, { status: 400 });
    const data = await UsersDB.update(id, body as Parameters<typeof UsersDB.update>[1]);
    return NextResponse.json(data);
  } catch (err) {
    console.error('PATCH /api/users/[id] error:', err);
    return NextResponse.json({ error: safeError(err) }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await UsersDB.remove(id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('DELETE /api/users/[id] error:', err);
    return NextResponse.json({ error: safeError(err) }, { status: 500 });
  }
}
