import fs from 'fs';
import path from 'path';
import { decode, encode } from 'fast-png';

const srcBuf = fs.readFileSync('/tmp/logo_420.png');
const srcImg = decode(srcBuf);

const targetSize = 512;
const innerSize = 420;
const offset = Math.floor((targetSize - innerSize) / 2); // 46

const outData = new Uint8Array(targetSize * targetSize * 4);

// Sample background gradient from the inner image:
// We can sample the top border row and bottom border row
const topRow = [];
for (let x = 0; x < innerSize; x++) {
  const idx = (0 * innerSize + x) * srcImg.channels;
  topRow.push([srcImg.data[idx], srcImg.data[idx + 1], srcImg.data[idx + 2]]);
}

const bottomRow = [];
for (let x = 0; x < innerSize; x++) {
  const idx = ((innerSize - 1) * innerSize + x) * srcImg.channels;
  bottomRow.push([srcImg.data[idx], srcImg.data[idx + 1], srcImg.data[idx + 2]]);
}

// Average top and bottom colors
const avgTop = [
  Math.round(topRow.reduce((s, c) => s + c[0], 0) / innerSize),
  Math.round(topRow.reduce((s, c) => s + c[1], 0) / innerSize),
  Math.round(topRow.reduce((s, c) => s + c[2], 0) / innerSize),
];

const avgBottom = [
  Math.round(bottomRow.reduce((s, c) => s + c[0], 0) / innerSize),
  Math.round(bottomRow.reduce((s, c) => s + c[1], 0) / innerSize),
  Math.round(bottomRow.reduce((s, c) => s + c[2], 0) / innerSize),
];

for (let y = 0; y < targetSize; y++) {
  const rowOffset = y * targetSize * 4;
  const isInsideY = y >= offset && y < offset + innerSize;
  const srcY = isInsideY ? y - offset : (y < offset ? 0 : innerSize - 1);

  // Gradient factor for padding
  const t = y / (targetSize - 1);
  const padR = Math.round(avgTop[0] + (avgBottom[0] - avgTop[0]) * t);
  const padG = Math.round(avgTop[1] + (avgBottom[1] - avgTop[1]) * t);
  const padB = Math.round(avgTop[2] + (avgBottom[2] - avgTop[2]) * t);

  for (let x = 0; x < targetSize; x++) {
    const idx = rowOffset + x * 4;
    const isInsideX = x >= offset && x < offset + innerSize;

    if (isInsideY && isInsideX) {
      const srcX = x - offset;
      const sIdx = (srcY * innerSize + srcX) * srcImg.channels;
      outData[idx] = srcImg.data[sIdx];
      outData[idx + 1] = srcImg.data[sIdx + 1];
      outData[idx + 2] = srcImg.data[sIdx + 2];
      outData[idx + 3] = srcImg.channels === 4 ? srcImg.data[sIdx + 3] : 255;
    } else {
      // Smoothly blend edge or fill padding
      if (isInsideY) {
        // Left or right padding: stretch nearest column with subtle border clamp
        const clampedSrcX = x < offset ? 0 : innerSize - 1;
        const sIdx = (srcY * innerSize + clampedSrcX) * srcImg.channels;
        outData[idx] = srcImg.data[sIdx];
        outData[idx + 1] = srcImg.data[sIdx + 1];
        outData[idx + 2] = srcImg.data[sIdx + 2];
        outData[idx + 3] = 255;
      } else {
        // Top or bottom padding: use vertical gradient matching background
        outData[idx] = padR;
        outData[idx + 1] = padG;
        outData[idx + 2] = padB;
        outData[idx + 3] = 255;
      }
    }
  }
}

const encoded = encode({ width: targetSize, height: targetSize, data: outData });
fs.writeFileSync('public/icons/icon-maskable-512x512.png', encoded);
console.log('Maskable icon created successfully (512x512):', encoded.length, 'bytes');

