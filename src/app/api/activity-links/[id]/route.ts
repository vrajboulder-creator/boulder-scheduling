import { NextRequest, NextResponse } from 'next/server';
import { ActivityLinksDB } from '@/lib/db';
import { safeError } from '@/lib/validation';

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await ActivityLinksDB.remove(id);
    return NextResponse.json({ deleted: true });
  } catch (err) {
    return NextResponse.json({ error: safeError(err) }, { status: 400 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const data = await ActivityLinksDB.update(id, body);
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({ error: safeError(err) }, { status: 400 });
  }
}
