const { chromium, webkit, expect } = require('@playwright/test');
const { fixture, allStopped } = require('./helpers/ar-fixture.cjs');
const fs = require('node:fs');
const url = process.env.TEST_URL || 'http://127.0.0.1:5174/';
const executablePath = process.env.CHROMIUM_EXECUTABLE_PATH;
const results = [];
(async () => {
 for (const [name, engine] of [['Chromium', chromium], ['WebKit', webkit]]) {
  const browser = await engine.launch({ headless: true, ...(name === 'Chromium' && executablePath ? { executablePath } : {}) });
  for (const [width, height] of [[320,568],[375,812],[390,844],[428,926]]) {
   const { context, page, errors } = await fixture(browser, { width, height });
   await page.goto(url); await page.getByRole('button', { name: 'Get Started' }).click();
   expect(await page.evaluate(() => [testAR.nativeCalls, testAR.runCalls])).toEqual([0,0]);
   await page.locator('.permission-phone img').evaluate(i => i.decode());
   expect(await page.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.scrollHeight])).toEqual([width,height]);
   if (width === 390) await page.screenshot({ path: `${name.toLowerCase()}-permission.png` });
   await page.getByRole('button', { name: 'Enable Camera' }).click();
   await expect(page.locator('.ar-scan')).toHaveAttribute('data-ar-state', 'SCANNING');
   expect(await page.evaluate(() => testAR.history[0])).toEqual({ audio: false, video: { facingMode: { ideal: 'environment' } } });
   expect(await page.evaluate(() => testAR.streams[0].getTracks()[0].readyState)).toBe('ended');
   expect(await page.evaluate(() => [testAR.nativeCalls,testAR.runCalls,testAR.activeMax])).toEqual([1,1,1]);
   await page.getByRole('button', { name: 'Close AR and return to Welcome' }).click();
   await expect(page.locator('.thiri-welcome')).toBeVisible(); expect(await allStopped(page)).toBe(true); expect(errors).toEqual([]);
   await page.getByRole('button', { name: 'Get Started' }).click(); await page.getByRole('button', { name: 'Not now', exact: true }).click();
   await expect(page.locator('.thiri-welcome')).toBeVisible(); await context.close();
   results.push({ engine: name, width, height, test: 'no early access, explanation layout/assets, permission preflight, exclusive XR8 handoff, close/cleanup, Not now', result: 'pass' });
  }
  {
   const { context, page } = await fixture(browser, { width: 320, height: 568 });
   await page.goto(new URL('camera-permission', url).href);
   for (const [mode, text] of [['NotAllowedError','Enable camera access'],['NotFoundError','find a suitable camera'],['NotReadableError','in use']]) {
    await page.evaluate(mode => testAR.nativeMode = mode, mode);
    await page.getByRole('button', { name: /Enable Camera|Try Again/ }).click(); await expect(page.getByRole('alert')).toContainText(text);
    expect(await page.evaluate(() => testAR.runCalls)).toBe(0);
   }
   await page.evaluate(() => testAR.nativeMode = 'relax'); await page.getByRole('button', { name: 'Try Again' }).click();
   await expect(page.locator('.ar-scan')).toBeVisible(); expect(await page.evaluate(() => testAR.history.at(-1))).toEqual({ audio: false, video: true });
   await context.close(); results.push({ engine: name, test: 'denied/missing/busy states, relaxed constraints, retry', result: 'pass' });
  }
  {
   const { context, page } = await fixture(browser);
   await page.goto(new URL('camera-permission', url).href); await page.evaluate(() => testAR.nativeMode = 'pending');
   await page.getByRole('button', { name: 'Enable Camera' }).click(); await expect(page.getByRole('button', { name: 'Waiting for permission…' })).toBeDisabled();
   await page.getByRole('button', { name: 'Not now', exact: true }).click(); await page.evaluate(() => testAR.resolveNative());
   await expect.poll(() => allStopped(page)).toBe(true); await expect(page.locator('.thiri-welcome')).toBeVisible(); expect(await page.evaluate(() => testAR.runCalls)).toBe(0);
   await context.close(); results.push({ engine: name, test: 'late permission cleanup and no surprise AR navigation', result: 'pass' });
  }
  {
   const { context, page } = await fixture(browser);
   await page.goto(new URL('choose-cracker', url).href); await expect(page).toHaveURL(/camera-permission$/); expect(await page.evaluate(() => testAR.nativeCalls)).toBe(0);
   await page.evaluate(() => testAR.facing = 'user'); await page.getByRole('button', { name: 'Enable Camera' }).click();
   await expect(page.getByRole('alert')).toContainText('selfie camera has been stopped'); expect(await allStopped(page)).toBe(true); expect(await page.evaluate(() => testAR.runCalls)).toBe(0);
   await context.close(); results.push({ engine: name, test: 'direct-link guard and selfie rejection before AR', result: 'pass' });
  }
  await browser.close();
 }
 fs.writeFileSync('camera-test-results.json', JSON.stringify({ note: 'Synthetic camera and SDK fixtures; not physical camera/SLAM verification.', results }, null, 2)); console.log(JSON.stringify(results,null,2));
})().catch(error => { console.error(error); process.exit(1); });
