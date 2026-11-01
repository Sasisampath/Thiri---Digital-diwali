import type { ScanState } from '../../lib/ar/types';
const labels: Record<ScanState, string> = { INITIALIZING: 'Starting AR', SCANNING: 'Scanning', SEARCHING: 'Finding ground', READY: 'Ready to place', TRACKING_LOST: 'Tracking lost', UNSUPPORTED: 'AR unavailable', ERROR: 'Camera issue' };
export default function ARStatusIndicator({ state, paused }: { state: ScanState; paused: boolean }) {
  return <div className={`ar-status state-${state.toLowerCase()}`} role="status" aria-live="polite"><i aria-hidden="true" />{paused ? 'Session paused' : labels[state]}</div>;
}
