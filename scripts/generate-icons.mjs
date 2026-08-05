/**
 * Gera ícones PWA oficiais SIDI-E
 * - any: logo com padding confortável (sem recorte em cantos arredondados)
 * - maskable: logo na safe zone (~60%) sobre fundo da marca
 */
import sharp from 'sharp'
import { mkdirSync, writeFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const iconsDir = join(__dirname, '..', 'public', 'icons')
const srcLogo = join(iconsDir, 'logo-source.png')

const BRAND_BG = { r: 15, g: 52, b: 96, alpha: 1 } // #0f3460
const SIZES = [48, 96, 128, 192, 256, 384, 512]

mkdirSync(iconsDir, { recursive: true })

async function extractLogo (size) {
  // Remove fundo preto quase puro → transparente
  const { data, info } = await sharp(srcLogo)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i]
    const g = data[i + 1]
    const b = data[i + 2]
    // Preto / near-black vira transparente
    if (r < 28 && g < 28 && b < 28) {
      data[i + 3] = 0
    }
  }

  return sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } })
    .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer()
}

async function makeAnyIcon (size) {
  // Logo ocupa ~72% — sobra margem para máscaras arredondadas do Android
  const logoSize = Math.round(size * 0.72)
  const logo = await extractLogo(logoSize)
  const offset = Math.round((size - logoSize) / 2)

  return sharp({
    create: { width: size, height: size, channels: 4, background: BRAND_BG }
  })
    .composite([{ input: logo, left: offset, top: offset }])
    .png()
    .toBuffer()
}

async function makeMaskableIcon (size) {
  // Safe zone maskable: conteúdo no centro ~60%
  const logoSize = Math.round(size * 0.58)
  const logo = await extractLogo(logoSize)
  const offset = Math.round((size - logoSize) / 2)

  return sharp({
    create: { width: size, height: size, channels: 4, background: BRAND_BG }
  })
    .composite([{ input: logo, left: offset, top: offset }])
    .png()
    .toBuffer()
}

async function main () {
  for (const size of SIZES) {
    const anyBuf = await makeAnyIcon(size)
    writeFileSync(join(iconsDir, `icon-${size}x${size}.png`), anyBuf)

    if (size === 192 || size === 512) {
      const maskBuf = await makeMaskableIcon(size)
      writeFileSync(join(iconsDir, `icon-${size}x${size}-maskable.png`), maskBuf)
    }

    // Favicons espelhados
    if ([16, 32, 96, 128].includes(size) || size === 192 || size === 512) {
      writeFileSync(join(iconsDir, `favicon-${size}x${size}.png`), anyBuf)
    }

    console.log(`✓ ${size}x${size}`)
  }

  // favicon 16/32 extras a partir do 48
  for (const size of [16, 32]) {
    const buf = await makeAnyIcon(size)
    writeFileSync(join(iconsDir, `icon-${size}x${size}.png`), buf)
    writeFileSync(join(iconsDir, `favicon-${size}x${size}.png`), buf)
    console.log(`✓ ${size}x${size}`)
  }

  // ICO simples (usa 32px png como favicon.ico fallback — browsers aceitam png renamed em muitos casos;
  // geramos um png-based ico via 32px)
  const ico32 = await makeAnyIcon(32)
  writeFileSync(join(__dirname, '..', 'public', 'favicon.ico'), ico32)

  console.log('Ícones SIDI-E gerados com fundo #0f3460 e safe zone.')
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
