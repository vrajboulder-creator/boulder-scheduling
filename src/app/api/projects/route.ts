import { NextRequest, NextResponse } from 'next/server';
import { ProjectsDB } from '@/lib/db';
import { validateProject, safeError } from '@/lib/validation';

export async function GET() {
  try {
    const data = await ProjectsDB.getAll();
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({ error: safeError(err) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const errs = validateProject(body);
    if (errs.length) return NextResponse.json({ error: errs.join(', ') }, { status: 400 });
    const data = await ProjectsDB.create(body);
    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: safeError(err) }, { status: 400 });
  }
}
