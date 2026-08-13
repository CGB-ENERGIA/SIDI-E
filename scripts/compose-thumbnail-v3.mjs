/**
 * Thumbnail v3 — telas bem encaixadas + celular com câmera EPI (eletricista)
 */
import { removeBackground } from '@imgly/background-removal-node'
import PerspT from 'perspective-transform'
import { writeFileSync, copyFileSync, existsSync } from 'fs'
import { join, basename } from 'path'
import sharp from 'sharp'
import { pathToFileURL } from 'url'

const DIR = join(process.cwd(), 'public', 'marketing')
const ASSETS = 'C:\\Users\\Italo\\.cursor\\projects\\c-Users-Italo-INSPE-O-GSTC\\assets'
const W = 1920
const H = 1080

function asset (name) {
  const a = join(ASSETS, name)
  const b = join(DIR, name)
  if (existsSync(a)) return a
  return b
}

async function roundMask (w, h, r) {
  return Buffer.from(`
    <svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${w}" height="${h}" rx="${r}" ry="${r}" fill="#fff"/>
    </svg>`)
}

/** UI da câmera SIDI-E (CameraCapture.vue) com eletricista no preview */
async function buildCameraUI () {
  const CW = 720
  const CH = 1280
  const headerH = 110
  const footerH = 200
  const midH = CH - headerH - footerH

  const field = await sharp(asset('electrician-field.jpg'))
    .resize(CW, midH, { fit: 'cover', position: 'centre' })
    .png()
    .toBuffer()

  // Guide frame + vignette like the app
  const guide = Buffer.from(`
    <svg width="${CW}" height="${midH}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <mask id="m">
          <rect width="${CW}" height="${midH}" fill="#fff"/>
          <rect x="${CW * 0.125}" y="${midH * 0.1}" width="${CW * 0.75}" height="${midH * 0.8}"
            rx="14" ry="14" fill="#000"/>
        </mask>
      </defs>
      <rect width="${CW}" height="${midH}" fill="rgba(0,0,0,0.38)" mask="url(#m)"/>
      <rect x="${CW * 0.125}" y="${midH * 0.1}" width="${CW * 0.75}" height="${midH * 0.8}"
        rx="14" ry="14" fill="none" stroke="rgba(255,255,255,0.55)" stroke-width="2.5"/>
      <text x="${CW / 2}" y="${midH * 0.1 + midH * 0.8 + 36}" text-anchor="middle"
        fill="#fff" font-family="Segoe UI, Helvetica, Arial, sans-serif" font-size="22"
        style="text-shadow:0 1px 3px #000">Enquadre o colaborador na área</text>
    </svg>`)

  const chrome = Buffer.from(`
    <svg width="${CW}" height="${CH}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="hdr" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#000" stop-opacity="0.92"/>
          <stop offset="100%" stop-color="#000" stop-opacity="0.72"/>
        </linearGradient>
      </defs>
      <!-- header -->
      <rect width="${CW}" height="${headerH}" fill="url(#hdr)"/>
      <!-- close X -->
      <circle cx="48" cy="${headerH / 2}" r="22" fill="rgba(255,255,255,0.12)"/>
      <path d="M38 ${headerH / 2 - 8} L58 ${headerH / 2 + 8} M58 ${headerH / 2 - 8} L38 ${headerH / 2 + 8}"
        stroke="#fff" stroke-width="2.5" stroke-linecap="round"/>
      <text x="${CW / 2}" y="${headerH / 2 - 6}" text-anchor="middle" fill="#fff"
        font-family="Segoe UI, Helvetica, Arial, sans-serif" font-size="22" font-weight="700">Foto de EPI</text>
      <text x="${CW / 2}" y="${headerH / 2 + 22}" text-anchor="middle" fill="#bdbdbd"
        font-family="Segoe UI, Helvetica, Arial, sans-serif" font-size="14">Mostre todos os equipamentos de segurança</text>

      <!-- footer -->
      <rect y="${CH - footerH}" width="${CW}" height="${footerH}" fill="rgba(0,0,0,0.88)"/>
      <!-- flip camera icon circle -->
      <circle cx="110" cy="${CH - footerH / 2 - 8}" r="28" fill="rgba(255,255,255,0.1)"/>
      <path d="M96 ${CH - footerH / 2 - 8} a14 14 0 1 1 28 0" fill="none" stroke="#fff" stroke-width="2.5"/>
      <path d="M122 ${CH - footerH / 2 - 20} l6 8 l-10 0 z" fill="#fff"/>
      <!-- shutter -->
      <circle cx="${CW / 2}" cy="${CH - footerH / 2 - 8}" r="42" fill="#fff"/>
      <circle cx="${CW / 2}" cy="${CH - footerH / 2 - 8}" r="34" fill="none" stroke="#111" stroke-width="3"/>
      <text x="${CW / 2}" y="${CH - 28}" text-anchor="middle" fill="#9e9e9e"
        font-family="Segoe UI, Helvetica, Arial, sans-serif" font-size="15">Capturar</text>
    </svg>`)

  const mid = await sharp(field)
    .composite([{ input: guide, left: 0, top: 0 }])
    .png()
    .toBuffer()

  const ui = await sharp({
    create: { width: CW, height: CH, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 1 } }
  })
    .composite([
      { input: mid, left: 0, top: headerH },
      { input: chrome, left: 0, top: 0 }
    ])
    .png()
    .toBuffer()

  writeFileSync(join(DIR, 'shot-phone-camera.png'), ui)
  console.log('✓ shot-phone-camera.png')
  return join(DIR, 'shot-phone-camera.png')
}

async function detectScreenQuad (path, seed, thresh = 22) {
  const { data, info } = await sharp(path).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  const { width: w, height: h, channels: c } = info
  const dark = (x, y) => {
    const i = (y * w + x) * c
    if (data[i + 3] < 200) return false
    return (data[i] + data[i + 1] + data[i + 2]) / 3 < thresh
  }

  let sx = seed.x; let sy = seed.y
  if (!dark(sx, sy)) {
    let found = false
    for (let r = 8; r < 300 && !found; r += 8) {
      for (let a = 0; a < 360; a += 10) {
        const x = Math.round(seed.x + Math.cos((a * Math.PI) / 180) * r)
        const y = Math.round(seed.y + Math.sin((a * Math.PI) / 180) * r)
        if (x < 0 || y < 0 || x >= w || y >= h) continue
        if (dark(x, y)) { sx = x; sy = y; found = true; break }
      }
    }
    if (!found) throw new Error('No dark seed: ' + path)
  }

  const mask = new Uint8Array(w * h)
  const q = [[sx, sy]]
  mask[sy * w + sx] = 1
  let minX = sx; let minY = sy; let maxX = sx; let maxY = sy; let count = 0
  while (q.length) {
    const [x, y] = q.pop()
    if (!dark(x, y)) { mask[y * w + x] = 0; continue }
    count++
    if (x < minX) minX = x
    if (y < minY) minY = y
    if (x > maxX) maxX = x
    if (y > maxY) maxY = y
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx; const ny = y + dy
      if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue
      const si = ny * w + nx
      if (mask[si]) continue
      mask[si] = 1
      q.push([nx, ny])
    }
  }

  let tl = { x: sx, y: sy, s: Infinity }
  let tr = { x: sx, y: sy, s: -Infinity }
  let br = { x: sx, y: sy, s: -Infinity }
  let bl = { x: sx, y: sy, s: Infinity }
  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      if (!mask[y * w + x] || !dark(x, y)) continue
      const sum = x + y
      const dif = x - y
      if (sum < tl.s) tl = { x, y, s: sum }
      if (dif > tr.s) tr = { x, y, s: dif }
      if (sum > br.s) br = { x, y, s: sum }
      if (dif < bl.s) bl = { x, y, s: dif }
    }
  }

  const cx = (tl.x + tr.x + br.x + bl.x) / 4
  const cy = (tl.y + tr.y + br.y + bl.y) / 4
  // Mais inset = UI fica DENTRO do bezel (não vaza)
  const inset = (p, amt = 0.028) => ({
    x: Math.round(p.x + (cx - p.x) * amt),
    y: Math.round(p.y + (cy - p.y) * amt)
  })

  return {
    w, h, count,
    bbox: { left: minX, top: minY, width: maxX - minX + 1, height: maxY - minY + 1 },
    quad: { tl: inset(tl), tr: inset(tr), br: inset(br), bl: inset(bl) }
  }
}

async function warpShotToQuad (shotPath, shellW, shellH, quad, srcW, srcH) {
  const shot = await sharp(shotPath)
    .resize(srcW, srcH, { fit: 'cover', position: 'north' })
    .modulate({ brightness: 1.04, saturation: 1.05 }) // tela “acesa”
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })

  const src = shot.data
  const sw = shot.info.width
  const sh = shot.info.height
  const sc = shot.info.channels

  const srcCorners = [0, 0, sw, 0, sw, sh, 0, sh]
  const dstCorners = [
    quad.tl.x, quad.tl.y,
    quad.tr.x, quad.tr.y,
    quad.br.x, quad.br.y,
    quad.bl.x, quad.bl.y
  ]
  const persp = PerspT(dstCorners, srcCorners)

  const minX = Math.max(0, Math.min(quad.tl.x, quad.tr.x, quad.br.x, quad.bl.x) - 2)
  const maxX = Math.min(shellW - 1, Math.max(quad.tl.x, quad.tr.x, quad.br.x, quad.bl.x) + 2)
  const minY = Math.max(0, Math.min(quad.tl.y, quad.tr.y, quad.br.y, quad.bl.y) - 2)
  const maxY = Math.min(shellH - 1, Math.max(quad.tl.y, quad.tr.y, quad.br.y, quad.bl.y) + 2)

  const out = Buffer.alloc(shellW * shellH * 4)

  const sample = (x, y) => {
    const x0 = Math.floor(x); const y0 = Math.floor(y)
    const x1 = Math.min(sw - 1, x0 + 1); const y1 = Math.min(sh - 1, y0 + 1)
    const fx = x - x0; const fy = y - y0
    const i00 = (y0 * sw + x0) * sc
    const i10 = (y0 * sw + x1) * sc
    const i01 = (y1 * sw + x0) * sc
    const i11 = (y1 * sw + x1) * sc
    const pix = [0, 0, 0, 0]
    for (let k = 0; k < 4; k++) {
      pix[k] = Math.round(
        src[i00 + k] * (1 - fx) * (1 - fy) +
        src[i10 + k] * fx * (1 - fy) +
        src[i01 + k] * (1 - fx) * fy +
        src[i11 + k] * fx * fy
      )
    }
    return pix
  }

  const inTri = (px, py, ax, ay, bx, by, cx, cy) => {
    const v0x = cx - ax; const v0y = cy - ay
    const v1x = bx - ax; const v1y = by - ay
    const v2x = px - ax; const v2y = py - ay
    const dot00 = v0x * v0x + v0y * v0y
    const dot01 = v0x * v1x + v0y * v1y
    const dot02 = v0x * v2x + v0y * v2y
    const dot11 = v1x * v1x + v1y * v1y
    const dot12 = v1x * v2x + v1y * v2y
    const inv = 1 / (dot00 * dot11 - dot01 * dot01)
    const u = (dot11 * dot02 - dot01 * dot12) * inv
    const v = (dot00 * dot12 - dot01 * dot02) * inv
    return u >= -0.01 && v >= -0.01 && (u + v) <= 1.01
  }

  const { tl, tr, br, bl } = quad
  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      if (
        !inTri(x, y, tl.x, tl.y, tr.x, tr.y, br.x, br.y) &&
        !inTri(x, y, tl.x, tl.y, br.x, br.y, bl.x, bl.y)
      ) continue
      const [sxu, syu] = persp.transform(x, y)
      if (sxu < -1 || syu < -1 || sxu > sw || syu > sh) continue
      const pix = sample(Math.max(0, Math.min(sw - 1.001, sxu)), Math.max(0, Math.min(sh - 1.001, syu)))
      const oi = (y * shellW + x) * 4
      out[oi] = pix[0]; out[oi + 1] = pix[1]; out[oi + 2] = pix[2]; out[oi + 3] = 255
    }
  }

  const base = await sharp(out, { raw: { width: shellW, height: shellH, channels: 4 } }).png().toBuffer()

  // Vidro: glare + vinheta nas bordas da tela (integra no bezel)
  const glass = Buffer.from(`
    <svg width="${shellW}" height="${shellH}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="g" x1="0" y1="0" x2="0.55" y2="1">
          <stop offset="0%" stop-color="#fff" stop-opacity="0.14"/>
          <stop offset="22%" stop-color="#fff" stop-opacity="0.04"/>
          <stop offset="55%" stop-color="#fff" stop-opacity="0"/>
          <stop offset="100%" stop-color="#4fc3f7" stop-opacity="0.05"/>
        </linearGradient>
        <linearGradient id="edge" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stop-color="#000" stop-opacity="0.35"/>
          <stop offset="6%" stop-color="#000" stop-opacity="0"/>
          <stop offset="94%" stop-color="#000" stop-opacity="0"/>
          <stop offset="100%" stop-color="#000" stop-opacity="0.35"/>
        </linearGradient>
        <linearGradient id="edgeV" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#000" stop-opacity="0.28"/>
          <stop offset="5%" stop-color="#000" stop-opacity="0"/>
          <stop offset="95%" stop-color="#000" stop-opacity="0"/>
          <stop offset="100%" stop-color="#000" stop-opacity="0.22"/>
        </linearGradient>
      </defs>
      <polygon points="${tl.x},${tl.y} ${tr.x},${tr.y} ${br.x},${br.y} ${bl.x},${bl.y}" fill="url(#g)"/>
      <polygon points="${tl.x},${tl.y} ${tr.x},${tr.y} ${br.x},${br.y} ${bl.x},${bl.y}" fill="url(#edge)"/>
      <polygon points="${tl.x},${tl.y} ${tr.x},${tr.y} ${br.x},${br.y} ${bl.x},${bl.y}" fill="url(#edgeV)"/>
    </svg>`)

  return sharp(base).composite([{ input: glass, blend: 'over' }]).png().toBuffer()
}

async function fillWithPerspective (shellPath, shotPath, seed, thresh) {
  const det = await detectScreenQuad(shellPath, seed, thresh)
  console.log('quad', basename(shellPath), det.quad)
  const srcW = Math.max(480, Math.round(det.bbox.width * 1.35))
  const srcH = Math.max(360, Math.round(det.bbox.height * 1.35))
  const warped = await warpShotToQuad(shotPath, det.w, det.h, det.quad, srcW, srcH)
  return sharp(shellPath)
    .composite([{ input: warped, left: 0, top: 0 }])
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
  return sharp(flipped).composite([{ input: fade, blend: 'dest-in' }]).png().toBuffer()
}

async function contactShadow (w) {
  const pad = 90
  const svg = Buffer.from(`
    <svg width="${w + pad * 2}" height="${70 + pad}" xmlns="http://www.w3.org/2000/svg">
      <defs><filter id="f"><feGaussianBlur stdDeviation="16"/></filter></defs>
      <ellipse cx="${pad + w / 2}" cy="${pad + 16}" rx="${w * 0.32}" ry="18"
        fill="rgba(0,0,0,0.7)" filter="url(#f)"/>
    </svg>`)
  return { buf: await sharp(svg).png().toBuffer(), pad }
}

async function prepareDevice ({ shell, shot, seed, thresh, resize }) {
  const filled = await fillWithPerspective(shell, shot, seed, thresh)
  writeFileSync(join(DIR, `_filled-${basename(shell)}`), filled)
  let cut = await cutoutBuffer(filled, basename(shell).replace('.png', ''))
  cut = await sharp(cut).trim({ threshold: 8 }).png().toBuffer()
  if (resize?.width) cut = await sharp(cut).resize({ width: resize.width }).png().toBuffer()
  if (resize?.height) cut = await sharp(cut).resize({ height: resize.height }).png().toBuffer()
  return cut
}

async function main () {
  // Copy new assets into marketing
  for (const f of ['electrician-field.jpg', 'phone-portrait-shell.png', 'laptop-shell-v2.png']) {
    const src = join(ASSETS, f)
    if (existsSync(src)) copyFileSync(src, join(DIR, f))
  }

  const cameraShot = await buildCameraUI()

  // Prefer new laptop shell; fallback to previous
  const lapShell = existsSync(join(DIR, 'laptop-shell-v2.png'))
    ? join(DIR, 'laptop-shell-v2.png')
    : join(DIR, 'device-laptop-shell.png')
  const phoShell = join(DIR, 'phone-portrait-shell.png')
  const tabShell = join(DIR, 'device-tablet-shell.png')

  const lapMeta = await sharp(lapShell).metadata()
  const phoMeta = await sharp(phoShell).metadata()
  const tabMeta = await sharp(tabShell).metadata()

  const laptop = await prepareDevice({
    shell: lapShell,
    shot: join(DIR, 'shot-desktop-admin.png'),
    seed: { x: Math.floor(lapMeta.width / 2), y: Math.floor(lapMeta.height * 0.32) },
    thresh: 28,
    resize: { width: 1080 }
  })

  const tablet = await prepareDevice({
    shell: tabShell,
    shot: join(DIR, 'shot-tablet-login.png'),
    seed: { x: Math.floor(tabMeta.width / 2), y: Math.floor(tabMeta.height * 0.45) },
    thresh: 22,
    resize: { height: 680 }
  })

  const phone = await prepareDevice({
    shell: phoShell,
    shot: cameraShot,
    seed: { x: Math.floor(phoMeta.width / 2), y: Math.floor(phoMeta.height * 0.5) },
    thresh: 35,
    resize: { height: 520 }
  })

  writeFileSync(join(DIR, '_debug-laptop.png'), laptop)
  writeFileSync(join(DIR, '_debug-tablet.png'), tablet)
  writeFileSync(join(DIR, '_debug-phone.png'), phone)

  const lapM = await sharp(laptop).metadata()
  const tabM = await sharp(tablet).metadata()
  const phoM = await sharp(phone).metadata()
  console.log('sizes', lapM.width, 'x', lapM.height, '|', tabM.width, 'x', tabM.height, '|', phoM.width, 'x', phoM.height)

  const lapRef = await makeReflection(laptop, 100, 0.25)
  const tabRef = await makeReflection(tablet, 90, 0.23)
  const phoRef = await makeReflection(phone, 80, 0.22)

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
      <ellipse cx="1180" cy="900" rx="90" ry="24" fill="#4fc3f7" opacity="0.06" filter="url(#glow)"/>
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

  // Layout: laptop left, tablet right, phone portrait front-center
  const lapX = 30
  const lapY = 200
  const tabX = 1320
  const tabY = 145
  const phoX = 1080
  const phoY = 420

  const lapSh = await contactShadow(lapM.width)
  const tabSh = await contactShadow(tabM.width)
  const phoSh = await contactShadow(phoM.width)

  const out = await sharp(bg)
    .composite([
      { input: overlays, left: 0, top: 0 },
      { input: lapSh.buf, left: lapX - lapSh.pad + 50, top: lapY + lapM.height - 42 },
      { input: tabSh.buf, left: tabX - tabSh.pad + 20, top: tabY + tabM.height - 36 },
      { input: phoSh.buf, left: phoX - phoSh.pad + 10, top: phoY + phoM.height - 28 },
      { input: lapRef, left: lapX + 28, top: lapY + lapM.height - 12 },
      { input: tabRef, left: tabX + 14, top: tabY + tabM.height - 10 },
      { input: phoRef, left: phoX + 8, top: phoY + phoM.height - 8 },
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
  console.log('✓ thumbnail v3 — camera + better screen fit')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
