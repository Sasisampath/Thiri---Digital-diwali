import { Mesh, MeshBasicMaterial, SphereGeometry, Vector3 } from 'three';
import { fireworksConfig } from '../../../config/fireworks';
import { ParticleEmitter } from './ParticleEmitter';
import { anchoredRoot, ContactGlow, localNodePosition } from './FireworkEffect';
import type { FireworkContext, FireworkEffect } from './FireworkEffect';
export class FlowerPotFountain implements FireworkEffect {
  readonly root;
  readonly duration=fireworksConfig.flowerPot.duration;
  readonly emitterOrigin:Vector3;
  private transitionAt:number|null;
  private sparks:ParticleEmitter;
  private smoke:ParticleEmitter;
  private glow:ContactGlow;
  private flameMaterial=new MeshBasicMaterial({color:'#FFD35A',transparent:true,depthWrite:false,toneMapped:false});
  private flame=new Mesh(new SphereGeometry(.022,10,8),this.flameMaterial);
  constructor(context:FireworkContext){
    this.emitterOrigin=localNodePosition(context,'FountainEmitter',new Vector3());this.root=anchoredRoot(context,'FlowerPotFountain');
    this.transitionAt=context.brandTransitionAt??null;
    const origin=this.emitterOrigin,reduced=context.reducedMotion,end=context.brandTransitionAt===undefined?4.1:context.brandTransitionAt+.55;
    this.sparks=new ParticleEmitter(context.capacity-24,{start:.02,end,rate:430,sample:(_i,b,r,s)=>{
      const ramp=Math.min(1,Math.max(.08,(b-.2)/1.05)),tail=Math.min(1,(4.1-b)/.6,context.brandTransitionAt===undefined?1:(end-b)/.55),intensity=Math.max(.05,ramp*tail),angle=r(1)*Math.PI*2;
      s.x=origin.x+(r(2)-.5)*.025;s.y=origin.y;s.z=origin.z+(r(3)-.5)*.025;
      const spread=(.05+r(4)*.65)*intensity;s.vx=Math.cos(angle)*spread;s.vz=Math.sin(angle)*spread;
      s.vy=(1.4+r(5)*2.1)*(.35+.65*intensity)*(reduced?.72:1);s.gravity=3.8;s.life=.55+r(6)*.8;s.size=.004+r(7)*.008;s.opacity=r(8)<intensity?.65+r(9)*.35:0;s.color=r(10)>.78?2:r(11)>.4?1:0;
    }},this.root);
    this.smoke=new ParticleEmitter(24,{start:.3,end:context.brandTransitionAt===undefined?3.7:context.brandTransitionAt+.4,rate:12,smoke:true,sample:(_i,_b,r,s)=>{
      s.x=origin.x;s.y=origin.y;s.z=origin.z;s.vx=(r(1)-.5)*.08;s.vy=.22+r(2)*.16;s.vz=(r(3)-.5)*.08;s.gravity=0;s.life=1.1+r(4)*.6;s.size=.04+r(5)*.07;s.opacity=.035;s.color=0;
    }},this.root);
    this.flame.position.copy(origin);this.flame.position.y+=.025;this.flame.scale.set(.7,2,.7);this.root.add(this.flame);this.glow=new ContactGlow(this.root);this.stop();
  }
  get activeParticles(){return this.sparks.activeCount+this.smoke.activeCount;}
  start(){this.sparks.reset();this.smoke.reset();this.root.visible=true;}
  update(t:number,budget:number,height:number){
    const intensity=Math.max(0,Math.min(1,t/.3,(4.5-t)/.9,this.transitionAt===null?1:(this.transitionAt+.8-t)/.8));
    this.sparks.update(t,Math.max(0,budget-24),height);this.smoke.update(t,24,height);this.glow.update(intensity);
    this.flameMaterial.opacity=intensity*(.65+.2*Math.sin(t*43));this.flame.visible=t<4.5;this.flame.scale.y=(1.5+.6*Math.sin(t*35))*intensity;
  }
  pause(){this.root.visible=false;}resume(){this.root.visible=true;}
  stop(){this.root.visible=false;this.sparks?.reset();this.smoke?.reset();}
  dispose(){this.stop();this.root.removeFromParent();this.sparks.dispose();this.smoke.dispose();this.glow.dispose();this.flame.geometry.dispose();this.flameMaterial.dispose();}
}
