import { readFile, readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = path.join(root, 'node_modules/@8thwall/engine-binary/dist');
const target = path.join(root, 'dist/vendor/8thwall');
const digest = bytes => createHash('sha256').update(bytes).digest('hex');
let count = 0;
async function verify(directory = '') {
 for (const name of await readdir(path.join(source, directory))) {
  const relative = path.join(directory, name);
  if ((await stat(path.join(source, relative))).isDirectory()) { await verify(relative); continue; }
  const [original, built] = await Promise.all([readFile(path.join(source, relative)), readFile(path.join(target, relative))]);
  if (digest(original) !== digest(built)) throw new Error(`Modified/missing AR runtime artifact: ${relative}`);
  count++;
 }
}
await verify();
for (const asset of ['assets/ar/placement-reticle.svg', 'assets/crackers/placement/flower-pot-placement.webp', 'assets/crackers/placement/ground-chakra-placement.webp', 'assets/crackers/placement/rocket-placement.webp', 'assets/crackers/selection/flower-pot-selection.webp', 'assets/crackers/selection/ground-chakra-selection.webp', 'assets/crackers/selection/rocket-selection.webp', 'assets/onboarding/scan-ground-guide.webp', 'licenses/8thwall-engine-LICENSE.txt', 'licenses/three-LICENSE.txt']) await stat(path.join(root, 'dist', asset));
console.log(`Verified ${count} unmodified engine artifacts, licenses and scan assets in dist/.`);
