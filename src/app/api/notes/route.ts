import { NextRequest, NextResponse } from 'next/server';
import { ActivityNotesDB } from '@/lib/db';
import { safeError } from '@/lib/validation';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = await ActivityNotesDB.create(body);
    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: safeError(err) }, { status: 400 });
  }
}
