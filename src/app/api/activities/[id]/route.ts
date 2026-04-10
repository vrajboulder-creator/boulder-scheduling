import { NextRequest, NextResponse } from 'next/server';
import { ActivitiesDB } from '@/lib/db';
import { validateActivity, safeError } from '@/lib/validation';

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Ctx) {
  try {
    const { id } = await params;
    const data = await ActivitiesDB.getById(id);
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: 'Activity not found' }, { status: 404 });
  }
}

export async function PUT(req: NextRequest, { params }: Ctx) {
  try {
    const { id } = await params;
    const body = await req.json();
    const errs = validateActivity(body, true);
    if (errs.length) return NextResponse.json({ error: errs.join(', ') }, { status: 400 });
    const data = await ActivitiesDB.update(id, body);
    return NextResponse.json(data);
  } catch (err: unknown) {
    console.error('PUT /api/activities/:id error:', err);
    return NextResponse.json({ error: safeError(err) }, { status: 400 });
  }
}

export async function PATCH(req: NextRequest, { params }: Ctx) {
  try {
    const { id } = await params;
    const body = await req.json();
    const errs = validateActivity(body, true);
    if (errs.length) return NextResponse.json({ error: errs.join(', ') }, { status: 400 });
    const data = await ActivitiesDB.update(id, body);
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({ error: safeError(err) }, { status: 400 });
  }
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  try {
    const { id } = await params;
    await ActivitiesDB.remove(id);
    return NextResponse.json({ deleted: true });
  } catch (err) {
    return NextResponse.json({ error: safeError(err) }, { status: 400 });
  }
}
