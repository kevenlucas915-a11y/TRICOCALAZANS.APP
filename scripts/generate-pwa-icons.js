import fs from 'fs';
import path from 'path';
import { encode } from 'fast-png';

function clamp(v, min = 0, max = 1) {
  return Math.max(min, Math.min(max, v));
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function distSegment(px, py, ax, ay, bx, by) {
  const pax = px - ax;
  const pay = py - ay;
  const bax = bx - ax;
  const bay = by - ay;
  const h = clamp((pax * bax + pay * bay) / (bax * bax + bay * bay + 1e-9), 0, 1);
  const dx = pax - bax * h;
  const dy = pay - bay * h;
  return Math.hypot(dx, dy);
}

function distBox(px, py, bx, by, r) {
  const dx = Math.max(0, Math.abs(px) - bx);
  const dy = Math.max(0, Math.abs(py) - by);
  return Math.hypot(dx, dy) - r;
}

function renderIcon(size = 512, maskable = false) {
  const data = new Uint8Array(size * size * 4);
  const scale = size / 512;
  const cx = size / 2;
  const cy = size / 2;

  // Colors: TricoCalazans clinical teal branding
  const cBgTop = [15, 118, 110];      // #0f766e (Teal 700)
  const cBgMid = [17, 94, 89];       // #115e59 (Teal 800)
  const cBgBottom = [4, 47, 46];     // #042f2e (Teal 950)
  const cCyan = [45, 212, 191];      // #2dd4bf (Teal 400)
  const cWhite = [255, 255, 255];

  const cornerR = maskable ? 0 : 108 * scale;
  const boxHalf = 256 * scale - cornerR;

  for (let y = 0; y < size; y++) {
    const fy = y - cy;
    const ny = y / size;
    const rowOffset = y * size * 4;

    for (let x = 0; x < size; x++) {
      const fx = x - cx;
      const idx = rowOffset + x * 4;

      // 1. App Squircle Mask
      let bgAlpha = 1.0;
      if (!maskable) {
        const dBox = distBox(fx, fy, boxHalf, boxHalf, cornerR);
        bgAlpha = clamp(0.5 - dBox, 0, 1);
      }

      if (bgAlpha <= 0) {
        data[idx] = 0;
        data[idx + 1] = 0;
        data[idx + 2] = 0;
        data[idx + 3] = 0;
        continue;
      }

      // 2. Gradient Background
      const distC = Math.hypot(fx, fy);
      const gradT = clamp(ny * 0.8 + (distC / (size * 0.75)) * 0.25, 0, 1);
      let r = lerp(cBgTop[0], cBgBottom[0], gradT);
      let g = lerp(cBgTop[1], cBgBottom[1], gradT);
      let b = lerp(cBgTop[2], cBgBottom[2], gradT);

      // 3. Central Glow & Dermoscopy Reticle Rings
      const rOuter = 185 * scale;
      const rInner = 145 * scale;

      // Outer dashed/smooth ring
      const dRing1 = Math.abs(distC - rOuter) - 1.6 * scale;
      const ring1A = clamp(0.5 - dRing1, 0, 1) * 0.28;

      // Inner ring
      const dRing2 = Math.abs(distC - rInner) - 1.2 * scale;
      const ring2A = clamp(0.5 - dRing2, 0, 1) * 0.22;

      // Central optical glow
      const glow = Math.max(0, 1 - distC / (210 * scale)) * 0.25;
      r += cCyan[0] * glow;
      g += cCyan[1] * glow;
      b += cCyan[2] * glow;

      if (ring1A > 0) {
        r = lerp(r, cCyan[0], ring1A);
        g = lerp(g, cCyan[1], ring1A);
        b = lerp(b, cCyan[2], ring1A);
      }
      if (ring2A > 0) {
        r = lerp(r, cCyan[0], ring2A);
        g = lerp(g, cCyan[1], ring2A);
        b = lerp(b, cCyan[2], ring2A);
      }

      // Reticle Ticks
      const dTickN = distSegment(fx, fy, 0, -rOuter - 9 * scale, 0, -rOuter + 9 * scale) - 1.3 * scale;
      const dTickS = distSegment(fx, fy, 0, rOuter - 9 * scale, 0, rOuter + 9 * scale) - 1.3 * scale;
      const dTickW = distSegment(fx, fy, -rOuter - 9 * scale, 0, -rOuter + 9 * scale, 0) - 1.3 * scale;
      const dTickE = distSegment(fx, fy, rOuter - 9 * scale, 0, rOuter + 9 * scale, 0) - 1.3 * scale;
      const tickA = Math.max(
        clamp(0.5 - dTickN, 0, 1),
        clamp(0.5 - dTickS, 0, 1),
        clamp(0.5 - dTickW, 0, 1),
        clamp(0.5 - dTickE, 0, 1)
      ) * 0.5;

      if (tickA > 0) {
        r = lerp(r, cCyan[0], tickA);
        g = lerp(g, cCyan[1], tickA);
        b = lerp(b, cCyan[2], tickA);
      }

      // 4. Clinical Microscope Icon
      const th = 8 * scale;
      const dBase = distSegment(fx, fy, -90 * scale, 125 * scale, 90 * scale, 125 * scale) - th;
      const dStage = distSegment(fx, fy, -60 * scale, 60 * scale, 25 * scale, 60 * scale) - th * 0.9;

      const dArm1 = distSegment(fx, fy, 20 * scale, 125 * scale, 55 * scale, 90 * scale) - th;
      const dArm2 = distSegment(fx, fy, 55 * scale, 90 * scale, 68 * scale, 20 * scale) - th;
      const dArm3 = distSegment(fx, fy, 68 * scale, 20 * scale, 35 * scale, -50 * scale) - th;
      const dArm4 = distSegment(fx, fy, 35 * scale, -50 * scale, -10 * scale, -50 * scale) - th;
      const dArm = Math.min(dArm1, dArm2, dArm3, dArm4);

      const dEyepiece = distSegment(fx, fy, -30 * scale, -120 * scale, -30 * scale, -80 * scale) - th * 1.3;
      const dEyecap = distSegment(fx, fy, -48 * scale, -120 * scale, -12 * scale, -120 * scale) - th * 0.9;
      const dBody = distSegment(fx, fy, -30 * scale, -80 * scale, -30 * scale, 18 * scale) - th * 1.7;
      const dLens = distSegment(fx, fy, -30 * scale, 18 * scale, -30 * scale, 48 * scale) - th * 0.85;
      const dKnob = Math.hypot(fx - 22 * scale, fy - 10 * scale) - 14 * scale;

      const dMicro = Math.min(dBase, dStage, dArm, dEyepiece, dEyecap, dBody, dLens, dKnob);
      const microA = clamp(0.5 - dMicro, 0, 1);

      // Hair Follicle / Tricoscopy Fiber Accent under lens
      const dBulb = Math.hypot(fx - (-30 * scale), fy - 92 * scale) - 7 * scale;
      const dStrand = distSegment(fx, fy, -30 * scale, 92 * scale, -30 * scale, 62 * scale) - 3 * scale;
      const dFollicle = Math.min(dBulb, dStrand);
      const follicleA = clamp(0.5 - dFollicle, 0, 1);

      if (microA > 0) {
        r = lerp(r, cWhite[0], microA);
        g = lerp(g, cWhite[1], microA);
        b = lerp(b, cWhite[2], microA);
      }

      if (follicleA > 0) {
        r = lerp(r, cCyan[0], follicleA);
        g = lerp(g, cCyan[1], follicleA);
        b = lerp(b, cCyan[2], follicleA);
      }

      data[idx] = clamp(Math.round(r), 0, 255);
      data[idx + 1] = clamp(Math.round(g), 0, 255);
      data[idx + 2] = clamp(Math.round(b), 0, 255);
      data[idx + 3] = clamp(Math.round(bgAlpha * 255), 0, 255);
    }
  }

  return encode({ width: size, height: size, data });
}

const outDir = path.resolve(process.argv[2] || './public/icons');
fs.mkdirSync(outDir, { recursive: true });

const sizes = [
  { name: 'icon-512x512.png', size: 512, maskable: false },
  { name: 'icon-maskable-512x512.png', size: 512, maskable: true },
  { name: 'icon-192x192.png', size: 192, maskable: false },
  { name: 'apple-touch-icon.png', size: 180, maskable: false },
  { name: 'icon-32x32.png', size: 32, maskable: false },
  { name: 'icon-16x16.png', size: 16, maskable: false },
];

for (const item of sizes) {
  const t0 = Date.now();
  const pngBuf = renderIcon(item.size, item.maskable);
  const targetPath = path.join(outDir, item.name);
  fs.writeFileSync(targetPath, pngBuf);
  console.log(`Generated ${item.name} (${item.size}x${item.size}) in ${Date.now() - t0}ms`);
}

// Also copy icon-192x192 and icon-512x512 directly to public/ root for maximum compatibility
fs.writeFileSync(path.resolve('./public/icon-192.png'), fs.readFileSync(path.join(outDir, 'icon-192x192.png')));
fs.writeFileSync(path.resolve('./public/icon-512.png'), fs.readFileSync(path.join(outDir, 'icon-512x512.png')));
fs.writeFileSync(path.resolve('./public/apple-touch-icon.png'), fs.readFileSync(path.join(outDir, 'apple-touch-icon.png')));
console.log('All icons generated successfully!');
