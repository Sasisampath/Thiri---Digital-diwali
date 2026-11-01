const {chromium, webkit, expect} = require('@playwright/test');
const fs = require('node:fs');
const executablePath = process.env.CHROMIUM_EXECUTABLE_PATH;
const url = process.env.TEST_URL || 'http://127.0.0.1:5173/';
const results=[];
(async()=>{
 for(const [name,engine] of [['Chromium',chromium],['WebKit',webkit]]){
  let browser;
  try { browser=await engine.launch({headless:true,...(name==='Chromium' && executablePath ? {executablePath} : {})}); }
  catch(e){throw new Error(`${name} unavailable. Run npx playwright install chromium webkit. ${e.message}`);}
  for(const [width,height] of [[320,568],[375,812],[390,844],[428,926]]){
   const context=await browser.newContext({viewport:{width,height},isMobile:true,hasTouch:true,deviceScaleFactor:1});
   const page=await context.newPage(); const errors=[];
   page.on('pageerror',e=>errors.push(e.message));
   await page.addInitScript(()=>{window.documentId=Math.random().toString(36);window.cameraCalls=0;if(navigator.mediaDevices)navigator.mediaDevices.getUserMedia=()=>{window.cameraCalls++;throw Error('Camera requested');};});
   await page.clock.install();
   await page.goto(url);
   await expect(page.locator('.thiri-splash.is-running')).toHaveCount(1);
   await expect(page.locator('h1')).toHaveCount(0);
   await page.clock.runFor(1300);
   const layout=await page.evaluate(()=>({width:document.documentElement.scrollWidth,height:document.documentElement.scrollHeight,viewWidth:innerWidth,viewHeight:innerHeight,cameraCalls}));
   expect(layout.width).toBe(width); expect(layout.height).toBe(height); expect(layout.cameraCalls).toBe(0);
   await page.clock.runFor(150);
   await expect(page.locator('.thiri-splash.is-exiting')).toHaveCount(1);
   await expect(page.locator('h1')).toHaveCount(1);
   await expect(page.locator('.thiri-launch-content')).toHaveAttribute('inert','');
   await page.clock.runFor(600);
   await expect(page.locator('.thiri-splash')).toHaveCount(0);
   await expect(page.locator('h1')).toBeFocused();
   await expect(page.getByRole('button', {name: 'Get Started'})).toBeVisible();
   await expect(page.locator('.welcome-art .firework img')).toHaveCount(3);
   await page.locator('.firework img').evaluateAll(images => Promise.all(images.map(i => i.decode())));
   const welcomeLayout = await page.evaluate(() => {
     const cta = document.querySelector('.thiri-primary-button').getBoundingClientRect();
     return { width: document.documentElement.scrollWidth, height: document.documentElement.scrollHeight,
       ctaBottom: cta.bottom, ctaHeight: cta.height, cameraCalls,
       imagesLoaded: [...document.querySelectorAll('.firework img')].every(i => i.complete && i.naturalWidth > 0) };
   });
   expect(welcomeLayout.width).toBe(width); expect(welcomeLayout.height).toBe(height);
   expect(welcomeLayout.ctaBottom).toBeLessThanOrEqual(height); expect(welcomeLayout.ctaHeight).toBeGreaterThanOrEqual(44);
   expect(welcomeLayout.cameraCalls).toBe(0); expect(welcomeLayout.imagesLoaded).toBe(true);
   const documentId = await page.evaluate(() => window.documentId);
   await page.getByRole('button', {name: 'Get Started'}).click();
   await expect(page).toHaveURL(/camera-permission$/);
   await expect(page.locator('.camera-permission')).toBeVisible();
   expect(await page.evaluate(() => window.documentId)).toBe(documentId);
   expect(await page.evaluate(() => cameraCalls)).toBe(0);
   await page.goBack();
   await expect(page.locator('.thiri-welcome')).toBeVisible();
   await expect(page.locator('.thiri-splash')).toHaveCount(0);
   await page.reload();
   await expect(page.locator('.thiri-splash')).toHaveCount(0);
   expect(errors).toEqual([]);
   results.push({engine:name,width,height,result:'pass: splash lifecycle, Welcome sizing/CTA touch target, camera explanation navigation without reload, back navigation, no camera, replay prevention, no runtime errors'});
   await context.close();
  }
  const reduced=await browser.newContext({reducedMotion:'reduce', viewport:{width:390,height:844}}); const p=await reduced.newPage();
  await p.goto(url); await expect(p.locator('.thiri-splash')).toHaveCount(0); await expect(p.locator('h1')).toBeVisible();
  await p.locator('.firework img').evaluateAll(images => Promise.all(images.map(i => i.decode())));
  expect(await p.locator('.firework-pot').evaluate(e => getComputedStyle(e).animationName)).toBe('none');
  await p.screenshot({path: `${name.toLowerCase()}-welcome.png`});
  results.push({engine:name,test:'reduced motion',result:'pass'});await reduced.close();
  const fallback=await browser.newContext();const f=await fallback.newPage();await f.clock.install();
  await f.route('**/kolam-background.svg',r=>r.abort());await f.goto(url);await expect(f.locator('.thiri-kolam > svg')).toHaveCount(1);
  await f.clock.runFor(2100);await expect(f.locator('.thiri-splash')).toHaveCount(0);results.push({engine:name,test:'Kolam fallback',result:'pass'});await fallback.close();
  await browser.close();
 }
 fs.writeFileSync('test-results.json',JSON.stringify(results,null,2));console.log(JSON.stringify(results,null,2));
})().catch(e=>{console.error(e);process.exit(1)});
