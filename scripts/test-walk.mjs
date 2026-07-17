import puppeteer from 'puppeteer-core'
import fs from 'node:fs'

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const URL = process.env.URL || 'http://localhost:4173/'
const OUT = process.env.OUT || './walktest'
const TARGET = process.env.TARGET || 'bedroom'
const YAW = Number(process.env.YAW || 84)
const ARRIVE = Number(process.env.ARRIVE || 85)

fs.mkdirSync(OUT, { recursive: true })

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'new',
  args: [
    '--use-gl=angle',
    '--use-angle=swiftshader',
    '--enable-unsafe-swiftshader',
    '--no-sandbox',
    '--window-size=1280,720',
  ],
})
const page = await browser.newPage()
await page.setViewport({ width: 1280, height: 720 })
const errors = []
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
page.on('pageerror', (e) => errors.push(String(e)))

await page.goto(URL, { waitUntil: 'networkidle2', timeout: 30000 })
await page.waitForFunction('window.__tourState && window.__tourState().currentId', { timeout: 20000 })
await new Promise((r) => setTimeout(r, 2800)) // let the first panorama finish loading

await page.screenshot({ path: `${OUT}/w_00.jpg`, type: 'jpeg', quality: 78 })
const before = await page.evaluate('({ ...window.__tourState(), lon: Math.round(window.__tourLon) })')

await page.evaluate(`window.__tourNavigate('${TARGET}', ${YAW}, ${ARRIVE})`)
for (let i = 1; i <= 30; i++) {
  await new Promise((r) => setTimeout(r, 55))
  await page.screenshot({ path: `${OUT}/w_${String(i).padStart(2, '0')}.jpg`, type: 'jpeg', quality: 72 })
}
const after = await page.evaluate('({ ...window.__tourState(), lon: Math.round(window.__tourLon) })')

console.log('before:', JSON.stringify(before))
console.log('after :', JSON.stringify(after))
console.log('errors:', errors.slice(0, 5).join(' | ') || 'none')
await browser.close()
