import puppeteer from 'puppeteer-core'
import fs from 'node:fs'

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const URL = process.env.URL || 'http://localhost:4173/'
const OUT = process.env.OUT || './tourtest'
fs.mkdirSync(OUT, { recursive: true })

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'new',
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox', '--window-size=1280,720'],
})
const page = await browser.newPage()
await page.setViewport({ width: 1280, height: 720 })
await page.goto(URL, { waitUntil: 'networkidle2', timeout: 30000 })
await page.waitForFunction('window.__tourState && window.__tourState().currentId', { timeout: 20000 })
await new Promise((r) => setTimeout(r, 2800))

const state = () => page.evaluate('({ ...window.__tourState(), lon: Math.round(window.__tourLon) })')
const shot = (n) => page.screenshot({ path: `${OUT}/${n}.jpg`, type: 'jpeg', quality: 76 })

// walk the full loop, capturing the arrival view of each room
const steps = [
  ['bedroom', 84],
  ['kitchen', 27],
  ['living', 96],
  ['kitchen', 306],
  ['bedroom', 103],
  ['living', 11],
]

await shot('00_start_living')
console.log('start:', JSON.stringify(await state()))

let i = 1
for (const [target, yaw] of steps) {
  const from = (await state()).currentId
  await page.evaluate(`window.__tourNavigate('${target}', ${yaw}, ${yaw})`)
  // capture mid-glide
  await new Promise((r) => setTimeout(r, 120))
  await shot(`${String(i).padStart(2, '0')}_${from}_to_${target}_mid`)
  // wait for arrival
  await new Promise((r) => setTimeout(r, 1600))
  await shot(`${String(i).padStart(2, '0')}_${from}_to_${target}_arrive`)
  console.log(`${from} -> ${target}:`, JSON.stringify(await state()))
  i++
}

await browser.close()
