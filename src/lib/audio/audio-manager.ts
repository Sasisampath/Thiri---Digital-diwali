import { cueDurations, synthesize } from './synthesis';
import type { SoundCue } from './synthesis';
export const audioAssets: Record<SoundCue,string> = {
  'flower-pot':'flower-pot-fountain.mp3','ground-chakra':'ground-chakra-spin.mp3',
  'rocket-launch':'rocket-launch.mp3','rocket-burst':'rocket-burst.mp3',
  ignite:'fuse-ignite.mp3',crackle:'firestick-crackle.mp3',
};
type Voice = { source:AudioBufferSourceNode; gain:GainNode };
type Channel = 'ignition'|'fireworks';
/** One context for the page/session, never recreated by renders or replay. No microphone. */
class AudioManager {
  private context:AudioContext|null=null;
  private buffers=new Map<SoundCue,AudioBuffer>();
  private voices=new Map<Channel,Voice>();
  private loading:Promise<void>|null=null;
  private listeners=new Set<()=>void>();
  private blocked=false;
  private events:{cue:SoundCue;at:number;duration:number;fallback:boolean}[]=[];
  private fallback=new Set<SoundCue>();
  subscribe=(listener:()=>void)=>{this.listeners.add(listener);return()=>{this.listeners.delete(listener);};};
  getBlocked=()=>this.blocked;
  private report(blocked:boolean,error?:unknown){
    this.blocked=blocked;this.listeners.forEach(fn=>fn());
    if(error&&import.meta.env.DEV)console.warn('[Thiri audio]',error);
  }
  /** Must be called directly in a click/pointer handler, BEFORE any await. */
  unlock=()=>{
    try{
      if(!this.context){
        const Constructor=window.AudioContext??(window as typeof window & {webkitAudioContext?:typeof AudioContext}).webkitAudioContext;
        if(!Constructor)throw new Error('Web Audio is unavailable in this browser.');
        const context=this.context=new Constructor();
        context.onstatechange=()=>{
          if(context.state!=='running'){this.stopAll();this.report(true);}
          else this.report(false);
        };
        document.addEventListener('visibilitychange',this.visibility);
        window.addEventListener('pagehide',this.background);
      }
      const context=this.context;
      // Invoke synchronously while user activation is still valid (Safari/Chrome).
      const resumed=context.resume();
      const warmup=context.createBufferSource();warmup.buffer=context.createBuffer(1,1,context.sampleRate);warmup.connect(context.destination);warmup.onended=()=>warmup.disconnect();warmup.start();
      void resumed.then(()=>this.report(context.state!=='running')).catch(error=>this.report(true,error));
      void this.preload();
    }catch(error){this.report(true,error);}
  };
  preload(){
    if(this.loading||!this.context)return this.loading??Promise.resolve();
    const context=this.context;
    // Always prepare an audible buffer immediately. File loading cannot cause a late cue.
    for(const cue of Object.keys(audioAssets) as SoundCue[]){
      const buffer=context.createBuffer(1,Math.ceil(cueDurations[cue]*context.sampleRate),context.sampleRate);
      buffer.copyToChannel(synthesize(cue,context.sampleRate),0);this.buffers.set(cue,buffer);this.fallback.add(cue);
    }
    this.loading=Promise.all((Object.keys(audioAssets) as SoundCue[]).map(async cue=>{
      try{
        const response=await fetch(`${import.meta.env.BASE_URL}assets/audio/${audioAssets[cue]}`);
        if(!response.ok)throw new Error(`${audioAssets[cue]}: HTTP ${response.status}`);
        const buffer=await context.decodeAudioData(await response.arrayBuffer());
        if(!buffer.length||!Number.isFinite(buffer.duration))throw new Error(`Invalid audio: ${cue}`);
        this.buffers.set(cue,buffer);this.fallback.delete(cue);
      }catch(error){if(import.meta.env.DEV)console.warn('[Thiri audio] Using synthesized fallback:',cue,error);}
    })).then(()=>{});
    return this.loading;
  }
  play(channel:Channel,cue:SoundCue,options:{loop?:boolean;duration?:number}={}){
    this.stop(channel);
    const context=this.context,buffer=this.buffers.get(cue);
    if(!context||context.state!=='running'||document.visibilityState==='hidden'||!buffer){this.report(true,new Error(`Playback blocked: ${cue}. Tap Enable Sound.`));return;}
    const source=context.createBufferSource(),gain=context.createGain();source.buffer=buffer;source.loop=Boolean(options.loop);
    const now=context.currentTime,duration=options.duration??buffer.duration;
    gain.gain.setValueAtTime(0,now);gain.gain.linearRampToValueAtTime(.8,now+.012);
    if(!source.loop){gain.gain.setValueAtTime(.8,now+Math.max(.02,duration-.65));gain.gain.linearRampToValueAtTime(0,now+duration);}
    source.connect(gain);gain.connect(context.destination);const voice={source,gain};this.voices.set(channel,voice);
    source.onended=()=>{source.disconnect();gain.disconnect();if(this.voices.get(channel)===voice)this.voices.delete(channel);};
    source.start();if(!source.loop)source.stop(now+duration);
    this.events.push({cue,at:performance.now(),duration,fallback:this.fallback.has(cue)});if(this.events.length>100)this.events.shift();
  }
  stop(channel:Channel){const voice=this.voices.get(channel);if(!voice)return;this.voices.delete(channel);voice.source.stop();voice.source.disconnect();voice.gain.disconnect();}
  stopAll(){this.stop('ignition');this.stop('fireworks');}
  private background=()=>{this.stopAll();if(this.context){void this.context.suspend().catch(error=>this.report(true,error));this.report(true);}};
  private visibility=()=>{if(document.visibilityState==='hidden')this.background();};
  diagnostics(){return {state:this.context?.state??'not-created',contexts:this.context?1:0,active:this.voices.size,loaded:this.buffers.size,fallback:[...this.fallback],events:[...this.events]};}
}
export const audioManager=new AudioManager();
