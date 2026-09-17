/**
 * Thumbnail PRO — composição cinematográfica com screenshots reais
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

async function softShadow (w, h, blur = 40, opacity = 0.55) {
  const pad = blur * 2
  const svg = Buffer.from(`
    <svg width="${w + pad * 2}" height="${h + pad * 2}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <filter id="f" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="${blur / 2}"/>
        </filter>
      </defs>
      <rect x="${pad}" y="${pad + 8}" width="${w}" height="${h}" rx="20" fill="rgba(0,0,0,${opacity})" filter="url(#f)"/>
    </svg>`)
  return { buf: svg, pad }
}

async function screenInBezel ({ src, sw, sh, padX, padY, radius, kind }) {
  const ow = sw + padX * 2
  const oh = sh + padY * 2

  const screen = await sharp(src)
    .resize(sw, sh, { fit: 'cover', position: 'centre' })
    .composite([{ input: await roundMask(sw, sh, Math.max(6, radius - 8)), blend: 'dest-in' }])
    .png()
    .toBuffer()

  const notch = kind === 'tablet'
    ? `<circle cx="${ow / 2}" cy="${padY * 0.45}" r="5" fill="#2a3140"/>`
    : kind === 'laptop'
      ? `<rect x="${ow * 0.2}" y="${oh - 12}" width="${ow * 0.6}" height="8" rx="2" fill="#0a0c10"/>`
      : ''

  const frame = Buffer.from(`
    <svg width="${ow}" height="${oh}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bezel" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#3a4254"/>
          <stop offset="45%" stop-color="#1c222e"/>
          <stop offset="100%" stop-color="#0e121a"/>
        </linearGradient>
        <linearGradient id="edge" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#6a7a94" stop-opacity="0.55"/>
          <stop offset="100%" stop-color="#1a2030" stop-opacity="0.2"/>
        </linearGradient>
      </defs>
      <rect x="1.5" y="1.5" width="${ow - 3}" height="${oh - 3}" rx="${radius}" ry="${radius}"
        fill="url(#bezel)" stroke="url(#edge)" stroke-width="2.5"/>
      ${notch}
    </svg>`)

  return sharp(frame)
    .composite([{ input: screen, left: padX, top: padY }])
    .png()
    .toBuffer()
}

async function glowOrb (size, color, opacity = 0.35) {
  const svg = Buffer.from(`
    <svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="g">
          <stop offset="0%" stop-color="${color}" stop-opacity="${opacity}"/>
          <stop offset="70%" stop-color="${color}" stop-opacity="0.08"/>
          <stop offset="100%" stop-color="${color}" stop-opacity="0"/>
        </radialGradient>
      </defs>
      <circle cx="${size / 2}" cy="${size / 2}" r="${size / 2}" fill="url(#g)"/>
    </svg>`)
  return svg
}

async function main () {
  // Devices
  const laptop = await screenInBezel({
    src: join(DIR, 'shot-desktop-admin.png'),
    sw: 1040, sh: 650, padX: 20, padY: 18, radius: 20, kind: 'laptop'
  })
  const tablet = await screenInBezel({
    src: join(DIR, 'shot-tablet-login.png'),
    sw: 380, sh: 560, padX: 18, padY: 32, radius: 32, kind: 'tablet'
  })
  const login = await screenInBezel({
    src: join(DIR, 'shot-desktop-login.png'),
    sw: 460, sh: 290, padX: 14, padY: 12, radius: 16, kind: 'panel'
  })

  // Logo badge
  const logo = await sharp(join(process.cwd(), 'public', 'icons', 'icon-192x192.png'))
    .resize(72, 72)
    .composite([{ input: await roundMask(72, 72, 16), blend: 'dest-in' }])
    .png()
    .toBuffer()

  const bg = Buffer.from(`
    <svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="base" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#050b16"/>
          <stop offset="50%" stop-color="#0a1f3d"/>
          <stop offset="100%" stop-color="#071528"/>
        </linearGradient>
        <linearGradient id="floor" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#0f3460" stop-opacity="0"/>
          <stop offset="100%" stop-color="#04101f" stop-opacity="0.9"/>
        </linearGradient>
        <linearGradient id="line" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stop-color="#4fc3f7" stop-opacity="0"/>
          <stop offset="40%" stop-color="#4fc3f7" stop-opacity="0.85"/>
          <stop offset="100%" stop-color="#4fc3f7" stop-opacity="0"/>
        </linearGradient>
        <pattern id="grid" width="48" height="48" patternUnits="userSpaceOnUse">
          <path d="M 48 0 L 0 0 0 48" fill="none" stroke="rgba(79,195,247,0.06)" stroke-width="1"/>
        </pattern>
      </defs>
      <rect width="${W}" height="${H}" fill="url(#base)"/>
      <rect width="${W}" height="${H}" fill="url(#grid)"/>
      <rect y="720" width="${W}" height="360" fill="url(#floor)"/>
      <!-- accent beam -->
      <rect x="70" y="118" width="280" height="2" fill="url(#line)"/>
      <!-- title -->
      <text x="160" y="78" fill="#fff" font-family="Segoe UI, Helvetica, Arial, sans-serif" font-size="46" font-weight="800" letter-spacing="1">SIDI-E</text>
      <text x="160" y="112" fill="#8ec8e8" font-family="Segoe UI, Helvetica, Arial, sans-serif" font-size="15" letter-spacing="4">SISTEMA DE INSPEÇÃO DE EPIS</text>
      <!-- bottom strip -->
      <text x="80" y="1035" fill="rgba(255,255,255,0.4)" font-family="Segoe UI, Helvetica, Arial, sans-serif" font-size="15" letter-spacing="2">GESTÃO ADMINISTRATIVA  ·  PWA EM CAMPO  ·  OFFLINE-FIRST</text>
    </svg>`)

  const cyanGlow = await glowOrb(700, '#4fc3f7', 0.28)
  const redGlow = await glowOrb(520, '#e94560', 0.22)
  const blueGlow = await glowOrb(640, '#0f3460', 0.5)

  const lapShadow = await softShadow(1080, 686, 48, 0.6)
  const tabShadow = await softShadow(416, 624, 36, 0.55)
  const logShadow = await softShadow(488, 314, 28, 0.5)

  const composed = await sharp(bg)
    .composite([
      { input: cyanGlow, left: 200, top: -80 },
      { input: redGlow, left: 1280, top: 420 },
      { input: blueGlow, left: 900, top: 100 },
      // shadows
      { input: lapShadow.buf, left: 90 - lapShadow.pad, top: 168 - lapShadow.pad },
      { input: tabShadow.buf, left: 1380 - tabShadow.pad, top: 210 - tabShadow.pad },
      { input: logShadow.buf, left: 980 - logShadow.pad, top: 700 - logShadow.pad },
      // devices
      { input: laptop, left: 90, top: 168 },
      { input: tablet, left: 1380, top: 210 },
      { input: login, left: 980, top: 700 },
      // brand mark
      { input: logo, left: 72, top: 42 }
    ])
    .jpeg({ quality: 92, mozjpeg: true })
    .toBuffer()

  // also png master
  const png = await sharp(composed).png().toBuffer()
  writeFileSync(join(DIR, 'sidie-thumbnail-divulgacao.png'), png)
  writeFileSync(join(DIR, 'sidie-thumbnail-divulgacao.jpg'), composed)
  console.log('✓ sidie-thumbnail-divulgacao.png / .jpg')
}

main().catch(e => {
  console.error(e)
  process.exit(1)
})
