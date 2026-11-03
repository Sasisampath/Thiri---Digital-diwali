const{chromium,webkit,expect}=require('@playwright/test');const{fixture,allStopped}=require('./helpers/ar-fixture.cjs');const{enter}=require('./helpers/celebration-flow.cjs');const fs=require('node:fs');const results=[];
async function frame(page,{target=[0,0,-1.4],status='NORMAL',position=[0,1.5,0]}={}){
 await page.clock.fastForward(155);await page.evaluate(({target,status,position})=>{const c=testAR.scene.camera;c.position.set(...position);c.lookAt(...target);c.updateMatrixWorld(true);const ray=new THREE.Raycaster();ray.setFromCamera(new THREE.Vector2(0,-.16),c);const p=ray.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0,1,0),0),new THREE.Vector3());testAR.emit({status,cameraPosition:position,lookAt:target,hits:p?[{type:'DETECTED_SURFACE',position:{x:p.x,y:p.y,z:p.z},rotation:{x:0,y:0,z:0,w:1}}]:[]});},{target,status,position});
}
async function until(page,state,options={},max=100){for(let i=0;i<max;i++){await frame(page,options);if(await page.locator(`[data-fireworks-state="${state}"]`).count())return;}throw Error(`Did not reach ${state}`);}
async function ignite(page){await page.getByRole('button',{name:'Tap to Light',exact:true}).click();await until(page,'PLAYING');}
(async()=>{for(const[name,engine]of [['Chromium',chromium],['WebKit',webkit]]){
 const browser=await engine.launch({headless:true,...(name==='Chromium'&&process.env.CHROMIUM_EXECUTABLE_PATH?{executablePath:process.env.CHROMIUM_EXECUTABLE_PATH}:{})});
 for(const[label,id]of [['Flower Pot','flower-pot'],['Ground Chakra','ground-chakra'],['Rocket','rocket']]){
  const sizes=[[320,568],[375,812],[390,844],[428,926]];
  for(const[width,height]of sizes){
   const{context,page,errors}=await fixture(browser,{width,height});let audioRequests=0;page.on('request',r=>{if(/\.(mp3|wav|ogg)(\?|$)/.test(r.url()))audioRequests++;});await page.clock.install();await enter(page,label);
   const saved=await page.evaluate(id=>{const m=testAR.scene.scene.getObjectByName(`CrackerModel:${id}`);return m.matrixWorld.toArray();},id);await ignite(page);
   expect(await page.locator('.fuse-instructions').count()).toBe(0);const effectName=id==='flower-pot'?'FlowerPotFountain':id==='ground-chakra'?'GroundChakraEffect':'RocketLaunchEffect';expect(await page.evaluate(n=>testAR.scene.scene.children.filter(o=>o.name===n).length,effectName)).toBe(1);
   let target=[0,0,-1.4];if(id==='rocket'){
    const sky=await page.evaluate(()=>testAR.scene.scene.getObjectByName('RocketBurstPoint').getWorldPosition(new THREE.Vector3()).toArray());
    for(let i=1;i<=12;i++){target=sky.map((v,j)=>[0,0,-1.4][j]+(v-[0,0,-1.4][j])*i/12);await frame(page,{target});}
   }
   await until(page,'COMPLETED',{target});await expect(page.getByRole('heading',{name:'That was magical!',exact:true})).toBeVisible();
   expect(await page.evaluate(id=>testAR.scene.scene.getObjectByName(`CrackerModel:${id}`).matrixWorld.toArray(),id)).toEqual(saved);
   expect(await page.evaluate(()=>[testAR.nativeCalls,testAR.runCalls,testAR.activeMax])).toEqual([1,1,1]);expect(audioRequests).toBe(0);
   expect(await page.evaluate(()=>[document.documentElement.scrollWidth,document.documentElement.scrollHeight])).toEqual([width,height]);const cta=await page.getByRole('button',{name:'Celebrate Again',exact:true}).boundingBox();expect(cta.height).toBeGreaterThanOrEqual(48);expect(cta.y+cta.height).toBeLessThanOrEqual(height);
   if(width===390)await page.screenshot({path:`${name.toLowerCase()}-${id}-completion-test.png`});
   await frame(page,{target});
   if(width===375){await page.getByRole('button',{name:'Choose Another Cracker',exact:true}).click();await expect(page).toHaveURL(/choose-cracker$/);await expect(page.getByRole('radio',{name:label,exact:true})).toBeChecked();}
   else{await page.getByRole('button',{name:'Celebrate Again',exact:true}).click();await expect(page).toHaveURL(/light-fuse$/);expect(await page.evaluate(n=>Boolean(testAR.scene.scene.getObjectByName(n)),effectName)).toBe(false);await expect(page.locator('.fuse-instructions')).toBeVisible();await expect(page.locator('[data-fireworks-state]')).toHaveCount(0);await page.getByRole('button',{name:'Back to placement',exact:true}).click();await page.getByRole('button',{name:'Back to cracker selection',exact:true}).click();}
   await page.getByRole('button',{name:'Close AR and return to Welcome',exact:true}).click();expect(await allStopped(page)).toBe(true);expect(await page.evaluate(()=>testAR.scene.scene.children.length)).toBe(0);expect(errors).toEqual([]);await context.close();results.push({engine:name,id,width,height,result:'pass',test:'real ignition/countdown handoff, selected effect exactly once, fixed world anchor, completion only after fade, replay/choose reset, one camera/session and full cleanup'});
  }
 }
 for(const[label,id,interrupt]of [['Flower Pot','flower-pot','tracking'],['Ground Chakra','ground-chakra','background'],['Rocket','rocket','sky']]){
  const{context,page,errors}=await fixture(browser);await page.clock.install();await enter(page,label);await ignite(page);
  if(interrupt==='background'){await page.evaluate(()=>{Object.defineProperty(document,'visibilityState',{configurable:true,value:'hidden'});document.dispatchEvent(new Event('visibilitychange'));});await expect(page.locator('[data-fireworks-state="PAUSED"]')).toBeVisible();await page.evaluate(()=>{Object.defineProperty(document,'visibilityState',{configurable:true,value:'visible'});document.dispatchEvent(new Event('visibilitychange'));});}
  else await frame(page,{status:'LIMITED'});
  if(interrupt==='sky'){
   await frame(page,{status:'LIMITED'});await page.getByRole('button',{name:'Play sky preview',exact:true}).click();await expect(page.getByText('Camera-relative sky preview',{exact:true})).toBeVisible();for(let i=0;i<25;i++)await frame(page,{status:'LIMITED'});await expect(page.locator('[data-fireworks-state="COMPLETED"]')).toBeVisible();expect(await page.evaluate(()=>Boolean(testAR.scene.scene.getObjectByName('RocketSkyPreview')))).toBe(false);
  }else{for(let i=0;i<50;i++)await frame(page);await expect(page.locator('[data-fireworks-state="COMPLETED"]')).toHaveCount(0);await expect(page.getByRole('button',{name:'Return to placement',exact:true})).toBeVisible();}
  expect(await page.evaluate(()=>[testAR.nativeCalls,testAR.runCalls])).toEqual([1,1]);expect(errors).toEqual([]);await context.close();results.push({engine:name,id,result:'pass',test:`${interrupt}: no stale world animation or automatic replay; explicit recovery/sky preview; no camera restart`});
 }
 await browser.close();}
 fs.writeFileSync('fireworks-test-results.json',JSON.stringify({note:'Synthetic rear-camera/SLAM callbacks and controlled monotonic browser time exercise actual application/Three.js behavior. Not physical mobile AR verification.',results},null,2));console.log(JSON.stringify(results,null,2));})().catch(e=>{console.error(e);process.exit(1)});
