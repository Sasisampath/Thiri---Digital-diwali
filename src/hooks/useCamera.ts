import { useCallback, useEffect, useRef, useState } from 'react';

export type CameraErrorKind = 'denied' | 'missing' | 'busy' | 'unsupported' | 'insecure' | 'rear' | 'initialization';
type CameraFailure = { kind: CameraErrorKind; message: string };
export type CameraDirection = 'environment' | 'unknown';

function errorName(error: unknown): string {
  return error instanceof Error || error instanceof DOMException ? error.name : '';
}
function cameraError(error: unknown): CameraFailure {
  switch (errorName(error)) {
    case 'NotAllowedError':
    case 'PermissionDeniedError':
    case 'SecurityError':
      return { kind: 'denied', message: 'Enable camera access in your browser settings to experience Thiri in your surroundings.' };
    case 'NotFoundError':
    case 'DevicesNotFoundError':
      return { kind: 'missing', message: 'We couldn’t find a suitable camera on this device. Try opening Thiri on a phone with a rear camera.' };
    case 'NotReadableError':
    case 'TrackStartError':
      return { kind: 'busy', message: 'Your camera may be in use by another app. Close other camera apps, then try again.' };
    case 'RearCameraError':
    case 'OverconstrainedError':
      return { kind: 'rear', message: 'Thiri needs a rear camera for your surroundings. The selfie camera has been stopped. Try a device with an available rear camera.' };
    default:
      return { kind: 'initialization', message: 'We couldn’t start your camera. Please try again.' };
  }
}
const canRelax = (error: unknown) => ['NotFoundError', 'DevicesNotFoundError', 'OverconstrainedError'].includes(errorName(error));
const stopTracks = (stream: MediaStream) => stream.getTracks().forEach(track => track.stop());

/** Single camera owner. A future AR engine must call stop() before acquiring its own stream. */
export function useCamera() {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [direction, setDirection] = useState<CameraDirection>('unknown');
  const [requesting, setRequesting] = useState(false);
  const [failure, setFailure] = useState<CameraFailure | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const generation = useRef(0);
  const mounted = useRef(false);
  const pending = useRef(false);
  const setError = useCallback((message: string | null, kind: CameraErrorKind = 'initialization') => setFailure(message ? { kind, message } : null), []);

  const stop = useCallback(() => {
    generation.current += 1;
    pending.current = false;
    if (streamRef.current) stopTracks(streamRef.current);
    streamRef.current = null;
    if (mounted.current) { setStream(null); setRequesting(false); setDirection('unknown'); }
  }, []);

  useEffect(() => {
    mounted.current = true;
    window.addEventListener('pagehide', stop);
    return () => { mounted.current = false; stop(); window.removeEventListener('pagehide', stop); };
  }, [stop]);

  const request = useCallback(async (): Promise<MediaStream | null> => {
    if (pending.current || streamRef.current || !mounted.current) return null;
    setFailure(null);
    if (!window.isSecureContext) {
      setFailure({ kind: 'insecure', message: 'Camera access needs a secure connection. Open Thiri using its HTTPS address.' });
      return null;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      setFailure({ kind: 'unsupported', message: 'This browser does not support camera access. Open Thiri in Safari or Chrome on your phone.' });
      return null;
    }
    const requestGeneration = ++generation.current;
    const active = () => mounted.current && requestGeneration === generation.current;
    pending.current = true;
    setRequesting(true);
    let candidate: MediaStream | null = null;
    try {
      // Prefer environment, attempt exact environment if a front camera is reported,
      // and relax video constraints only for camera/constraint availability failures.
      const attempts: MediaTrackConstraints[] = [{ facingMode: { ideal: 'environment' } }, { facingMode: { exact: 'environment' } }];
      let mode: CameraDirection = 'unknown';
      for (let index = 0; index <= attempts.length; index++) {
        if (!active()) return null;
        const video = index === attempts.length ? true : attempts[index];
        try {
          candidate = await navigator.mediaDevices.getUserMedia({ audio: false, video });
        } catch (cause) {
          if (!active()) return null;
          if (canRelax(cause) && index < attempts.length) {
            // An initial constraint failure can go straight to relaxed video.
            if (index === 0) index = attempts.length - 1;
            continue;
          }
          throw cause;
        }
        if (!active()) { stopTracks(candidate); return null; }
        const tracks = candidate.getVideoTracks();
        const track = tracks.find(track => track.readyState === 'live');
        if (!track) { stopTracks(candidate); candidate = null; throw new Error('No live video track'); }
        const facing = typeof track.getSettings === 'function' ? track.getSettings().facingMode : undefined;
        if (facing && facing !== 'environment') {
          stopTracks(candidate); candidate = null;
          if (index < attempts.length) continue;
          throw new DOMException('Rear camera required', 'RearCameraError');
        }
        mode = facing === 'environment' ? 'environment' : 'unknown';
        break;
      }
      if (!candidate) throw new Error('No usable camera');
      streamRef.current = candidate;
      setDirection(mode);
      setStream(candidate);
      return candidate;
    } catch (cause) {
      if (candidate) stopTracks(candidate);
      if (active()) setFailure(cameraError(cause));
      return null;
    } finally {
      if (active()) { pending.current = false; setRequesting(false); }
    }
  }, []);

  return { stream, direction, requesting, error: failure?.message ?? null, errorKind: failure?.kind ?? null, request, stop, setError };
}
