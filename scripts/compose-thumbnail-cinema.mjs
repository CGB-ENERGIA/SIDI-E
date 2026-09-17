/**
 * Thumbnail CINEMA — fundo fotográfico + telas reais com perspectiva, reflexo e luz
 */
import sharp from 'sharp'
import { join } from 'path'
import { writeFileSync } from 'fs'

const DIR = join(process.cwd(), 'public', 'marketing')
const W = 1920
const H = 1080

async function roundMask (w, h, r) {
  return Buffer.from(`
    <svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${w}" height="${h}" rx="${r}" ry="${r}" fill="#fff"/>
    </svg>`)
}

async function screenInBezel ({ src, sw, sh, padX, padY, radius, kind }) {
  const ow = sw + padX * 2
  const oh = sh + padY * 2 + (kind === 'laptop' ? 28 : 0)

  const screen = await sharp(src)
    .resize(sw, sh, { fit: 'cover', position: 'north' })
    .composite([{ input: await roundMask(sw, sh, Math.max(4, radius - 10)), blend: 'dest-in' }])
    .png()
    .toBuffer()

  let extras = ''
  if (kind === 'tablet') {
    extras = `<circle cx="${ow / 2}" cy="${padY * 0.42}" r="4.5" fill="#2a3140"/>`
  } else if (kind === 'laptop') {
    extras = `
      <rect x="0" y="${oh - 28}" width="${ow}" height="28" rx="4" fill="#0a0c12"/>
      <rect x="${ow * 0.18}" y="${oh - 18}" width="${ow * 0.64}" height="6" rx="3" fill="#1a2030"/>
      <rect x="2" y="${oh - 28}" width="${ow - 4}" height="1" fill="rgba(120,140,180,0.25)"/>
    `
  }

  const frame = Buffer.from(`
    <svg width="${ow}" height="${oh}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bezel" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#4a5568"/>
          <stop offset="35%" stop-color="#1e2636"/>
          <stop offset="100%" stop-color="#0b0f18"/>
        </linearGradient>
        <linearGradient id="edge" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#9eb0cc" stop-opacity="0.65"/>
          <stop offset="50%" stop-color="#4a5a72" stop-opacity="0.25"/>
          <stop offset="100%" stop-color="#121820" stop-opacity="0.4"/>
        </linearGradient>
        <linearGradient id="glass" x1="0" y1="0" x2="0.3" y2="1">
          <stop offset="0%" stop-color="#fff" stop-opacity="0.12"/>
          <stop offset="40%" stop-color="#fff" stop-opacity="0"/>
        </linearGradient>
      </defs>
      <rect x="1" y="1" width="${ow - 2}" height="${oh - 2 - (kind === 'laptop' ? 28 : 0)}" rx="${radius}" ry="${radius}"
        fill="url(#bezel)" stroke="url(#edge)" stroke-width="2"/>
      ${extras}
      <rect x="${padX}" y="${padY}" width="${sw}" height="${sh}" rx="${Math.max(4, radius - 10)}"
        fill="url(#glass)"/>
    </svg>`)

  return sharp(frame)
    .composite([{ input: screen, left: padX, top: padY }])
    .png()
    .toBuffer()
}

/** Soft drop shadow under a device */
async function dropShadow (w, h, blur = 50, opacity = 0.7) {
  const pad = Math.ceil(blur * 2.2)
  const svg = Buffer.from(`
    <svg width="${w + pad * 2}" height="${h + pad * 2}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <filter id="f" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="${blur / 2.2}"/>
        </filter>
      </defs>
      <ellipse cx="${pad + w / 2}" cy="${pad + h * 0.92}" rx="${w * 0.42}" ry="${h * 0.08}"
        fill="rgba(0,0,0,${opacity})" filter="url(#f)"/>
    </svg>`)
  return { buf: await sharp(svg).png().toBuffer(), pad }
}

/** Reflection: flip vertical + fade */
async function makeReflection (deviceBuf, maxH = 160) {
  const meta = await sharp(deviceBuf).metadata()
  const rw = meta.width
  const rh = Math.min(maxH, Math.floor(meta.height * 0.35))
  const flipped = await sharp(deviceBuf)
    .extract({ left: 0, top: meta.height - rh, width: rw, height: rh })
    .flip()
    .png()
    .toBuffer()

  const fade = Buffer.from(`
    <svg width="${rw}" height="${rh}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="f" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#fff" stop-opacity="0.28"/>
          <stop offset="55%" stop-color="#fff" stop-opacity="0.08"/>
          <stop offset="100%" stop-color="#fff" stop-opacity="0"/>
        </linearGradient>
      </defs>
      <rect width="${rw}" height="${rh}" fill="url(#f)"/>
    </svg>`)

  return sharp(flipped)
    .composite([{ input: fade, blend: 'dest-in' }])
    .png()
    .toBuffer()
}

/** Slight 3D skew via affine */
async function skewDevice (buf, skewX = 0.08, skewY = -0.02) {
  const meta = await sharp(buf).metadata()
  // expand canvas so skewed edges aren't clipped
  const padX = Math.ceil(Math.abs(skewX) * meta.height) + 8
  const padY = Math.ceil(Math.abs(skewY) * meta.width) + 8
  const padded = await sharp(buf)
    .extend({
      top: padY, bottom: padY, left: padX, right: padX,
      background: { r: 0, g: 0, b: 0, alpha: 0 }
    })
    .png()
    .toBuffer()

  return sharp(padded)
    .affine(
      [[1, skewX], [skewY, 1]],
      { background: { r: 0, g: 0, b: 0, alpha: 0 }, interpolator: sharp.interpolators.nohalo }
    )
    .png()
    .toBuffer()
}

async function main () {
  // —— Devices with real screens ——
  let laptop = await screenInBezel({
    src: join(DIR, 'shot-desktop-admin.png'),
    sw: 980, sh: 580, padX: 18, padY: 16, radius: 18, kind: 'laptop'
  })
  let tablet = await screenInBezel({
    src: join(DIR, 'shot-tablet-login.png'),
    sw: 340, sh: 520, padX: 16, padY: 28, radius: 30, kind: 'tablet'
  })
  let login = await screenInBezel({
    src: join(DIR, 'shot-desktop-login.png'),
    sw: 420, sh: 265, padX: 12, padY: 10, radius: 14, kind: 'panel'
  })

  laptop = await skewDevice(laptop, 0.06, -0.015)
  tablet = await skewDevice(tablet, -0.05, 0.02)
  login = await skewDevice(login, 0.04, -0.01)

  const lapMeta = await sharp(laptop).metadata()
  const tabMeta = await sharp(tablet).metadata()
  const logMeta = await sharp(login).metadata()

  const lapRef = await makeReflection(laptop, 150)
  const tabRef = await makeReflection(tablet, 120)
  const logRef = await makeReflection(login, 90)

  const logo = await sharp(join(process.cwd(), 'public', 'icons', 'icon-192x192.png'))
    .resize(78, 78)
    .composite([{ input: await roundMask(78, 78, 18), blend: 'dest-in' }])
    .png()
    .toBuffer()

  // Background photo + dark grade
  const bgPhoto = await sharp(join(DIR, 'bg-cinematic.png'))
    .resize(W, H, { fit: 'cover', position: 'centre' })
    .modulate({ brightness: 0.72, saturation: 1.15 })
    .png()
    .toBuffer()

  const overlays = Buffer.from(`
    <svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="vignette" cx="50%" cy="42%" r="72%">
          <stop offset="0%" stop-color="#000" stop-opacity="0"/>
          <stop offset="55%" stop-color="#000" stop-opacity="0.15"/>
          <stop offset="100%" stop-color="#000" stop-opacity="0.72"/>
        </radialGradient>
        <linearGradient id="topFade" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#02060e" stop-opacity="0.85"/>
          <stop offset="100%" stop-color="#02060e" stop-opacity="0"/>
        </linearGradient>
        <linearGradient id="botFade" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#02060e" stop-opacity="0"/>
          <stop offset="100%" stop-color="#02060e" stop-opacity="0.9"/>
        </linearGradient>
        <linearGradient id="cyanBeam" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stop-color="#4fc3f7" stop-opacity="0"/>
          <stop offset="30%" stop-color="#4fc3f7" stop-opacity="0.9"/>
          <stop offset="100%" stop-color="#4fc3f7" stop-opacity="0"/>
        </linearGradient>
        <linearGradient id="glassCard" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#0a1a30" stop-opacity="0.55"/>
          <stop offset="100%" stop-color="#061018" stop-opacity="0.35"/>
        </linearGradient>
        <filter id="blurSoft" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="18"/>
        </filter>
      </defs>
      <!-- grade -->
      <rect width="${W}" height="${H}" fill="url(#vignette)"/>
      <rect width="${W}" height="220" fill="url(#topFade)"/>
      <rect y="880" width="${W}" height="200" fill="url(#botFade)"/>
      <!-- ambient orbs -->
      <circle cx="420" cy="280" r="220" fill="#4fc3f7" opacity="0.12" filter="url(#blurSoft)"/>
      <circle cx="1580" cy="620" r="200" fill="#e94560" opacity="0.14" filter="url(#blurSoft)"/>
      <!-- brand glass panel -->
      <rect x="56" y="36" width="620" height="128" rx="20" fill="url(#glassCard)"
        stroke="rgba(79,195,247,0.22)" stroke-width="1"/>
      <rect x="160" y="118" width="320" height="2.5" fill="url(#cyanBeam)"/>
      <text x="160" y="82" fill="#ffffff" font-family="Segoe UI, Helvetica Neue, Arial, sans-serif"
        font-size="48" font-weight="800" letter-spacing="1.5">SIDI-E</text>
      <text x="160" y="108" fill="#9fd4f0" font-family="Segoe UI, Helvetica Neue, Arial, sans-serif"
        font-size="14" letter-spacing="3.5">SISTEMA DE INSPEÇÃO DE EPIS</text>
      <!-- tagline -->
      <text x="72" y="1028" fill="rgba(255,255,255,0.78)" font-family="Segoe UI, Helvetica Neue, Arial, sans-serif"
        font-size="18" letter-spacing="1.2">Gestão administrativa  ·  PWA em campo  ·  Offline-first</text>
      <!-- accent dots -->
      <circle cx="1680" cy="1024" r="4" fill="#4fc3f7" opacity="0.9"/>
      <circle cx="1710" cy="1024" r="4" fill="#e94560" opacity="0.85"/>
      <circle cx="1740" cy="1024" r="4" fill="#ffffff" opacity="0.55"/>
    </svg>`)

  // Positions — hero laptop center-left, tablet right, login floating lower mid
  const lapX = 70
  const lapY = 175
  const tabX = 1320
  const tabY = 155
  const logX = 980
  const logY = 620

  const lapSh = await dropShadow(lapMeta.width, lapMeta.height, 55, 0.75)
  const tabSh = await dropShadow(tabMeta.width, tabMeta.height, 42, 0.7)
  const logSh = await dropShadow(logMeta.width, logMeta.height, 32, 0.6)

  const composed = await sharp(bgPhoto)
    .composite([
      { input: overlays, left: 0, top: 0 },
      // shadows
      { input: lapSh.buf, left: lapX - lapSh.pad, top: lapY - lapSh.pad + 20 },
      { input: tabSh.buf, left: tabX - tabSh.pad, top: tabY - tabSh.pad + 16 },
      { input: logSh.buf, left: logX - logSh.pad, top: logY - logSh.pad + 12 },
      // reflections
      { input: lapRef, left: lapX + 8, top: lapY + lapMeta.height - 18 },
      { input: tabRef, left: tabX + 6, top: tabY + tabMeta.height - 14 },
      { input: logRef, left: logX + 4, top: logY + logMeta.height - 10 },
      // devices
      { input: laptop, left: lapX, top: lapY },
      { input: tablet, left: tabX, top: tabY },
      { input: login, left: logX, top: logY },
      // logo in glass card
      { input: logo, left: 72, top: 52 }
    ])
    .jpeg({ quality: 94, mozjpeg: true })
    .toBuffer()

  const png = await sharp(composed).png({ compressionLevel: 8 }).toBuffer()
  writeFileSync(join(DIR, 'sidie-thumbnail-divulgacao.png'), png)
  writeFileSync(join(DIR, 'sidie-thumbnail-divulgacao.jpg'), composed)
  // keep cinematic AI scene as alternate
  console.log('✓ cinema thumbnail → sidie-thumbnail-divulgacao.png / .jpg')
  console.log(`  png ${(png.length / 1024).toFixed(0)} KB · jpg ${(composed.length / 1024).toFixed(0)} KB`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
