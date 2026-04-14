import { NextRequest, NextResponse } from 'next/server';
import { ActivitiesDB } from '@/lib/db';
import { validateActivity, allowlistActivity, safeError } from '@/lib/validation';

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Ctx) {
  try {
    const { id } = await params;
    const data = await ActivitiesDB.getById(id);
    return NextResponse.json(data);
  } catch (err) {
    const msg = (err instanceof Error ? err.message : '').toLowerCase();
    const is404 = msg.includes('not found') || msg.includes('no rows');
    return NextResponse.json(
      { error: is404 ? 'Activity not found' : safeError(err) },
      { status: is404 ? 404 : 500 }
    );
  }
}

// PUT = full replacement, PATCH = partial update — both use the same DB call
// but PUT requires name to be present
export async function PUT(req: NextRequest, { params }: Ctx) {
  try {
    const { id } = await params;
    const raw = await req.json();
    const body = allowlistActivity(raw);
    // For PUT, treat like a create-validation (name required)
    const errs = validateActivity(body, false);
    if (errs.length) return NextResponse.json({ error: errs.join(', ') }, { status: 400 });
    const data = await ActivitiesDB.update(id, body);
    return NextResponse.json(data);
  } catch (err) {
    console.error('PUT /api/activities/:id error:', err);
    return NextResponse.json({ error: safeError(err) }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: Ctx) {
  try {
    const { id } = await params;
    const raw = await req.json();
    const body = allowlistActivity(raw);
    const errs = validateActivity(body, true);
    if (errs.length) return NextResponse.json({ error: errs.join(', ') }, { status: 400 });
    const data = await ActivitiesDB.update(id, body);
    return NextResponse.json(data);
  } catch (err) {
    console.error('PATCH /api/activities/:id error:', err);
    return NextResponse.json({ error: safeError(err) }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  try {
    const { id } = await params;
    await ActivitiesDB.remove(id);
    return NextResponse.json({ deleted: true });
  } catch (err) {
    console.error('DELETE /api/activities/:id error:', err);
    return NextResponse.json({ error: safeError(err) }, { status: 500 });
  }
}
