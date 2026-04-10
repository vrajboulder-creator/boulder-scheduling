import { NextRequest, NextResponse } from 'next/server';
import { ProjectsDB } from '@/lib/db';
import { safeError } from '@/lib/validation';

// UUID regex to distinguish ID from code
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ param: string }> }
) {
  try {
    const { param } = await params;
    // If it looks like a UUID, get by id; otherwise get by code
    const data = UUID_RE.test(param)
      ? await ProjectsDB.getAll().then(all => all.find(p => p.id === param))
      : await ProjectsDB.getByCode(param);
    if (!data) return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ param: string }> }
) {
  try {
    const { param: id } = await params;
    const body = await req.json();
    const data = await ProjectsDB.update(id, body);
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({ error: safeError(err) }, { status: 400 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ param: string }> }
) {
  try {
    const { param: id } = await params;
    await ProjectsDB.remove(id);
    return NextResponse.json({ deleted: true });
  } catch (err) {
    return NextResponse.json({ error: safeError(err) }, { status: 400 });
  }
}
