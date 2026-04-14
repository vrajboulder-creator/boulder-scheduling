/**
 * Dependency Date Propagation Test
 *
 * Verifies: when a predecessor activity's finish date is changed in the
 * detail panel, the successor activity's start date shifts to the next day.
 *
 * From the snapshot we know:
 *  - Detail panel is a right sidebar (not a modal/dialog)
 *  - Finish date input is ref e286 — it's the 2nd textbox inside "Schedule" section
 *  - Close button is a plain button with an X icon (no text label)
 *  - Pressing Escape navigates away — use the close button (ref e241) instead
 */

import { test, expect } from '@playwright/test';

test.describe('Dependency date propagation', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: /Master Schedule/i }).click();
    await page.waitForSelector('text=Owner Request for Proposal', { timeout: 15000 });
  });

  test('changing predecessor finish date shifts successor start date', async ({ page }) => {
    // 1. Expand Bid Preparation
    await page.getByText('Bid Preparation').click();
    await page.waitForSelector('text=Takeoffs Needed', { timeout: 5000 });

    const succRow = () => page.locator('tr', { hasText: 'Subcontractor + Vendor Bids Needed' }).first();

    // 2. Open detail for predecessor (Takeoffs Needed = 2-A)
    await page.locator('tr', { hasText: 'Takeoffs Needed' }).first().click();
    await page.waitForSelector('h3:has-text("Takeoffs Needed")', { timeout: 8000 });

    // 3. Set an initial finish date (predecessor has no date yet)
    const initialFinish = '2026-05-10';
    const scheduleSection = page.locator('p:has-text("Schedule")').locator('..');
    const startInput = scheduleSection.locator('input').first();
    const finishInput = scheduleSection.locator('input').nth(1);

    await startInput.fill('2026-05-05');
    await startInput.dispatchEvent('change');
    await startInput.press('Tab');
    await finishInput.fill(initialFinish);
    await finishInput.dispatchEvent('change');
    await finishInput.press('Tab');
    await page.waitForTimeout(400);

    // 4. Close sidebar
    await page.locator('h3:has-text("Takeoffs Needed")').locator('..').locator('button').first().click();
    await page.waitForTimeout(300);

    // Re-expand if collapsed
    if (!(await succRow().isVisible().catch(() => false))) {
      await page.getByText('Bid Preparation').click();
      await page.waitForSelector('text=Subcontractor + Vendor Bids Needed', { timeout: 5000 });
    }

    // 5. Read successor start BEFORE the finish change
    const startBefore = await succRow().locator('td').nth(5).innerText();
    console.log('Successor start BEFORE finish change:', startBefore);

    // 6. Re-open predecessor and change finish date forward by 5 days
    await page.locator('tr', { hasText: 'Takeoffs Needed' }).first().click();
    await page.waitForSelector('h3:has-text("Takeoffs Needed")', { timeout: 8000 });

    const newFinishDate = '2026-05-15'; // 5 days later than 2026-05-10
    const expectedStartText = 'May 16'; // successor should start day after new finish

    const scheduleSection2 = page.locator('p:has-text("Schedule")').locator('..');
    const finishInput2 = scheduleSection2.locator('input').nth(1);
    await finishInput2.fill(newFinishDate);
    await finishInput2.dispatchEvent('change');
    await finishInput2.press('Tab');
    await page.waitForTimeout(400);

    // 7. Close sidebar
    await page.locator('h3:has-text("Takeoffs Needed")').locator('..').locator('button').first().click();
    await page.waitForTimeout(400);

    // Re-expand if collapsed
    if (!(await succRow().isVisible().catch(() => false))) {
      await page.getByText('Bid Preparation').click();
      await page.waitForSelector('text=Subcontractor + Vendor Bids Needed', { timeout: 5000 });
    }

    // 8. Check successor start shifted
    const startAfter = await succRow().locator('td').nth(5).innerText();
    console.log('Successor start AFTER finish change:', startAfter);

    expect(startAfter).toContain(expectedStartText);
    expect(startAfter).not.toBe(startBefore);

    console.log(`✓ Predecessor finish: ${initialFinish} → ${newFinishDate}`);
    console.log(`✓ Successor start: "${startBefore}" → "${startAfter}" (expected May 16)`);
  });

  test('predecessor pill shows correct label 2-A in 2-B row', async ({ page }) => {
    await page.getByText('Bid Preparation').click();
    await page.waitForSelector('text=Subcontractor + Vendor Bids Needed', { timeout: 5000 });

    const succRow = page.locator('tr', { hasText: 'Subcontractor + Vendor Bids Needed' }).first();
    // Predecessor column is td index 2
    const predCell = succRow.locator('td').nth(2);
    const predText = await predCell.innerText();
    console.log('Predecessor cell for 2-B:', predText);

    expect(predText).toContain('2-A');
  });

  test('all phases show in CSV order', async ({ page }) => {
    const phaseHeaders = page.locator('td[colspan="10"] .font-semibold');
    const texts = await phaseHeaders.allInnerTexts();
    const phases = texts.filter(t => t.trim() && !t.match(/^\d+$/));
    console.log('First 5 phases:', phases.slice(0, 5));

    expect(phases[0]).toContain('Owner Request for Proposal');
    expect(phases[1]).toContain('Bid Preparation');
    expect(phases[2]).toContain('Bid Submission to Owner');
    expect(phases[3]).toContain('Notice to Proceed');
  });

  test('activity labels follow N-X format', async ({ page }) => {
    await page.getByText('Bid Preparation').click();
    await page.waitForSelector('text=Takeoffs Needed', { timeout: 5000 });

    // First activity in phase 2 should be labeled 2-A
    const firstRow = page.locator('tr', { hasText: 'Takeoffs Needed' }).first();
    const idCell = firstRow.locator('td').nth(0);
    const label = await idCell.innerText();
    console.log('First Bid Prep activity label:', label);
    expect(label).toContain('2-A');

    // Second activity should be 2-B
    const secondRow = page.locator('tr', { hasText: 'Subcontractor + Vendor Bids Needed' }).first();
    const label2 = await secondRow.locator('td').nth(0).innerText();
    console.log('Second Bid Prep activity label:', label2);
    expect(label2).toContain('2-B');
  });

});
