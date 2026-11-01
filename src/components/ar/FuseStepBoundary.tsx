import { useEffect, useRef } from 'react';
import { getCracker } from '../../config/crackers';
import type { PlacedCracker } from '../../lib/ar/placed-cracker-state';
import '../../styles/cracker-placement.css';

type Props = { placed: PlacedCracker | null; trackingReady: boolean; onBack: () => void };
/** Receives the real model and named FusePoint. Screen 07 ignition is not implemented. */
export default function FuseStepBoundary({ placed, trackingReady, onBack }: Props) {
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => { heading.current?.focus({ preventScroll: true }); }, []);
  return <section className="cracker-placement-panel fuse-step-boundary" aria-labelledby="fuse-step-title">
    <p className="placement-cracker-name">SCREEN 07 · NEXT STEP</p>
    <h1 ref={heading} id="fuse-step-title" tabIndex={-1}>Light the Fuse</h1>
    <p>{placed && trackingReady ? `${getCracker(placed.type).name} is placed. Fuse controls are coming next.` : "Let's find your cracker again. Return to placement to recover tracking."}</p>
    <button className="thiri-primary-button" type="button" onClick={onBack}>Back to placement</button>
  </section>;
}
