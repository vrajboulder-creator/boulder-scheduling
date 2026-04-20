import { NextRequest, NextResponse } from 'next/server';
import puppeteer from 'puppeteer';

export const maxDuration = 120;

export async function POST(req: NextRequest) {
  let browser;
  try {
    const { url, fromDate, toDate } = await req.json() as { url: string; fromDate: string; toDate: string };
    if (!url || typeof url !== 'string') {
      return NextResponse.json({ error: 'url required' }, { status: 400 });
    }
    const parsed = new URL(url);
    const host = req.headers.get('host') || 'localhost:3000';
    if (parsed.host !== host && parsed.hostname !== 'localhost') {
      return NextResponse.json({ error: 'invalid url' }, { status: 400 });
    }

    const ganttUrl = `${parsed.protocol}//${parsed.host}/?view=gantt&pdf=1&from=${fromDate}&to=${toDate}`;
    const cookieHeader = req.headers.get('cookie') || '';

    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    });

    const page = await browser.newPage();

    if (cookieHeader) {
      const cookies = cookieHeader.split(';').flatMap((c) => {
        const [name, ...rest] = c.trim().split('=');
        const n = name.trim(); const v = rest.join('=');
        if (!n) return [];
        return [{ name: n, value: v, domain: parsed.hostname }];
      });
      if (cookies.length) await page.browserContext().setCookie(...cookies);
    }

    // Safe viewport — never exceed Chromium's ~8000px screenshot limit
    const VP_W = 1800;
    const VP_H = 850;
    await page.setViewport({ width: VP_W, height: VP_H });
    await page.goto(ganttUrl, { waitUntil: 'networkidle2', timeout: 30000 });
    await page.waitForSelector('[data-gantt-row]', { timeout: 25000 });
    await new Promise((r) => setTimeout(r, 1000));

    // Measure scroll extents
    const { totalH, tlLeft } = await page.evaluate(() => {
      const tl   = document.querySelector<HTMLElement>('[data-timeline-scroll]');
      const left = document.querySelector<HTMLElement>('[data-left-scroll]');
      return {
        totalH: Math.max(tl?.scrollHeight ?? 0, left?.scrollHeight ?? 0),
        tlLeft: tl?.getBoundingClientRect().left ?? 220,
      };
    });

    if (!totalH) throw new Error('Cannot measure gantt height');

    // Find the horizontal scroll offset for fromDate so we start there
    const startScrollX = await page.evaluate((from: string) => {
      const tl = document.querySelector<HTMLElement>('[data-timeline-scroll]');
      if (!tl || !from) return 0;
      // Find the first gantt row bar that starts at/after fromDate
      const fromMs = new Date(from + 'T12:00').getTime();
      // Use the today-line position as a reference — it's at scrollLeft that matches today's offset
      // Better: find first visible bar's left position
      const firstBar = tl.querySelector<HTMLElement>('[data-bar]');
      if (!firstBar) return 0;
      // Walk all bars and find the one closest to fromDate
      const bars = Array.from(tl.querySelectorAll<HTMLElement>('[data-bar]'));
      let best = 0;
      let bestDiff = Infinity;
      bars.forEach((bar) => {
        const startAttr = bar.dataset.start;
        if (!startAttr) return;
        const barMs = new Date(startAttr + 'T12:00').getTime();
        const diff = Math.abs(barMs - fromMs);
        if (diff < bestDiff) { bestDiff = diff; best = bar.offsetLeft; }
      });
      return Math.max(0, best - 20);
    }, fromDate);

    const TL_VIS_W = VP_W - tlLeft;
    // Only capture from fromDate to toDate — measure the width of that range
    const rangeScrollW = await page.evaluate((to: string, startX: number) => {
      const tl = document.querySelector<HTMLElement>('[data-timeline-scroll]');
      if (!tl || !to) return tl?.scrollWidth ?? 0;
      const toMs = new Date(to + 'T12:00').getTime();
      const bars = Array.from(tl.querySelectorAll<HTMLElement>('[data-bar]'));
      let endX = startX;
      bars.forEach((bar) => {
        const endAttr = bar.dataset.finish;
        if (!endAttr) return;
        const barMs = new Date(endAttr + 'T12:00').getTime();
        if (barMs <= toMs) endX = Math.max(endX, bar.offsetLeft + bar.offsetWidth);
      });
      return endX - startX + 40;
    }, toDate, startScrollX);

    const numRows = Math.ceil(totalH / VP_H);
    const numCols = Math.ceil(rangeScrollW / TL_VIS_W);

    console.log(`[gantt-pdf] ${numRows}r × ${numCols}c = ${numRows * numCols} pages`);

    const shots: Buffer[] = [];

    for (let row = 0; row < numRows; row++) {
      for (let col = 0; col < numCols; col++) {
        await page.evaluate(({ y, x }: { y: number; x: number }) => {
          const tl   = document.querySelector<HTMLElement>('[data-timeline-scroll]');
          const left = document.querySelector<HTMLElement>('[data-left-scroll]');
          if (tl)   { tl.scrollTop = y; tl.scrollLeft = x; }
          if (left) left.scrollTop = y;
        }, { y: row * VP_H, x: startScrollX + col * TL_VIS_W });

        await new Promise((r) => setTimeout(r, 80));

        // clip to exact VP_W × VP_H — never exceeds safe canvas size
        const shot = await page.screenshot({
          type: 'jpeg',
          quality: 88,
          clip: { x: 0, y: 0, width: VP_W, height: VP_H },
        }) as Buffer;
        shots.push(shot);
      }
    }

    await browser.close();

    const { jsPDF } = await import('jspdf');
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a3' });
    const W = 420, H = 297;

    shots.forEach((buf, i) => {
      if (i > 0) doc.addPage();
      doc.addImage(`data:image/jpeg;base64,${buf.toString('base64')}`, 'JPEG', 0, 0, W, H);
      const r = Math.floor(i / numCols) + 1;
      const c = (i % numCols) + 1;
      doc.setFontSize(6); doc.setTextColor(160);
      doc.text(`Row ${r}/${numRows}  Col ${c}/${numCols}`, W - 36, H - 2);
    });

    return new NextResponse(doc.output('arraybuffer'), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="gantt_${new Date().toISOString().slice(0, 10)}.pdf"`,
      },
    });
  } catch (err) {
    if (browser) await browser.close().catch(() => {});
    console.error('[gantt-pdf]', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
