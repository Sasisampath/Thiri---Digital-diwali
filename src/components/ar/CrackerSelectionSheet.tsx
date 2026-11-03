import { useEffect, useRef, useState } from 'react';
import { crackers, getCracker } from '../../config/crackers';
import type { CrackerType } from '../../config/crackers';
import CrackerSelectionCard from './CrackerSelectionCard';
import '../../styles/cracker-selection.css';

type Props = { selected: CrackerType; trackingReady: boolean; onSelect: (id: CrackerType) => void; onContinue: () => void; onClose: () => void };
export default function CrackerSelectionSheet({ selected, trackingReady, onSelect, onContinue, onClose }: Props) {
  const cardArea = useRef<HTMLDivElement>(null);
  const initialSelection = useRef(selected);
  const heading = useRef<HTMLHeadingElement>(null);
  const [exiting, setExiting] = useState(false);
  const finished = useRef(false);
  const continueRef = useRef(onContinue);
  continueRef.current = onContinue;
  const cracker = getCracker(selected);
  useEffect(() => { heading.current?.focus({ preventScroll: true }); if(getCracker(initialSelection.current).brand) cardArea.current?.querySelector<HTMLInputElement>('input:checked')?.closest('label')?.scrollIntoView({block:'nearest'}); }, []);
  const finish = () => { if (!finished.current) { finished.current = true; continueRef.current(); } };
  useEffect(() => {
    if (!exiting) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { finish(); return; }
    const timer = window.setTimeout(finish, 240); // Fallback if an animationend event is interrupted.
    return () => window.clearTimeout(timer);
  }, [exiting]);
  return <section className={`cracker-selection-sheet${exiting ? ' is-exiting' : ''}`} aria-labelledby="cracker-sheet-title"
    onAnimationEnd={event => { if (event.target === event.currentTarget && event.animationName === 'cracker-sheet-out') finish(); }}>
    <header className="cracker-sheet-header"><div><h1 ref={heading} id="cracker-sheet-title" tabIndex={-1}>Pick your cracker</h1><p>What are we lighting today?</p></div>
      <button className="cracker-sheet-close" type="button" aria-label="Close AR and return to Welcome" onClick={onClose}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg></button>
    </header>
    <div ref={cardArea} className="cracker-card-scroll" role="radiogroup" aria-label="Choose your cracker">
      <div className="cracker-card-grid">
        {crackers.slice(0,3).map(item => <CrackerSelectionCard key={item.id} cracker={item} selected={selected === item.id} disabled={exiting} onSelect={onSelect} />)}
        <p className="cracker-specials-hint">JazzHQ Specials <span aria-hidden="true">↓</span></p>
        {crackers.slice(3).map(item => <CrackerSelectionCard key={item.id} cracker={item} selected={selected === item.id} disabled={exiting} onSelect={onSelect} />)}
      </div>
    </div>
    {!trackingReady && <p className="cracker-tracking-note" role="status">Tracking is recovering. You can keep choosing.</p>}
    <button className="thiri-primary-button cracker-place-next" type="button" disabled={exiting} onClick={() => setExiting(true)}><span key={selected} className="cracker-cta-label">Place {cracker.name}</span><span aria-hidden="true">→</span></button>
  </section>;
}
