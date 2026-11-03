# Screen 10 — Celebrate Again

## Delivered

The completion screen is a floating cream card over the existing rear-camera scene, with the supplied diya, small secondary sparkle cluster, purple replay pill, lavender selection button and close control. It mounts only for the real `FireworksController` COMPLETED state, after the selected effect's fade duration. No page timer invents completion. Repeated controller frames do not remount or retrigger the card.

## Files

- `src/components/ar/CelebrationComplete.tsx` — real HTML dialog/buttons, artwork, recovery guidance, focus/keyboard handling, guarded exit transitions and timer cleanup.
- `src/styles/celebration-complete.css` — compact cream card, light scrim, safe areas, short-screen internal scrolling, image reveal and reduced motion.
- `src/components/ar/ScanGroundScreen.tsx` — completion-only UI branch, inert background controls, replay/new-selection/rescan/exit callbacks.
- `src/lib/ar/engine.ts`, `types.ts`, `tracking.ts` — replay availability, completion-anchor trust and explicit reset APIs.
- `src/lib/ar/{placement-controller,cracker-preview,ignition-controller}.ts` — explicit old-model disposal and reference clearing for new selection; existing-model preservation for safe replay.
- `src/lib/ar/fireworks-controller.ts` — disposes finished particle resources before reporting COMPLETED; restores local model animation while retaining its world placement.
- `src/App.tsx` — returns keyboard focus to the Welcome heading after AR exit.
- `scripts/optimize-images.mjs`, `scripts/verify-ar-build.mjs` — celebration optimization jobs/filter and required production asset checks.
- `tests/celebration.cjs`, `tests/celebration-memory.cjs`, `tests/helpers/fireworks-flow.cjs` — replay, artwork/layout, recovery, accessibility and real WebGL resource-counter coverage. Existing fireworks regression expectations now reflect direct replay to fuse.

## Approved assets and optimization

The supplied Downloads files were inspected and copied unchanged to:

| Asset | Original PNG | WebP | Dimensions |
|---|---:|---:|---|
| `glowing_diya_diwali_celebration` | 1,164,275 bytes | 106,956 bytes | 1254² → 768² |
| `glossy_festive_sparkle_cluster` | 476,813 bytes | 14,150 bytes | 1254² → 256² |

All four files are under `public/assets/celebration/` and retain alpha transparency. Quality 85 / alpha quality 100 WebP, no upscaling, cropping, flattening or ratio change. The source PNGs remain available as picture-element fallbacks. The WebPs are approximately 91% and 97% smaller. The rendered WebP hero was visually inspected; its flame and decorations stay inside the contained square image.

The hero reserves a 180–220 CSS-pixel square with explicit intrinsic dimensions, preventing image-load layout shifts. Short devices use 180px. The sparkle cluster is 44px and secondary. Both entrance animations run once; no looping hero bounce or screen-wide particles. An optional `--only=celebration` filter regenerates only these WebPs through the existing script:

```sh
npm run optimize:images -- --only=celebration
```

## Actual completion and replay

The existing fireworks controller advances via the sole XR8 frame lifecycle. At genuine end-of-fade it stops/disposes its effect, releases particle geometry/materials, stops audio, restores local visual overrides and publishes COMPLETED. Its state guard prevents repeated completion events. The placed model and its world anchor remain alive.

`GroundARSession.resetForReplay()` validates the live owner/session, camera/paused status, fresh NORMAL tracking, recovered placement state, completion-anchor trust, finite position/quaternion/scale, and agreement with the saved world transform. If valid, it calls explicit fireworks and ignition reset methods, clears countdown/once-only guards, retains the selected model and placement, and re-enters Light the Fuse in the same route/session. The firestick becomes ready; a new drag or Tap to Light is required. No countdown or explosion starts automatically.

If final validation fails, the API returns `place` and the UI goes to placement. Tracking loss, stale frames, backgrounding and orientation change invalidate completion-anchor trust. The card remains readable, Celebrate Again disables, and “Let's find your spot again.” / Rescan appears. Merely restoring NORMAL status does not pretend a possibly drifted anchor is valid; Rescan obtains fresh ground evidence and placement. Camera-relative Rocket completion also requires fresh placement rather than claiming that preview restored a world anchor.

`resetForNewCracker()` stops/disposes effects, forgets ignition's old placed/fuse references, clears placement/scan evidence, removes/disposes all session-owned cached cracker models and opens existing selection. It preserves selected ID as the initial card choice, camera, scene, renderer, lights/ground UI resources and SDK tracking. Re-selecting a cracker builds a fresh model when needed. No geometry/material shared by a still-live replayed model is disposed: safe replay retains that model; only the new-selection reset clears it.

## Exit and accessibility

Close and Escape use the existing AR disposal and Welcome navigation. Camera tracks, SDK modules, effects, audio, listeners and session resources release. Welcome receives logical heading focus. No confirmation dialog is added.

The card uses `role="dialog"`, `aria-modal`, a labelled heading/description, real minimum-48px buttons, focus on entry and Tab/Shift+Tab containment. Background header controls and attribution are inert; the scrim prevents pointer pass-through. Recovery remains accessible and selection/exit stay available. Very short viewports scroll the card internally rather than hiding actions or scrolling the whole camera page.

CSS entrance is about 250 ms, contained diya reveal about 360 ms, secondary sparkle fade about 300 ms and exit about 170 ms. The single exit callback is guarded against repeated activation, cancelled on unmount and immediate for reduced motion. There is no extra render loop or completion/loading delay.

## Tests and Vercel

```sh
npm ci
npm run dev
# With TEST_URL pointing to the running app if needed:
npm run test:celebration
npm run test:celebration-memory
npm run test:fireworks
npm run test:fireworks-effects
npm run test:placement
npm run test:ignition
npm run test:ignition-state
npm run test:ar
npm run test:selection
npm run test:camera
npm run test:e2e
npm run build
```

Install Playwright Chromium/WebKit first. `PLAYWRIGHT_BROWSERS_PATH` and `CHROMIUM_EXECUTABLE_PATH` can select existing browsers. Celebration tests use synthetic SDK camera/tracking and controlled monotonic browser time while exercising actual application/controller behavior. They cover all requested portrait sizes, valid same-placement replay, Flower Pot → Replay → Replay → Choose Another, Chakra → Replay → Choose Another, Rocket → Replay → Exit, old-model removal, no automatic countdown, one camera/SDK run, focus/inert/keyboard, approved WebP loading, tracking/background/orientation/stale recovery, reduced and non-reduced motion, duplicate taps, pending timer cancellation and very-short-card scrolling.

The memory suite uses actual WebGL renderer counters across six cycles per model in both engines. It compares geometry, texture, shader-program and scene-object counts with the baseline after every completed effect. This detects growth in those tested resources, but is not a full browser-heap analysis or physical mobile GPU certification.

Vercel architecture is unchanged: Vite preset, `npm ci`, `npm run build`, output `dist`, existing SPA/runtime rewrites, no backend, database, authentication or new media owner. Build verification requires both PNG/WebP pairs and all original engine runtime artifacts/licenses. The existing lazy AR chunk-size warning remains.

## Physical-device acceptance still required

No physical iPhone/Android AR test or Vercel deployment was performed here. On deployed HTTPS, test iPhone 13 Safari and Android Chrome:

1. Complete each real effect; the card must appear only after fade-out, with live camera behind it and unclipped artwork/buttons.
2. Replay Flower Pot twice at the same valid location; then choose another. Repeat Chakra replay/selection and Rocket replay/exit. Verify explicit ignition is always required and no extra permission prompt appears.
3. Move/obscure/background/orient the phone at completion. Invalid replay must show recovery, not silently reuse a drifted anchor. Confirm Rescan, selection and Close always work.
4. Verify safe areas at 320×568, 375×812, 390×844 and 428×926, touch/keyboard/VoiceOver focus, reduced motion and card scrolling in short landscape.
5. Inspect deployed asset/runtime requests, camera indicator shutdown on exit and sustained mobile GPU memory/frame rate over many cycles. Report drift or device-specific failures honestly.

Local verification: 20 main completion/replay/layout/recovery cases and 6 animation/stale/timer cases passed across Chromium and WebKit. Both real-WebGL memory groups passed six cycles for each model. Existing fireworks (30), effect groups (2), placement (14), ignition (14), ignition state (2), scanning/AR (14), selection (10), camera (14) and launch/Welcome (12) checks passed. `npm run build` passed strict TypeScript, Vite and verification of all 13 unmodified runtime artifacts plus required assets/licenses. Physical-device validation remains outstanding.
