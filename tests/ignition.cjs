const {chromium,webkit,expect}=require('@playwright/test');
const {fixture,allStopped}=require('./helpers/ar-fixture.cjs');
const fs=require('node:fs');
const url=process.env.TEST_URL||'http://127.0.0.1:5174/';
const executablePath=process.env.CHROMIUM_EXECUTABLE_PATH;
const results=[];
async function frames(page,{position=[0,1.5,0],target=[0,0,-1.4],status='NORMAL'}={},count=4){for(let i=0;i<count;i++){await page.waitForTimeout(155);await page.evaluate(({position,target,status})=>{const c=testAR.scene.camera;c.position.set(...position);c.lookAt(...target);c.updateMatrixWorld(true);const r=new THREE.Raycaster();r.setFromCamera(new THREE.Vector2(0,-.16),c);const p=r.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0,1,0),0),new THREE.Vector3());testAR.emit({status,cameraPosition:position,lookAt:target,hits:p?[{type:'DETECTED_SURFACE',position:{x:p.x,y:p.y,z:p.z},rotation:{x:0,y:0,z:0,w:1}}]:[]});},{position,target,status});}}
async function enter(page,name='Flower Pot'){
 await page.goto(new URL('camera-permission',url).href);await page.getByRole('button',{name:'Enable Camera'}).click();await expect.poll(()=>page.evaluate(()=>Boolean(testAR.scene?.scene.children.find(o=>o.isMesh)?.material.map))).toBe(true);
 await frames(page);await page.getByRole('button',{name:'Choose a Cracker'}).click();if(name!=='Flower Pot')await page.getByText(name,{exact:true}).click();await page.getByRole('button',{name:`Place ${name}`,exact:true}).click();await frames(page,{},8);await page.getByRole('button',{name:'Place Cracker',exact:true}).click();await frames(page,{},1);await page.getByRole('button',{name:'Light the Fuse',exact:true}).click();await frames(page,{},2);await expect(page.getByRole('button',{name:'Tap to Light',exact:true})).toBeEnabled();
}
async function dragStart(page){const box=await page.locator('.firestick-drag').boundingBox();const mouse={x:box.x+box.width*.65,y:box.y+box.height*.65};await page.mouse.move(mouse.x,mouse.y);await page.mouse.down();return{box,mouse};}
async function dragHit(page){const{box,mouse}=await dragStart(page);const fuse=await page.locator('.fuse-target').evaluate(el=>({x:parseFloat(el.style.left),y:parseFloat(el.style.top)}));await page.mouse.move(mouse.x+fuse.x-(box.x+box.width*.5),mouse.y+fuse.y-(box.y+box.height*.1));await page.mouse.up();}
(async()=>{
 for(const[name,engine]of [['Chromium',chromium],['WebKit',webkit]]){
  const browser=await engine.launch({headless:true,...(name==='Chromium'&&executablePath?{executablePath}:{})});
  for(const[width,height]of (process.env.IGNITION_ONLY==='recovery'?[]:[[320,568],[375,812],[390,844],[428,926]])){
   const{context,page,errors}=await fixture(browser,{width,height});await enter(page);
   expect(await page.evaluate(()=>[document.documentElement.scrollWidth,document.documentElement.scrollHeight])).toEqual([width,height]);
   const box=await page.locator('.firestick-drag').boundingBox();expect(box.x).toBeGreaterThanOrEqual(0);expect(box.y).toBeGreaterThanOrEqual(0);expect(box.x+box.width).toBeLessThanOrEqual(width);expect(box.y+box.height).toBeLessThanOrEqual(height);
   expect(await page.locator('.firestick-drag img').evaluateAll(imgs=>imgs.every(i=>i.complete&&i.naturalWidth===100&&i.naturalHeight===300))).toBe(true);
   if(width===390)await page.screenshot({path:`${name.toLowerCase()}-fuse-ui-test.png`});
   const saved=await page.evaluate(()=>{const m=testAR.scene.scene.getObjectByName('CrackerModel:flower-pot');window.savedModel=m;return m.getWorldPosition(new THREE.Vector3()).toArray();});
   const target0=await page.locator('.fuse-target').evaluate(e=>e.style.left);await frames(page,{position:[.12,1.5,0]},1);expect(await page.locator('.fuse-target').evaluate(e=>e.style.left)).not.toBe(target0);
   expect(await page.evaluate(()=>savedModel.getWorldPosition(new THREE.Vector3()).toArray())).toEqual(saved);
   await frames(page,{},1);const{mouse}=await dragStart(page);await page.mouse.move(mouse.x-20,mouse.y+10);await expect(page.locator('.fuse-instructions')).toHaveAttribute('data-ignition-state','DRAGGING');
   await page.locator('.firestick-drag').dispatchEvent('pointercancel');await page.mouse.up();await expect(page.locator('.fuse-instructions')).toHaveAttribute('data-ignition-state','FIRESTICK_READY');
   await frames(page,{},1);await dragHit(page);await expect(page.locator('.fuse-instructions')).toHaveAttribute('data-ignition-state','FUSE_CONTACT');await frames(page,{},1);
   await expect(page.locator('.fuse-instructions')).toHaveAttribute('data-ignition-state','IGNITING');
   const effect=await page.evaluate(()=>{const effect=testAR.scene.scene.getObjectByName('ThiriFuseIgnition'),fuse=savedModel.getObjectByName('FusePoint');return{visible:effect.visible,point:effect.getWorldPosition(new THREE.Vector3()).toArray(),fuse:fuse.getWorldPosition(new THREE.Vector3()).toArray(),count:testAR.scene.scene.children.filter(o=>o.name==='ThiriFuseIgnition').length};});
   expect(effect.visible).toBe(true);expect(effect.point).toEqual(effect.fuse);expect(effect.count).toBe(1);
   await frames(page,{},4);await expect(page.getByRole('timer')).toHaveText('5');
   const values=[5];for(let second=4;second>=1;second--){await frames(page,{},7);values.push(Number(await page.getByRole('timer').innerText()));}
   expect(values).toEqual([5,4,3,2,1]);await frames(page,{},7);await expect(page.locator('[data-fireworks-state="PLAYING"]')).toBeVisible();
   expect(await page.evaluate(()=>[testAR.nativeCalls,testAR.runCalls,testAR.activeMax])).toEqual([1,1,1]);
   expect(await page.evaluate(()=>savedModel.getWorldPosition(new THREE.Vector3()).toArray())).toEqual(saved);
   await page.getByRole('button',{name:'Cancel fireworks and return to placement',exact:true}).click();await expect(page).toHaveURL(/place-cracker$/);await expect(page.getByRole('button',{name:'Place Cracker',exact:true})).toBeDisabled();
   expect(errors).toEqual([]);await context.close();results.push({engine:name,width,height,result:'pass',test:'CSS tip alignment, drag miss/cancel/contact, camera projection movement, world-space sparks, one ignition, monotonic 5-to-1 countdown, frozen model, shared camera, no scrolling'});
  }
  for(const[label,id]of [['Ground Chakra','ground-chakra'],['Rocket','rocket']]){
   const{context,page,errors}=await fixture(browser);let audioRequests=0;page.on('request',r=>{if(/\.(mp3|wav|ogg)(\?|$)/.test(r.url()))audioRequests++;});await enter(page,label);
   await frames(page,{target:[0,2,1.4]},5);await expect(page.getByRole('button',{name:'Tap to Light',exact:true})).toBeDisabled();await expect(page.getByText('Point your camera at the fuse.')).toBeVisible();
   await frames(page,{},5);await expect(page.getByRole('button',{name:'Tap to Light',exact:true})).toBeEnabled();
   await frames(page,{status:'LIMITED'},1);await expect(page.getByText("Let's find your cracker again.",{exact:true})).toBeVisible();await expect(page.getByRole('button',{name:'Tap to Light',exact:true})).toBeDisabled();
   await frames(page,{},4);await page.getByRole('button',{name:'Sound on',exact:true}).click();expect(await page.getByRole('button',{name:'Sound on',exact:true}).getAttribute('aria-pressed')).toBe('true');
   await page.getByRole('button',{name:'Tap to Light',exact:true}).evaluate(button=>{button.click();button.click();button.click();});await frames(page,{},1);await expect(page.locator('.fuse-instructions')).toHaveAttribute('data-ignition-state','IGNITING');
   await page.evaluate(()=>{Object.defineProperty(document,'visibilityState',{configurable:true,value:'hidden'});document.dispatchEvent(new Event('visibilitychange'));});await expect(page.getByText('Ignition paused.',{exact:true})).toBeVisible();
   await page.evaluate(()=>{Object.defineProperty(document,'visibilityState',{configurable:true,value:'visible'});document.dispatchEvent(new Event('visibilitychange'));});await frames(page,{},8);await expect(page.getByRole('timer')).toHaveCount(0);
   expect(await page.evaluate(()=>testAR.scene.scene.getObjectByName('ThiriFuseIgnition').visible)).toBe(false);expect(audioRequests).toBe(6);
   await page.getByRole('button',{name:'Return to placement',exact:true}).click();await frames(page,{},8);await page.getByRole('button',{name:'Place Cracker',exact:true}).click();await frames(page,{},1);await page.getByRole('button',{name:'Light the Fuse',exact:true}).click();await frames(page,{},2);await expect(page.getByRole('button',{name:'Tap to Light',exact:true})).toBeEnabled();
   await page.getByRole('button',{name:'Back to placement',exact:true}).click();await page.getByRole('button',{name:'Back to cracker selection',exact:true}).click();await page.getByRole('button',{name:'Close AR and return to Welcome',exact:true}).click();expect(await allStopped(page)).toBe(true);expect(await page.evaluate(()=>testAR.scene.scene.children.length)).toBe(0);expect(errors).toEqual([]);
   await context.close();results.push({engine:name,id,result:'pass',test:'offscreen/limited tracking guards, Tap fallback, duplicate prevention, enabled sound control with six preloaded assets, background cancellation without auto replay, explicit reposition retry, disposal'});
  }
  {
   const{context,page}=await fixture(browser);await enter(page);
   const math=await page.evaluate(async()=>{const {projectFuse,withinFuseRadius}=await import('/src/lib/ar/fuse-projection.ts');const camera=new THREE.PerspectiveCamera(60,2,.01,100);const fuse=new THREE.Object3D();fuse.position.set(0,0,-2);const b={left:20,top:30,width:200,height:100};const center=projectFuse(fuse,camera,b);fuse.position.z=2;const behind=projectFuse(fuse,camera,b).visible;fuse.position.set(99,0,-2);return{center,behind,off:projectFuse(fuse,camera,b).visible,inside:withinFuseRadius({x:166,y:80},center,46),outside:withinFuseRadius({x:166.01,y:80},center,46),nan:withinFuseRadius({x:NaN,y:80},center,46)};});
   expect(math).toEqual({center:{x:120,y:80,visible:true},behind:false,off:false,inside:true,outside:false,nan:false});await context.close();results.push({engine:name,result:'pass',test:'projection uses offset CSS canvas bounds, rejects behind/offscreen, configurable radius boundary and NaN rejection'});
  }
  await browser.close();
 }
 fs.writeFileSync(process.env.IGNITION_ONLY==='recovery'?'ignition-recovery-test-results.json':'ignition-test-results.json',JSON.stringify({note:'Real Three projection, geometry, world transforms and application ignition logic; synthetic camera/SDK poses. Not physical-device AR verification.',results},null,2));console.log(JSON.stringify(results,null,2));
})().catch(e=>{console.error(e);process.exit(1)});
