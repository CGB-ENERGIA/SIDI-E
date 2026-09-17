/**
 * Thumbnail HERO — fundo cinema + dispositivos maiores assentados na mesa
 */
import sharp from 'sharp'
import { join } from 'path'
import { writeFileSync, copyFileSync, existsSync } from 'fs'

const DIR = join(process.cwd(), 'public', 'marketing')
const ASSETS = 'C:\\Users\\Italo\\.cursor\\projects\\c-Users-Italo-INSPE-O-GSTC\\assets'
const W = 1920
const H = 1080

async function roundMask (w, h, r) {
  return Buffer.from(`
    <svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${w}" height="${h}" rx="${r}" ry="${r}" fill="#fff"/>
    </svg>`)
}

async function screenInBezel ({ src, sw, sh, padX, padY, radius, kind }) {
  const chin = kind === 'laptop' ? 34 : 0
  const ow = sw + padX * 2
  const oh = sh + padY * 2 + chin

  const screen = await sharp(src)
    .resize(sw, sh, { fit: 'cover', position: 'north' })
    .composite([{ input: await roundMask(sw, sh, Math.max(4, radius - 10)), blend: 'dest-in' }])
    .png()
    .toBuffer()

  let extras = ''
  if (kind === 'tablet') {
    extras = `<circle cx="${ow / 2}" cy="${padY * 0.4}" r="5" fill="#2a3140"/>`
  } else if (kind === 'laptop') {
    extras = `
      <rect x="0" y="${oh - chin}" width="${ow}" height="${chin}" rx="6" fill="#080a10"/>
      <rect x="${ow * 0.15}" y="${oh - 22}" width="${ow * 0.7}" height="8" rx="4" fill="#151b28"/>
      <rect x="3" y="${oh - chin}" width="${ow - 6}" height="1.5" fill="rgba(140,160,200,0.35)"/>
    `
  }

  const frame = Buffer.from(`
    <svg width="${ow}" height="${oh}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bezel" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#5a6578"/>
          <stop offset="40%" stop-color="#222a3a"/>
          <stop offset="100%" stop-color="#0a0e16"/>
        </linearGradient>
        <linearGradient id="edge" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#c8d4e8" stop-opacity="0.7"/>
          <stop offset="100%" stop-color="#1a2030" stop-opacity="0.35"/>
        </linearGradient>
      </defs>
      <rect x="1" y="1" width="${ow - 2}" height="${oh - 2 - chin}" rx="${radius}" ry="${radius}"
        fill="url(#bezel)" stroke="url(#edge)" stroke-width="2.2"/>
      ${extras}
    </svg>`)

  return sharp(frame)
    .composite([{ input: screen, left: padX, top: padY }])
    .png()
    .toBuffer()
}

async function makeReflection (deviceBuf, maxH = 180, opacity = 0.32) {
  const meta = await sharp(deviceBuf).metadata()
  const rw = meta.width
  const rh = Math.min(maxH, Math.floor(meta.height * 0.38))
  const flipped = await sharp(deviceBuf)
    .extract({ left: 0, top: meta.height - rh, width: rw, height: rh })
    .flip()
    .modulate({ brightness: 0.55 })
    .png()
    .toBuffer()

  const fade = Buffer.from(`
    <svg width="${rw}" height="${rh}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="f" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#fff" stop-opacity="${opacity}"/>
          <stop offset="45%" stop-color="#fff" stop-opacity="${opacity * 0.35}"/>
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

async function skewDevice (buf, skewX = 0.05, skewY = -0.01) {
  const meta = await sharp(buf).metadata()
  const padX = Math.ceil(Math.abs(skewX) * meta.height) + 10
  const padY = Math.ceil(Math.abs(skewY) * meta.width) + 10
  const padded = await sharp(buf)
    .extend({
      top: padY, bottom: padY, left: padX, right: padX,
      background: { r: 0, g: 0, b: 0, alpha: 0 }
    })
    .png()
    .toBuffer()

  return sharp(padded)
    .affine([[1, skewX], [skewY, 1]], {
      background: { r: 0, g: 0, b: 0, alpha: 0 },
      interpolator: sharp.interpolators.nohalo
    })
    .png()
    .toBuffer()
}

async function softShadow (w, h) {
  const pad = 80
  const svg = Buffer.from(`
    <svg width="${w + pad * 2}" height="${h + pad * 2}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <filter id="f"><feGaussianBlur stdDeviation="28"/></filter>
      </defs>
      <ellipse cx="${pad + w / 2}" cy="${pad + h - 10}" rx="${w * 0.4}" ry="28"
        fill="rgba(0,0,0,0.75)" filter="url(#f)"/>
    </svg>`)
  return { buf: await sharp(svg).png().toBuffer(), pad }
}

async function main () {
  let laptop = await screenInBezel({
    src: join(DIR, 'shot-desktop-admin.png'),
    sw: 1080, sh: 640, padX: 20, padY: 16, radius: 18, kind: 'laptop'
  })
  let tablet = await screenInBezel({
    src: join(DIR, 'shot-tablet-login.png'),
    sw: 360, sh: 540, padX: 17, padY: 30, radius: 32, kind: 'tablet'
  })
  let login = await screenInBezel({
    src: join(DIR, 'shot-desktop-login.png'),
    sw: 380, sh: 240, padX: 11, padY: 10, radius: 14, kind: 'panel'
  })

  laptop = await skewDevice(laptop, 0.045, -0.012)
  tablet = await skewDevice(tablet, -0.04, 0.018)
  login = await skewDevice(login, 0.03, -0.008)

  const lapMeta = await sharp(laptop).metadata()
  const tabMeta = await sharp(tablet).metadata()
  const logMeta = await sharp(login).metadata()

  const lapRef = await makeReflection(laptop, 170, 0.3)
  const tabRef = await makeReflection(tablet, 140, 0.28)
  const logRef = await makeReflection(login, 100, 0.22)

  const logo = await sharp(join(process.cwd(), 'public', 'icons', 'icon-192x192.png'))
    .resize(82, 82)
    .composite([{ input: await roundMask(82, 82, 20), blend: 'dest-in' }])
    .png()
    .toBuffer()

  const bgPhoto = await sharp(join(DIR, 'bg-cinematic.png'))
    .resize(W, H, { fit: 'cover', position: 'south' })
    .modulate({ brightness: 0.68, saturation: 1.2 })
    .png()
    .toBuffer()

  const overlays = Buffer.from(`
    <svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="vignette" cx="48%" cy="40%" r="75%">
          <stop offset="0%" stop-color="#000" stop-opacity="0"/>
          <stop offset="100%" stop-color="#000" stop-opacity="0.78"/>
        </radialGradient>
        <linearGradient id="topFade" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#01040a" stop-opacity="0.88"/>
          <stop offset="100%" stop-color="#01040a" stop-opacity="0"/>
        </linearGradient>
        <linearGradient id="botFade" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#01040a" stop-opacity="0"/>
          <stop offset="100%" stop-color="#01040a" stop-opacity="0.92"/>
        </linearGradient>
        <linearGradient id="cyanBeam" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stop-color="#4fc3f7" stop-opacity="0"/>
          <stop offset="25%" stop-color="#4fc3f7" stop-opacity="1"/>
          <stop offset="100%" stop-color="#4fc3f7" stop-opacity="0"/>
        </linearGradient>
        <linearGradient id="glass" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#0c2038" stop-opacity="0.72"/>
          <stop offset="100%" stop-color="#061018" stop-opacity="0.45"/>
        </linearGradient>
        <filter id="glow"><feGaussianBlur stdDeviation="22"/></filter>
      </defs>
      <rect width="${W}" height="${H}" fill="url(#vignette)"/>
      <rect width="${W}" height="200" fill="url(#topFade)"/>
      <rect y="900" width="${W}" height="180" fill="url(#botFade)"/>
      <circle cx="380" cy="300" r="260" fill="#4fc3f7" opacity="0.1" filter="url(#glow)"/>
      <circle cx="1620" cy="580" r="240" fill="#e94560" opacity="0.12" filter="url(#glow)"/>
      <rect x="52" y="32" width="640" height="132" rx="22" fill="url(#glass)"
        stroke="rgba(79,195,247,0.28)" stroke-width="1.2"/>
      <rect x="158" y="122" width="340" height="2.5" fill="url(#cyanBeam)"/>
      <text x="158" y="86" fill="#fff" font-family="Segoe UI, Helvetica Neue, Arial, sans-serif"
        font-size="52" font-weight="800" letter-spacing="2">SIDI-E</text>
      <text x="158" y="112" fill="#9ed6f5" font-family="Segoe UI, Helvetica Neue, Arial, sans-serif"
        font-size="14" letter-spacing="3.8">SISTEMA DE INSPEÇÃO DE EPIS</text>
      <text x="960" y="1036" text-anchor="middle" fill="rgba(255,255,255,0.82)"
        font-family="Segoe UI, Helvetica Neue, Arial, sans-serif" font-size="19" letter-spacing="1.5">
        Gestão administrativa  ·  PWA em campo  ·  Offline-first
      </text>
    </svg>`)

  // Sit devices on the reflective table plane (lower third)
  const lapX = 55
  const lapY = 195
  const tabX = 1340
  const tabY = 175
  const logX = 1020
  const logY = 655

  const lapSh = await softShadow(lapMeta.width, lapMeta.height)
  const tabSh = await softShadow(tabMeta.width, tabMeta.height)
  const logSh = await softShadow(logMeta.width, logMeta.height)

  const realCompose = await sharp(bgPhoto)
    .composite([
      { input: overlays, left: 0, top: 0 },
      { input: lapSh.buf, left: lapX - lapSh.pad, top: lapY - lapSh.pad + 24 },
      { input: tabSh.buf, left: tabX - tabSh.pad, top: tabY - tabSh.pad + 18 },
      { input: logSh.buf, left: logX - logSh.pad, top: logY - logSh.pad + 14 },
      { input: lapRef, left: lapX + 10, top: lapY + lapMeta.height - 22 },
      { input: tabRef, left: tabX + 8, top: tabY + tabMeta.height - 18 },
      { input: logRef, left: logX + 6, top: logY + logMeta.height - 12 },
      { input: laptop, left: lapX, top: lapY },
      { input: tablet, left: tabX, top: tabY },
      { input: login, left: logX, top: logY },
      { input: logo, left: 68, top: 48 }
    ])
    .jpeg({ quality: 94, mozjpeg: true })
    .toBuffer()

  writeFileSync(join(DIR, 'sidie-thumbnail-divulgacao-real.png'), await sharp(realCompose).png().toBuffer())
  writeFileSync(join(DIR, 'sidie-thumbnail-divulgacao-real.jpg'), realCompose)

  // Prefer cinematic AI hero if available; else real compose
  const heroSrc = join(ASSETS, 'sidie-thumbnail-hero.png')
  const proSrc = join(DIR, 'sidie-thumbnail-pro-scene.png')
  let master
  if (existsSync(heroSrc)) {
    master = await sharp(heroSrc).resize(W, H, { fit: 'cover' }).jpeg({ quality: 94, mozjpeg: true }).toBuffer()
    copyFileSync(heroSrc, join(DIR, 'sidie-thumbnail-hero.png'))
  } else if (existsSync(proSrc)) {
    master = await sharp(proSrc).resize(W, H, { fit: 'cover' }).jpeg({ quality: 94, mozjpeg: true }).toBuffer()
  } else {
    master = realCompose
  }

  writeFileSync(join(DIR, 'sidie-thumbnail-divulgacao.png'), await sharp(master).png().toBuffer())
  writeFileSync(join(DIR, 'sidie-thumbnail-divulgacao.jpg'), master)
  console.log('✓ hero → sidie-thumbnail-divulgacao.png / .jpg')
  console.log('✓ real screens → sidie-thumbnail-divulgacao-real.png / .jpg')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
