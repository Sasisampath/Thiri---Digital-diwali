/** Temporary, original procedural SFX, NOT authentic firework recordings.
 * Shared by the offline MP3 generator and missing/failed-file runtime fallback. */
export type SoundCue = 'flower-pot' | 'ground-chakra' | 'rocket-launch' | 'rocket-burst' | 'ignite' | 'crackle';
export const cueDurations: Record<SoundCue, number> = {'flower-pot':5.6,'ground-chakra':4.9,'rocket-launch':2.1,'rocket-burst':1.3,ignite:.7,crackle:1.8};
export function synthesize(cue: SoundCue, rate: number): Float32Array<ArrayBuffer> {
  const duration=cueDurations[cue], samples=new Float32Array(Math.ceil(duration*rate));
  let seed=12345+cue.charCodeAt(0), low=0, pop=0, phase=0;
  const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
  for(let i=0;i<samples.length;i++){
    const t=i/rate,u=t/duration,n=random()*2-1; low+=.12*(n-low);
    const tail=Math.min(1,(duration-t)/(.9)), attack=Math.min(1,t/.018);
    let value=0;
    if(cue==='flower-pot'){
      if(random()<115/rate)pop=.25+random()*.35;
      pop*=Math.exp(-1/(rate*.002)); value=(n*.26+low*.3+pop*n)*(.82+.18*Math.sin(t*19));
    }else if(cue==='ground-chakra'){
      phase+=2*Math.PI*(42-32*Math.pow(u,2))/rate;
      if(random()<180/rate)pop=.5;pop*=Math.exp(-1/(rate*.0015));
      value=((n-low)*.3+pop*n)*(.55+.45*Math.sin(phase)**2)*(1-.3*u);
    }else if(cue==='rocket-launch'){
      phase+=2*Math.PI*(650+1900*u)/rate;
      value=Math.sin(phase)*.22+low*.8+n*.08;
    }else if(cue==='rocket-burst'){
      if(random()<70/rate)pop=.4*Math.exp(-3*t);
      pop*=Math.exp(-1/(rate*.003));value=(low*2+n*.3)*Math.exp(-7*t)+pop*n;
    }else{
      if(random()<(cue==='ignite'?160:65)/rate)pop=.4;
      pop*=Math.exp(-1/(rate*.002));value=(n*.13+pop*n)*(cue==='ignite'?Math.exp(-2*t):1);
    }
    samples[i]=Math.tanh(value)*.82*attack*Math.max(0,tail);
  }
  return samples;
}
