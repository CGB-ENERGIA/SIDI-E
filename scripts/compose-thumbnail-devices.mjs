/**
 * Thumbnail com dispositivos REALISTAS + screenshots reais do SIDI-E
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

/** MacBook-style laptop: lid + aluminum chin + camera */
async function buildLaptop (src, sw = 1020, sh = 638) {
  const bezelT = 14
  const bezelX = 18
  const bezelB = 18
  const camH = 10
  const chin = 42
  const lidW = sw + bezelX * 2
  const lidH = sh + bezelT + bezelB + camH
  const baseW = Math.round(lidW * 1.06)
  const baseH = 56
  const hingeGap = 3
  const ow = baseW
  const oh = lidH + hingeGap + baseH
  const lidX = Math.round((baseW - lidW) / 2)

  const screen = await sharp(src)
    .resize(sw, sh, { fit: 'cover', position: 'north' })
    .composite([{ input: await roundMask(sw, sh, 4), blend: 'dest-in' }])
    .png()
    .toBuffer()

  const frame = Buffer.from(`
    <svg width="${ow}" height="${oh}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="lid" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#3a4150"/>
          <stop offset="18%" stop-color="#1c212c"/>
          <stop offset="100%" stop-color="#10141c"/>
        </linearGradient>
        <linearGradient id="lidEdge" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stop-color="#8a96aa" stop-opacity="0.55"/>
          <stop offset="50%" stop-color="#4a5568" stop-opacity="0.2"/>
          <stop offset="100%" stop-color="#9aa6ba" stop-opacity="0.45"/>
        </linearGradient>
        <linearGradient id="baseMetal" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#c5ccd8"/>
          <stop offset="12%" stop-color="#9aa3b2"/>
          <stop offset="55%" stop-color="#6e7788"/>
          <stop offset="100%" stop-color="#3d4452"/>
        </linearGradient>
        <linearGradient id="baseTop" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#d8dee8"/>
          <stop offset="100%" stop-color="#8b93a3"/>
        </linearGradient>
        <linearGradient id="keys" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#2a303c"/>
          <stop offset="100%" stop-color="#151920"/>
        </linearGradient>
        <linearGradient id="glass" x1="0.05" y1="0" x2="0.55" y2="1">
          <stop offset="0%" stop-color="#fff" stop-opacity="0.14"/>
          <stop offset="28%" stop-color="#fff" stop-opacity="0.03"/>
          <stop offset="100%" stop-color="#4fc3f7" stop-opacity="0.04"/>
        </linearGradient>
        <filter id="soft"><feGaussianBlur stdDeviation="1.2"/></filter>
      </defs>

      <!-- Lid body -->
      <rect x="${lidX}" y="0" width="${lidW}" height="${lidH}" rx="14" ry="14" fill="url(#lid)"/>
      <rect x="${lidX + 0.8}" y="0.8" width="${lidW - 1.6}" height="${lidH - 1.6}" rx="13" ry="13"
        fill="none" stroke="url(#lidEdge)" stroke-width="1.6"/>

      <!-- Camera bar / notch area -->
      <rect x="${lidX + bezelX}" y="${bezelT}" width="${sw}" height="${camH}" fill="#0a0c10"/>
      <circle cx="${lidX + lidW / 2}" cy="${bezelT + camH / 2}" r="3.2" fill="#1a2030"/>
      <circle cx="${lidX + lidW / 2}" cy="${bezelT + camH / 2}" r="1.5" fill="#3d7ea8"/>

      <!-- Screen glass highlight -->
      <rect x="${lidX + bezelX}" y="${bezelT + camH}" width="${sw}" height="${sh}" rx="3" fill="url(#glass)"/>

      <!-- Hinge -->
      <rect x="${lidX + 40}" y="${lidH - 2}" width="${lidW - 80}" height="${hingeGap + 4}" rx="2" fill="#1a1e28"/>

      <!-- Base / keyboard deck -->
      <path d="M 8 ${lidH + hingeGap}
               L ${ow - 8} ${lidH + hingeGap}
               L ${ow - 2} ${oh - 6}
               Q ${ow / 2} ${oh + 2} 2 ${oh - 6} Z"
            fill="url(#baseMetal)"/>
      <rect x="${Math.round(ow * 0.08)}" y="${lidH + hingeGap + 8}" width="${Math.round(ow * 0.84)}" height="${baseH - 22}"
            rx="4" fill="url(#keys)" opacity="0.92"/>
      <!-- trackpad -->
      <rect x="${Math.round(ow * 0.38)}" y="${lidH + hingeGap + baseH - 20}" width="${Math.round(ow * 0.24)}" height="10"
            rx="2.5" fill="#5a6578" opacity="0.55"/>
      <!-- front lip highlight -->
      <rect x="10" y="${oh - 7}" width="${ow - 20}" height="2" rx="1" fill="#e8eef8" opacity="0.35"/>
    </svg>`)

  const device = await sharp(frame)
    .composite([{
      input: screen,
      left: lidX + bezelX,
      top: bezelT + camH
    }])
    .png()
    .toBuffer()

  // Re-apply glass glare on top of screen
  const glare = Buffer.from(`
    <svg width="${ow}" height="${oh}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="g" x1="0" y1="0" x2="0.4" y2="1">
          <stop offset="0%" stop-color="#fff" stop-opacity="0.11"/>
          <stop offset="35%" stop-color="#fff" stop-opacity="0"/>
        </linearGradient>
      </defs>
      <rect x="${lidX + bezelX}" y="${bezelT + camH}" width="${sw}" height="${sh}" rx="3" fill="url(#g)"/>
    </svg>`)

  return sharp(device).composite([{ input: glare, blend: 'over' }]).png().toBuffer()
}

/** iPad-style portrait tablet */
async function buildTablet (src, sw = 348, sh = 520) {
  const padX = 22
  const padTop = 36
  const padBot = 36
  const ow = sw + padX * 2
  const oh = sh + padTop + padBot

  const screen = await sharp(src)
    .resize(sw, sh, { fit: 'cover', position: 'centre' })
    .composite([{ input: await roundMask(sw, sh, 8), blend: 'dest-in' }])
    .png()
    .toBuffer()

  const frame = Buffer.from(`
    <svg width="${ow}" height="${oh}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="body" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#4a5160"/>
          <stop offset="35%" stop-color="#1e2430"/>
          <stop offset="100%" stop-color="#0c1018"/>
        </linearGradient>
        <linearGradient id="rim" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#c5d0e0" stop-opacity="0.7"/>
          <stop offset="40%" stop-color="#6a7588" stop-opacity="0.25"/>
          <stop offset="100%" stop-color="#2a3344" stop-opacity="0.5"/>
        </linearGradient>
        <linearGradient id="glass" x1="0" y1="0" x2="0.35" y2="1">
          <stop offset="0%" stop-color="#fff" stop-opacity="0.12"/>
          <stop offset="40%" stop-color="#fff" stop-opacity="0"/>
          <stop offset="100%" stop-color="#e94560" stop-opacity="0.05"/>
        </linearGradient>
      </defs>

      <!-- Outer aluminum body -->
      <rect x="1" y="1" width="${ow - 2}" height="${oh - 2}" rx="36" ry="36" fill="url(#body)"/>
      <rect x="1" y="1" width="${ow - 2}" height="${oh - 2}" rx="36" ry="36"
        fill="none" stroke="url(#rim)" stroke-width="2.2"/>

      <!-- Inner dark inset -->
      <rect x="8" y="8" width="${ow - 16}" height="${oh - 16}" rx="30" ry="30" fill="#0a0c12"/>

      <!-- Front camera -->
      <circle cx="${ow / 2}" cy="${padTop * 0.48}" r="5" fill="#151a24"/>
      <circle cx="${ow / 2}" cy="${padTop * 0.48}" r="2.4" fill="#2a6080"/>
      <circle cx="${ow / 2 + 14}" cy="${padTop * 0.48}" r="2" fill="#1a2030"/>

      <!-- Home indicator -->
      <rect x="${ow / 2 - 28}" y="${oh - padBot * 0.45}" width="56" height="4.5" rx="2.2" fill="#3a4458" opacity="0.85"/>

      <!-- Side buttons -->
      <rect x="${ow - 3}" y="${oh * 0.22}" width="4" height="36" rx="1.5" fill="#8a94a8"/>
      <rect x="${ow - 3}" y="${oh * 0.32}" width="4" height="52" rx="1.5" fill="#8a94a8"/>
      <rect x="-1" y="${oh * 0.28}" width="4" height="48" rx="1.5" fill="#6a7488"/>

      <!-- Glass glare -->
      <rect x="${padX}" y="${padTop}" width="${sw}" height="${sh}" rx="8" fill="url(#glass)"/>
    </svg>`)

  const device = await sharp(frame)
    .composite([{ input: screen, left: padX, top: padTop }])
    .png()
    .toBuffer()

  const glare = Buffer.from(`
    <svg width="${ow}" height="${oh}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="g" x1="0" y1="0" x2="0.3" y2="1">
          <stop offset="0%" stop-color="#fff" stop-opacity="0.1"/>
          <stop offset="40%" stop-color="#fff" stop-opacity="0"/>
        </linearGradient>
      </defs>
      <rect x="${padX}" y="${padTop}" width="${sw}" height="${sh}" rx="8" fill="url(#g)"/>
    </svg>`)

  return sharp(device).composite([{ input: glare, blend: 'over' }]).png().toBuffer()
}

/** Landscape phone / compact tablet */
async function buildPhoneLandscape (src, sw = 400, sh = 248) {
  const padX = 16
  const padY = 14
  const ow = sw + padX * 2
  const oh = sh + padY * 2

  const screen = await sharp(src)
    .resize(sw, sh, { fit: 'cover', position: 'centre' })
    .composite([{ input: await roundMask(sw, sh, 10), blend: 'dest-in' }])
    .png()
    .toBuffer()

  const frame = Buffer.from(`
    <svg width="${ow}" height="${oh}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="body" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#3e4656"/>
          <stop offset="40%" stop-color="#1a2030"/>
          <stop offset="100%" stop-color="#0a0e16"/>
        </linearGradient>
        <linearGradient id="rim" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#b8c4d8" stop-opacity="0.65"/>
          <stop offset="100%" stop-color="#2a3344" stop-opacity="0.45"/>
        </linearGradient>
        <linearGradient id="glass" x1="0" y1="0" x2="0.4" y2="1">
          <stop offset="0%" stop-color="#fff" stop-opacity="0.13"/>
          <stop offset="45%" stop-color="#fff" stop-opacity="0"/>
        </linearGradient>
      </defs>

      <rect x="1" y="1" width="${ow - 2}" height="${oh - 2}" rx="28" ry="28" fill="url(#body)"/>
      <rect x="1" y="1" width="${ow - 2}" height="${oh - 2}" rx="28" ry="28"
        fill="none" stroke="url(#rim)" stroke-width="2"/>
      <rect x="6" y="6" width="${ow - 12}" height="${oh - 12}" rx="22" ry="22" fill="#080a10"/>

      <!-- Landscape Dynamic Island / camera -->
      <rect x="${padX * 0.35}" y="${oh / 2 - 10}" width="8" height="20" rx="4" fill="#12161e"/>
      <circle cx="${padX * 0.55}" cy="${oh / 2}" r="3" fill="#1e6088"/>

      <!-- Side button -->
      <rect x="${ow * 0.28}" y="-1" width="40" height="3.5" rx="1.5" fill="#8a94a8"/>

      <rect x="${padX}" y="${padY}" width="${sw}" height="${sh}" rx="10" fill="url(#glass)"/>
    </svg>`)

  const device = await sharp(frame)
    .composite([{ input: screen, left: padX, top: padY }])
    .png()
    .toBuffer()

  const glare = Buffer.from(`
    <svg width="${ow}" height="${oh}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="g" x1="0" y1="0" x2="0.35" y2="1">
          <stop offset="0%" stop-color="#fff" stop-opacity="0.1"/>
          <stop offset="40%" stop-color="#fff" stop-opacity="0"/>
        </linearGradient>
      </defs>
      <rect x="${padX}" y="${padY}" width="${sw}" height="${sh}" rx="10" fill="url(#g)"/>
    </svg>`)

  return sharp(device).composite([{ input: glare, blend: 'over' }]).png().toBuffer()
}

async function makeReflection (deviceBuf, maxH = 160, opacity = 0.34) {
  const meta = await sharp(deviceBuf).metadata()
  const rw = meta.width
  const rh = Math.min(maxH, Math.floor(meta.height * 0.32))
  const flipped = await sharp(deviceBuf)
    .extract({ left: 0, top: meta.height - rh, width: rw, height: rh })
    .flip()
    .modulate({ brightness: 0.5, saturation: 0.85 })
    .png()
    .toBuffer()

  const fade = Buffer.from(`
    <svg width="${rw}" height="${rh}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="f" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#fff" stop-opacity="${opacity}"/>
          <stop offset="50%" stop-color="#fff" stop-opacity="${opacity * 0.3}"/>
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

async function contactShadow (w, depth = 36) {
  const pad = 70
  const svg = Buffer.from(`
    <svg width="${w + pad * 2}" height="${depth + pad * 2}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <filter id="f"><feGaussianBlur stdDeviation="18"/></filter>
      </defs>
      <ellipse cx="${pad + w / 2}" cy="${pad + depth * 0.55}" rx="${w * 0.38}" ry="${depth * 0.45}"
        fill="rgba(0,0,0,0.78)" filter="url(#f)"/>
    </svg>`)
  return { buf: await sharp(svg).png().toBuffer(), pad, h: depth + pad * 2 }
}

/** Subtle perspective — keep readable, slight lean */
async function lean (buf, skewX = 0.035, skewY = -0.008) {
  const meta = await sharp(buf).metadata()
  const padX = Math.ceil(Math.abs(skewX) * meta.height) + 12
  const padY = Math.ceil(Math.abs(skewY) * meta.width) + 12
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

async function main () {
  let laptop = await buildLaptop(join(DIR, 'shot-desktop-admin.png'))
  let tablet = await buildTablet(join(DIR, 'shot-tablet-login.png'))
  let phone = await buildPhoneLandscape(join(DIR, 'shot-desktop-login.png'))

  laptop = await lean(laptop, 0.038, -0.01)
  tablet = await lean(tablet, -0.032, 0.014)
  phone = await lean(phone, 0.028, -0.006)

  const lapM = await sharp(laptop).metadata()
  const tabM = await sharp(tablet).metadata()
  const phoM = await sharp(phone).metadata()

  const lapRef = await makeReflection(laptop, 130, 0.3)
  const tabRef = await makeReflection(tablet, 110, 0.28)
  const phoRef = await makeReflection(phone, 80, 0.22)

  const logo = await sharp(join(process.cwd(), 'public', 'icons', 'icon-192x192.png'))
    .resize(78, 78)
    .composite([{ input: await roundMask(78, 78, 18), blend: 'dest-in' }])
    .png()
    .toBuffer()

  const bgPhoto = await sharp(join(DIR, 'bg-cinematic.png'))
    .resize(W, H, { fit: 'cover', position: 'south' })
    .modulate({ brightness: 0.66, saturation: 1.18 })
    .png()
    .toBuffer()

  const overlays = Buffer.from(`
    <svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="vignette" cx="48%" cy="38%" r="76%">
          <stop offset="0%" stop-color="#000" stop-opacity="0"/>
          <stop offset="100%" stop-color="#000" stop-opacity="0.8"/>
        </radialGradient>
        <linearGradient id="topFade" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#01040a" stop-opacity="0.9"/>
          <stop offset="100%" stop-color="#01040a" stop-opacity="0"/>
        </linearGradient>
        <linearGradient id="botFade" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#01040a" stop-opacity="0"/>
          <stop offset="100%" stop-color="#01040a" stop-opacity="0.94"/>
        </linearGradient>
        <linearGradient id="cyanBeam" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stop-color="#4fc3f7" stop-opacity="0"/>
          <stop offset="25%" stop-color="#4fc3f7" stop-opacity="1"/>
          <stop offset="100%" stop-color="#4fc3f7" stop-opacity="0"/>
        </linearGradient>
        <linearGradient id="glass" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#0c2038" stop-opacity="0.75"/>
          <stop offset="100%" stop-color="#061018" stop-opacity="0.48"/>
        </linearGradient>
        <filter id="glow"><feGaussianBlur stdDeviation="24"/></filter>
      </defs>
      <rect width="${W}" height="${H}" fill="url(#vignette)"/>
      <rect width="${W}" height="190" fill="url(#topFade)"/>
      <rect y="910" width="${W}" height="170" fill="url(#botFade)"/>
      <circle cx="420" cy="320" r="240" fill="#4fc3f7" opacity="0.09" filter="url(#glow)"/>
      <circle cx="1580" cy="560" r="220" fill="#e94560" opacity="0.11" filter="url(#glow)"/>
      <!-- screen light spills on table -->
      <ellipse cx="620" cy="880" rx="280" ry="40" fill="#4fc3f7" opacity="0.07" filter="url(#glow)"/>
      <ellipse cx="1520" cy="860" rx="140" ry="36" fill="#4fc3f7" opacity="0.06" filter="url(#glow)"/>
      <rect x="52" y="30" width="630" height="128" rx="20" fill="url(#glass)"
        stroke="rgba(79,195,247,0.28)" stroke-width="1.2"/>
      <rect x="156" y="120" width="330" height="2.5" fill="url(#cyanBeam)"/>
      <text x="156" y="84" fill="#fff" font-family="Segoe UI, Helvetica Neue, Arial, sans-serif"
        font-size="50" font-weight="800" letter-spacing="2">SIDI-E</text>
      <text x="156" y="110" fill="#9ed6f5" font-family="Segoe UI, Helvetica Neue, Arial, sans-serif"
        font-size="13" letter-spacing="3.6">SISTEMA DE INSPEÇÃO DE EPIS</text>
      <text x="960" y="1034" text-anchor="middle" fill="rgba(255,255,255,0.84)"
        font-family="Segoe UI, Helvetica Neue, Arial, sans-serif" font-size="18" letter-spacing="1.4">
        Gestão administrativa  ·  PWA em campo  ·  Offline-first
      </text>
    </svg>`)

  // Devices sitting on the table plane
  const lapX = 48
  const lapY = 168
  const tabX = 1355
  const tabY = 168
  const phoX = 1040
  const phoY = 640

  const lapSh = await contactShadow(lapM.width, 40)
  const tabSh = await contactShadow(tabM.width, 34)
  const phoSh = await contactShadow(phoM.width, 28)

  const out = await sharp(bgPhoto)
    .composite([
      { input: overlays, left: 0, top: 0 },
      { input: lapSh.buf, left: lapX - lapSh.pad + 20, top: lapY + lapM.height - 50 },
      { input: tabSh.buf, left: tabX - tabSh.pad + 10, top: tabY + tabM.height - 42 },
      { input: phoSh.buf, left: phoX - phoSh.pad + 8, top: phoY + phoM.height - 30 },
      { input: lapRef, left: lapX + 12, top: lapY + lapM.height - 18 },
      { input: tabRef, left: tabX + 8, top: tabY + tabM.height - 14 },
      { input: phoRef, left: phoX + 6, top: phoY + phoM.height - 10 },
      { input: laptop, left: lapX, top: lapY },
      { input: tablet, left: tabX, top: tabY },
      { input: phone, left: phoX, top: phoY },
      { input: logo, left: 68, top: 48 }
    ])
    .jpeg({ quality: 94, mozjpeg: true })
    .toBuffer()

  const png = await sharp(out).png().toBuffer()
  writeFileSync(join(DIR, 'sidie-thumbnail-divulgacao-real.png'), png)
  writeFileSync(join(DIR, 'sidie-thumbnail-divulgacao-real.jpg'), out)
  // also promote as main divulgacao for consistency with what user is refining
  writeFileSync(join(DIR, 'sidie-thumbnail-divulgacao.png'), png)
  writeFileSync(join(DIR, 'sidie-thumbnail-divulgacao.jpg'), out)
  console.log('✓ devices realistic → sidie-thumbnail-divulgacao(-real).png / .jpg')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
