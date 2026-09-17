/**
 * Encaixa screenshots reais em cascos fotorealistas de dispositivos
 */
import sharp from 'sharp'
import { join } from 'path'
import { writeFileSync } from 'fs'

const DIR = join(process.cwd(), 'public', 'marketing')
const W = 1920
const H = 1080

/** Detect largest near-black rectangle (the empty screen) */
async function detectBlackScreen (path, { dark = 38, minAreaRatio = 0.12 } = {}) {
  const { data, info } = await sharp(path)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })

  const { width: w, height: h, channels: c } = info
  const isDark = (x, y) => {
    const i = (y * w + x) * c
    return data[i] < dark && data[i + 1] < dark && data[i + 2] < dark && data[i + 3] > 200
  }

  // Sample every 2px for speed; find dark blob bounds in central mass
  const mask = new Uint8Array(w * h)
  for (let y = 0; y < h; y += 2) {
    for (let x = 0; x < w; x += 2) {
      if (isDark(x, y)) {
        mask[y * w + x] = 1
        if (x + 1 < w) mask[y * w + x + 1] = 1
        if (y + 1 < h) mask[(y + 1) * w + x] = 1
      }
    }
  }

  // Find bounding box of dark pixels, ignoring edges of frame (outer 4%)
  const mx = Math.floor(w * 0.04)
  const my = Math.floor(h * 0.04)
  let minX = w; let minY = h; let maxX = 0; let maxY = 0; let count = 0
  for (let y = my; y < h - my; y++) {
    for (let x = mx; x < w - mx; x++) {
      if (!mask[y * w + x]) continue
      // require neighborhood density to avoid camera dots / shadows
      let n = 0
      for (let dy = -2; dy <= 2; dy++) {
        for (let dx = -2; dx <= 2; dx++) {
          const nx = x + dx; const ny = y + dy
          if (nx >= 0 && ny >= 0 && nx < w && ny < h && mask[ny * w + nx]) n++
        }
      }
      if (n < 12) continue
      count++
      if (x < minX) minX = x
      if (y < minY) minY = y
      if (x > maxX) maxX = x
      if (y > maxY) maxY = y
    }
  }

  const bw = maxX - minX + 1
  const bh = maxY - minY + 1
  const areaRatio = (bw * bh) / (w * h)
  if (count < 100 || areaRatio < minAreaRatio) {
    throw new Error(`Screen detect failed for ${path}: area=${areaRatio.toFixed(3)} count=${count}`)
  }

  // Inset slightly so we don't cover bezel
  const inset = Math.max(2, Math.round(Math.min(bw, bh) * 0.008))
  return {
    left: minX + inset,
    top: minY + inset,
    width: bw - inset * 2,
    height: bh - inset * 2,
    shellW: w,
    shellH: h
  }
}

async function roundMask (w, h, r) {
  return Buffer.from(`
    <svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${w}" height="${h}" rx="${r}" ry="${r}" fill="#fff"/>
    </svg>`)
}

async function fillScreen (shellPath, shotPath, screen, radius = 8) {
  const shot = await sharp(shotPath)
    .resize(screen.width, screen.height, { fit: 'cover', position: 'north' })
    .composite([{ input: await roundMask(screen.width, screen.height, radius), blend: 'dest-in' }])
    .png()
    .toBuffer()

  // Subtle glass glare on top of UI
  const glare = Buffer.from(`
    <svg width="${screen.width}" height="${screen.height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="g" x1="0" y1="0" x2="0.45" y2="1">
          <stop offset="0%" stop-color="#fff" stop-opacity="0.10"/>
          <stop offset="32%" stop-color="#fff" stop-opacity="0.02"/>
          <stop offset="100%" stop-color="#4fc3f7" stop-opacity="0.03"/>
        </linearGradient>
      </defs>
      <rect width="${screen.width}" height="${screen.height}" rx="${radius}" fill="url(#g)"/>
    </svg>`)

  const withGlare = await sharp(shot)
    .composite([{ input: glare, blend: 'over' }])
    .png()
    .toBuffer()

  return sharp(shellPath)
    .composite([{ input: withGlare, left: screen.left, top: screen.top }])
    .png()
    .toBuffer()
}

async function makeReflection (buf, maxH = 140, opacity = 0.3) {
  const meta = await sharp(buf).metadata()
  const rh = Math.min(maxH, Math.floor(meta.height * 0.28))
  const flipped = await sharp(buf)
    .extract({ left: 0, top: meta.height - rh, width: meta.width, height: rh })
    .flip()
    .modulate({ brightness: 0.45 })
    .png()
    .toBuffer()

  const fade = Buffer.from(`
    <svg width="${meta.width}" height="${rh}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="f" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#fff" stop-opacity="${opacity}"/>
          <stop offset="55%" stop-color="#fff" stop-opacity="${opacity * 0.25}"/>
          <stop offset="100%" stop-color="#fff" stop-opacity="0"/>
        </linearGradient>
      </defs>
      <rect width="${meta.width}" height="${rh}" fill="url(#f)"/>
    </svg>`)

  return sharp(flipped)
    .composite([{ input: fade, blend: 'dest-in' }])
    .png()
    .toBuffer()
}

async function contactShadow (w) {
  const pad = 80
  const h = 70
  const svg = Buffer.from(`
    <svg width="${w + pad * 2}" height="${h + pad}" xmlns="http://www.w3.org/2000/svg">
      <defs><filter id="f"><feGaussianBlur stdDeviation="16"/></filter></defs>
      <ellipse cx="${pad + w / 2}" cy="${pad + 20}" rx="${w * 0.36}" ry="22"
        fill="rgba(0,0,0,0.72)" filter="url(#f)"/>
    </svg>`)
  return { buf: await sharp(svg).png().toBuffer(), pad }
}

async function main () {
  const lapShell = join(DIR, 'device-laptop-shell.png')
  const tabShell = join(DIR, 'device-tablet-shell.png')
  const phoShell = join(DIR, 'device-phone-shell.png')

  console.log('Detecting screens…')
  const lapScreen = await detectBlackScreen(lapShell, { dark: 45, minAreaRatio: 0.15 })
  const tabScreen = await detectBlackScreen(tabShell, { dark: 45, minAreaRatio: 0.2 })
  const phoScreen = await detectBlackScreen(phoShell, { dark: 50, minAreaRatio: 0.12 })
  console.log('laptop screen', lapScreen)
  console.log('tablet screen', tabScreen)
  console.log('phone screen', phoScreen)

  let laptop = await fillScreen(lapShell, join(DIR, 'shot-desktop-admin.png'), lapScreen, 6)
  let tablet = await fillScreen(tabShell, join(DIR, 'shot-tablet-login.png'), tabScreen, 10)
  let phone = await fillScreen(phoShell, join(DIR, 'shot-desktop-login.png'), phoScreen, 14)

  // Scale devices for composition
  laptop = await sharp(laptop).resize({ width: 1180 }).png().toBuffer()
  tablet = await sharp(tablet).resize({ height: 720 }).png().toBuffer()
  phone = await sharp(phone).resize({ width: 520 }).png().toBuffer()

  const lapM = await sharp(laptop).metadata()
  const tabM = await sharp(tablet).metadata()
  const phoM = await sharp(phone).metadata()

  const lapRef = await makeReflection(laptop, 120, 0.28)
  const tabRef = await makeReflection(tablet, 100, 0.26)
  const phoRef = await makeReflection(phone, 70, 0.2)

  const logo = await sharp(join(process.cwd(), 'public', 'icons', 'icon-192x192.png'))
    .resize(78, 78)
    .composite([{ input: await roundMask(78, 78, 18), blend: 'dest-in' }])
    .png()
    .toBuffer()

  const bg = await sharp(join(DIR, 'bg-cinematic.png'))
    .resize(W, H, { fit: 'cover', position: 'south' })
    .modulate({ brightness: 0.62, saturation: 1.15 })
    .png()
    .toBuffer()

  const overlays = Buffer.from(`
    <svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="vignette" cx="48%" cy="40%" r="75%">
          <stop offset="0%" stop-color="#000" stop-opacity="0"/>
          <stop offset="100%" stop-color="#000" stop-opacity="0.82"/>
        </radialGradient>
        <linearGradient id="topFade" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#01040a" stop-opacity="0.92"/>
          <stop offset="100%" stop-color="#01040a" stop-opacity="0"/>
        </linearGradient>
        <linearGradient id="botFade" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#01040a" stop-opacity="0"/>
          <stop offset="100%" stop-color="#01040a" stop-opacity="0.95"/>
        </linearGradient>
        <linearGradient id="cyanBeam" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stop-color="#4fc3f7" stop-opacity="0"/>
          <stop offset="25%" stop-color="#4fc3f7" stop-opacity="1"/>
          <stop offset="100%" stop-color="#4fc3f7" stop-opacity="0"/>
        </linearGradient>
        <linearGradient id="glass" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#0c2038" stop-opacity="0.78"/>
          <stop offset="100%" stop-color="#061018" stop-opacity="0.5"/>
        </linearGradient>
        <filter id="glow"><feGaussianBlur stdDeviation="22"/></filter>
      </defs>
      <rect width="${W}" height="${H}" fill="url(#vignette)"/>
      <rect width="${W}" height="180" fill="url(#topFade)"/>
      <rect y="920" width="${W}" height="160" fill="url(#botFade)"/>
      <circle cx="500" cy="300" r="220" fill="#4fc3f7" opacity="0.08" filter="url(#glow)"/>
      <circle cx="1550" cy="520" r="200" fill="#e94560" opacity="0.1" filter="url(#glow)"/>
      <ellipse cx="640" cy="900" rx="260" ry="36" fill="#4fc3f7" opacity="0.06" filter="url(#glow)"/>
      <rect x="52" y="28" width="630" height="126" rx="20" fill="url(#glass)"
        stroke="rgba(79,195,247,0.28)" stroke-width="1.2"/>
      <rect x="156" y="118" width="330" height="2.5" fill="url(#cyanBeam)"/>
      <text x="156" y="82" fill="#fff" font-family="Segoe UI, Helvetica Neue, Arial, sans-serif"
        font-size="50" font-weight="800" letter-spacing="2">SIDI-E</text>
      <text x="156" y="108" fill="#9ed6f5" font-family="Segoe UI, Helvetica Neue, Arial, sans-serif"
        font-size="13" letter-spacing="3.6">SISTEMA DE INSPEÇÃO DE EPIS</text>
      <text x="960" y="1032" text-anchor="middle" fill="rgba(255,255,255,0.85)"
        font-family="Segoe UI, Helvetica Neue, Arial, sans-serif" font-size="18" letter-spacing="1.4">
        Gestão administrativa  ·  PWA em campo  ·  Offline-first
      </text>
    </svg>`)

  const lapX = 40
  const lapY = 175
  const tabX = 1280
  const tabY = 140
  const phoX = 980
  const phoY = 620

  const lapSh = await contactShadow(lapM.width)
  const tabSh = await contactShadow(tabM.width)
  const phoSh = await contactShadow(phoM.width)

  const out = await sharp(bg)
    .composite([
      { input: overlays, left: 0, top: 0 },
      { input: lapSh.buf, left: lapX - lapSh.pad + 30, top: lapY + lapM.height - 55 },
      { input: tabSh.buf, left: tabX - tabSh.pad + 15, top: tabY + tabM.height - 48 },
      { input: phoSh.buf, left: phoX - phoSh.pad + 10, top: phoY + phoM.height - 36 },
      { input: lapRef, left: lapX + 20, top: lapY + lapM.height - 16 },
      { input: tabRef, left: tabX + 12, top: tabY + tabM.height - 12 },
      { input: phoRef, left: phoX + 8, top: phoY + phoM.height - 8 },
      { input: laptop, left: lapX, top: lapY },
      { input: tablet, left: tabX, top: tabY },
      { input: phone, left: phoX, top: phoY },
      { input: logo, left: 68, top: 46 }
    ])
    .jpeg({ quality: 94, mozjpeg: true })
    .toBuffer()

  // Debug: save filled devices alone
  writeFileSync(join(DIR, '_debug-laptop.png'), laptop)
  writeFileSync(join(DIR, '_debug-tablet.png'), tablet)
  writeFileSync(join(DIR, '_debug-phone.png'), phone)

  const png = await sharp(out).png().toBuffer()
  writeFileSync(join(DIR, 'sidie-thumbnail-divulgacao-real.png'), png)
  writeFileSync(join(DIR, 'sidie-thumbnail-divulgacao-real.jpg'), out)
  writeFileSync(join(DIR, 'sidie-thumbnail-divulgacao.png'), png)
  writeFileSync(join(DIR, 'sidie-thumbnail-divulgacao.jpg'), out)
  console.log('✓ photoreal devices → sidie-thumbnail-divulgacao(-real).png')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
