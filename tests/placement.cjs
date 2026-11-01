const { chromium, webkit, expect } = require('@playwright/test');
const { fixture, allStopped } = require('./helpers/ar-fixture.cjs');
const fs = require('node:fs');
const url = process.env.TEST_URL || 'http://127.0.0.1:5174/';
const executablePath = process.env.CHROMIUM_EXECUTABLE_PATH;
const results = [];
async function frames(page, { position = [0,1.5,0], target = [0,0,-1.4], status = 'NORMAL' } = {}, count = 4) {
 for(let i=0;i<count;i++) {
  await new Promise(resolve=>setTimeout(resolve,155));
  await page.evaluate(({position,target,status})=>{
   const cam=testAR.scene.camera;cam.position.set(...position);cam.lookAt(...target);cam.updateMatrixWorld(true);
   const ray=new THREE.Raycaster();ray.setFromCamera(new THREE.Vector2(0,-0.16),cam);
   const point=ray.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0,1,0),0),new THREE.Vector3());
   const hits=point?[{type:'DETECTED_SURFACE',position:{x:point.x,y:point.y,z:point.z},rotation:{x:0,y:0,z:0,w:1}}]:[];
   testAR.emit({status,hits,cameraPosition:position,lookAt:target});
  },{position,target,status});
 }
}
async function enter(page,name='Flower Pot') {
 await page.goto(new URL('camera-permission',url).href);await page.getByRole('button',{name:'Enable Camera'}).click();
 await expect(page.locator('.ar-scan')).toHaveAttribute('data-ar-state','SCANNING');
 await expect.poll(()=>page.evaluate(()=>Boolean(testAR.scene?.scene.children.find(o=>o.isMesh)?.material.map))).toBe(true);
 await frames(page);await page.getByRole('button',{name:'Choose a Cracker'}).click();
 if(name!=='Flower Pot')await page.getByText(name,{exact:true}).click();
 await page.getByRole('button',{name:`Place ${name}`,exact:true}).click();await expect(page).toHaveURL(/place-cracker$/);
}
async function ready(page,options) {
 await frames(page,options,8);await expect(page.locator('.cracker-placement-panel')).toHaveAttribute('data-placement-phase','READY_TO_PLACE');
}
(async()=>{
 for(const[name,engine]of [['Chromium',chromium],['WebKit',webkit]]) {
  const browser=await engine.launch({headless:true,...(name==='Chromium'&&executablePath?{executablePath}:{})});
  for(const[width,height]of [[320,568],[375,812],[390,844],[428,926]]){
   const{context,page,errors}=await fixture(browser,{width,height});await enter(page);await ready(page);
   expect(await page.evaluate(()=>[document.documentElement.scrollWidth,document.documentElement.scrollHeight])).toEqual([width,height]);
   const cta=await page.getByRole('button',{name:'Place Cracker',exact:true}).boundingBox();expect(cta.height).toBeGreaterThanOrEqual(48);expect(cta.y+cta.height).toBeLessThanOrEqual(height);
   const preview=await page.evaluate(()=>{
    const model=testAR.scene.scene.getObjectByName('CrackerModel:flower-pot');const box=new THREE.Box3().setFromObject(model);const fuse=model.getObjectByName('FusePoint');
    let meshes=0,allTransparent=true;model.traverse(o=>{if(o.isMesh){meshes++;allTransparent=allTransparent&&o.material.transparent&&o.material.opacity<1;}});
    window.currentCracker=model;
    return{meshes,allTransparent,base:box.min.y,hasFuse:Boolean(fuse),fuseHeight:fuse.getWorldPosition(new THREE.Vector3()).y,position:model.getWorldPosition(new THREE.Vector3()).toArray()};
   });
   expect(preview.meshes).toBeGreaterThan(2);expect(preview.meshes).toBeLessThanOrEqual(8);expect(preview.allTransparent).toBe(true);expect(preview.hasFuse).toBe(true);expect(preview.base).toBeGreaterThanOrEqual(-0.0001);expect(preview.fuseHeight).toBeGreaterThan(0.3);
   await frames(page,{},1);await page.getByRole('button',{name:'Place Cracker',exact:true}).click();
   await expect(page.getByRole('heading',{name:'Cracker placed!'})).toBeVisible();
   const saved=await page.evaluate(()=>{const m=currentCracker;let opaque=true;m.traverse(o=>{if(o.isMesh)opaque=opaque&&!o.material.transparent&&o.material.opacity===1;});return{position:m.getWorldPosition(new THREE.Vector3()).toArray(),rotation:m.getWorldQuaternion(new THREE.Quaternion()).toArray(),opaque,notCameraParent:m.parent.parent===testAR.scene.scene,reticle:testAR.scene.scene.children.find(o=>o.isMesh).visible};});
   expect(saved.opaque).toBe(true);expect(saved.notCameraParent).toBe(true);expect(saved.reticle).toBe(false);
   for(const x of [0.12,0.24,0.36])await frames(page,{position:[x,1.5,x],target:[0,0,-1.4]},1);
   expect(await page.evaluate(()=>currentCracker.getWorldPosition(new THREE.Vector3()).toArray())).toEqual(saved.position);
   expect(await page.evaluate(()=>currentCracker.getWorldQuaternion(new THREE.Quaternion()).toArray())).toEqual(saved.rotation);
   await frames(page,{status:'LIMITED'},1);await expect(page.getByRole('heading',{name:"Let's find your cracker again."})).toBeVisible();
   await expect(page.getByRole('button',{name:'Light the Fuse',exact:true})).toBeDisabled();
   expect(await page.evaluate(()=>({same:testAR.scene.scene.getObjectByName('CrackerModel:flower-pot')===currentCracker,visible:currentCracker.parent.visible}))).toEqual({same:true,visible:false});
   await frames(page,{},4);await expect(page.getByRole('heading',{name:'Cracker placed!'})).toBeVisible();
   expect(await page.evaluate(()=>currentCracker.getWorldPosition(new THREE.Vector3()).toArray())).toEqual(saved.position);
   await frames(page,{},1);await page.getByRole('button',{name:'Light the Fuse',exact:true}).click();await expect(page).toHaveURL(/light-fuse$/);
   await expect(page.locator('.fuse-step-boundary')).toContainText('Fuse controls are coming next.');
   expect(await page.evaluate(()=>currentCracker.getObjectByName('FusePoint').getWorldPosition(new THREE.Vector3()).toArray())).not.toEqual(saved.position);
   await page.locator('.fuse-step-boundary button').click();await expect(page).toHaveURL(/place-cracker$/);
   await page.getByRole('button',{name:'Reposition',exact:true}).click();await expect(page.locator('.cracker-placement-panel')).toHaveAttribute('data-placement-phase','REPOSITIONING');
   const newTarget={position:[0.35,1.5,0],target:[0.4,0,-1.4]};await ready(page,newTarget);await frames(page,newTarget,1);
   await page.getByRole('button',{name:'Place Cracker',exact:true}).click();
   await expect(page.getByRole('heading',{name:'Cracker placed!'})).toBeVisible();expect(await page.evaluate(()=>currentCracker.getWorldPosition(new THREE.Vector3()).toArray())).not.toEqual(saved.position);
   expect(await page.evaluate(()=>[testAR.nativeCalls,testAR.runCalls,testAR.activeMax])).toEqual([1,1,1]);
   await page.getByRole('button',{name:'Recenter view and reset placement'}).click();expect(await page.evaluate(()=>testAR.recenters)).toBe(1);await expect(page.getByRole('button',{name:'Place Cracker',exact:true})).toBeDisabled();
   await page.getByRole('button',{name:'Back to cracker selection',exact:true}).click();await expect(page.getByRole('radio',{name:'Flower Pot',exact:true})).toBeChecked();
   await page.getByRole('button',{name:'Close AR and return to Welcome',exact:true}).click();expect(await allStopped(page)).toBe(true);expect(await page.evaluate(()=>testAR.scene.scene.children.length)).toBe(0);expect(errors).toEqual([]);
   await context.close();results.push({engine:name,width,height,result:'pass',test:'procedural cone/fuse/base bounds, preview alpha, real candidate, frozen world position/rotation, lost/recovered tracking retention, fuse boundary, reposition/recenter, one AR session, full disposal'});
  }
  for(const[label,id]of [['Ground Chakra','ground-chakra'],['Rocket','rocket']]){
   const{context,page,errors}=await fixture(browser);await enter(page,label);await ready(page);
   const shape=await page.evaluate(id=>{
    const m=testAR.scene.scene.getObjectByName(`CrackerModel:${id}`),box=new THREE.Box3().setFromObject(m),size=box.getSize(new THREE.Vector3());let meshCount=0,maps=0;
    m.traverse(o=>{if(o.isMesh){meshCount++;if(o.material.map)maps++;}});return{minY:box.min.y,size:size.toArray(),meshCount,maps,fuse:!!m.getObjectByName('FusePoint')};
   },id);
   expect(shape.minY).toBeGreaterThanOrEqual(-0.0001);expect(shape.maps).toBe(0);expect(shape.fuse).toBe(true);expect(shape.meshCount).toBeLessThanOrEqual(8);
   if(id==='ground-chakra')expect(shape.size[1]).toBeLessThan(shape.size[0]*.4);else expect(shape.size[1]).toBeGreaterThan(.75);
   await frames(page,{},1);await page.getByRole('button',{name:'Place Cracker',exact:true}).click();await expect(page.getByRole('heading',{name:'Cracker placed!'})).toBeVisible();
   await frames(page,{status:'LIMITED'},1);await page.getByRole('button',{name:'Rescan',exact:true}).click();await expect(page).toHaveURL(/\/camera$/);
   expect(await page.evaluate(()=>[testAR.nativeCalls,testAR.runCalls])).toEqual([1,1]);expect(errors).toEqual([]);
   await context.close();results.push({engine:name,id,result:'pass',test:'correct volumetric untextured model/fuse, horizontal chakra or tall supported rocket, placement, rescan without camera restart'});
  }
  {
   const{context,page,errors}=await fixture(browser);await enter(page);
   for(let i=0;i<5;i++){await page.waitForTimeout(155);await page.evaluate(()=>testAR.emit({hits:[]}));}
   await expect(page.getByRole('button',{name:'Place Cracker',exact:true})).toBeDisabled();
   expect(await page.evaluate(()=>testAR.scene.scene.getObjectByName('ThiriCrackerAnchor').visible)).toBe(false);
   await ready(page);await frames(page,{position:[1.2,1.5,0],target:[1.2,0,-1.4]},1);
   await expect(page.getByRole('button',{name:'Place Cracker',exact:true})).toBeDisabled();
   await ready(page);await page.waitForTimeout(400);await page.getByRole('button',{name:'Place Cracker',exact:true}).click();
   await expect(page.getByRole('heading',{name:'Cracker placed!'})).toHaveCount(0);
   await ready(page);await frames(page,{},1);await page.getByRole('button',{name:'Place Cracker',exact:true}).click();
   const saved=await page.evaluate(()=>testAR.scene.scene.getObjectByName('CrackerModel:flower-pot').getWorldPosition(new THREE.Vector3()).toArray());
   await page.evaluate(()=>{Object.defineProperty(document,'visibilityState',{configurable:true,value:'hidden'});document.dispatchEvent(new Event('visibilitychange'));});
   await expect(page.getByRole('button',{name:'Light the Fuse',exact:true})).toBeDisabled();
   expect(await page.evaluate(()=>testAR.scene.scene.getObjectByName('ThiriCrackerAnchor').visible)).toBe(false);
   await page.evaluate(()=>{Object.defineProperty(document,'visibilityState',{configurable:true,value:'visible'});document.dispatchEvent(new Event('visibilitychange'));});
   await frames(page,{},4);await expect(page.getByRole('heading',{name:'Cracker placed!'})).toBeVisible();
   expect(await page.evaluate(()=>testAR.scene.scene.getObjectByName('CrackerModel:flower-pot').getWorldPosition(new THREE.Vector3()).toArray())).toEqual(saved);
   expect(await page.evaluate(()=>[testAR.pauses,testAR.resumes,testAR.runCalls,testAR.nativeCalls])).toEqual([1,1,1,1]);
   expect(errors).toEqual([]);await context.close();results.push({engine:name,result:'pass',test:'NORMAL without support cannot place, sudden pose invalidates preview, stale confirmation rejected, background/resume retains saved world transform without restarting camera'});
  }
  await browser.close();
 }
 fs.writeFileSync('placement-test-results.json',JSON.stringify({note:'Real procedural Three.js scene/geometry/transforms are tested using synthetic SDK camera/pose data. Not physical-device anchor verification.',results},null,2));console.log(JSON.stringify(results,null,2));
})().catch(error=>{console.error(error);process.exit(1)});
