# Screen 09 — AR Fireworks

> Audio update (2026-11-03): historical silent/mute behavior below is superseded by [AUDIO.md](AUDIO.md). Six local cues now play through gesture-unlocked Web Audio, enabled by default; temporary synthesis is explicitly identified.

## Implemented

Flower Pot, Ground Chakra and Rocket have distinct real-time Three.js particle effects. The existing ignition/countdown and rear-camera AR session are reused. The countdown's previous placeholder has been removed. No prerecorded footage, static firework image, extra renderer, requestAnimationFrame loop, SDK restart or additional permission request is introduced.

Flower Pot was implemented and validated first through the complete countdown → fountain → completion → replay-placement flow, including real WebGL rendering, before the other effects were added.

## Files

- `src/config/fireworks.ts`: effect durations, 320/640/1000 particle budgets and conservative initial device hints.
- `src/components/ar/effects/ParticleEmitter.ts`: reusable fixed buffers, deterministic birth/velocity/gravity/lifetime, seeded variation, soft velocity-oriented spark shader and particle recycling.
- `src/components/ar/effects/FireworkEffect.ts`: common effect contract, immutable world-anchor transform, named-node lookup and soft ground contact glow.
- `FlowerPotFountain.ts`: golden fountain, opening flame, subtle smoke and gradual emission/fade.
- `GroundChakraEffect.ts`: radial ground sparks and accelerated/decelerated local-axis visual rotation.
- `RocketLaunchEffect.ts`, `RocketExplosionEffect.ts`: supported launch visual, exhaust, tracked world-space burst, bounded look-up gate and explicitly selected camera-relative sky preview.
- `src/lib/ar/fireworks-controller.ts`: once-only countdown handoff, effect selection, states, interruption, adaptive quality, completion and resource lifecycle.
- `src/lib/audio/fireworks-audio.ts`: optional verified audio hooks; currently empty asset map, so silent.
- `src/components/ar/FireworksOverlay.tsx`, `src/styles/fireworks.css`: minimal playing/guidance UI, completion and explicit replay/choose actions.
- `src/components/ar/models/{model,FlowerPotModel,RocketModel}.ts`: separate visual body, named actual fountain opening and rocket exhaust; fixed launch support separated from the moving rocket. Placement-root transforms and earlier screen compositions are preserved.
- `src/lib/ar/{engine,types,tracking}.ts`, `src/components/ar/{ScanGroundScreen,FirestickInteraction}.tsx`: shared session/frame integration and replacement of the old countdown boundary.
- `tests/fireworks.cjs`, `tests/fireworks-effects.cjs`, `tests/helpers/celebration-flow.cjs`, updated ignition/placement regressions and npm scripts.

## Countdown handoff

`IgnitionController` still owns the original monotonic five-second countdown. After it publishes zero, `GroundARSession` checks the live session, active fuse flow, unpaused camera, recovered NORMAL tracking and uninterrupted ignition. It passes the existing `CountdownContext` to `FireworksController.countdownFinished()`.

The controller accepts only WAITING with no prior attempt. It records the ignition timestamp before creating the effect, validates selected/placed cracker types, transitions READY → PLAYING and ignores repeated zero events. React receives meaningful summary changes only. Particle movement runs in the existing SDK `onUpdate` pipeline; countdown and effect timing use monotonic elapsed time, with no interval simulating successful fireworks.

States: WAITING, READY, PLAYING, PAUSED, TRACKING_LOST, COMPLETED, CANCELLED, ERROR. Completion is reached only after the selected effect's total fade duration. After its last particles expire, the effect is disposed and local visual overrides are restored before COMPLETED is published. Screen 10 preserves the placed model for validated replay.

## Effect behavior

### Flower Pot — complete

The named `FountainEmitter` is at the actual procedural cone opening (model-local Y=0.287 m), distinct from the rope's FusePoint. The effect root copies the saved placed position/quaternion/scale into the shared scene. Sparks originate within that opening, build over approximately one second, sustain a dense golden stream, spread, fall under gravity and fade. Emission tapers off by 4.1 s; remaining sparks and faint smoke expire before the 5.6 s completion. A small warm opening flame and contact glow fade with the effect. The placed model never moves.

### Ground Chakra — complete

The disc stays on its saved ground anchor. Only `VisualBody` rotates around its local vertical axis: ramp-up, rapid rotation and smooth slowdown to a stop. Radial orange/gold sparks use emission direction at each birth time, the saved plane orientation and gravity. Sparks stop at ground contact. Emission ends at 3.7 s; completion is approximately 4.9 s. The final visual orientation remains until reset, when its original local transform is restored.

### Rocket — complete, with explicit sky limitation

`RocketVisual` includes the existing body, fins, fuse and long stick. `LaunchSupport` stays at the ground anchor. The visual vibrates briefly, then accelerates approximately 5 m along its placed upright axis, producing exhaust from the named `RocketExhaust`. The saved PlacedCracker root, world position and rotation are untouched.

The nominal burst begins at about 2.45 s, emitting purple, magenta, gold and orange radial particles with gravity and varied lifetimes. Completion is about 5.8 s for a prompt, visible burst. The tracked-camera frustum must contain the actual world burst point; there is no fixed screen target. If the user looks up slightly later, the burst starts when visible and then receives its full fade time (up to about 6.75 s total). If not visible by the 3.4 s guidance deadline, world playback pauses and offers a clear continuation/reposition path. It does not wait indefinitely or detonate an unseen burst automatically.

This implementation inspected the existing SDK and official [engine overview](https://8thwall.org/docs/engine/overview), [world-tracking configuration](https://8thwall.org/docs/api/engine/xrcontroller/configure), and [engine capabilities](https://8thwall.org/docs/engine). Sky segmentation is a distinct feature; it is not evidence of reliable SLAM anchors against featureless sky. No sky-specific API, segmentation mask, VPS, or world-tracking reconfiguration is invented or added. The world burst is unmasked 3D content and requires continuing usable world tracking; it is not certified as a persistent sky anchor.

When framing/tracking fails, the user can explicitly select **Play sky preview**. The UI explains that it follows the camera and labels the entire preview **Camera-relative sky preview**. A separate particle burst uses a scene transform equivalent to the current view camera, cancelling camera pose in the model-view matrix. It is intentionally viewport-relative, uses the existing live camera feed/projection, and does not claim physical anchoring. No second camera, static substitute or automatic fallback is used. An explicit preview is allowed once per attempt. Limited SLAM can continue this labelled preview, but backgrounding, stale camera frames or camera failure still interrupts it.

## Particles and performance

Each emitter preallocates BufferGeometry attributes, birth times and particle properties. Slots recycle; position is calculated analytically from initial position, velocity, gravity and age. A seed based on slot and birth time gives reproducible trajectories even when frames are skipped. Shader points have variable sizes/colors, a bright core and a velocity-oriented soft streak. Smoke uses a faint soft circular point. There are no external particle textures, meshes created per frame, heavy post-processing or shadow maps.

Budgets are configurable: LOW 320, MEDIUM 640, HIGH 1000 allocated particle slots. Initial memory/CPU hints choose low or medium; actual SDK frame cadence feeds an exponential moving average. Sustained cadence slower than roughly 34 ms reduces subsequent emissions to low. Already-live sparks finish their lifetimes rather than disappearing abruptly, so a short transition can temporarily exceed the new density target while remaining within the original fixed allocation. No new pool is allocated for quality changes. A budget is a starting quality choice, not a guarantee of mobile frame rate.

The fountain uses two particle draws plus tiny flame/glow meshes; Chakra uses one particle draw plus glow; Rocket uses two particle draws for trail/burst. The rocket's static launch support adds two small merged model meshes (nine merged model meshes total), rather than moving the placed anchor. All geometry, shader/material resources, glow/flame geometry and local visual overrides are released/restored on reset/disposal. Repeated-cycle tests check scene object counts return to baseline.

Reduced motion lowers spark travel and disables the guidance-arrow animation; it does not remove the celebration or require a gesture beyond the existing ignition.

## Tracking, interruption and replay

World effects stop rendering when tracking becomes LIMITED/unusable, on large pose jumps detected by the existing placement controller, or when current camera frames stop. Their state does not automatically resume or replay after tracking recovers. The saved placed root remains intact. Recovery requires an explicit new placement/ignition, or the clearly labelled Rocket sky preview.

Backgrounding pauses the SDK through the existing lifecycle and interrupts effects/countdown. Returning cannot automatically launch an explosion. Closing/fatal engine errors dispose all effects before releasing the existing SDK renderer and camera. There is no new media owner.

**Celebrate Again** now uses the [Screen 10 validated replay API](CELEBRATION_COMPLETE.md): finished particles are already disposed, ignition/countdown reset, and valid selection/placement/camera are retained for direct return to Light the Fuse. Unreliable placement requires recovery. A new explicit ignition is required. **Choose Another Cracker** performs the same cleanup and opens existing selection without a camera restart. Screen 10 now provides the approved illustrated completion card; see its linked implementation guide.

## Audio / assets

No legitimate supplied fireworks audio was found in `public/assets`. The optional asset map remains empty; sound enabled or muted both work without requests for missing audio. Future verified URLs can map fountain/chakra/launch/burst sounds. The existing persisted sound preference gates playback; mute, completion, cancellation and disposal stop audio. Playback promise rejection cannot block visuals. No microphone access is used.

All effects are procedural. Optional spark PNGs are not needed, and no images or unrelated sounds were fetched as substitutes. Existing approved branding, cracker art and temporary authorized SVG firestick remain unchanged.

## Verification and Vercel

From the project directory:

```sh
npm ci
npm run dev
# Another terminal, with TEST_URL set if Vite uses a different port:
npm run test:fireworks-effects
npm run test:fireworks
npm run test:ignition
npm run test:ignition-state
npm run test:placement
npm run test:ar
npm run test:camera
npm run test:selection
npm run test:e2e
npm run build
```

Install Playwright Chromium/WebKit first. `CHROMIUM_EXECUTABLE_PATH` and `PLAYWRIGHT_BROWSERS_PATH` can select existing browsers. The fireworks flow tests use controlled browser monotonic time and explicitly synthetic SDK camera/SLAM poses, while exercising the real application/Three.js behavior. Effect tests render real WebGL shaders with controlled timestamps and synthetic world transforms. These are not physical-camera or mobile-GPU performance tests.

Coverage: correct effect for every cracker, exactly-once zero handoff, named source geometry, fixed root transforms, visual-child motion, world/preview burst rules, gravity/fade/completion, skipped-frame determinism, quality reduction, repeated reset/disposal, tracking/background loss, no automatic replay, Celebrate Again/Choose Another, single camera/SDK run, and all four requested portrait sizes in Chromium/WebKit.

Vercel remains frontend-only: Vite preset, `npm ci`, `npm run build`, output `dist`. The existing prebuild copies the complete pinned 8th Wall distribution, and postbuild verifies 13 original engine artifacts plus required assets/licenses. No server functions, database, authentication or environment secrets are added. Existing SPA/asset rewrites remain unchanged. The lazy Three.js/AR bundle retains a size warning; it loads only after camera consent. A build pass does not certify a deployed WebAR experience.

## Required physical-device acceptance

No physical iPhone/Android AR test or Vercel deployment was performed here. On deployed HTTPS, test iPhone 13 Safari and Android Chrome, including a mid-range Android device:

1. Enable rear camera once, scan textured well-lit ground, choose Flower Pot, place, light and observe 5 → 1. At zero verify a golden fountain emerges from the actual cone opening and keeps ground perspective while moving the phone slowly.
2. Wait for the fade and completion; Celebrate Again must preserve the camera, reset visual state and require a new ignition. Choose Another must reuse the same camera and clear the old effect.
3. Check Chakra's flat contact, spin axis, radial sparks, slowdown and fade from different angles. Verify anchor drift honestly rather than claiming stable placement after tracking loss.
4. For Rocket, tilt gradually upward while maintaining textured features. Verify launch/support separation, exhaust, world burst when tracking remains usable, and bounded Look up guidance. Test the explicitly camera-relative preview and its label separately; it must not be described as world-anchored.
5. Obscure the camera/move quickly before and during each effect; verify interruption and explicit recovery. Background during countdown, launch, burst and sky preview; returning must not detonate/replay automatically.
6. Inspect runtime requests on Vercel, safe areas at 320×568, 375×812, 390×844 and 428×926, touch targets, camera cleanup, mute, GPU frame cadence, heat and memory across repeated cycles. Tune budgets based on those measurements. Report device-specific failures or sky drift as limitations.

Local results for this change: `npm run build` passed strict TypeScript, Vite and runtime/asset verification. `test:fireworks` passed 30 flow/layout/recovery cases; `test:fireworks-effects` passed both Chromium/WebKit groups (all three effects, repeated cleanup, quality adaptation, sky preview and deterministic active trajectories). Ignition (14), ignition-state (2), placement (14), scanning/AR (14), camera (14), selection (10) and Splash/Welcome (12) checks also passed. The existing lazy AR chunk size warning remains. These results are synthetic browser/renderer verification, not physical-device certification.
