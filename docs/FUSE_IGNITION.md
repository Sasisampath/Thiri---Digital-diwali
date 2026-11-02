# Screen 07 — Light the Fuse

## What changed

- `src/components/ar/FirestickInteraction.tsx`: Screen 07 instructions, target cue, accessible Tap to Light, interruption/recovery UI and integrated countdown.
- `src/components/ar/DraggableFirestick.tsx`: captured Pointer Events, explicit image-tip anchor, pointer cancellation/lost capture, smooth return and resize cancellation.
- `src/components/ar/FuseIgnitionEffect.ts`: short, real Three.js world-space particle burst and fuse glow, advanced by the existing XR8 frame loop.
- `src/config/ignition.ts`: replaceable artwork manifest, actual shared tip anchor and hit radius.
- `src/lib/ar/fuse-projection.ts`: FusePoint → tracked-camera projection → CSS/client viewport coordinates, visibility checks and configurable hit radius.
- `src/lib/ar/ignition-controller.ts`: session-owned interaction state, duplicate-ignition lock, spark timing, countdown context and interruption handling.
- `src/lib/audio/ignition-audio.ts`: sound preference, gesture-triggered optional verified audio URLs, rejected-playback handling and cleanup.
- `src/styles/fuse-interaction.css`: compact safe-area UI, touch targets, firestick layers and reduced motion.
- `src/lib/ar/{engine,types,tracking}.ts`, `src/components/ar/ScanGroundScreen.tsx`: reuse the existing camera/scene/render loop and restore the existing sound toggle on Screen 07. The placeholder `FuseStepBoundary.tsx` is superseded.
- `tests/ignition.cjs`, updated `tests/placement.cjs`, `package.json`: new interaction/projection/countdown tests and placement regressions.

Previous Splash, Welcome, permission, scanning, selection and placement compositions are preserved. There is no new dependency, renderer, camera request or SDK initialization for ignition/countdown.

## Assets and missing files

The supplied brief names `firestick-unlit.png`, `firestick-lit.png`, `fuse-sparks.png`, `firestick-crackle.mp3`, and `fuse-ignite.mp3`. None was present in the project or Downloads when inspected. No approved PNG was fabricated, modified or overwritten. No missing audio is fetched, and no unrelated audio is substituted.

The working interaction currently uses explicitly temporary, coded, alpha-transparent SVG fallbacks under `public/assets/ignition/fallback-{unlit,lit}.svg`. Both share a 100×300 viewBox and exact tip at (50,30), normalized (0.5,0.1); only the glow differs. These need replacement with approved artwork when supplied. SVG is resolution independent and does not require a raster WebP conversion. When approved PNGs arrive, retain their originals, inspect actual alpha bounds/tip alignment, normalize both presentations to the same canvas, generate WebPs with alpha and update the image paths and anchor together. The current particle effect is procedural and needs no spark texture.

Audio deliberately remains silent, including when the user's sound setting is on, until the named real assets are supplied. Add only verified URLs to `ignitionAudioAssets`; no microphone permission is requested. Muting immediately stops active audio. Leaving, cancelling or finishing the sequence releases playback. A blocked browser playback promise is caught and does not block the interaction.

## Projection and contact

The session's existing `PlacedCracker.fusePoint` is a named child of the actual world-placed model. Each active XR8 frame updates its ancestor matrices and projects its world position with the tracked Three.js camera. NDC coordinates map through the canvas's real `getBoundingClientRect()`; offsets, CSS scaling and DPR are handled in CSS pixels, never framebuffer pixels. Camera-space depth and clip bounds reject behind-camera, near/far and offscreen points.

The HTML firestick has a tip at the normalized image anchor, measured from its current client rectangle after dragging. Pointer down captures the primary pointer; movement uses direct DOM transforms and refs, rather than per-frame React position state. Pointer up/cancel/lost capture and viewport resize release/reset the gesture. Top and bottom controls remain interactive. A subtle fuse cue follows the projected node with no fixed viewport target or snap-to-target movement.

Contact requires an armed/lit, actively dragged firestick; a valid placed model; fresh NORMAL tracking and recovered placement; a visible FusePoint; and tip distance ≤46 configurable CSS pixels. Tap to Light uses the same guarded ignition method and once-only lock. A failed/stale interaction never lights the fuse. Sound is controlled by the existing persisted preference.

## Ignition, state and countdown

Controller states are IDLE, FIRESTICK_READY, DRAGGING, FUSE_CONTACT, IGNITING, IGNITED, TRACKING_LOST and ERROR. Guarded methods own transitions, pointer input and the once-only `fired` latch. Releasing without contact returns to FIRESTICK_READY; tracking loss cancels the gesture. A short initial unlit-to-lit image reveal is decorative, cleaned up on unmount and skipped for reduced motion. It never ignites the cracker.

On first contact the controller locks ignition immediately. The next existing AR frame displays a roughly 700 ms burst of 32 particles plus a small glowing core originating at the actual FusePoint world position. The stick fades away. The model's saved transform is never rewritten. Reduced motion reduces particle travel and removes UI transitions without preventing ignition.

After completed ignition is observed, a single monotonic countdown starts. `5 - floor((performance.now() - countdownStarted)/1000)` gives 5,4,3,2,1, then the [Screen 09 fireworks controller](FIREWORKS.md). There is no second animation loop, ticking interval or duplicate countdown timer. `getCountdownContext()` exposes `{selectedCracker, placedCracker, fusePoint, ignitionTimestamp, arSession}` to the future Screen 08 implementation. Countdown remains in the same AR screen/session for this minimal integration.

Tracking loss, backgrounding, stale-frame watchdog or leaving an active ignition/countdown interrupts it, hides effects, stops audio and cancels countdown. Returning never automatically restarts it. Explicit Return to placement clears the old attempt and requires placement again. Before ignition, Back preserves placement. Rescan uses the existing scan flow/session. A full camera/engine failure follows the existing retry/help UI. Resource disposal removes particle geometry/materials and the glow from the shared scene.

## Verification

Run from the project directory:

```sh
npm ci
npm run dev
# With the app server running:
TEST_URL=http://127.0.0.1:5174/ npm run test:ignition
npm run test:ignition-state
npm run test:placement
npm run build
```

Install Playwright Chromium/WebKit first; `CHROMIUM_EXECUTABLE_PATH` and `PLAYWRIGHT_BROWSERS_PATH` can select installed browsers. Tests intentionally inject synthetic SDK camera/pose data while exercising actual Three geometry/transforms, projection and application logic. They do not prove physical-device SLAM or touch performance.

Coverage includes four portrait viewports (320×568, 375×812, 390×844, 428×926), CSS tip alignment, drag miss/cancel/contact, Tap fallback, all three FusePoints, behind/offscreen rejection, canvas offset mapping, hit-radius edges, duplicate prevention, particles at the real world node, countdown, sound preference/missing audio, tracking and background interruption, explicit retry, unchanged placed transforms, one camera/SDK run and full resource cleanup.

## Vercel and device acceptance

Use the existing Vite preset, `npm ci`, `npm run build`, output `dist`, HTTPS and committed runtime/asset rewrites. No backend, authentication, database or environment secrets are required. Existing engine binary packaging/licenses remain unchanged.

On physical iPhone 13 Safari and Android Chrome:

1. Complete permission → textured-ground scan → select → place → Light the Fuse. There must be no new permission prompt or camera restart.
2. Move the phone slightly: the saved cracker stays approximately anchored and the fuse cue follows its actual 3D projection. Point away and confirm lighting disables.
3. Drag away and release; verify return. Test finger cancellation/rotation. Drag the physical tip onto the fuse: one world-space spark burst, stick fade and one 5-to-1 countdown should occur.
4. Repeat with Tap to Light and all three crackers. Test mute and sound again once approved audio exists.
5. Lose tracking before contact: no ignition. Lose tracking/background during sparks or countdown: interruption must require explicit recovery, with no automatic fireworks/replay on return.
6. Check safe areas, CTA visibility, no scrolling/zooming, Back/Reposition/Rescan and Close camera cleanup. Inspect runtime/asset requests on deployed HTTPS.

Actual physical iPhone/Android behavior and Vercel deployment are not verified by local browser fixtures. Report drift, failed recovery or device-specific errors honestly. Approved firestick/spark PNGs and audio remain outstanding assets.

Verified for this change: `npm run build`, `test:ignition` (14 cases), `test:ignition-state` (2), `test:placement` (14), `test:ar` (14), `test:camera` (14) and `test:e2e` (12) passed locally. The existing large lazy AR chunk warning remains. Physical-device tracking and touch behavior are not certified.
