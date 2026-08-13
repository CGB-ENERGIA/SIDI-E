/**
 * Fix phone body (no rembg on black phone) + recompose
 */
import PerspT from 'perspective-transform'
import { writeFileSync } from 'fs'
import { join } from 'path'
import sharp from 'sharp'

const DIR = join(process.cwd(), 'public', 'marketing')
const W = 1920
const H = 1080

async function detectScreenQuad (path, seed, thresh = 40) {
  const { data, info } = await sharp(path).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  const { width: w, height: h, channels: c } = info
  const dark = (x, y) => {
    const i = (y * w + x) * c
    if (data[i + 3] < 200) return false
    return (data[i] + data[i + 1] + data[i + 2]) / 3 < thresh
  }
  let sx = seed.x; let sy = seed.y
  if (!dark(sx, sy)) {
    for (let r = 8; r < 300; r += 8) {
      let found = false
      for (let a = 0; a < 360; a += 10) {
        const x = Math.round(sx + Math.cos((a * Math.PI) / 180) * r)
        const y = Math.round(sy + Math.sin((a * Math.PI) / 180) * r)
        if (x >= 0 && y >= 0 && x < w && y < h && dark(x, y)) {
          sx = x; sy = y; found = true; break
        }
      }
      if (found) break
    }
  }
  const mask = new Uint8Array(w * h)
  const q = [[sx, sy]]
  mask[sy * w + sx] = 1
  let minX = sx; let minY = sy; let maxX = sx; let maxY = sy
  while (q.length) {
    const [x, y] = q.pop()
    if (!dark(x, y)) { mask[y * w + x] = 0; continue }
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
  const inset = (p, amt = 0.03) => ({
    x: Math.round(p.x + (cx - p.x) * amt),
    y: Math.round(p.y + (cy - p.y) * amt)
  })
  return {
    w,
    h,
    bbox: { left: minX, top: minY, width: maxX - minX + 1, height: maxY - minY + 1 },
    quad: { tl: inset(tl), tr: inset(tr), br: inset(br), bl: inset(bl) }
  }
}

async function warpShotToQuad (shotPath, shellW, shellH, quad, srcW, srcH) {
  const shot = await sharp(shotPath)
    .resize(srcW, srcH, { fit: 'cover', position: 'north' })
    .modulate({ brightness: 1.05, saturation: 1.06 })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })

  const src = shot.data
  const sw = shot.info.width
  const sh = shot.info.height
  const sc = shot.info.channels
  const pmap = PerspT(
    [quad.tl.x, quad.tl.y, quad.tr.x, quad.tr.y, quad.br.x, quad.br.y, quad.bl.x, quad.bl.y],
    [0, 0, sw, 0, sw, sh, 0, sh]
  )

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
      const [sxu, syu] = pmap.transform(x, y)
      if (sxu < -1 || syu < -1 || sxu > sw || syu > sh) continue
      const pix = sample(
        Math.max(0, Math.min(sw - 1.001, sxu)),
        Math.max(0, Math.min(sh - 1.001, syu))
      )
      const oi = (y * shellW + x) * 4
      out[oi] = pix[0]; out[oi + 1] = pix[1]; out[oi + 2] = pix[2]; out[oi + 3] = 255
    }
  }

  const base = await sharp(out, { raw: { width: shellW, height: shellH, channels: 4 } }).png().toBuffer()
  const glass = Buffer.from(`
    <svg width="${shellW}" height="${shellH}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="g" x1="0" y1="0" x2="0.5" y2="1">
          <stop offset="0%" stop-color="#fff" stop-opacity="0.12"/>
          <stop offset="30%" stop-color="#fff" stop-opacity="0.02"/>
          <stop offset="100%" stop-color="#4fc3f7" stop-opacity="0.04"/>
        </linearGradient>
        <linearGradient id="edge" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stop-color="#000" stop-opacity="0.3"/>
          <stop offset="7%" stop-color="#000" stop-opacity="0"/>
          <stop offset="93%" stop-color="#000" stop-opacity="0"/>
          <stop offset="100%" stop-color="#000" stop-opacity="0.3"/>
        </linearGradient>
      </defs>
      <polygon points="${tl.x},${tl.y} ${tr.x},${tr.y} ${br.x},${br.y} ${bl.x},${bl.y}" fill="url(#g)"/>
      <polygon points="${tl.x},${tl.y} ${tr.x},${tr.y} ${br.x},${br.y} ${bl.x},${bl.y}" fill="url(#edge)"/>
    </svg>`)

  return sharp(base).composite([{ input: glass, blend: 'over' }]).png().toBuffer()
}

async function makeReflection (buf, maxH = 100, opacity = 0.25) {
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
          <stop offset="55%" stop-color="#fff" stop-opacity="0"/>
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

async function main () {
  const shell = join(DIR, 'phone-portrait-shell.png')
  const meta = await sharp(shell).metadata()
  const det = await detectScreenQuad(
    shell,
    { x: Math.floor(meta.width / 2), y: Math.floor(meta.height * 0.5) },
    40
  )
  console.log('phone quad', det.quad)

  const warped = await warpShotToQuad(
    join(DIR, 'shot-phone-camera.png'),
    det.w,
    det.h,
    det.quad,
    720,
    1280
  )
  const filled = await sharp(shell)
    .composite([{ input: warped, left: 0, top: 0 }])
    .png()
    .toBuffer()

  // Keep phone body with geometric rounded mask (silver frame survives)
  const padX = Math.round(det.bbox.width * 0.14)
  const padY = Math.round(det.bbox.height * 0.05)
  const bx = Math.max(0, det.bbox.left - padX)
  const by = Math.max(0, det.bbox.top - padY)
  const bw = Math.min(det.w - bx, det.bbox.width + padX * 2)
  const bh = Math.min(det.h - by, det.bbox.height + padY * 2)
  const rx = Math.round(Math.min(bw, bh) * 0.13)
  const bodyMask = Buffer.from(`
    <svg width="${det.w}" height="${det.h}" xmlns="http://www.w3.org/2000/svg">
      <rect x="${bx}" y="${by}" width="${bw}" height="${bh}" rx="${rx}" ry="${rx}" fill="#fff"/>
    </svg>`)

  let phone = await sharp(filled)
    .composite([{ input: bodyMask, blend: 'dest-in' }])
    .png()
    .toBuffer()
  phone = await sharp(phone).trim({ threshold: 5 }).resize({ height: 560 }).png().toBuffer()
  writeFileSync(join(DIR, '_debug-phone.png'), phone)

  const laptop = await sharp(join(DIR, '_debug-laptop.png')).png().toBuffer()
  const tablet = await sharp(join(DIR, '_debug-tablet.png')).png().toBuffer()
  const lapM = await sharp(laptop).metadata()
  const tabM = await sharp(tablet).metadata()
  const phoM = await sharp(phone).metadata()
  console.log('sizes', lapM.width, lapM.height, tabM.width, tabM.height, phoM.width, phoM.height)

  const logo = await sharp(join(process.cwd(), 'public', 'icons', 'icon-192x192.png'))
    .resize(78, 78)
    .composite([{
      input: Buffer.from('<svg width="78" height="78"><rect width="78" height="78" rx="18" fill="#fff"/></svg>'),
      blend: 'dest-in'
    }])
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
        <radialGradient id="v" cx="48%" cy="40%" r="75%">
          <stop offset="0%" stop-color="#000" stop-opacity="0"/>
          <stop offset="100%" stop-color="#000" stop-opacity="0.82"/>
        </radialGradient>
        <linearGradient id="top" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#01040a" stop-opacity="0.9"/>
          <stop offset="100%" stop-color="#01040a" stop-opacity="0"/>
        </linearGradient>
        <linearGradient id="bot" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#01040a" stop-opacity="0"/>
          <stop offset="100%" stop-color="#01040a" stop-opacity="0.95"/>
        </linearGradient>
        <linearGradient id="cyan" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stop-color="#4fc3f7" stop-opacity="0"/>
          <stop offset="25%" stop-color="#4fc3f7" stop-opacity="1"/>
          <stop offset="100%" stop-color="#4fc3f7" stop-opacity="0"/>
        </linearGradient>
        <linearGradient id="gl" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#0c2038" stop-opacity="0.78"/>
          <stop offset="100%" stop-color="#061018" stop-opacity="0.5"/>
        </linearGradient>
        <filter id="glow"><feGaussianBlur stdDeviation="20"/></filter>
      </defs>
      <rect width="${W}" height="${H}" fill="url(#v)"/>
      <rect width="${W}" height="170" fill="url(#top)"/>
      <rect y="930" width="${W}" height="150" fill="url(#bot)"/>
      <ellipse cx="1120" cy="900" rx="100" ry="28" fill="#4fc3f7" opacity="0.07" filter="url(#glow)"/>
      <rect x="52" y="28" width="630" height="126" rx="20" fill="url(#gl)"
        stroke="rgba(79,195,247,0.28)" stroke-width="1.2"/>
      <rect x="156" y="118" width="330" height="2.5" fill="url(#cyan)"/>
      <text x="156" y="82" fill="#fff" font-family="Segoe UI, Helvetica Neue, Arial, sans-serif"
        font-size="50" font-weight="800" letter-spacing="2">SIDI-E</text>
      <text x="156" y="108" fill="#9ed6f5" font-family="Segoe UI, Helvetica Neue, Arial, sans-serif"
        font-size="13" letter-spacing="3.6">SISTEMA DE INSPEÇÃO DE EPIS</text>
      <text x="960" y="1032" text-anchor="middle" fill="rgba(255,255,255,0.85)"
        font-family="Segoe UI, Helvetica Neue, Arial, sans-serif" font-size="18" letter-spacing="1.4">
        Gestão administrativa  ·  PWA em campo  ·  Offline-first
      </text>
    </svg>`)

  const lapX = 20
  const lapY = 195
  const tabX = 1340
  const tabY = 140
  const phoX = 1040
  const phoY = 360

  const lapRef = await makeReflection(laptop)
  const tabRef = await makeReflection(tablet)
  const phoRef = await makeReflection(phone, 95, 0.24)
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
  console.log('✓ phone fixed + camera EPI')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
