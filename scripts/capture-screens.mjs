import { chromium, devices } from 'playwright'
import { mkdirSync } from 'fs'
import { join } from 'path'

const OUT = join(process.cwd(), 'public', 'marketing')
mkdirSync(OUT, { recursive: true })
const BASE = 'http://localhost:9000'

async function waitReady (page) {
  // splash ~1.1s + rede
  await page.waitForTimeout(1800)
  // esconde splash se ainda estiver visível
  await page.evaluate(() => {
    document.querySelectorAll('.app-splash').forEach(el => { el.style.display = 'none' })
  }).catch(() => {})
  await page.waitForTimeout(200)
}

async function shot (page, name) {
  await waitReady(page)
  await page.screenshot({ path: join(OUT, name), type: 'png' })
  console.log('✓', name)
}

async function main () {
  const browser = await chromium.launch({ headless: true })

  // 1) Login administrativo (notebook)
  const desktop = await browser.newPage({ viewport: { width: 1440, height: 900 } })
  await desktop.goto(`${BASE}/login`, { waitUntil: 'networkidle', timeout: 90000 })
  await shot(desktop, 'shot-desktop-login.png')

  // 2) Painel admin — dashboard real (DEV ?shot=1)
  await desktop.goto(`${BASE}/dashboard?shot=1`, { waitUntil: 'networkidle', timeout: 90000 })
  await shot(desktop, 'shot-desktop-admin.png')

  // 3) Atividades (visão admin rica)
  await desktop.goto(`${BASE}/atividades?shot=1`, { waitUntil: 'networkidle', timeout: 90000 })
  await shot(desktop, 'shot-desktop-atividades.png')

  // 4) Login PWA no tablet
  const tablet = await browser.newPage({
    viewport: { width: 820, height: 1180 },
    isMobile: true,
    hasTouch: true,
    userAgent: devices['iPad Pro 11'].userAgent
  })
  await tablet.goto(`${BASE}/m/login`, { waitUntil: 'networkidle', timeout: 90000 })
  await shot(tablet, 'shot-tablet-login.png')

  // 5) Home PWA com sessão mock (UI real)
  const today = new Date().toISOString().split('T')[0]
  await tablet.addInitScript(({ today }) => {
    const session = {
      prefixo: 'EQ-01',
      equipeId: 'preview-team',
      equipeName: 'Equipe Preview',
      colaboradores: ['JOÃO SILVA', 'MARIA SANTOS'],
      data: today,
      loginAt: new Date().toISOString()
    }
    localStorage.setItem('gstc_mobile_session', JSON.stringify(session))
  }, { today })
  await tablet.goto(`${BASE}/m/home`, { waitUntil: 'networkidle', timeout: 90000 })
  await shot(tablet, 'shot-tablet-home.png')

  await browser.close()
  console.log('Capturas salvas em public/marketing/')
}

main().catch(e => {
  console.error(e)
  process.exit(1)
})
