import { Object3D, Vector3 } from 'three';
import type { PerspectiveCamera } from 'three';
import { fireworksConfig } from '../../../config/fireworks';
import { projectFuse } from '../../../lib/ar/fuse-projection';
import { ParticleEmitter } from './ParticleEmitter';
import { burstConfig } from './RocketExplosionEffect';
import type { EmitterConfig } from './ParticleEmitter';
import { anchoredRoot, localNodePosition } from './FireworkEffect';
import type { FireworkContext, FireworkEffect } from './FireworkEffect';
const cfg=fireworksConfig.rocket;
export function rocketHeight(t:number){const u=Math.min(1,Math.max(0,(t-cfg.launchStart)/(cfg.burstAt-cfg.launchStart)));return cfg.height*u*u;}
export class RocketLaunchEffect implements FireworkEffect {
 readonly root;
 private visual:Object3D;
 private initialPosition:Vector3;
 private initialVisible:boolean;
 private trail:ParticleEmitter;
 private burst:ParticleEmitter;
 private burstSettings:EmitterConfig;
 private burstNode=new Object3D();
 private burstTime:number|null=null;
 readonly exhaustOrigin:Vector3;
 get duration(){return (this.burstTime??cfg.burstAt)+3.35;}
 constructor(context:FireworkContext){
   const visual=context.placed.rootObject.getObjectByName('RocketVisual');if(!visual)throw new Error('The placed rocket visual is missing.');this.root=anchoredRoot(context,'RocketLaunchEffect');this.visual=visual;this.initialPosition=visual.position.clone();this.initialVisible=visual.visible;
   this.exhaustOrigin=localNodePosition(context,'RocketExhaust',new Vector3());const origin=this.exhaustOrigin;
   this.burstNode.position.set(0,.6+cfg.height,0);this.burstNode.name='RocketBurstPoint';this.root.add(this.burstNode);
   const trailCount=Math.floor(context.capacity*.28);
   this.trail=new ParticleEmitter(trailCount,{start:0,end:cfg.burstAt,rate:180,sample:(_i,b,r,s)=>{
     s.x=origin.x+(r(1)-.5)*.025;s.y=origin.y+rocketHeight(b);s.z=origin.z+(r(2)-.5)*.025;s.vx=(r(3)-.5)*.14;s.vy=-.3-r(4)*.55;s.vz=(r(5)-.5)*.14;s.gravity=.3;s.life=.25+r(6)*.45;s.size=.006+r(7)*.014;s.opacity=.9;s.color=r(8)>.45?1:2;
   }},this.root);
   this.burstSettings=burstConfig(this.burstNode.position,Infinity,context.reducedMotion);this.burst=new ParticleEmitter(context.capacity-trailCount,this.burstSettings,this.root);this.stop();
 }
 get activeParticles(){return this.trail.activeCount+this.burst.activeCount;}
 get burstStartedAt(){return this.burstTime;}
 get hasBurst(){return this.burstTime!==null;}
 burstVisible(camera:PerspectiveCamera){return projectFuse(this.burstNode,camera,{left:0,top:0,width:1,height:1}).visible;}
 triggerBurst(elapsed:number){if(this.burstTime!==null)return;this.burstTime=elapsed;this.burstSettings.start=elapsed;this.burstSettings.end=elapsed;this.visual.visible=false;}
 start(){this.burstTime=null;this.burstSettings.start=Infinity;this.burstSettings.end=Infinity;this.trail.reset();this.burst.reset();this.visual.visible=true;this.root.visible=true;}
 update(t:number,budget:number,height:number){
   this.visual.position.copy(this.initialPosition);this.visual.position.y+=rocketHeight(t);if(t<cfg.launchStart)this.visual.position.x+=Math.sin(t*85)*.002;
   const trailBudget=Math.floor(budget*.28);this.trail.update(t,trailBudget,height);this.burst.update(t,budget-trailBudget,height);
 }
 pause(){this.root.visible=false;this.visual.visible=false;}resume(){this.root.visible=true;this.visual.visible=!this.hasBurst;}
 stop(){this.root.visible=false;this.visual.visible=false;this.trail?.reset();this.burst?.reset();}
 dispose(){this.stop();this.visual.position.copy(this.initialPosition);this.visual.visible=this.initialVisible;this.root.removeFromParent();this.trail.dispose();this.burst.dispose();}
}
