/**
 * Upscale + sharpen the panorama source images for a crisper 360° view.
 *
 *   node scripts/upscale.mjs
 *
 * Reads the pristine originals from /image-originals, upscales each with a
 * high-quality Lanczos3 kernel, applies an unsharp mask, and writes the result
 * back to /public/images (same filenames, so no code changes needed).
 *
 * NOTE: upscaling cannot invent detail that isn't in the source — for true
 * Matterport-level clarity, re-export the panoramas from your 3D tool at
 * 4096x2048 or higher and drop them straight into /public/images.
 */
import sharp from 'sharp'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')

const TARGET_WIDTH = 4096 // upscaled width; height follows aspect ratio
const files = ['pano-living.jpg', 'pano-bedroom.jpg', 'pano-kitchen.jpg']

for (const file of files) {
  const src = path.join(root, 'image-originals', file)
  const out = path.join(root, 'public', 'images', file)
  const meta = await sharp(src).metadata()
  await sharp(src)
    .resize({ width: TARGET_WIDTH, kernel: sharp.kernel.lanczos3 })
    // unsharp mask: sigma = radius, m1/m2 = flat/jagged sharpening strength
    .sharpen({ sigma: 1.1, m1: 0.6, m2: 2.4 })
    .jpeg({ quality: 92, mozjpeg: true })
    .toFile(out)
  const newMeta = await sharp(out).metadata()
  console.log(`✓ ${file}: ${meta.width}x${meta.height} -> ${newMeta.width}x${newMeta.height}`)
}

console.log('\nDone. Refresh the browser (Ctrl+R) to see the sharper panoramas.')
