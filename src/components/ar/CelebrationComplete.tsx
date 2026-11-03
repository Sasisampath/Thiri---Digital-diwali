import { useEffect, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import '../../styles/celebration-complete.css';
type Props={replayAvailable:boolean;cameraRelative:boolean;onReplay:()=>void;onChoose:()=>void;onRescan:()=>void;onExit:()=>void};
export default function CelebrationComplete({replayAvailable,cameraRelative,onReplay,onChoose,onRescan,onExit}:Props){
  const card=useRef<HTMLElement>(null),heading=useRef<HTMLHeadingElement>(null);
  const pending=useRef(false),timer=useRef<number|null>(null);
  const [leaving,setLeaving]=useState(false);
  useEffect(()=>{heading.current?.focus({preventScroll:true});return()=>{if(timer.current!==null)clearTimeout(timer.current);};},[]);
  const act=(action:()=>void)=>{
    if(pending.current)return;pending.current=true;setLeaving(true);
    if(matchMedia('(prefers-reduced-motion: reduce)').matches){action();return;}
    timer.current=window.setTimeout(action,170);
  };
  const keyboard=(e:KeyboardEvent<HTMLElement>)=>{
    if(e.key==='Escape'){e.preventDefault();act(onExit);return;}
    if(e.key!=='Tab')return;
    const buttons=Array.from(card.current?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)')??[]);
    const first=buttons[0],last=buttons[buttons.length-1];
    if(e.shiftKey&&(document.activeElement===first||document.activeElement===heading.current)){e.preventDefault();last?.focus();}
    else if(!e.shiftKey&&(document.activeElement===last||document.activeElement===heading.current)){e.preventDefault();first?.focus();}
  };
  const assets=`${import.meta.env.BASE_URL}assets/celebration/`;
  return <div className={`celebration-overlay${leaving?' is-leaving':''}`} data-fireworks-state="COMPLETED">
    <section ref={card} className="celebration-card" role="dialog" aria-modal="true" aria-labelledby="celebration-title" aria-describedby="celebration-description" onKeyDown={keyboard}>
      <button className="celebration-close" type="button" aria-label="Close celebration and return to Welcome" onClick={()=>act(onExit)}><svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg></button>
      <div className="celebration-art" aria-hidden="true">
        <picture><source type="image/webp" srcSet={`${assets}glowing_diya_diwali_celebration.webp`}/><img className="celebration-diya" src={`${assets}glowing_diya_diwali_celebration.png`} alt="" width="1254" height="1254"/></picture>
        <picture><source type="image/webp" srcSet={`${assets}glossy_festive_sparkle_cluster.webp`}/><img className="celebration-sparkles" src={`${assets}glossy_festive_sparkle_cluster.png`} alt="" width="1254" height="1254"/></picture>
      </div>
      <h1 ref={heading} tabIndex={-1} id="celebration-title">That was magical!</h1>
      <p id="celebration-description">Ready for another one?</p>
      {cameraRelative&&<small className="celebration-preview-note">Camera-relative sky preview</small>}
      {!replayAvailable&&<div className="celebration-recovery" aria-live="polite"><p>Let's find your spot again.</p><button type="button" onClick={()=>act(onRescan)}>Rescan</button></div>}
      <div className="celebration-actions">
        <button className="celebration-primary" type="button" disabled={!replayAvailable||leaving} onClick={()=>act(onReplay)}><svg width="19" height="19" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 10a8 8 0 1 1 1 8M4 4v6h6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>Celebrate Again</button>
        <button className="celebration-secondary" type="button" disabled={leaving} onClick={()=>act(onChoose)}>Choose Another Cracker</button>
      </div>
    </section>
  </div>;
}
