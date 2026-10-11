/**
 * Build PWA icons from the original logo SVG (public/logo.svg).
 * Usage: node scripts/build-icons.mjs   (requires devDependency `sharp`)
 *
 * Outputs (public/icons/):
 *   icon-192.png, icon-512.png, icon-maskable-512.png, apple-icon-180.png
 */
import sharp from 'sharp';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const logo = path.join(root, 'public', 'logo.svg');
const outDir = path.join(root, 'public', 'icons');
await mkdir(outDir, { recursive: true });

const svg = await sharp(logo).ensureAlpha().png().toBuffer();

// Standard icons.
await sharp(svg).resize(192, 192).png().toFile(path.join(outDir, 'icon-192.png'));
await sharp(svg).resize(512, 512).png().toFile(path.join(outDir, 'icon-512.png'));
await sharp(svg).resize(180, 180).png().toFile(path.join(outDir, 'apple-icon-180.png'));

// Maskable: scale content into the inner 80% safe zone over the navy tile.
const masked = await sharp({
  create: { width: 512, height: 512, channels: 4, background: { r: 11, g: 27, b: 45, alpha: 1 } }
})
  .composite([{ input: svg, gravity: 'center', width: 400, height: 400 }])
  .png()
  .toFile(path.join(outDir, 'icon-maskable-512.png'));

console.log('Icons written to public/icons/');
void masked;
