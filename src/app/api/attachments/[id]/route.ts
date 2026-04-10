import { NextRequest, NextResponse } from 'next/server';
import { AttachmentsDB } from '@/lib/db';
import { safeError } from '@/lib/validation';

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await AttachmentsDB.remove(id);
    return NextResponse.json({ deleted: true });
  } catch (err) {
    return NextResponse.json({ error: safeError(err) }, { status: 400 });
  }
}
