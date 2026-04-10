import { NextRequest, NextResponse } from 'next/server';
import { AttachmentsDB } from '@/lib/db';
import { safeError } from '@/lib/validation';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const data = await AttachmentsDB.getForActivity(id);
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({ error: safeError(err) }, { status: 500 });
  }
}
