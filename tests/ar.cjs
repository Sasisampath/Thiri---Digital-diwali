const { chromium, webkit, expect } = require('@playwright/test');
const { fixture, allStopped } = require('./helpers/ar-fixture.cjs');
const fs = require('node:fs');
const url = process.env.TEST_URL || 'http://127.0.0.1:5174/';
const executablePath = process.env.CHROMIUM_EXECUTABLE_PATH;
const results = [];
const surface = x => ({ type: 'DETECTED_SURFACE', position: { x, y: 0, z: -1.2 }, rotation: { x: 0, y: 0, z: 0, w: 1 }, distance: 1.9 });
async function enter(page) {
 await page.goto(new URL('camera-permission', url).href);
 await page.getByRole('button', { name: 'Enable Camera' }).click();
 await expect(page.locator('.ar-scan')).toHaveAttribute('data-ar-state','SCANNING');
 await expect.poll(() => page.evaluate(() => Boolean(testAR.scene?.scene.children.find(o => o.isMesh)?.material.map))).toBe(true);
}
async function frames(page, data = {}, count = 4) {
 for(let i=0;i<count;i++) { await new Promise(resolve => setTimeout(resolve, 150)); await page.evaluate(data => testAR.emit(data), data); }
}
(async()=>{
 for(const [name,engine] of [['Chromium',chromium],['WebKit',webkit]]) {
  const browser=await engine.launch({headless:true,...(name==='Chromium'&&executablePath?{executablePath}:{})});
  for(const [width,height] of [[320,568],[375,812],[390,844],[428,926]]) {
   const {context,page,errors}=await fixture(browser,{width,height}); await enter(page);
   expect(await page.evaluate(()=>[document.documentElement.scrollWidth,document.documentElement.scrollHeight])).toEqual([width,height]);
   expect(await page.evaluate(()=>testAR.options)).toEqual({direction:'back',allowedDevices:'mobile'});
   expect(await page.evaluate(()=>testAR.config)).toEqual({disableWorldTracking:false,enableWorldPoints:true,scale:'absolute'});
   await expect(page.getByRole('heading',{name:'Find your spot'})).toBeVisible();
   await expect(page.getByRole('button',{name:'Choose a Cracker'})).toHaveCount(0);
   await new Promise(resolve => setTimeout(resolve, 3500)); await expect(page.getByRole('button',{name:'Choose a Cracker'})).toHaveCount(0);
   await frames(page,{status:'NORMAL'}); await expect(page.locator('.ar-scan')).toHaveAttribute('data-ar-state','SEARCHING');
   await frames(page,{hits:[{...surface(0),type:'FEATURE_POINT'}]}); await expect(page.getByRole('button',{name:'Choose a Cracker'})).toHaveCount(0);
   await frames(page,{hits:[surface(0)]}); await expect(page.locator('.ar-scan')).toHaveAttribute('data-ar-state','READY');
   expect(await page.evaluate(()=>{const m=testAR.scene.scene.children.find(o=>o.isMesh);return {visible:m.visible,x:m.position.x,y:m.position.y,z:m.position.z};})).toEqual({visible:true,x:0,y:0.006,z:-1.2});
   expect(await page.evaluate(()=>{const m=testAR.scene.scene.children.find(o=>o.isMesh);const n=new THREE.Vector3(0,0,1).applyQuaternion(m.quaternion);return Math.abs(n.y)>0.999;})).toBe(true);
   await frames(page,{hits:[surface(0.25)],x:0.2},1); expect(await page.evaluate(()=>testAR.scene.scene.children.find(o=>o.isMesh).position.x)).toBe(0.25);
   await page.getByRole('button',{name:'Choose a Cracker'}).click(); await expect(page).toHaveURL(/choose-cracker$/);
   await expect(page.getByRole('heading',{name:'Pick your cracker'})).toBeVisible(); expect(await page.evaluate(()=>testAR.runCalls)).toBe(1);
   await page.goBack(); await expect(page).toHaveURL(/\/camera$/); expect(await page.evaluate(()=>testAR.runCalls)).toBe(1);
   await frames(page,{status:'LIMITED',reason:'INITIALIZING'},1); await expect(page.locator('.ar-scan')).toHaveAttribute('data-ar-state','TRACKING_LOST');
   expect(await page.evaluate(()=>testAR.scene.scene.children.find(o=>o.isMesh).visible)).toBe(false);
   await expect(page.getByRole('button',{name:'Choose a Cracker'})).toHaveCount(0);
   await expect(page.getByText('Use a well-lit area with a textured floor.')).toBeVisible();
   await page.getByRole('button',{name:'Sound on',exact:true}).click(); expect(await page.getByRole('button',{name:'Sound on',exact:true}).getAttribute('aria-pressed')).toBe('true');
   await page.getByRole('button',{name:'Close AR and return to Welcome'}).click(); await expect(page.locator('.thiri-welcome')).toBeVisible();
   expect(await allStopped(page)).toBe(true); expect(await page.evaluate(()=>testAR.disposedRenderers)).toBe(1); expect(errors).toEqual([]); await context.close();
   results.push({engine:name,width,height,test:'layout, consent handoff, no timer/normal/feature-only false READY, world-space surface reticle, aim update, session-preserving next step/back, tracking loss, sound, release',result:'pass'});
  }
  {
   const {context,page}=await fixture(browser);await enter(page);
   const points=[];for(let x=-0.6;x<=0.61;x+=0.2)for(let z=-2.4;z<=-0.59;z+=0.3)points.push({confidence:1,position:{x,y:0,z}});
   await frames(page,{points});await expect(page.locator('.ar-scan')).toHaveAttribute('data-ar-state','READY');
   await frames(page,{status:'LIMITED'},1);
   const wall=[];for(let x=-0.6;x<=0.61;x+=0.2)for(let y=-0.4;y<=0.5;y+=0.1)wall.push({confidence:1,position:{x,y,z:-1.4}});
   await frames(page,{points:wall});await expect(page.getByRole('button',{name:'Choose a Cracker'})).toHaveCount(0);
   await frames(page,{points});await expect(page.locator('.ar-scan')).toHaveAttribute('data-ar-state','READY');
   await new Promise(resolve => setTimeout(resolve, 2100));await expect(page.locator('.ar-scan')).toHaveAttribute('data-ar-state','TRACKING_LOST');
   await frames(page,{points});await expect(page.locator('.ar-scan')).toHaveAttribute('data-ar-state','READY');
   await page.evaluate(()=>{Object.defineProperty(document,'visibilityState',{configurable:true,value:'hidden'});document.dispatchEvent(new Event('visibilitychange'));});
   await expect(page.getByText('Session paused')).toBeVisible();expect(await page.evaluate(()=>testAR.pauses)).toBe(1);
   await page.evaluate(()=>{Object.defineProperty(document,'visibilityState',{configurable:true,value:'visible'});document.dispatchEvent(new Event('visibilitychange'));});
   expect(await page.evaluate(()=>[testAR.resumes,testAR.runCalls])).toEqual([1,1]);await expect(page.getByRole('button',{name:'Choose a Cracker'})).toHaveCount(0);
   await frames(page,{points});await expect(page.locator('.ar-scan')).toHaveAttribute('data-ar-state','READY');
   await page.locator('canvas').dispatchEvent('webglcontextlost');await expect(page.getByRole('alert')).toContainText('camera display was interrupted');expect(await allStopped(page)).toBe(true);
   await context.close();results.push({engine:name,test:'SLAM point-cloud horizontal support, wall rejection, stale-frame invalidation, pause/resume, WebGL-loss cleanup',result:'pass'});
  }
  {
   const {context,page}=await fixture(browser,undefined,{incompatible:true});await page.goto(new URL('camera-permission',url).href);await page.getByRole('button',{name:'Enable Camera'}).click();
   await expect(page.locator('.ar-scan')).toHaveAttribute('data-ar-state','UNSUPPORTED');expect(await page.evaluate(()=>testAR.runCalls)).toBe(0);expect(await allStopped(page)).toBe(true);
   await expect(page.getByRole('button',{name:'Choose a Cracker'})).toHaveCount(0);await context.close();
   results.push({engine:name,test:'unsupported devices never show fake AR or placement',result:'pass'});
  }
  {
   const {context,page}=await fixture(browser,undefined,{initFailure:true});await page.goto(new URL('camera-permission',url).href);await page.getByRole('button',{name:'Enable Camera'}).click();
   await expect(page.getByRole('alert')).toContainText('engine could not initialize');await page.evaluate(()=>testAR.initFailure=false);await page.getByRole('button',{name:'Retry',exact:true}).click();
   await expect(page.locator('.ar-scan')).toHaveAttribute('data-ar-state','SCANNING');
   await page.evaluate(()=>testAR.modules.find(m=>m.onException).onException(new DOMException('Denied','NotAllowedError')));
   await expect(page.getByRole('button',{name:'Camera permission help'})).toBeVisible();await page.getByRole('button',{name:'Camera permission help'}).click();
   await expect(page).toHaveURL(/camera-permission$/);await expect(page.getByRole('heading',{name:'Camera access is off'})).toBeVisible();expect(await allStopped(page)).toBe(true);
   await context.close();results.push({engine:name,test:'engine initialization failure/retry and native-error permission guidance',result:'pass'});
  }
  await browser.close();
 }
 fs.writeFileSync('ar-test-results.json',JSON.stringify({note:'SDK callbacks, camera and poses are test fixtures. Real Three.js placement/reticle code is exercised. This does NOT certify physical SLAM.',results},null,2));console.log(JSON.stringify(results,null,2));
})().catch(error=>{console.error(error);process.exit(1)});
