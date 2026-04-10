import { NextRequest, NextResponse } from 'next/server';
import { ActivitiesDB } from '@/lib/db';
import { safeError } from '@/lib/validation';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!Array.isArray(body)) return NextResponse.json({ error: 'Expected array' }, { status: 400 });
    if (body.length > 500) return NextResponse.json({ error: 'Max 500 activities per bulk save' }, { status: 400 });
    const data = await ActivitiesDB.bulkUpsert(body);
    return NextResponse.json({ saved: data.length });
  } catch (err) {
    return NextResponse.json({ error: safeError(err) }, { status: 400 });
  }
}
