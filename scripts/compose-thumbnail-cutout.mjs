/**
 * 1) Preenche tela no casco fotorealista (coords corretas)
 * 2) Remove fundo
 * 3) Compõe cena SIDI-E
 */
import { removeBackground } from '@imgly/background-removal-node'
import { writeFileSync } from 'fs'
import { join, basename } from 'path'
import sharp from 'sharp'
import { pathToFileURL } from 'url'

const DIR = join(process.cwd(), 'public', 'marketing')
const W = 1920
const H = 1080

async function floodScreen (path, seed, thresh = 20) {
  const { data, info } = await sharp(path).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  const { width: w, height: h, channels: c } = info
  const dark = (x, y) => {
    const i = (y * w + x) * c
    if (data[i + 3] < 200) return false
    return (data[i] + data[i + 1] + data[i + 2]) / 3 < thresh
  }
  const seen = new Uint8Array(w * h)
  let sx = seed.x; let sy = seed.y
  if (!dark(sx, sy)) {
    let found = false
    for (let r = 8; r < 260 && !found; r += 8) {
      for (let a = 0; a < 360; a += 12) {
        const x = Math.round(seed.x + Math.cos((a * Math.PI) / 180) * r)
        const y = Math.round(seed.y + Math.sin((a * Math.PI) / 180) * r)
        if (x < 0 || y < 0 || x >= w || y >= h) continue
        if (dark(x, y)) { sx = x; sy = y; found = true; break }
      }
    }
    if (!found) throw new Error('No dark seed: ' + path)
  }
  const q = [[sx, sy]]
  seen[sy * w + sx] = 1
  let minX = sx; let minY = sy; let maxX = sx; let maxY = sy; let count = 0
  while (q.length) {
    const [x, y] = q.pop()
    if (!dark(x, y)) continue
    count++
    if (x < minX) minX = x
    if (y < minY) minY = y
    if (x > maxX) maxX = x
    if (y > maxY) maxY = y
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx; const ny = y + dy
      if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue
      const si = ny * w + nx
      if (seen[si]) continue
      seen[si] = 1
      q.push([nx, ny])
    }
  }
  const inset = 2
  return {
    left: minX + inset,
    top: minY + inset,
    width: maxX - minX + 1 - inset * 2,
    height: maxY - minY + 1 - inset * 2,
    count,
    w,
    h
  }
}

async function roundMask (w, h, r) {
  return Buffer.from(`
    <svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${w}" height="${h}" rx="${r}" ry="${r}" fill="#fff"/>
    </svg>`)
}

async function fillScreen (shellPath, shotPath, screen, radius = 6) {
  const shot = await sharp(shotPath)
    .resize(screen.width, screen.height, { fit: 'cover', position: 'north' })
    .composite([{ input: await roundMask(screen.width, screen.height, radius), blend: 'dest-in' }])
    .png()
    .toBuffer()

  const glare = Buffer.from(`
    <svg width="${screen.width}" height="${screen.height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="g" x1="0" y1="0" x2="0.45" y2="1">
          <stop offset="0%" stop-color="#fff" stop-opacity="0.12"/>
          <stop offset="30%" stop-color="#fff" stop-opacity="0.03"/>
          <stop offset="100%" stop-color="#4fc3f7" stop-opacity="0.05"/>
        </linearGradient>
        <linearGradient id="edge" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stop-color="#000" stop-opacity="0.25"/>
          <stop offset="8%" stop-color="#000" stop-opacity="0"/>
          <stop offset="92%" stop-color="#000" stop-opacity="0"/>
          <stop offset="100%" stop-color="#000" stop-opacity="0.25"/>
        </linearGradient>
      </defs>
      <rect width="${screen.width}" height="${screen.height}" rx="${radius}" fill="url(#g)"/>
      <rect width="${screen.width}" height="${screen.height}" rx="${radius}" fill="url(#edge)"/>
    </svg>`)

  const layered = await sharp(shot)
    .composite([{ input: glare, blend: 'over' }])
    .png()
    .toBuffer()

  return sharp(shellPath)
    .composite([{ input: layered, left: screen.left, top: screen.top }])
    .png()
    .toBuffer()
}

async function cutoutBuffer (pngBuf, label) {
  console.log('cutout', label, '…')
  const tmp = join(DIR, `_tmp-${label}.png`)
  writeFileSync(tmp, pngBuf)
  const blob = await removeBackground(pathToFileURL(tmp))
  return Buffer.from(await blob.arrayBuffer())
}

async function makeReflection (buf, maxH = 110, opacity = 0.26) {
  const meta = await sharp(buf).metadata()
  const rh = Math.min(maxH, Math.floor(meta.height * 0.24))
  const flipped = await sharp(buf)
    .extract({ left: 0, top: Math.max(0, meta.height - rh), width: meta.width, height: rh })
    .flip()
    .modulate({ brightness: 0.4 })
    .png()
    .toBuffer()

  const fade = Buffer.from(`
    <svg width="${meta.width}" height="${rh}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="f" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#fff" stop-opacity="${opacity}"/>
          <stop offset="50%" stop-color="#fff" stop-opacity="${opacity * 0.25}"/>
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
  const pad = 90
  const svg = Buffer.from(`
    <svg width="${w + pad * 2}" height="${70 + pad}" xmlns="http://www.w3.org/2000/svg">
      <defs><filter id="f"><feGaussianBlur stdDeviation="16"/></filter></defs>
      <ellipse cx="${pad + w / 2}" cy="${pad + 16}" rx="${w * 0.32}" ry="18"
        fill="rgba(0,0,0,0.68)" filter="url(#f)"/>
    </svg>`)
  return { buf: await sharp(svg).png().toBuffer(), pad }
}

async function prepareDevice ({ shell, shot, seed, thresh, radius, resize }) {
  console.log('screen detect', basename(shell))
  const screen = await floodScreen(shell, seed, thresh)
  console.log(' ', screen)
  const filled = await fillScreen(shell, shot, screen, radius)
  writeFileSync(join(DIR, `_filled-${basename(shell)}`), filled)
  let cut = await cutoutBuffer(filled, basename(shell).replace('.png', ''))
  cut = await sharp(cut).trim({ threshold: 8 }).png().toBuffer()
  if (resize?.width) cut = await sharp(cut).resize({ width: resize.width }).png().toBuffer()
  if (resize?.height) cut = await sharp(cut).resize({ height: resize.height }).png().toBuffer()
  return cut
}

async function main () {
  const laptop = await prepareDevice({
    shell: join(DIR, 'device-laptop-shell.png'),
    shot: join(DIR, 'shot-desktop-admin.png'),
    seed: { x: 768, y: 350 },
    thresh: 20,
    radius: 4,
    resize: { width: 1100 }
  })

  const tablet = await prepareDevice({
    shell: join(DIR, 'device-tablet-shell.png'),
    shot: join(DIR, 'shot-tablet-login.png'),
    seed: { x: 512, y: 700 },
    thresh: 20,
    radius: 10,
    resize: { height: 680 }
  })

  const phone = await prepareDevice({
    shell: join(DIR, 'device-phone-shell.png'),
    shot: join(DIR, 'shot-desktop-login.png'),
    seed: { x: 800, y: 500 },
    thresh: 22,
    radius: 16,
    resize: { width: 480 }
  })

  writeFileSync(join(DIR, '_debug-laptop.png'), laptop)
  writeFileSync(join(DIR, '_debug-tablet.png'), tablet)
  writeFileSync(join(DIR, '_debug-phone.png'), phone)

  const lapM = await sharp(laptop).metadata()
  const tabM = await sharp(tablet).metadata()
  const phoM = await sharp(phone).metadata()
  console.log('sizes', lapM.width, lapM.height, '|', tabM.width, tabM.height, '|', phoM.width, phoM.height)

  const lapRef = await makeReflection(laptop, 100, 0.25)
  const tabRef = await makeReflection(tablet, 90, 0.23)
  const phoRef = await makeReflection(phone, 60, 0.2)

  const logo = await sharp(join(process.cwd(), 'public', 'icons', 'icon-192x192.png'))
    .resize(78, 78)
    .composite([{ input: await roundMask(78, 78, 18), blend: 'dest-in' }])
    .png()
    .toBuffer()

  const bg = await sharp(join(DIR, 'bg-cinematic.png'))
    .resize(W, H, { fit: 'cover', position: 'south' })
    .modulate({ brightness: 0.58, saturation: 1.1 })
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
          <stop offset="0%" stop-color="#01040a" stop-opacity="0.9"/>
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
      <rect width="${W}" height="170" fill="url(#topFade)"/>
      <rect y="930" width="${W}" height="150" fill="url(#botFade)"/>
      <circle cx="480" cy="300" r="220" fill="#4fc3f7" opacity="0.07" filter="url(#glow)"/>
      <circle cx="1560" cy="500" r="200" fill="#e94560" opacity="0.1" filter="url(#glow)"/>
      <ellipse cx="600" cy="905" rx="220" ry="30" fill="#4fc3f7" opacity="0.05" filter="url(#glow)"/>
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

  // Sit on table — leave room for reflections
  const lapX = 40
  const lapY = 200
  const tabX = 1300
  const tabY = 150
  const phoX = 1020
  const phoY = 640

  const lapSh = await contactShadow(lapM.width)
  const tabSh = await contactShadow(tabM.width)
  const phoSh = await contactShadow(phoM.width)

  const out = await sharp(bg)
    .composite([
      { input: overlays, left: 0, top: 0 },
      { input: lapSh.buf, left: lapX - lapSh.pad + 50, top: lapY + lapM.height - 42 },
      { input: tabSh.buf, left: tabX - tabSh.pad + 20, top: tabY + tabM.height - 36 },
      { input: phoSh.buf, left: phoX - phoSh.pad + 12, top: phoY + phoM.height - 28 },
      { input: lapRef, left: lapX + 30, top: lapY + lapM.height - 12 },
      { input: tabRef, left: tabX + 16, top: tabY + tabM.height - 10 },
      { input: phoRef, left: phoX + 10, top: phoY + phoM.height - 8 },
      { input: laptop, left: lapX, top: lapY },
      { input: tablet, left: tabX, top: tabY },
      { input: phone, left: phoX, top: phoY },
      { input: logo, left: 68, top: 46 }
    ])
    .jpeg({ quality: 94, mozjpeg: true })
    .toBuffer()

  const png = await sharp(out).png().toBuffer()
  writeFileSync(join(DIR, 'sidie-thumbnail-divulgacao-real.png'), png)
  writeFileSync(join(DIR, 'sidie-thumbnail-divulgacao-real.jpg'), out)
  writeFileSync(join(DIR, 'sidie-thumbnail-divulgacao.png'), png)
  writeFileSync(join(DIR, 'sidie-thumbnail-divulgacao.jpg'), out)
  console.log('✓ sidie-thumbnail-divulgacao(-real) atualizado')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
