# JazzHQ Special Crackers

> Audio update (2026-11-03): historical silent/mute behavior below is superseded by [AUDIO.md](AUDIO.md). Six local cues now play through gesture-unlocked Web Audio, enabled by default; temporary synthesis is explicitly identified.

## Delivered

Six options share the existing selection, placement, FusePoint, ignition/countdown, fireworks and completion flows. The original three remain first. JazzHQ Flower Pot, JazzHQ Chakra and JazzHQ Rocket reuse the corresponding original artwork, procedural model recipes and effect classes, with a small official-logo badge and an explicitly configured screen-space brand reveal.

## Files

- `src/config/crackers.ts`: six typed IDs, baseType, placementType, thumbnail, brand and specialReveal metadata. Original IDs/names/assets/default remain unchanged.
- `src/components/ar/CrackerSelection{Sheet,Card}.tsx`, `src/styles/cracker-selection.css`: fixed header/CTA, native vertical card scroll area, one original row initially, JazzHQ discovery hint and the second three-column row. Back to a selected special scrolls that card into view.
- `src/components/ar/models/{index,FlowerPotModel,GroundChakraModel,RocketModel}.ts`: base-type factory and selected-ID constructor parameter. No duplicated generators, separate GLB downloads or logo billboards substitute for the existing world-space models.
- `src/config/jazzhq.ts`, `src/components/ar/JazzHQLogoReveal.tsx`, `src/styles/jazzhq-reveal.css`: one shared official-logo overlay, phase timings, contained artwork, small decorative sparks and reduced motion.
- `src/lib/ar/fireworks-controller.ts`, `src/components/ar/FireworksOverlay.tsx`: metadata-based effect/audio/fallback selection and once-only reveal timing. Original effect durations/completion remain conditional-free of brand timing.
- `src/components/ar/effects/{FireworkEffect,FlowerPotFountain,GroundChakraEffect,RocketLaunchEffect}.ts`: optional special transition settings; branded fountain emission/flame taper and Chakra slowdown/emission fade after three seconds; actual Rocket burst timestamp exposure. Undefined settings preserve original behavior.
- `src/components/ar/ScanGroundScreen.tsx`: selection-only pan-y touch scope; all other AR interaction modes retain their existing touch behavior and shared camera owner.
- `scripts/optimize-images.mjs`, `scripts/verify-ar-build.mjs`: lossless PNG alternative and required branding asset checks.
- `tests/jazzhq.cjs`, `tests/jazzhq-effects.cjs`, updated selection regression assertions and npm scripts.

## Official artwork

Supplied files were inspected and retained byte-for-byte:

| Supplied file | Project asset | Use |
|---|---|---|
| `3 (1).svg` | `/assets/branding/jazzhq-logo.svg` | Primary wide official SVG, viewBox 382×63.5; badge and reveal |
| `4.svg` | `/assets/branding/jazzhq-logo-stacked.svg` | Original stacked alternative, retained unchanged |
| `1.png` | `/assets/branding/jazzhq-logo.png` | Original 1592×265 alpha PNG, unchanged |
| PNG-derived | `/assets/branding/jazzhq-logo.webp` | Lossless alpha fallback, 6,602 bytes versus PNG 23,136 bytes |

The production SVG preserves its actual paths, colors, aspect ratio and transparent background. It is loaded as an image, never recreated with text, recolored, cropped or distorted. Both SVGs contain artwork/styles without script, external links or foreignObject content. The optional WebP preserves the PNG canvas size with no upscaling/cropping. The wide logo is readable on a compact light translucent plate; the plate covers a small screen area rather than obscuring the camera environment.

```sh
npm run optimize:images -- --only=branding/jazzhq
```

No branding asset is missing. Existing optional audio remains silent pending the previously approved audio files; no new audio URLs or unrelated media were added.

## Selection behavior

The original card illustrations, typography, selected borders/checks and three-column widths are retained. The new scrollport is one original-card-row plus a small “JazzHQ Specials ↓” hint. Six cards are in the data/DOM, but the second row starts outside the initial clipped scroll viewport. Only that area scrolls; the sheet header, CTA and full-size camera canvas stay fixed.

The area uses native overflow-y, pan-y, overscroll containment, no horizontal overflow and iOS momentum scrolling. The page/camera never scroll with the cards. The primary CTA follows the selected metadata name, including “Place JazzHQ Flower Pot”, “Place JazzHQ Chakra” and “Place JazzHQ Rocket”. Native radio behavior and selection retention continue across Back/replay navigation.

## Reveal timing and natural effects

The existing SDK frame callback owns all timing. There is no logo setTimeout, interval, second render loop, engine restart or new media stream. FireworksController publishes only meaningful phase transitions, so the DOM logo does not receive per-frame React position state.

For a special Flower Pot or Chakra, natural effects run unchanged for the first three seconds. After that, new visible fountain emission/flame or Chakra emission/rotation gradually tapers, while already-live sparks keep their natural gravity/lifetime fade. An optional constructor context controls this special-only taper. Original settings and durations (Flower Pot 5.6 s, Chakra 4.9 s) are unchanged.

For special Rocket, the three-second interval begins at the actual `triggerBurst(elapsed)` timestamp, after launch and any framing wait. It does not begin at countdown zero or launch. Original Rocket guidance, launch/support separation and normal burst lifetime remain unchanged. Explicit camera-relative sky preview has its own actual burst start at preview elapsed zero, and uses the same three-second brand delay while retaining the existing preview label.

Reveal phases:

1. Natural interval: 3 seconds, with no logo.
2. ENTERING: 0.4 s fade/scale from 0.8 to 1.
3. HOLDING: 3 s steady official logo and secondary “Happy Diwali from JazzHQ”.
4. EXITING: 0.45 s gentle fade.
5. Real completion: after both the natural effect lifetime and the reveal end, dispose resources and enter the existing Celebration Complete card.

Thus special Flower Pot/Chakra normally complete after about 6.85 s; special Rocket completes about 6.85 s after the actual sky burst, in addition to launch. The base effect duration is not modified globally. Original IDs always have specialReveal=null and never mount the logo during fireworks. Controlled tests check original completion boundaries and identical natural particle-position/opacity checksums at 2.9 s between each original/special pair.

## Interruption, replay and cleanup

A reveal-start latch permits one reveal per ignition attempt. Repeated countdown-zero frames cannot create a second effect or logo. Tracking loss cancels a world-space reveal through the existing recovery state; background/stale-camera interruptions also cancel camera-relative preview/reveal. Recovery does not automatically resume a logo or explosion. If a reveal was already interrupted after starting, an explicitly chosen sky preview does not trigger that same attempt's logo again; a fresh manual ignition resets the latch.

Existing `resetForReplay()` and `resetForNewCracker()` reset brand phases/latches together with ignition/countdown/particles. The selected six-option ID remains intact for valid replay, so a JazzHQ replay still uses the JazzHQ variant. Replay requires manual lighting. Choose Another disposes the old model/effects/fuse references and opens the six-card sheet in the same SDK scene/camera session. Exit uses existing full cleanup. CSS animation unmounts with the overlay; no logo timers/listeners or extra Three particle system need separate ownership.

The logo is intentionally screen-space and is never presented as a physically world-anchored object. Fireworks remain in the original world-space scene, or the user's explicitly selected and labelled Rocket camera-relative preview.

## Automated checks

With the Vite app running and Playwright Chromium/WebKit installed:

```sh
npm run test:jazzhq-effects
npm run test:jazzhq
npm run test:selection
npm run test:fireworks
npm run test:fireworks-effects
npm run test:celebration
npm run test:celebration-memory
npm run test:placement
npm run test:ignition
npm run test:ignition-state
npm run test:ar
npm run test:camera
npm run test:e2e
npm run build
```

Set TEST_URL to the running server, with optional CHROMIUM_EXECUTABLE_PATH / PLAYWRIGHT_BROWSERS_PATH for installed browsers. The real packaged SDK initialization test can run against the production preview via `npm run test:runtime`; it blocks native camera access while initializing WASM/SLAM and checking runtime URLs.

JazzHQ flow checks cover six selectable IDs at 320×568, 375×812, 390×844, 428×926; original/hidden special rows; fixed header/CTA/canvas; official logo loading/proportions; all three branded placement/FusePoint/countdown/reveal flows; manual replay; branded → original switching without logo leakage; cleanup; one camera/SDK run; explicit Rocket preview and background cancellation. Effect checks use controlled timestamps for first-three-second equality, original durations, delayed burst-relative timing, hold/fade boundaries, duplicate rejection and interrupted recovery.

Chromium uses actual automated touch gestures to exercise native card scrolling. The mobile WebKit automation API does not support wheel gestures, so its layout/scroll checks use the browser scroll API. This is not a claim of physical iPhone touch/momentum validation. Synthetic SDK camera/SLAM fixtures exercise real application/Three code but do not certify physical-world anchoring.

## Vercel and physical checks

Vite + Vercel settings stay unchanged: npm ci, npm run build, dist, frontend-only. The build includes all official logo assets and verifies the complete pinned 8th Wall runtime/licenses. No backend, database, authentication, camera dependency or extra render pipeline was introduced. The existing lazy AR chunk-size warning remains.

No physical iPhone/Android AR test or Vercel deployment was performed here. On the deployed HTTPS app:

1. Open selection on iPhone Safari and Android Chrome at all requested sizes. Verify only originals initially, native momentum scrolling to specials, fixed header/CTA, no horizontal/page scroll and native radio/keyboard selection.
2. Place/light each special. Verify natural effects remain visible for approximately three seconds before the official logo, then readable hold and fade. Rocket's delay must be measured from the sky burst, not launch. Test its explicitly labelled preview separately.
3. Replay with manual ignition; choose an original afterward and verify no logo. Confirm no extra camera prompt/restart, valid world placement, and clean exit.
4. Lose tracking or background during natural effects, logo entry/hold/fade and preview. Recovery must require explicit action and never silently replay branding or fireworks.
5. Measure sustained mobile GPU frame rate/memory, check safe areas and deployed asset/runtime requests. Report actual device-specific scrolling, sky drift or recovery limitations honestly.

Verified locally for this change: JazzHQ flow suite (16 cases) and both deterministic effect groups passed; selection, fireworks, real-WebGL effect/memory, completion, placement, ignition, scanning, camera and launch/Welcome suites passed. The real packaged SDK initialized WASM/SLAM with zero camera calls and no missing production runtime requests. `npm run build` passed TypeScript, Vite and byte-for-byte validation of 13 runtime artifacts plus required assets/licenses. Native iPhone Safari scrolling, physical AR anchoring and sustained mobile performance remain unverified.
