import { NextRequest, NextResponse } from 'next/server';
import { ActivitiesDB } from '@/lib/db';
import { validateActivity, allowlistActivity, safeError } from '@/lib/validation';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!Array.isArray(body)) return NextResponse.json({ error: 'Expected array' }, { status: 400 });
    if (body.length > 500) return NextResponse.json({ error: 'Max 500 activities per bulk save' }, { status: 400 });

    // Allowlist + validate every item
    const safe = body.map((item, i) => {
      if (typeof item !== 'object' || item === null) throw new Error(`Item ${i} is not an object`);
      return allowlistActivity(item as Record<string, unknown>);
    });

    const allErrors: string[] = [];
    safe.forEach((item, i) => {
      const errs = validateActivity(item, true); // treat as partial — bulk save is always an update/upsert
      errs.forEach((e) => allErrors.push(`[${i}] ${e}`));
    });
    if (allErrors.length) return NextResponse.json({ error: allErrors.join('; ') }, { status: 400 });

    const data = await ActivitiesDB.bulkUpsert(safe);
    return NextResponse.json({ saved: data.length });
  } catch (err) {
    console.error('POST /api/activities/bulk/save error:', err);
    return NextResponse.json({ error: safeError(err) }, { status: 500 });
  }
}
