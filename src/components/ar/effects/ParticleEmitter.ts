import { AdditiveBlending, BufferGeometry, Color, DynamicDrawUsage, Float32BufferAttribute, NormalBlending, Points, ShaderMaterial } from 'three';
import type { Object3D } from 'three';
export type Spark = { x:number; y:number; z:number; vx:number; vy:number; vz:number; gravity:number; life:number; size:number; opacity:number; color:number };
export type EmitterConfig = { start:number; end:number; rate:number; burst?:boolean; smoke?:boolean; ground?:boolean; sample:(index:number,birth:number,random:(salt:number)=>number,out:Spark)=>void };
const colors = ['#FFF9F2','#FFD35A','#FFAF38','#FF7049','#7559E8','#DF197F'].map(c=>new Color(c));
export function randomSeed(index:number,salt:number) { const v=Math.sin(index*127.1+salt*311.7)*43758.5453;return v-Math.floor(v); }
/** Fixed reusable buffers. Particle trajectories are analytic functions of birth time. */
export class ParticleEmitter {
  readonly geometry = new BufferGeometry();
  readonly material: ShaderMaterial;
  readonly points: Points;
  private position:Float32Array;
  private alpha:Float32Array;
  private size:Float32Array;
  private color:Float32Array;
  private velocity:Float32Array;
  private birth:Float64Array;
  private properties:Float32Array;
  private accepted:Uint8Array;
  private spark:Spark={x:0,y:0,z:0,vx:0,vy:0,vz:0,gravity:0,life:1,size:.008,opacity:1,color:0};
  private attributes:Float32BufferAttribute[]=[];
  private randomIndex=0;
  private random=(salt:number)=>randomSeed(this.randomIndex,salt);
  activeCount=0;
  constructor(readonly capacity:number,private config:EmitterConfig,parent:Object3D) {
    this.position=new Float32Array(capacity*3);this.alpha=new Float32Array(capacity);this.size=new Float32Array(capacity);this.color=new Float32Array(capacity*3);this.velocity=new Float32Array(capacity*3);
    this.birth=new Float64Array(capacity).fill(-Infinity);this.properties=new Float32Array(capacity*11);this.accepted=new Uint8Array(capacity);
    for(const[name,array,n]of [['position',this.position,3],['aOpacity',this.alpha,1],['aSize',this.size,1],['aColor',this.color,3],['aVelocity',this.velocity,3]] as const) this.geometry.setAttribute(name,new Float32BufferAttribute(array,n).setUsage(DynamicDrawUsage));
    // BufferAttributes own their typed arrays; use those exact buffers in the loop.
    this.position=this.geometry.attributes.position.array as Float32Array;this.alpha=this.geometry.attributes.aOpacity.array as Float32Array;this.size=this.geometry.attributes.aSize.array as Float32Array;this.color=this.geometry.attributes.aColor.array as Float32Array;this.velocity=this.geometry.attributes.aVelocity.array as Float32Array;
    this.attributes=Object.values(this.geometry.attributes) as Float32BufferAttribute[];
    this.material=new ShaderMaterial({transparent:true,depthWrite:false,blending:config.smoke?NormalBlending:AdditiveBlending,toneMapped:false,uniforms:{viewportHeight:{value:800},streak:{value:config.smoke?0:1}},
      vertexShader:`attribute vec3 aVelocity; varying vec2 sparkDirection; attribute float aSize; attribute float aOpacity; attribute vec3 aColor; varying float opacity; varying vec3 color; uniform float viewportHeight; void main(){ vec4 p=modelViewMatrix*vec4(position,1.); gl_Position=projectionMatrix*p; gl_PointSize=clamp(aSize*viewportHeight*2.8/max(.05,-p.z),1.,24.); sparkDirection=normalize((mat3(modelViewMatrix)*aVelocity).xy+vec2(.0001)); opacity=aOpacity; color=aColor; }`,
      fragmentShader:`varying float opacity; varying vec3 color; varying vec2 sparkDirection; uniform float streak; void main(){ vec2 uv=gl_PointCoord*2.-1.; float along=dot(uv,sparkDirection); float across=dot(uv,vec2(-sparkDirection.y,sparkDirection.x)); float r=mix(length(uv),length(vec2(across*1.7,along*.75)),streak); if(r>1.||opacity<.001)discard; float glow=exp(-r*r*4.)*(1.-smoothstep(.65,1.,r)); gl_FragColor=vec4(color*(1.3+1.7*exp(-r*r*14.)),opacity*glow); #include <tonemapping_fragment>\n #include <colorspace_fragment>\n }`.replace('; #include',';\n #include')});
    this.points=new Points(this.geometry,this.material);this.points.frustumCulled=false;this.points.name='FireworkParticles';parent.add(this.points);
  }
  update(time:number,budget:number,viewportHeight:number) {
    this.material.uniforms.viewportHeight.value=viewportHeight;this.activeCount=0;
    const cfg=this.config,period=this.capacity/cfg.rate;
    for(let i=0;i<this.capacity;i++) {
      const first=cfg.start+(cfg.burst?0:i/cfg.rate);
      const last=Math.min(time,cfg.end);
      const born=cfg.burst?first:first+Math.floor((last-first)/period)*period;
      if(time<first||born<first||born>cfg.end){this.alpha[i]=0;continue;}
      const p=i*11;
      if(this.birth[i]!==born) {
        this.birth[i]=born;this.randomIndex=i+Math.round(born*1000)*13;
        this.config.sample(i,born,this.random,this.spark);
        const s=this.spark;
        this.properties[p]=s.x;this.properties[p+1]=s.y;this.properties[p+2]=s.z;this.properties[p+3]=s.vx;this.properties[p+4]=s.vy;this.properties[p+5]=s.vz;this.properties[p+6]=s.gravity;this.properties[p+7]=s.life;this.properties[p+8]=s.size;this.properties[p+9]=s.opacity;this.properties[p+10]=s.color;
        this.accepted[i]=i<budget?1:0;
        const c=colors[s.color%colors.length];this.color[i*3]=c.r;this.color[i*3+1]=c.g;this.color[i*3+2]=c.b;
      }
      const age=time-born,life=this.properties[p+7];
      if(!this.accepted[i]||age<0||age>=life){this.alpha[i]=0;continue;}
      const fade=1-age/life,fadeIn=Math.min(1,age/.025+.2);
      this.position[i*3]=this.properties[p]+this.properties[p+3]*age;
      this.position[i*3+1]=this.properties[p+1]+this.properties[p+4]*age-this.properties[p+6]*age*age*.5;
      this.position[i*3+2]=this.properties[p+2]+this.properties[p+5]*age;
      // Ground-level sparks stop at contact; no particles shoot through the floor.
      if(cfg.ground!==false&&this.position[i*3+1]<.003){this.alpha[i]=0;continue;}
      this.velocity[i*3]=this.properties[p+3];this.velocity[i*3+1]=this.properties[p+4]-this.properties[p+6]*age;this.velocity[i*3+2]=this.properties[p+5];
      this.alpha[i]=this.properties[p+9]*fade*fade*fadeIn;this.size[i]=this.properties[p+8]*(.4+.6*fade);this.activeCount++;
    }
    for(const attribute of this.attributes)attribute.needsUpdate=true;
  }
  reset(){this.birth.fill(-Infinity);this.alpha.fill(0);this.activeCount=0;this.geometry.attributes.aOpacity.needsUpdate=true;}
  dispose(){this.points.removeFromParent();this.geometry.dispose();this.material.dispose();}
}
