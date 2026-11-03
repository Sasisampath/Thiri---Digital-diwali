# Thiri audio fix — 3 November 2026

## Root cause and behavior
Both effective audio manifests were empty and sound defaulted off. All six cues now have local MP3s, decoded once into a single shared Web Audio context. Office-demo sound defaults on, ignoring legacy `thiri:sound-enabled=false`. The existing speaker control re-enables sound rather than muting. System volume and browser restrictions still apply. No microphone access is requested.

`AudioManager.unlock()` constructs/resumes the context synchronously inside Get Started, Enable Camera, Light the Fuse, drag/tap, replay and sound-button gestures, before awaiting anything. A one-sample buffer primes the output. Fetch/decode runs ahead of ignition. Files that fail to load/decode get deterministic, distinct synthesized buffers immediately; cues never wait for a download and then play late. Development warnings report loading/activation errors. An explicit Enable Sound button appears if the context is suspended/interrupted or playback is blocked. Re-enabling does not replay an interrupted event.

Ignition and fireworks have separate source ownership. Countdown cleanup cannot stop fireworks. One source per channel prevents duplicate overlaps. Idempotent settings cannot restart audio each frame. Hidden/pagehide stops sources and suspends context; visibility return alone does not resume. Replay retains the context and buffers, resets once-only event guards, and requires manual ignition. AR exit stops both channels. A dormant context/cache remains available for the next user gesture, with only one set of page-lifetime visibility listeners; no per-session accumulation.

## Installed recordings and temporary synthesis

| File under public/assets/audio | Provenance / changes | License / attribution |
| --- | --- | --- |
| rocket-launch.mp3 | Rudmer_Rotteveel, “Whistle and Explosion Single_Firework”, Freesound 336008; recorded with Tascam DR-05. Whistle segment 0–1.08s, amplified, slowed to about 2.1s, edge fades and peak limiting; mono 96kbps MP3. | CC0 1.0; attribution not required, voluntarily credited here. |
| rocket-burst.mp3 | Same recording, separate segment from 1.12s to end, gain reduction, tail fade and peak limiting; mono 96kbps MP3. | Same CC0 terms; shared by both rocket variants. |
| flower-pot-fountain.mp3 | **Temporary original synthesis, not an authentic recording.** Continuous filtered noise fountain hiss and stochastic rapid crackles; 5.6 seconds. | Original procedural output dedicated to CC0 1.0; no attribution required. |
| ground-chakra-spin.mp3 | **Temporary original synthesis, not an authentic recording.** Brighter noise with rotation modulation, crackles and declining spin rate; 4.9 seconds. | Same original synthesis CC0 dedication. |
| fuse-ignite.mp3 | **Temporary original synthesis**, short hiss/crackles, 0.7 seconds. | Same original synthesis CC0 dedication. |
| firestick-crackle.mp3 | **Temporary original synthesis**, loopable low sizzling crackles, 1.8 seconds. | Same original synthesis CC0 dedication. |

Verified author/source page: https://freesound.org/people/Rudmer_Rotteveel/sounds/336008/
Actual downloaded HQ preview: https://cdn.freesound.org/previews/336/336008_4921277-hq.mp3
CC0 deed: https://creativecommons.org/publicdomain/zero/1.0/
The author explicitly describes the rocket recording and grants CC0 redistribution, modification and commercial use. Original fountain/spinner recordings could not be verified during sourcing; they are explicitly temporary synthesis under the user-authorized fallback. No generic explosion is presented as a fountain or spinner recording. Runtime rocket fallback is also synthesized if the verified file fails.

Rebuild the four synthesized MP3s: `FFMPEG=/path/to/ffmpeg node scripts/generate-audio.mjs`. Deterministic synthesis lives in `src/lib/audio/synthesis.ts`, shared with runtime fallback. To reproduce rocket cuts, download the source URL above to `rocket-cc0.mp3`, then use ffmpeg:

```sh
ffmpeg -i rocket-cc0.mp3 -af 'atrim=end=1.08,asetpts=PTS-STARTPTS,volume=22,atempo=0.5142857,afade=t=in:d=0.02,afade=t=out:st=1.85:d=0.25,alimiter=limit=0.85:level=false' -ac 1 -ar 44100 -b:a 96k rocket-launch.mp3
ffmpeg -ss 1.12 -i rocket-cc0.mp3 -af 'volume=0.65,afade=t=out:st=0.9:d=0.35,alimiter=limit=0.85:level=false' -ac 1 -ar 44100 -b:a 96k rocket-burst.mp3
```

## Mapping / synchronization
`getCracker(id).baseType` selects Flower Pot + JazzHQ Flower Pot → fountain; Ground Chakra + JazzHQ Chakra → spin; Rocket + JazzHQ Rocket → separate launch and burst. No branded duplicate files. Fountain/spin start once with their real effect. Rocket launch starts at configured lift-off (+0.35s), burst only in `triggerBurst` or the explicitly selected sky-preview start. JazzHQ natural audio is preserved for the first three seconds and fades with its shortened particle transition (fountain 4.9s, spin 4.6s), rather than continuing through the logo hold. No unrelated music.

## Validation and device checklist
`npm run test:audio` uses Chromium and WebKit: actual MP3 decoding and OfflineAudioContext rendering must have finite, nonzero PCM below clipping; all six variants test real application event wiring, legacy false preference, once-only cues, launch/burst order, replay, same camera/session, background stop/gesture recovery, cleanup, missing-file synthesis and refresh activation. Camera/SLAM inputs are synthetic. Latest results: all six audio flows passed in Chromium and WebKit; separate edge checks passed for explicit sky-preview burst, missing-file fallback and refresh. Ignition state, ignition mobile layouts, firework effects, full fireworks completion/replay at 320×568, 375×812, 390×844 and 428×926, JazzHQ effects and camera regressions passed in both engines. Build verifies byte-identical copies of all six audio files and NOTICE in dist. Physical audibility is still unverified. Other regression commands: `test:ignition-state`, `test:ignition`, `test:fireworks`, `test:jazzhq-effects`, `test:camera`. Run `npm run build` for Vite/Vercel artifact checks.

Physical iPhone Safari and Android Chrome **remain untested**: on the HTTPS Vercel URL set system volume, Get Started → Enable Camera, place/light each of six crackers, confirm audible/distinct sounds and actual rocket lift-off/burst synchronization. Repeat Celebrate Again, background/foreground (tap Enable Sound), reload with old false storage, change system volume, and exit (silence/camera indicator off). Check hardware silent-mode/output-route behavior, headphones, interruptions and real AR framing/tracking. Automated events/PCM output are not proof of speaker audibility on a physical device.
