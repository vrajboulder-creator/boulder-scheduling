import { NextRequest, NextResponse } from 'next/server';
import { safeError } from '@/lib/validation';

export async function POST(req: NextRequest) {
  try {
    const { activities, mode } = await req.json();

    if (!Array.isArray(activities) || activities.length === 0) {
      return NextResponse.json({ error: 'No activities provided' }, { status: 400 });
    }

    const apiKey = process.env.NVIDIA_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'AI not configured' }, { status: 500 });
    }

    const lines = activities
      .slice(0, 20)
      .map((a: any) =>
        `- ${a.name} | ${a.trade || '—'} | ${a.phase || '—'} | ${a.start_date || '?'} → ${a.finish_date || '?'} | ${a.status} | ${a.pct ?? 0}% | sub: ${a.sub || '—'}${a.blocker ? ` | BLOCKED: ${a.blocker}` : ''}`
      )
      .join('\n');

    const systemPrompt =
      mode === 'risk'
        ? `You are a senior construction project manager. Analyze these schedule activities and identify risks, delays, and blockers.

Return ONLY valid HTML (no markdown, no code fences). Use this exact structure:
<div class="ai-report">
  <div class="severity-block high">
    <div class="severity-label">🔴 High Severity</div>
    <div class="risk-item"><span class="risk-name">Activity Name</span><span class="risk-badge delay">Delay</span><p class="risk-action">Recommended action here.</p></div>
  </div>
  <div class="severity-block medium">
    <div class="severity-label">🟡 Medium Severity</div>
    ...
  </div>
  <div class="severity-block low">
    <div class="severity-label">🟢 Low Severity</div>
    ...
  </div>
</div>

Risk badge classes: use "delay" for Delay, "blocked" for Blocked, "atrisk" for At Risk. Be direct and field-ready. Only include severities that have items.`
        : `You are a senior construction project scheduler. Generate a professional 3-week look-ahead report.

Return ONLY valid HTML (no markdown, no code fences). Use this exact structure:
<div class="ai-report">
  <div class="week-block">
    <div class="week-header">Week 1 — <span class="week-dates">dates</span></div>
    <div class="section-label">Key Tasks</div>
    <ul class="task-list"><li><strong>Task Name</strong> — brief note</li></ul>
    <div class="section-label">Crew Coordination</div>
    <ul class="crew-list"><li>note</li></ul>
    <div class="section-label">Procurement Reminders</div>
    <ul class="procurement-list"><li>item</li></ul>
    <div class="section-label">PM Action Items</div>
    <ol class="action-list"><li>action</li></ol>
  </div>
  <!-- repeat for Week 2 and Week 3 -->
</div>

Be concise and field-ready. Estimate week date ranges based on activity start/finish dates provided.`;

    const userPrompt = `Schedule Activities:\n${lines}`;

    const res = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'nvidia/llama-3.1-nemotron-nano-8b-v1',
        max_tokens: 1200,
        temperature: 0.6,
        top_p: 0.9,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error('NVIDIA API error:', err);
      return NextResponse.json({ error: 'AI service error' }, { status: 502 });
    }

    const data = await res.json();
    const text = data.choices?.[0]?.message?.content ?? 'No response generated.';
    return NextResponse.json({ result: text });
  } catch (err) {
    console.error('POST /api/ai-lookahead error:', err);
    return NextResponse.json({ error: safeError(err) }, { status: 500 });
  }
}
