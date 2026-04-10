import { NextRequest, NextResponse } from 'next/server';
import { LinkedItemsDB } from '@/lib/db';
import { safeError } from '@/lib/validation';

export async function GET() {
  try {
    const data = await LinkedItemsDB.getAll();
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({ error: safeError(err) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = await LinkedItemsDB.create(body);
    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: safeError(err) }, { status: 400 });
  }
}
