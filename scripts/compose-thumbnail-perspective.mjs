/**
 * Preenche tela com warp de perspectiva (4 cantos) + cutout + compose
 */
import { removeBackground } from '@imgly/background-removal-node'
import PerspT from 'perspective-transform'
import { writeFileSync } from 'fs'
import { join, basename } from 'path'
import sharp from 'sharp'
import { pathToFileURL } from 'url'

const DIR = join(process.cwd(), 'public', 'marketing')
const W = 1920
const H = 1080

/** Flood-fill dark screen → mask + axis bbox + 4 corners */
async function detectScreenQuad (path, seed, thresh = 20) {
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
    for (let r = 8; r < 280 && !found; r += 8) {
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

  // Extreme corners of the mask (perspective quad)
  // TL = min(x+y), TR = max(x-y), BR = max(x+y), BL = min(x-y)
  let tl = { x: sx, y: sy, s: Infinity }
  let tr = { x: sx, y: sy, s: -Infinity }
  let br = { x: sx, y: sy, s: -Infinity }
  let bl = { x: sx, y: sy, s: Infinity }
  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      if (!mask[y * w + x] || !dark(x, y)) continue
      const sum = x + y
      const dif = x - y
      if (sum < tl.s) { tl = { x, y, s: sum } }
      if (dif > tr.s) { tr = { x, y, s: dif } }
      if (sum > br.s) { br = { x, y, s: sum } }
      if (dif < bl.s) { bl = { x, y, s: dif } }
    }
  }

  // Inset corners slightly toward center to stay inside bezel
  const cx = (tl.x + tr.x + br.x + bl.x) / 4
  const cy = (tl.y + tr.y + br.y + bl.y) / 4
  const inset = (p, amt = 0.012) => ({
    x: Math.round(p.x + (cx - p.x) * amt),
    y: Math.round(p.y + (cy - p.y) * amt)
  })

  return {
    w,
    h,
    count,
    mask,
    bbox: { left: minX, top: minY, width: maxX - minX + 1, height: maxY - minY + 1 },
    quad: {
      tl: inset(tl),
      tr: inset(tr),
      br: inset(br),
      bl: inset(bl)
    }
  }
}

async function warpShotToQuad (shotPath, shellW, shellH, quad, srcW, srcH) {
  // Render screenshot to a transparent canvas the size of the shell, warped into quad
  const shot = await sharp(shotPath)
    .resize(srcW, srcH, { fit: 'cover', position: 'north' })
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
  // Map dest → src
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
      const v =
        src[i00 + k] * (1 - fx) * (1 - fy) +
        src[i10 + k] * fx * (1 - fy) +
        src[i01 + k] * (1 - fx) * fy +
        src[i11 + k] * fx * fy
      pix[k] = Math.round(v)
    }
    return pix
  }

  // Point-in-quad via barycentric of two triangles
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

  // Soft glass glare over the warped UI
  const base = await sharp(out, { raw: { width: shellW, height: shellH, channels: 4 } }).png().toBuffer()

  const glare = Buffer.from(`
    <svg width="${shellW}" height="${shellH}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="g" x1="0" y1="0" x2="0.5" y2="1">
          <stop offset="0%" stop-color="#fff" stop-opacity="0.10"/>
          <stop offset="35%" stop-color="#fff" stop-opacity="0.02"/>
          <stop offset="100%" stop-color="#4fc3f7" stop-opacity="0.04"/>
        </linearGradient>
      </defs>
      <polygon points="${tl.x},${tl.y} ${tr.x},${tr.y} ${br.x},${br.y} ${bl.x},${bl.y}" fill="url(#g)"/>
    </svg>`)

  return sharp(base).composite([{ input: glare, blend: 'over' }]).png().toBuffer()
}

async function fillWithPerspective (shellPath, shotPath, seed, thresh) {
  const det = await detectScreenQuad(shellPath, seed, thresh)
  console.log('quad', basename(shellPath), det.quad, 'count', det.count)
  const srcW = Math.max(400, Math.round(det.bbox.width * 1.2))
  const srcH = Math.max(300, Math.round(det.bbox.height * 1.2))
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
        fill="rgba(0,0,0,0.68)" filter="url(#f)"/>
    </svg>`)
  return { buf: await sharp(svg).png().toBuffer(), pad }
}

async function roundMask (w, h, r) {
  return Buffer.from(`
    <svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${w}" height="${h}" rx="${r}" ry="${r}" fill="#fff"/>
    </svg>`)
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
  const laptop = await prepareDevice({
    shell: join(DIR, 'device-laptop-shell.png'),
    shot: join(DIR, 'shot-desktop-admin.png'),
    seed: { x: 768, y: 350 },
    thresh: 20,
    resize: { width: 1120 }
  })
  const tablet = await prepareDevice({
    shell: join(DIR, 'device-tablet-shell.png'),
    shot: join(DIR, 'shot-tablet-login.png'),
    seed: { x: 512, y: 700 },
    thresh: 20,
    resize: { height: 700 }
  })
  const phone = await prepareDevice({
    shell: join(DIR, 'device-phone-shell.png'),
    shot: join(DIR, 'shot-desktop-login.png'),
    seed: { x: 800, y: 500 },
    thresh: 22,
    resize: { width: 500 }
  })

  writeFileSync(join(DIR, '_debug-laptop.png'), laptop)
  writeFileSync(join(DIR, '_debug-tablet.png'), tablet)
  writeFileSync(join(DIR, '_debug-phone.png'), phone)

  const lapM = await sharp(laptop).metadata()
  const tabM = await sharp(tablet).metadata()
  const phoM = await sharp(phone).metadata()

  const lapRef = await makeReflection(laptop, 105, 0.26)
  const tabRef = await makeReflection(tablet, 95, 0.24)
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

  const lapX = 35
  const lapY = 195
  const tabX = 1290
  const tabY = 140
  const phoX = 1010
  const phoY = 635

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
  console.log('✓ perspective devices → sidie-thumbnail-divulgacao(-real)')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
