import { getCracker } from '../../config/crackers';
import JazzHQLogoReveal from './JazzHQLogoReveal';
import { useEffect, useRef } from 'react';
import type { FireworksSummary } from '../../lib/ar/fireworks-controller';
import '../../styles/fireworks.css';
type Props=FireworksSummary&{onAgain:()=>void;onChoose:()=>void;onSkyPreview:()=>void};
export default function FireworksOverlay({fireworksState,fireworksError,fireworksSpace,fireworksType,rocketGuidance,logoRevealPhase,onAgain,onChoose,onSkyPreview}:Props){
  const title=useRef<HTMLHeadingElement>(null);
  useEffect(()=>{if(fireworksState!=='PLAYING')title.current?.focus({preventScroll:true});},[fireworksState]);
  if(fireworksState==='PLAYING')return <div className="fireworks-playing" data-fireworks-state={fireworksState} aria-label="Fireworks playing">{rocketGuidance&&<div className="rocket-guidance"><span aria-hidden="true">↑</span><p>Look up!</p><small>Sky preview follows your camera.</small><button type="button" onClick={onSkyPreview}>Play sky preview</button></div>}{fireworksSpace==='camera-relative'&&<p className="sky-preview-label">Camera-relative sky preview</p>}{logoRevealPhase!=='NONE'&&<JazzHQLogoReveal phase={logoRevealPhase}/>}</div>;
  const completed=fireworksState==='COMPLETED';
  return <section className="fireworks-completion" data-fireworks-state={fireworksState} aria-labelledby="fireworks-title">
    <h1 ref={title} id="fireworks-title" tabIndex={-1}>{completed?'That was magical!':rocketGuidance?'Look up to follow your rocket.':fireworksState==='ERROR'?'Let’s try that again.':"Let's find your cracker again."}</h1>
    {fireworksSpace==='camera-relative'&&<p className="sky-preview-note">Camera-relative sky preview</p>}
    <p>{completed?'Ready for another one?':fireworksError??'The celebration stopped safely. Place your cracker and light it again when you’re ready.'}</p>
    {!completed&&fireworksType&&getCracker(fireworksType).baseType==='rocket'&&fireworksSpace==='world'&&<p>Sky preview follows your camera.</p>}
    {!completed&&fireworksType&&getCracker(fireworksType).baseType==='rocket'&&fireworksSpace==='world'&&<button type="button" className="thiri-primary-button" onClick={onSkyPreview}>Play sky preview</button>}
    <button type="button" className="thiri-primary-button" onClick={onAgain}>{completed?'Celebrate Again':'Return to placement'}</button>
    <button type="button" className="ar-secondary-button" onClick={onChoose}>Choose Another Cracker</button>
  </section>;
}
