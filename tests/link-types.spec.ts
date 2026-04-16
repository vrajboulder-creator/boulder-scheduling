/**
 * Link-type logic tests — exercise all 4 MS-Project link types (FS/SS/FF/SF)
 * plus lag, multi-predecessor MAX across types, and cascade-through-chain.
 *
 * Test fixture uses CSV-TPSJ-0001 (1-A), CSV-TPSJ-0002 (2-A), CSV-TPSJ-0003 (2-B).
 * Each test resets dates + links in beforeEach, restores original link in afterEach.
 */

import { test, expect } from '@playwright/test';

const P1 = 'CSV-TPSJ-0001'; // 1-A
const P2 = 'CSV-TPSJ-0002'; // 2-A
const P3 = 'CSV-TPSJ-0003'; // 2-B

type Link = { id: string; predecessor_id: string; successor_id: string; link_type: string; lag_days: number };

test.describe('Link types (FS/SS/FF/SF) + lag', () => {

  test.beforeEach(async ({ page }) => {
    await page.waitForTimeout(500);

    // Clean ALL links on P3 (2-B)
    const linksResp = await page.request.get('/api/activity-links');
    const links: Link[] = linksResp.ok() ? await linksResp.json() : [];
    await Promise.all(
      links.filter((l) => l.successor_id === P3).map((l) => page.request.delete(`/api/activity-links/${l.id}`))
    );
    // Also break 1-A → 2-A so 2-A stays independent at Apr 17
    const chain = links.find((l) => l.predecessor_id === P1 && l.successor_id === P2);
    if (chain) await page.request.delete(`/api/activity-links/${chain.id}`);

    // Reset clean dates sequentially
    await page.request.patch(`/api/activities/${P1}`, {
      data: { start_date: '2026-04-10', finish_date: '2026-04-20', duration: 11 },
      headers: { 'Content-Type': 'application/json' },
    });
    await page.request.patch(`/api/activities/${P2}`, {
      data: { start_date: '2026-04-15', finish_date: '2026-04-17', duration: 3 },
      headers: { 'Content-Type': 'application/json' },
    });
    await page.request.patch(`/api/activities/${P3}`, {
      data: { start_date: '2026-04-18', finish_date: '2026-04-22', duration: 5 },
      headers: { 'Content-Type': 'application/json' },
    });
    await page.waitForTimeout(300);
  });

  test.afterEach(async ({ page }) => {
    // Restore the standard 2-A → 2-B link + 1-A → 2-A link so other test files stay clean
    await page.request.post('/api/activity-links', {
      data: { predecessor_id: P2, successor_id: P3, link_type: 'FS', lag_days: 0 },
      headers: { 'Content-Type': 'application/json' },
    }).catch(() => {});
    await page.request.post('/api/activity-links', {
      data: { predecessor_id: P1, successor_id: P2, link_type: 'FS', lag_days: 0 },
      headers: { 'Content-Type': 'application/json' },
    }).catch(() => {});
  });

  const expandBidPrep = async (page: any) => {
    await page.goto('/');
    await page.getByRole('button', { name: /Master Schedule/i }).click();
    await page.waitForSelector('text=Owner Request for Proposal', { timeout: 15000 });
    await page.getByText('Bid Preparation').click();
    await page.waitForSelector('text=Subcontractor + Vendor Bids Needed', { timeout: 5000 });
  };

  const succRow = (page: any) =>
    page.locator('tr', { hasText: 'Subcontractor + Vendor Bids Needed' }).first();

  const readStartFinish = async (page: any) => ({
    start: (await succRow(page).locator('td').nth(6).innerText()).trim(),
    finish: (await succRow(page).locator('td').nth(7).innerText()).trim(),
  });

  // ── FS (Finish-to-Start, default) ────────────────────────────────────────
  test('FS: successor start = predecessor finish + 1', async ({ page }) => {
    await page.request.post('/api/activity-links', {
      data: { predecessor_id: P1, successor_id: P3, link_type: 'FS', lag_days: 0 },
      headers: { 'Content-Type': 'application/json' },
    });
    await expandBidPrep(page);
    const { start, finish } = await readStartFinish(page);
    console.log('FS 2-B:', start, '->', finish);
    // 1-A finish Apr 20 → 2-B start Apr 21, finish Apr 25 (dur 5)
    expect(start).toContain('Apr 21');
    expect(finish).toContain('Apr 25');
  });

  // ── SS (Start-to-Start) ──────────────────────────────────────────────────
  test('SS: successor start = predecessor start', async ({ page }) => {
    await page.request.post('/api/activity-links', {
      data: { predecessor_id: P1, successor_id: P3, link_type: 'SS', lag_days: 0 },
      headers: { 'Content-Type': 'application/json' },
    });
    await expandBidPrep(page);
    const { start, finish } = await readStartFinish(page);
    console.log('SS 2-B:', start, '->', finish);
    // 1-A start Apr 10 → 2-B start Apr 10, finish Apr 14 (dur 5)
    expect(start).toContain('Apr 10');
    expect(finish).toContain('Apr 14');
  });

  // ── FF (Finish-to-Finish) ────────────────────────────────────────────────
  test('FF: successor finish = predecessor finish', async ({ page }) => {
    await page.request.post('/api/activity-links', {
      data: { predecessor_id: P1, successor_id: P3, link_type: 'FF', lag_days: 0 },
      headers: { 'Content-Type': 'application/json' },
    });
    await expandBidPrep(page);
    const { start, finish } = await readStartFinish(page);
    console.log('FF 2-B:', start, '->', finish);
    // 1-A finish Apr 20 → 2-B finish Apr 20, start Apr 16 (dur 5 → finish - 4)
    expect(finish).toContain('Apr 20');
    expect(start).toContain('Apr 16');
  });

  // ── SF (Start-to-Finish) ─────────────────────────────────────────────────
  test('SF: successor finish = predecessor start', async ({ page }) => {
    await page.request.post('/api/activity-links', {
      data: { predecessor_id: P1, successor_id: P3, link_type: 'SF', lag_days: 0 },
      headers: { 'Content-Type': 'application/json' },
    });
    await expandBidPrep(page);
    const { start, finish } = await readStartFinish(page);
    console.log('SF 2-B:', start, '->', finish);
    // 1-A start Apr 10 → 2-B finish Apr 10, start Apr 6 (dur 5)
    expect(finish).toContain('Apr 10');
    expect(start).toContain('Apr 6');
  });

  // ── FS with positive lag ─────────────────────────────────────────────────
  test('FS + 3d lag: successor start = predecessor finish + 1 + 3', async ({ page }) => {
    await page.request.post('/api/activity-links', {
      data: { predecessor_id: P1, successor_id: P3, link_type: 'FS', lag_days: 3 },
      headers: { 'Content-Type': 'application/json' },
    });
    await expandBidPrep(page);
    const { start } = await readStartFinish(page);
    console.log('FS+3d 2-B:', start);
    // 1-A finish Apr 20 → 2-B start Apr 20 + 1 + 3 = Apr 24
    expect(start).toContain('Apr 24');
  });

  // ── SS with negative lag (lead) ──────────────────────────────────────────
  test('SS − 2d lead: successor start = predecessor start − 2', async ({ page }) => {
    await page.request.post('/api/activity-links', {
      data: { predecessor_id: P1, successor_id: P3, link_type: 'SS', lag_days: -2 },
      headers: { 'Content-Type': 'application/json' },
    });
    await expandBidPrep(page);
    const { start } = await readStartFinish(page);
    console.log('SS-2d 2-B:', start);
    // 1-A start Apr 10 → 2-B start Apr 8
    expect(start).toContain('Apr 8');
  });

  // ── Multi-dep: MAX across mixed link types ───────────────────────────────
  test('Mixed FS + SS: latest constraint wins', async ({ page }) => {
    // 1-A FS → 2-B: successor start = Apr 21
    // 2-A SS → 2-B: successor start = Apr 15 (2-A start)
    // MAX(Apr 21, Apr 15) = Apr 21
    await page.request.post('/api/activity-links', {
      data: { predecessor_id: P1, successor_id: P3, link_type: 'FS', lag_days: 0 },
      headers: { 'Content-Type': 'application/json' },
    });
    await page.request.post('/api/activity-links', {
      data: { predecessor_id: P2, successor_id: P3, link_type: 'SS', lag_days: 0 },
      headers: { 'Content-Type': 'application/json' },
    });
    await expandBidPrep(page);
    const { start } = await readStartFinish(page);
    console.log('Mixed FS+SS 2-B:', start);
    expect(start).toContain('Apr 21');
  });

  // ── Multi-dep: FS vs FF — reconcile start/finish constraints ─────────────
  test('FS + FF: use whichever constraint pushes later', async ({ page }) => {
    // 1-A FS → 2-B: start = Apr 21, implies finish Apr 25
    // 2-A FF → 2-B: finish = Apr 17, implies start Apr 13
    // FS later — MAX start wins → Apr 21 / Apr 25
    await page.request.post('/api/activity-links', {
      data: { predecessor_id: P1, successor_id: P3, link_type: 'FS', lag_days: 0 },
      headers: { 'Content-Type': 'application/json' },
    });
    await page.request.post('/api/activity-links', {
      data: { predecessor_id: P2, successor_id: P3, link_type: 'FF', lag_days: 0 },
      headers: { 'Content-Type': 'application/json' },
    });
    await expandBidPrep(page);
    const { start, finish } = await readStartFinish(page);
    console.log('FS+FF 2-B:', start, '->', finish);
    expect(start).toContain('Apr 21');
    expect(finish).toContain('Apr 25');
  });

  // ── Cycle fallback: still produces a date ────────────────────────────────
  test('Cycle: resolver falls back, dates still rendered', async ({ page }) => {
    // Create 1-A → 2-A → 2-B → 1-A cycle
    await page.request.post('/api/activity-links', {
      data: { predecessor_id: P1, successor_id: P2, link_type: 'FS', lag_days: 0 },
      headers: { 'Content-Type': 'application/json' },
    });
    await page.request.post('/api/activity-links', {
      data: { predecessor_id: P2, successor_id: P3, link_type: 'FS', lag_days: 0 },
      headers: { 'Content-Type': 'application/json' },
    });
    await page.request.post('/api/activity-links', {
      data: { predecessor_id: P3, successor_id: P1, link_type: 'FS', lag_days: 0 },
      headers: { 'Content-Type': 'application/json' },
    });
    await expandBidPrep(page);
    const { start, finish } = await readStartFinish(page);
    console.log('Cycle 2-B:', start, '->', finish);
    // Resolver should produce SOME date (not empty) — fallback branch
    expect(start).not.toBe('');
    expect(start).not.toBe('—');
    expect(finish).not.toBe('');
    // Clean up the extra cycle links so afterEach can restore defaults
    const linksResp = await page.request.get('/api/activity-links');
    const links: Link[] = await linksResp.json();
    for (const l of links) {
      if ((l.predecessor_id === P3 && l.successor_id === P1) ||
          (l.predecessor_id === P2 && l.successor_id === P3)) {
        await page.request.delete(`/api/activity-links/${l.id}`);
      }
    }
  });

  // ── Link type BADGE visible in UI and cycles on click ────────────────────
  test('UI: clicking link-type badge cycles FS → SS → FF → SF', async ({ page }) => {
    await page.request.post('/api/activity-links', {
      data: { predecessor_id: P1, successor_id: P3, link_type: 'FS', lag_days: 0 },
      headers: { 'Content-Type': 'application/json' },
    });
    await expandBidPrep(page);

    // Link Type column is td index 3 after Predecessor
    const linkTypeCell = succRow(page).locator('td').nth(3);
    const badge = linkTypeCell.locator('button').first();

    const waitForType = async (expected: string) => {
      await expect(badge).toHaveText(expected, { timeout: 5000 });
    };

    await waitForType('FS');
    console.log('Initial: FS');

    await badge.click();
    await waitForType('SS');
    console.log('After 1 click: SS');

    await badge.click();
    await waitForType('FF');
    console.log('After 2 clicks: FF');

    await badge.click();
    await waitForType('SF');
    console.log('After 3 clicks: SF');

    await badge.click();
    await waitForType('FS');
    console.log('After 4 clicks (wrap): FS');
  });

  // ── Cycle stability: dates don't drift on repeated resolve ───────────────
  test('Cycle stability: reloading does not drift dates forward', async ({ page }) => {
    // Create 2-A FS → 2-B, 2-B SS → 2-A (mini cycle between 2-A and 2-B)
    await page.request.post('/api/activity-links', {
      data: { predecessor_id: P2, successor_id: P3, link_type: 'FS', lag_days: 0 },
      headers: { 'Content-Type': 'application/json' },
    });
    await page.request.post('/api/activity-links', {
      data: { predecessor_id: P3, successor_id: P2, link_type: 'SS', lag_days: 0 },
      headers: { 'Content-Type': 'application/json' },
    });

    await expandBidPrep(page);
    const first = await readStartFinish(page);
    console.log('First load:', first);

    // Reload three times — if cycle drift is present, dates will push forward each time
    for (let i = 0; i < 3; i++) {
      await page.reload();
      await page.getByRole('button', { name: /Master Schedule/i }).click();
      await page.waitForSelector('text=Owner Request for Proposal', { timeout: 15000 });
      await page.getByText('Bid Preparation').click();
      await page.waitForSelector('text=Subcontractor + Vendor Bids Needed', { timeout: 5000 });
    }
    const last = await readStartFinish(page);
    console.log('After 3 reloads:', last);

    // Cleanup cycle
    const linksResp = await page.request.get('/api/activity-links');
    const links: Link[] = await linksResp.json();
    const extra = links.find((l) => l.predecessor_id === P3 && l.successor_id === P2);
    if (extra) await page.request.delete(`/api/activity-links/${extra.id}`);

    // Dates should be stable (same start + finish after reloads as on first load)
    expect(last.start).toBe(first.start);
    expect(last.finish).toBe(first.finish);
  });

  // ── Server-side persistence of link_type ─────────────────────────────────
  test('Link type persists to database and survives reload', async ({ page }) => {
    await page.request.post('/api/activity-links', {
      data: { predecessor_id: P1, successor_id: P3, link_type: 'SS', lag_days: 5 },
      headers: { 'Content-Type': 'application/json' },
    });
    await expandBidPrep(page);

    // Fetch from server — link_type should still be SS
    const linksResp = await page.request.get('/api/activity-links');
    const links: Link[] = await linksResp.json();
    const match = links.find((l) => l.predecessor_id === P1 && l.successor_id === P3);
    console.log('Persisted link:', match);
    expect(match?.link_type).toBe('SS');
    expect(match?.lag_days).toBe(5);

    // UI reflects SS + 5d lag: 2-B start = 1-A start (Apr 10) + 5 = Apr 15
    const { start } = await readStartFinish(page);
    console.log('SS+5d 2-B:', start);
    expect(start).toContain('Apr 15');
  });

});
