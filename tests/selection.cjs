const { chromium, webkit, expect } = require('@playwright/test');
const { fixture, allStopped } = require('./helpers/ar-fixture.cjs');
const fs = require('node:fs');
const url = process.env.TEST_URL || 'http://127.0.0.1:5174/';
const executablePath = process.env.CHROMIUM_EXECUTABLE_PATH;
const results = [];
async function ready(page) {
 await expect.poll(() => page.evaluate(() => Boolean(testAR.scene?.scene.children.find(o => o.isMesh)?.material.map))).toBe(true);
 for(let i=0;i<4;i++) {
  await new Promise(resolve=>setTimeout(resolve,150));
  await page.evaluate(()=>testAR.emit({hits:[{type:'DETECTED_SURFACE',position:{x:0,y:0,z:-1.2},rotation:{x:0,y:0,z:0,w:1}}]}));
 }
 await expect(page.locator('.ar-scan')).toHaveAttribute('data-ar-state','READY');
}
(async()=>{
 for(const [name,engine] of [['Chromium',chromium],['WebKit',webkit]]) {
  const browser=await engine.launch({headless:true,...(name==='Chromium'&&executablePath?{executablePath}:{})});
  for(const [width,height] of [[320,568],[375,812],[390,844],[428,926]]) {
   const {context,page,errors}=await fixture(browser,{width,height});
   await page.goto(new URL('camera-permission',url).href);await page.getByRole('button',{name:'Enable Camera'}).click();
   await expect(page.locator('.ar-scan')).toHaveAttribute('data-ar-state','SCANNING');await ready(page);
   await page.evaluate(()=>{window.originalARCanvas=document.querySelector('canvas');window.originalARScene=testAR.scene;});
   await page.getByRole('button',{name:'Choose a Cracker'}).click();
   await expect(page.getByRole('heading',{name:'Pick your cracker'})).toBeVisible();
   await expect(page.getByRole('radio')).toHaveCount(3);await expect(page.getByRole('radio',{name:'Flower Pot',exact:true})).toBeChecked();
   await expect(page.getByRole('button',{name:'Place Flower Pot',exact:true})).toBeVisible();
   await page.locator('.cracker-card-art img').evaluateAll(images=>Promise.all(images.map(i=>i.decode())));
   expect(await page.locator('.cracker-card-art img').evaluateAll(images=>images.every(i=>i.currentSrc.endsWith('.webp')&&getComputedStyle(i).objectFit==='contain'))).toBe(true);
   const bounds=await page.evaluate(()=>{
    const sheet=document.querySelector('.cracker-selection-sheet').getBoundingClientRect();
    const cards=[...document.querySelectorAll('.cracker-card-face')].map(e=>{const r=e.getBoundingClientRect();return{x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom}});
    const cta=document.querySelector('.cracker-place-next').getBoundingClientRect();
    return{pageWidth:document.documentElement.scrollWidth,pageHeight:document.documentElement.scrollHeight,sheetTop:sheet.top,cards,ctaHeight:cta.height,ctaBottom:cta.bottom};
   });
   expect([bounds.pageWidth,bounds.pageHeight]).toEqual([width,height]);expect(bounds.sheetTop).toBeGreaterThan(height*.3);
   expect(bounds.ctaHeight).toBeGreaterThanOrEqual(48);expect(bounds.ctaBottom).toBeLessThanOrEqual(height);
   for(const card of bounds.cards){expect(card.width).toBeGreaterThanOrEqual(48);expect(card.height).toBeGreaterThanOrEqual(48);expect(card.x).toBeGreaterThanOrEqual(0);expect(card.right).toBeLessThanOrEqual(width);expect(card.bottom).toBeLessThanOrEqual(height);}
   expect(Math.max(...bounds.cards.map(c=>c.width))-Math.min(...bounds.cards.map(c=>c.width))).toBeLessThan(1);
   if(width===390)await page.screenshot({path:`${name.toLowerCase()}-selection-ui-test.png`});
   await page.getByText('Ground Chakra',{exact:true}).click();await expect(page.getByRole('button',{name:'Place Ground Chakra',exact:true})).toBeVisible();
   await page.getByText('Rocket',{exact:true}).click();await expect(page.getByRole('radio',{name:'Rocket',exact:true})).toBeChecked();await expect(page.locator('.cracker-radio:checked')).toHaveCount(1);
   await page.evaluate(()=>testAR.emit({status:'LIMITED',reason:'INITIALIZING'}));
   await expect(page.getByText('Tracking is recovering. You can keep choosing.')).toBeVisible();await expect(page.getByRole('radio',{name:'Rocket',exact:true})).toBeChecked();
   await page.getByText('Ground Chakra',{exact:true}).click();await page.getByRole('button',{name:'Place Ground Chakra',exact:true}).click();
   await expect(page).toHaveURL(/place-cracker$/);await expect(page.locator('.cracker-placement-boundary')).toHaveAttribute('data-selected-cracker','ground-chakra');
   await expect(page.locator('.cracker-placement-boundary')).toHaveAttribute('data-placement-type','ground-flat');
   await expect(page.getByText('Find a tracked spot before placing your cracker.')).toBeVisible();
   await expect(page.getByRole('button',{name:/^Place /})).toHaveCount(0);
   expect(await page.evaluate(()=>({native:testAR.nativeCalls,runs:testAR.runCalls,max:testAR.activeMax,sameCanvas:originalARCanvas===document.querySelector('canvas'),sameScene:originalARScene===testAR.scene,objects:testAR.scene.scene.children.length}))).toEqual({native:1,runs:1,max:1,sameCanvas:true,sameScene:true,objects:1});
   await page.getByRole('button',{name:'Back to cracker selection',exact:true}).click();await expect(page).toHaveURL(/choose-cracker$/);
   await expect(page.getByRole('radio',{name:'Ground Chakra',exact:true})).toBeChecked();
   await page.getByText('Rocket',{exact:true}).click();await page.getByRole('button',{name:'Place Rocket',exact:true}).click();
   await expect(page.locator('.cracker-placement-boundary')).toHaveAttribute('data-selected-cracker','rocket');await expect(page.locator('.cracker-placement-boundary')).toHaveAttribute('data-placement-type','ground-upright');
   await page.goBack();await expect(page).toHaveURL(/choose-cracker$/);await expect(page.getByRole('radio',{name:'Rocket',exact:true})).toBeChecked();
   await page.getByRole('button',{name:'Back to Scan the Ground',exact:true}).click();await expect(page).toHaveURL(/\/camera$/);
   expect(await page.evaluate(()=>[testAR.nativeCalls,testAR.runCalls])).toEqual([1,1]);
   await ready(page);await page.getByRole('button',{name:'Choose a Cracker'}).click();await expect(page.getByRole('radio',{name:'Rocket',exact:true})).toBeChecked();
   await page.getByRole('button',{name:'Close AR and return to Welcome',exact:true}).click();await expect(page.locator('.thiri-welcome')).toBeVisible();expect(await allStopped(page)).toBe(true);expect(errors).toEqual([]);
   await context.close();results.push({engine:name,width,height,result:'pass',test:'three WebP cards/default/selection/CTA, lost-tracking selection, shared placement metadata, stable camera/canvas/scene, HTML and browser Back, close/cleanup, no flat-image AR placement'});
  }
  {
   const{context,page}=await fixture(browser);
   await page.goto(new URL('camera-permission',url).href);await page.getByRole('button',{name:'Enable Camera'}).click();await expect(page.locator('.ar-scan')).toHaveAttribute('data-ar-state','SCANNING');await ready(page);await page.getByRole('button',{name:'Choose a Cracker'}).click();
   await page.getByRole('radio',{name:'Flower Pot',exact:true}).focus();await page.keyboard.press('ArrowRight');await expect(page.getByRole('radio',{name:'Ground Chakra',exact:true})).toBeChecked();
   await page.emulateMedia({reducedMotion:'no-preference'});await page.getByRole('button',{name:'Place Ground Chakra',exact:true}).click();await expect(page).toHaveURL(/place-cracker$/);
   await page.getByRole('button',{name:'Change cracker',exact:true}).click();await expect(page.getByRole('radio',{name:'Ground Chakra',exact:true})).toBeChecked();
   await page.emulateMedia({reducedMotion:'reduce'});expect(await page.locator('.cracker-selection-sheet').evaluate(e=>getComputedStyle(e).animationName)).toBe('none');
   await context.close();results.push({engine:name,result:'pass',test:'native radio keyboard navigation, animated exit, reduced motion, return from placement'});
  }
  await browser.close();
 }
 fs.writeFileSync('selection-test-results.json',JSON.stringify({note:'SDK/camera/poses are fixtures; verifies selection UI and real shared session logic, not physical AR.',results},null,2));console.log(JSON.stringify(results,null,2));
})().catch(error=>{console.error(error);process.exit(1)});
