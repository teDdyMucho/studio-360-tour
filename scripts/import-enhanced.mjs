/**
 * Import the AI-enhanced high-res panoramas (5504x3072 PNGs) as the panorama
 * sources. Converts each big PNG to an optimized full-res JPG so the browser
 * loads them fast, and writes them into /public/images with the app's filenames.
 *
 *   node scripts/import-enhanced.mjs
 */
import sharp from 'sharp'
import { fileURLToPath } from 'node:url'
import fs from 'node:fs'
import path from 'node:path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')
const srcDir = path.join(root, 'enhanced', 'enhanced')

// map each enhanced PNG to its room (identified visually)
const mapping = [
  { png: 'hf_20260715_193401_c2b67155-ba58-4932-be35-6e42125b734a.png', out: 'pano-kitchen.jpg', room: 'Kitchen' },
  { png: 'hf_20260715_194513_e7fa3396-5348-4c43-ad60-69445a212c25.png', out: 'pano-living.jpg', room: 'Living & Dining' },
  { png: 'hf_20260715_195208_5bc4c0ad-85e7-441b-b4f2-918b8fe595c0.png', out: 'pano-bedroom.jpg', room: 'Bedroom' },
]

for (const m of mapping) {
  const src = path.join(srcDir, m.png)
  const outPub = path.join(root, 'public', 'images', m.out)
  const outOrig = path.join(root, 'image-originals', m.out)
  const meta = await sharp(src).metadata()
  const buf = await sharp(src)
    .jpeg({ quality: 92, mozjpeg: true })
    .toBuffer()
  fs.writeFileSync(outPub, buf)
  fs.writeFileSync(outOrig, buf) // keep as the new pristine source
  const kb = Math.round(buf.length / 1024)
  console.log(`✓ ${m.room.padEnd(16)} ${meta.width}x${meta.height}  ->  public/images/${m.out}  (${kb} KB)`)
}

console.log('\nDone. Hard-refresh the browser (Ctrl+Shift+R) to load the sharp panoramas.')
