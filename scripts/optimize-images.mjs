import sharp from 'sharp';
import { stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const jobs = [
  ['branding/thiri-logo', null, true],
  ['branding/thiri-icon', null, true],
  ['crackers/flower-pot', 960, false],
  ['crackers/ground-chakra', 960, false],
  ['crackers/rocket', 960, false],
  ['crackers/selection/flower-pot-selection', 768, false],
  ['crackers/selection/ground-chakra-selection', 768, false],
  ['crackers/selection/rocket-selection', 768, false],
  ['onboarding/ar_fireworks_smartphone_render', 960, false],
  ['onboarding/secure_purple_camera_icon', 256, false],
  ['onboarding/scan-ground-guide', 480, false],
];
for (const [name, width, lossless] of jobs) {
  const source = path.join(root, 'public/assets', `${name}.png`);
  const output = path.join(root, 'public/assets', `${name}.webp`);
  let pipeline = sharp(source);
  if (width) pipeline = pipeline.resize({ width, withoutEnlargement: true });
  await pipeline.webp({ lossless, quality: 85, alphaQuality: 100, effort: 6 }).toFile(output);
  const [before, after] = await Promise.all([stat(source), stat(output)]);
  console.log(`${name}: ${Math.round(before.size / 1024)} KB PNG → ${Math.round(after.size / 1024)} KB WebP`);
}
// PNG source files are never overwritten. All outputs preserve transparency/aspect ratio.
