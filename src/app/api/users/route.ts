import { NextRequest, NextResponse } from 'next/server';
import { UsersDB } from '@/lib/db';
import { safeError } from '@/lib/validation';
import type { UserRole } from '@/types';

const VALID_ROLES: UserRole[] = ['Admin', 'PM', 'Superintendent', 'Field', 'Subcontractor', 'Viewer'];

function validateUser(body: Record<string, unknown>, isUpdate: boolean): string[] {
  const errors: string[] = [];
  if (!isUpdate && (!body.full_name || typeof body.full_name !== 'string' || !body.full_name.trim()))
    errors.push('full_name is required');
  if (body.full_name !== undefined && (typeof body.full_name !== 'string' || body.full_name.length > 200))
    errors.push('full_name must be a string under 200 chars');
  if (body.role !== undefined && !VALID_ROLES.includes(body.role as UserRole))
    errors.push('invalid role');
  if (body.email !== undefined && body.email !== null && typeof body.email !== 'string')
    errors.push('email must be a string');
  return errors;
}

function allowlistUser(body: Record<string, unknown>) {
  const safe: Record<string, unknown> = {};
  for (const key of ['full_name', 'role', 'company', 'phone', 'email'] as const) {
    if (key in body) safe[key] = body[key];
  }
  return safe;
}

export async function GET() {
  try {
    const data = await UsersDB.getAll();
    return NextResponse.json(data);
  } catch (err) {
    console.error('GET /api/users error:', err);
    return NextResponse.json({ error: safeError(err) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const raw = await req.json();
    const body = allowlistUser(raw);
    const errs = validateUser(body, false);
    if (errs.length) return NextResponse.json({ error: errs.join(', ') }, { status: 400 });
    const data = await UsersDB.create(body as Parameters<typeof UsersDB.create>[0]);
    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    console.error('POST /api/users error:', err);
    return NextResponse.json({ error: safeError(err) }, { status: 500 });
  }
}
