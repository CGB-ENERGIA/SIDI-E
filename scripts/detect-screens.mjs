import sharp from 'sharp'
import { join } from 'path'

const DIR = join(process.cwd(), 'public', 'marketing')

async function floodScreen (path, seed, thresh = 22) {
  const { data, info } = await sharp(path).raw().ensureAlpha().toBuffer({ resolveWithObject: true })
  const { width: w, height: h, channels: c } = info
  const dark = (x, y) => {
    const i = (y * w + x) * c
    return (data[i] + data[i + 1] + data[i + 2]) / 3 < thresh && data[i + 3] > 200
  }
  const seen = new Uint8Array(w * h)
  const q = [[seed.x, seed.y]]
  seen[seed.y * w + seed.x] = 1
  let minX = seed.x; let minY = seed.y; let maxX = seed.x; let maxY = seed.y; let count = 0
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
  return { left: minX, top: minY, width: maxX - minX + 1, height: maxY - minY + 1, count, w, h }
}

async function overlay (src, box, out) {
  const svg = Buffer.from(`
    <svg width="${box.w}" height="${box.h}" xmlns="http://www.w3.org/2000/svg">
      <rect x="${box.left}" y="${box.top}" width="${box.width}" height="${box.height}"
        fill="rgba(0,255,100,0.15)" stroke="#00ff66" stroke-width="4"/>
    </svg>`)
  await sharp(src).composite([{ input: svg, left: 0, top: 0 }]).png().toFile(out)
}

const lap = await floodScreen(join(DIR, 'device-laptop-shell.png'), { x: 768, y: 350 }, 20)
const tab = await floodScreen(join(DIR, 'device-tablet-shell.png'), { x: 512, y: 700 }, 20)
const pho = await floodScreen(join(DIR, 'device-phone-shell.png'), { x: 800, y: 500 }, 20)
console.log('laptop', lap)
console.log('tablet', tab)
console.log('phone', pho)
await overlay(join(DIR, 'device-laptop-shell.png'), lap, join(DIR, '_box-laptop.png'))
await overlay(join(DIR, 'device-tablet-shell.png'), tab, join(DIR, '_box-tablet.png'))
await overlay(join(DIR, 'device-phone-shell.png'), pho, join(DIR, '_box-phone.png'))
console.log('ok')
