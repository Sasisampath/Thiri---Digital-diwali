const {chromium,webkit,expect}=require('@playwright/test');
const {fixture,allStopped}=require('./helpers/ar-fixture.cjs');
const {enter}=require('./helpers/celebration-flow.cjs');
const {frame,until,ignite}=require('./helpers/fireworks-flow.cjs');
const fs=require('node:fs');
const results=[];
const diagnostics=page=>page.evaluate(async()=> (await import('/src/lib/audio/audio-manager.ts')).audioManager.diagnostics());
(async()=>{
 for(const[name,engine]of [['Chromium',chromium],['WebKit',webkit]]){
  const browser=await engine.launch({headless:true,...(name==='Chromium'&&process.env.CHROMIUM_EXECUTABLE_PATH?{executablePath:process.env.CHROMIUM_EXECUTABLE_PATH}:{})});
  // Decode actual MP3s and render into OfflineAudioContext: nonzero PCM, finite and below clipping.
  const probe=await browser.newPage();await probe.goto(process.env.TEST_URL||'http://127.0.0.1:5174/');
  const pcm=await probe.evaluate(async()=>{
   const {audioAssets,audioManager}=await import('/src/lib/audio/audio-manager.ts');
   const before=audioManager.diagnostics();const output=[];
   for(const[cue,file]of Object.entries(audioAssets)){
    const c=new OfflineAudioContext(1,44100*6,44100);
    const r=await fetch(`/assets/audio/${file}`);if(!r.ok)throw Error(file);
    const b=await c.decodeAudioData(await r.arrayBuffer());const s=c.createBufferSource();s.buffer=b;s.connect(c.destination);s.start();
    const rendered=await c.startRendering(),data=rendered.getChannelData(0);let power=0,peak=0;
    for(const v of data){power+=v*v;peak=Math.max(peak,Math.abs(v));}
    output.push({cue,duration:b.duration,rms:Math.sqrt(power/data.length),peak});
   }
   return{before,output};
  });
  expect(pcm.before.contexts).toBe(0);for(const row of pcm.output){expect(row.rms).toBeGreaterThan(.001);expect(row.peak).toBeLessThan(1);}
  expect(pcm.output.find(r=>r.cue==='flower-pot').duration).toBeGreaterThan(5.5);expect(pcm.output.find(r=>r.cue==='ground-chakra').duration).toBeGreaterThan(4.8);
  await probe.close();
  for(const label of (process.env.AUDIO_ONLY==='edges'?[]:['Flower Pot','Ground Chakra','Rocket','JazzHQ Flower Pot','JazzHQ Chakra','JazzHQ Rocket'])){
   const{page,context,errors}=await fixture(browser);await context.addInitScript(()=>localStorage.setItem('thiri:sound-enabled','false'));
   await page.clock.install();await enter(page,label);
   await expect(page.getByRole('button',{name:'Sound on',exact:true})).toHaveAttribute('aria-pressed','true');
   await expect.poll(async()=> (await diagnostics(page)).fallback.length).toBe(0);
   expect((await diagnostics(page)).state).toBe('running');
   await ignite(page);let d=await diagnostics(page);expect(d.events.filter(e=>e.cue==='ignite')).toHaveLength(1);
   const base=label.includes('Rocket')?'rocket':label.includes('Chakra')?'ground-chakra':'flower-pot';
   let target=[0,0,-1.4];
   if(base==='rocket'){
    // Countdown zero does not emit a premature launch/burst.
    expect(d.events.filter(e=>e.cue.startsWith('rocket'))).toHaveLength(0);
    const sky=await page.evaluate(()=>testAR.scene.scene.getObjectByName('RocketBurstPoint').getWorldPosition(new THREE.Vector3()).toArray());
    for(let i=1;i<=12;i++){target=sky.map((v,j)=>[0,0,-1.4][j]+(v-[0,0,-1.4][j])*i/12);await frame(page,{target});}
   }
   await until(page,'COMPLETED',{target});d=await diagnostics(page);
   const cues=d.events.filter(e=>!['ignite','crackle'].includes(e.cue));
   expect(cues.map(e=>e.cue)).toEqual(base==='rocket'?['rocket-launch','rocket-burst']:[base]);
   if(base==='rocket')expect(cues[1].at-cues[0].at).toBeGreaterThan(1800);
   expect(d.contexts).toBe(1);expect(d.active).toBe(0);
   await frame(page,{target});await page.getByRole('button',{name:'Celebrate Again',exact:true}).click();
   for(let i=1;i<=12;i++)await frame(page,{target:target.map((v,j)=>v+([0,0,-1.4][j]-v)*i/12)});await expect(page.getByRole('button',{name:'Tap to Light',exact:true})).toBeEnabled();await ignite(page);
   expect((await diagnostics(page)).events.filter(e=>e.cue==='ignite')).toHaveLength(2);
   // Background cancels sources and requires a new gesture; no automatic replay.
   await page.evaluate(()=>{Object.defineProperty(document,'visibilityState',{configurable:true,value:'hidden'});document.dispatchEvent(new Event('visibilitychange'));});
   expect((await diagnostics(page)).active).toBe(0);
   await page.evaluate(()=>{Object.defineProperty(document,'visibilityState',{configurable:true,value:'visible'});document.dispatchEvent(new Event('visibilitychange'));});
   await expect(page.locator('.ar-enable-sound')).toBeVisible();await page.locator('.ar-enable-sound').click();await expect.poll(async()=> (await diagnostics(page)).state).toBe('running');
   await page.getByRole('button',{name:'Cancel fireworks and return to placement',exact:true}).click();
   await page.getByRole('button',{name:'Back to cracker selection',exact:true}).click();await page.getByRole('button',{name:'Close AR and return to Welcome',exact:true}).click();
   expect((await diagnostics(page)).active).toBe(0);expect(await allStopped(page)).toBe(true);
   expect(await page.evaluate(()=>[testAR.nativeCalls,testAR.runCalls,testAR.activeMax])).toEqual([1,1,1]);expect(errors).toEqual([]);
   await context.close();results.push({engine:name,label,result:'pass',cues});console.log(name,label,'pass');
  }
  // Sky-preview burst is driven by the actual explicit preview event, never countdown zero.
  {
   const{page,context,errors}=await fixture(browser);await page.clock.install();await enter(page,'Rocket');await ignite(page);
   for(let i=0;i<24;i++)await frame(page);
   await expect(page.locator('[data-fireworks-state="PAUSED"]')).toBeVisible();
   const before=(await diagnostics(page)).events;expect(before.filter(e=>e.cue==='rocket-burst')).toHaveLength(0);
   await frame(page);await page.getByRole('button',{name:'Play sky preview',exact:true}).click();
   const d=await diagnostics(page);expect(d.events.filter(e=>e.cue==='rocket-launch')).toHaveLength(1);expect(d.events.filter(e=>e.cue==='rocket-burst')).toHaveLength(1);
   await until(page,'COMPLETED',{status:'LIMITED'});expect((await diagnostics(page)).active).toBe(0);expect(errors).toEqual([]);
   await context.close();results.push({engine:name,result:'pass',checks:'explicit sky preview emits one actual burst, launch does not emit an early burst'});
  }
  // A failed file must use audible synthesis, never defer a cue until fetch resolves.
  const{page,context}=await fixture(browser);await page.route('**/assets/audio/*.mp3',r=>r.fulfill({status:404,body:''}));
  await page.goto((process.env.TEST_URL||'http://127.0.0.1:5174/')+'camera-permission');await page.getByRole('button',{name:'Enable Camera',exact:true}).click();
  await expect.poll(async()=> (await diagnostics(page)).loaded).toBe(6);await expect.poll(async()=> (await diagnostics(page)).state).toBe('running');await page.evaluate(async()=>{const m=(await import('/src/lib/audio/audio-manager.ts')).audioManager;await m.preload();m.play('fireworks','flower-pot');});
  expect((await diagnostics(page)).events.at(-1).fallback).toBe(true);expect((await diagnostics(page)).active).toBe(1);
  await page.reload();expect((await diagnostics(page)).contexts).toBe(0);await context.close();
  results.push({engine:name,pcm,result:'pass',checks:'decoded/rendered six real files; missing-file synthesized fallback; refresh requires activation'});await browser.close();
 }
 fs.writeFileSync(process.env.AUDIO_ONLY==='edges'?'audio-edge-test-results.json':'audio-test-results.json',JSON.stringify({note:'Real browser Web Audio decoding/output graph and PCM checks, synthetic camera/SLAM. Does not verify speaker audibility on physical phones.',results},null,2));console.log(JSON.stringify(results,null,2));
})().catch(e=>{console.error(e);process.exit(1)});
