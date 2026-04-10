import { NextRequest, NextResponse } from 'next/server';
import { ActivityNotesDB } from '@/lib/db';
import { safeError } from '@/lib/validation';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const data = await ActivityNotesDB.getForActivity(id);
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({ error: safeError(err) }, { status: 500 });
  }
}
