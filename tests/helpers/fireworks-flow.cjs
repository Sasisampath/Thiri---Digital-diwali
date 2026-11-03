async function frame(page,{target=[0,0,-1.4],status='NORMAL',position=[0,1.5,0]}={}){
 await page.clock.fastForward(155);await page.evaluate(({target,status,position})=>{const c=testAR.scene.camera;c.position.set(...position);c.lookAt(...target);c.updateMatrixWorld(true);const ray=new THREE.Raycaster();ray.setFromCamera(new THREE.Vector2(0,-.16),c);const p=ray.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0,1,0),0),new THREE.Vector3());testAR.emit({status,cameraPosition:position,lookAt:target,hits:p?[{type:'DETECTED_SURFACE',position:{x:p.x,y:p.y,z:p.z},rotation:{x:0,y:0,z:0,w:1}}]:[]});},{target,status,position});
}
async function until(page,state,options={},max=100){for(let i=0;i<max;i++){await frame(page,options);if(await page.locator(`[data-fireworks-state="${state}"]`).count())return;}throw Error(`Did not reach ${state}`);}
async function ignite(page){await page.getByRole('button',{name:'Tap to Light',exact:true}).click();await until(page,'PLAYING');}

module.exports={frame,until,ignite};
