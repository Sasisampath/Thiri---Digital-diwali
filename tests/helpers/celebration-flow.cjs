const {expect}=require('@playwright/test');
const url=process.env.TEST_URL||'http://127.0.0.1:5174/';
async function frames(page,{position=[0,1.5,0],target=[0,0,-1.4],status='NORMAL'}={},count=4){for(let i=0;i<count;i++){await page.waitForTimeout(155);await page.evaluate(({position,target,status})=>{const c=testAR.scene.camera;c.position.set(...position);c.lookAt(...target);c.updateMatrixWorld(true);const r=new THREE.Raycaster();r.setFromCamera(new THREE.Vector2(0,-.16),c);const p=r.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0,1,0),0),new THREE.Vector3());testAR.emit({status,cameraPosition:position,lookAt:target,hits:p?[{type:'DETECTED_SURFACE',position:{x:p.x,y:p.y,z:p.z},rotation:{x:0,y:0,z:0,w:1}}]:[]});},{position,target,status});}}
async function enter(page,name='Flower Pot'){
 await page.goto(new URL('camera-permission',url).href);await page.getByRole('button',{name:'Enable Camera'}).click();await expect.poll(()=>page.evaluate(()=>Boolean(testAR.scene?.scene.children.find(o=>o.isMesh)?.material.map))).toBe(true);
 await frames(page);await page.getByRole('button',{name:'Choose a Cracker'}).click();if(name!=='Flower Pot')await page.getByText(name,{exact:true}).click();await page.getByRole('button',{name:`Place ${name}`,exact:true}).click();await frames(page,{},8);await page.getByRole('button',{name:'Place Cracker',exact:true}).click();await frames(page,{},1);await page.getByRole('button',{name:'Light the Fuse',exact:true}).click();await frames(page,{},2);await expect(page.getByRole('button',{name:'Tap to Light',exact:true})).toBeEnabled();
}

module.exports={frames,enter};
