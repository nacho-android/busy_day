import { access, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = path.join(root, 'art', 'generated-masters');
const destination = path.join(root, 'public', 'assets', 'backgrounds');
const exports = [
  ['title_master.png', 'title.webp'],
  ['facility_hub_master.png', 'facility_hub.webp'],
  ['car_park_master.png', 'car_park.webp'],
  ['cath_lab_master.png', 'cath_lab.webp'],
  ['tea_room_master.png', 'tea_room.webp'],
  ['pig_housing_master.png', 'pig_housing.webp'],
  ['feed_store_master.png', 'feed-store.webp'],
  ['sheep_scales_master.png', 'sheep-scales.webp'],
  ['baboon_wing_master.png', 'baboon-wing.webp'],
  ['procedure_prep_master.png', 'procedure-prep.webp'],
  ['coffee_shop_master.png', 'coffee-shop.webp'],
];

await mkdir(destination, { recursive: true });
for (const [inputName, outputName] of exports) {
  const input = path.join(source, inputName);
  try {
    await access(input);
  } catch {
    process.stderr.write(`Skipping missing master: ${inputName}\n`);
    continue;
  }
  const output = path.join(destination, outputName);
  await sharp(input)
    .resize(1280, 720, { fit: 'cover', position: 'centre' })
    .webp({ quality: 88, effort: 5 })
    .toFile(output);
  process.stdout.write(`Optimised ${path.relative(root, output)}\n`);
}
