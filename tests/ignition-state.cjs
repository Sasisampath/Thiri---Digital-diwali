const {chromium,webkit,expect}=require('@playwright/test');
const fs=require('node:fs');
const results=[];
(async()=>{
 for(const[name,engine]of [['Chromium',chromium],['WebKit',webkit]]){
  const browser=await engine.launch({headless:true,...(name==='Chromium'&&process.env.CHROMIUM_EXECUTABLE_PATH?{executablePath:process.env.CHROMIUM_EXECUTABLE_PATH}:{})});
  const page=await browser.newPage();await page.goto(process.env.TEST_URL||'http://127.0.0.1:5174/');
  const result=await page.evaluate(async()=>{
   const T=await import('/node_modules/.vite/deps/three.js');const {IgnitionController}=await import('/src/lib/ar/ignition-controller.ts');
   const scene=new T.Scene(),camera=new T.PerspectiveCamera(60,1,.01,100),root=new T.Group(),fuse=new T.Object3D();root.position.z=-2;root.add(fuse);scene.add(root);
   const canvas=document.createElement('canvas');canvas.style.cssText='position:fixed;inset:0;width:100vw;height:100vh';document.body.append(canvas);
   const placed={type:'flower-pot',worldPosition:new T.Vector3(0,0,-2),worldRotation:new T.Quaternion(),worldScale:new T.Vector3(1,1,1),rootObject:root,fusePoint:fuse};const session={};let projection;
   const controller=new IgnitionController(scene,canvas,()=>{},p=>projection=p,session,40);controller.enter(placed);const idle=controller.getSummary().ignitionPhase;controller.update(camera,true,performance.now());controller.arm();const ready=controller.getSummary().ignitionPhase;
   controller.beginDrag();controller.moveTip({x:projection.x+100,y:projection.y});const miss=controller.getSummary().ignitionPhase;controller.cancelDrag();const cancelled=controller.getSummary().ignitionPhase;
   const first=controller.tap(),duplicate=controller.tap(),contact=controller.getSummary().ignitionPhase;const n=performance.now();controller.update(camera,true,n+100);const igniting=controller.getSummary().ignitionPhase;controller.update(camera,true,n+800);const five=controller.getSummary().countdown;controller.update(camera,true,n+3800);const two=controller.getSummary().countdown;
   const context=controller.getCountdownContext();controller.lost();controller.update(camera,true,n+6800);const interrupted=controller.getSummary().ignitionInterrupted,countAfterLoss=controller.getSummary().countdown;const third=controller.tap();controller.dispose();
   return{idle,ready,miss,cancelled,first,duplicate,contact,igniting,five,two,interrupted,countAfterLoss,third,contextValid:context.arSession===session&&context.fusePoint===fuse&&context.placedCracker===placed&&context.ignitionTimestamp>0,childrenAfterDispose:scene.children.length,radius:controller.hitRadius};
  });
  expect(result).toEqual({idle:'IDLE',ready:'FIRESTICK_READY',miss:'DRAGGING',cancelled:'FIRESTICK_READY',first:true,duplicate:false,contact:'FUSE_CONTACT',igniting:'IGNITING',five:5,two:2,interrupted:true,countAfterLoss:null,third:false,contextValid:true,childrenAfterDispose:1,radius:40});
  await browser.close();results.push({engine:name,result:'pass',test:'actual controller transitions, drag miss/cancel, duplicate tap rejected, configurable radius, elapsed-time countdown under skipped frames, integration context identity, interrupted replay rejected and disposal'});
 }
 fs.writeFileSync('ignition-state-test-results.json',JSON.stringify({note:'Browser-hosted real controller/Three.js math with explicit synthetic inputs; no physical camera.',results},null,2));console.log(JSON.stringify(results,null,2));
})().catch(e=>{console.error(e);process.exit(1)});
