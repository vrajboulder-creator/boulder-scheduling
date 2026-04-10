import { NextRequest, NextResponse } from 'next/server';
import { ActivitiesDB } from '@/lib/db';
import { validateActivity, safeError } from '@/lib/validation';

export async function GET(req: NextRequest) {
  try {
    const projectId = req.nextUrl.searchParams.get('project_id') || undefined;
    const data = await ActivitiesDB.getAll(projectId);
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({ error: safeError(err) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const errs = validateActivity(body, false);
    if (errs.length) return NextResponse.json({ error: errs.join(', ') }, { status: 400 });
    const data = await ActivitiesDB.create(body);
    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: safeError(err) }, { status: 400 });
  }
}
