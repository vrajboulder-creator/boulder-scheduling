import { NextRequest, NextResponse } from 'next/server';
import { ActivitiesDB } from '@/lib/db';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const data = await ActivitiesDB.getFullById(id);
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: 'Activity not found' }, { status: 404 });
  }
}
