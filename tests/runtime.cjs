const { chromium, expect } = require('@playwright/test');
const fs = require('node:fs');
const url = process.env.TEST_URL || 'http://127.0.0.1:5174/';
(async () => {
 const browser = await chromium.launch({ headless: true, ...(process.env.CHROMIUM_EXECUTABLE_PATH ? { executablePath: process.env.CHROMIUM_EXECUTABLE_PATH } : {}) });
 const page = await browser.newPage(); const errors = [], failedRequests = [];
 page.on('pageerror', error => errors.push(error.message));
 page.on('response', response => { if (response.status() >= 400) failedRequests.push({ url: response.url(), status: response.status() }); });
 await page.goto(url);
 const result = await page.evaluate(async () => {
  let cameraCalls = 0;
  Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: { getUserMedia: async () => { cameraCalls++; throw Error('Runtime initialization must not open camera'); } } });
  await new Promise((resolve, reject) => {
   const script = document.createElement('script');
   const timer = setTimeout(() => reject(Error('SDK script timed out')), 30000);
   const done = () => { if (window.XR8) { clearTimeout(timer); resolve(); } };
   window.addEventListener('xrloaded', done, { once: true }); script.onload = done; script.onerror = reject;
   script.src = '/vendor/8thwall/xr.js'; document.head.append(script);
  });
  await XR8.initialize(); await XR8.loadChunk('slam');
  return { package: '@8thwall/engine-binary@1.0.0', runtimeVersionReported: XR8.version(), initialized: XR8.isInitialized(), slamLoaded: true, cameraCalls };
 });
 expect(result.initialized).toBe(true); expect(result.cameraCalls).toBe(0); expect(errors).toEqual([]); expect(failedRequests).toEqual([]);
 for (const path of ['vendor/8thwall/xr-slam.js','vendor/8thwall/resources/media-worker.js','assets/ar/placement-reticle.svg','licenses/8thwall-engine-LICENSE.txt']) {
  const response = await page.request.get(new URL(path, url).href); expect(response.status()).toBe(200);
  expect((await response.text()).startsWith('<!doctype html>')).toBe(false);
 }
 const report = { note: 'Real distributed SDK WASM/SLAM initialization, with camera access blocked. Not physical SLAM verification.', result, errors, failedRequests };
 fs.writeFileSync('ar-runtime-results.json', JSON.stringify(report, null, 2)); console.log(JSON.stringify(report, null, 2));
 await browser.close();
})().catch(error => { console.error(error); process.exit(1); });
