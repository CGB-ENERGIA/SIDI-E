/**
 * Monta thumbnail de divulgação SIDI-E com screenshots reais
 * Notebook (admin) + Tablet (PWA login) + painel de login desktop
 */
import sharp from 'sharp'
import { join } from 'path'
import { writeFileSync } from 'fs'

const DIR = join(process.cwd(), 'public', 'marketing')
const W = 1920
const H = 1080

const BG = { r: 8, g: 18, b: 36, alpha: 1 }

async function roundedRectMask (w, h, r) {
  const svg = `
    <svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
      <rect x="0" y="0" width="${w}" height="${h}" rx="${r}" ry="${r}" fill="white"/>
    </svg>`
  return Buffer.from(svg)
}

async function deviceFrame ({ screenBuf, screenW, screenH, padX, padY, radius, bezel }) {
  const outerW = screenW + padX * 2
  const outerH = screenH + padY * 2
  const screen = await sharp(screenBuf)
    .resize(screenW, screenH, { fit: 'cover' })
    .composite([{
      input: await roundedRectMask(screenW, screenH, Math.max(8, radius - 6)),
      blend: 'dest-in'
    }])
    .png()
    .toBuffer()

  const frameSvg = `
    <svg width="${outerW}" height="${outerH}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#2a2f3a"/>
          <stop offset="100%" stop-color="#12151c"/>
        </linearGradient>
        <filter id="sh" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="18" stdDeviation="24" flood-color="#000" flood-opacity="0.55"/>
        </filter>
      </defs>
      <rect x="2" y="2" width="${outerW - 4}" height="${outerH - 4}" rx="${radius}" ry="${radius}"
        fill="url(#g)" stroke="#3a4250" stroke-width="2" filter="url(#sh)"/>
      ${bezel === 'laptop' ? `
        <rect x="${outerW * 0.18}" y="${outerH - padY + 10}" width="${outerW * 0.64}" height="10" rx="3" fill="#0c0e14"/>
      ` : ''}
      ${bezel === 'tablet' ? `
        <circle cx="${outerW / 2}" cy="${padY / 2}" r="4" fill="#3a4250"/>
      ` : ''}
    </svg>`

  return sharp(Buffer.from(frameSvg))
    .composite([{ input: screen, left: padX, top: padY }])
    .png()
    .toBuffer()
}

async function main () {
  const admin = join(DIR, 'shot-desktop-admin.png')
  const deskLogin = join(DIR, 'shot-desktop-login.png')
  const tabLogin = join(DIR, 'shot-tablet-login.png')

  // Notebook — painel admin
  const laptop = await deviceFrame({
    screenBuf: admin,
    screenW: 980,
    screenH: 612,
    padX: 18,
    padY: 16,
    radius: 18,
    bezel: 'laptop'
  })

  // Tablet — login PWA
  const tablet = await deviceFrame({
    screenBuf: tabLogin,
    screenW: 360,
    screenH: 520,
    padX: 16,
    padY: 28,
    radius: 28,
    bezel: 'tablet'
  })

  // Card flutuante — login desktop (tela real recortada/arredondada)
  const loginCard = await sharp(deskLogin)
    .resize(420, 300, { fit: 'cover', position: 'centre' })
    .composite([{
      input: await roundedRectMask(420, 300, 16),
      blend: 'dest-in'
    }])
    .png()
    .toBuffer()

  const loginFrameSvg = `
    <svg width="448" height="336" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <filter id="s" x="-25%" y="-25%" width="150%" height="150%">
          <feDropShadow dx="0" dy="14" stdDeviation="18" flood-color="#000" flood-opacity="0.5"/>
        </filter>
      </defs>
      <rect x="4" y="4" width="440" height="328" rx="18" fill="#1a2233" stroke="#4fc3f7" stroke-opacity="0.35" stroke-width="2" filter="url(#s)"/>
    </svg>`
  const loginPanel = await sharp(Buffer.from(loginFrameSvg))
    .composite([{ input: loginCard, left: 14, top: 14 }])
    .png()
    .toBuffer()

  // Fundo com glow da marca
  const bgSvg = `
    <svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="r1" cx="30%" cy="40%" r="55%">
          <stop offset="0%" stop-color="#1a4a7a"/>
          <stop offset="100%" stop-color="#081224" stop-opacity="0"/>
        </radialGradient>
        <radialGradient id="r2" cx="75%" cy="70%" r="45%">
          <stop offset="0%" stop-color="#4a1a2e" stop-opacity="0.55"/>
          <stop offset="100%" stop-color="#081224" stop-opacity="0"/>
        </radialGradient>
        <linearGradient id="base" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#07101f"/>
          <stop offset="100%" stop-color="#0f3460"/>
        </linearGradient>
      </defs>
      <rect width="${W}" height="${H}" fill="url(#base)"/>
      <rect width="${W}" height="${H}" fill="url(#r1)"/>
      <rect width="${W}" height="${H}" fill="url(#r2)"/>
      <text x="80" y="92" fill="#ffffff" font-family="Segoe UI, Arial, sans-serif" font-size="42" font-weight="700">SIDI-E</text>
      <text x="80" y="128" fill="#4fc3f7" font-family="Segoe UI, Arial, sans-serif" font-size="18" letter-spacing="3">SISTEMA DE INSPEÇÃO DE EPIS</text>
      <text x="80" y="1000" fill="rgba(255,255,255,0.45)" font-family="Segoe UI, Arial, sans-serif" font-size="16">Gestão administrativa  ·  PWA em campo  ·  Offline-first</text>
    </svg>`

  const laptopMeta = await sharp(laptop).metadata()
  const tabletMeta = await sharp(tablet).metadata()
  const loginMeta = await sharp(loginPanel).metadata()

  const out = await sharp(Buffer.from(bgSvg))
    .composite([
      // Notebook à esquerda
      { input: laptop, left: 70, top: 170 },
      // Tablet à direita
      { input: tablet, left: W - tabletMeta.width - 90, top: 200 },
      // Login desktop em destaque (sobreposto na diagonal)
      { input: loginPanel, left: 520, top: H - loginMeta.height - 70 }
    ])
    .png()
    .toBuffer()

  const dest = join(DIR, 'sidie-thumbnail-divulgacao.png')
  writeFileSync(dest, out)
  console.log('✓', dest, `(${laptopMeta.width}x${laptopMeta.height} laptop, ${tabletMeta.width}x${tabletMeta.height} tablet)`)
}

main().catch(e => {
  console.error(e)
  process.exit(1)
})
