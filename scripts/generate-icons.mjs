import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import zlib from 'node:zlib';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PUBLIC_ICONS_DIR = path.resolve(__dirname, '..', 'public', 'icons');

if (!fs.existsSync(PUBLIC_ICONS_DIR)) {
  fs.mkdirSync(PUBLIC_ICONS_DIR, { recursive: true });
}

// Function to generate simple PNG with shield colors (Cyan / Emerald gradient)
function createPng(width, height) {
  const bytesPerPixel = 4;
  const scanlineWidth = width * bytesPerPixel;
  const rawData = Buffer.alloc((scanlineWidth + 1) * height);

  for (let y = 0; y < height; y++) {
    const rowOffset = y * (scanlineWidth + 1);
    rawData[rowOffset] = 0; // Filter type 0 (None)

    for (let x = 0; x < width; x++) {
      const pixelOffset = rowOffset + 1 + x * bytesPerPixel;
      
      // Calculate normalized coordinates (-1 to 1)
      const nx = (x / width) * 2 - 1;
      const ny = (y / height) * 2 - 1;
      
      // Shield shape equation
      const inShield = (Math.abs(nx) <= 0.85) && (ny >= -0.85) && (ny <= 0.85 - Math.pow(Math.abs(nx), 1.5) * 0.8);
      
      if (inShield) {
        // Gradient from cyan (#06b6d4) to emerald (#10b981)
        const t = (y / height);
        const r = Math.round(6 * (1 - t) + 16 * t);
        const g = Math.round(182 * (1 - t) + 185 * t);
        const b = Math.round(212 * (1 - t) + 129 * t);
        rawData[pixelOffset] = r;
        rawData[pixelOffset + 1] = g;
        rawData[pixelOffset + 2] = b;
        rawData[pixelOffset + 3] = 255;
      } else {
        // Transparent
        rawData[pixelOffset] = 0;
        rawData[pixelOffset + 1] = 0;
        rawData[pixelOffset + 2] = 0;
        rawData[pixelOffset + 3] = 0;
      }
    }
  }

  const compressed = zlib.deflateSync(rawData);

  // PNG Signature
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR Chunk
  const ihdr = Buffer.alloc(25);
  ihdr.writeUInt32BE(13, 0); // Length
  ihdr.write('IHDR', 4);
  ihdr.writeUInt32BE(width, 8);
  ihdr.writeUInt32BE(height, 12);
  ihdr.writeUInt8(8, 16); // Bit depth
  ihdr.writeUInt8(6, 17); // Color type RGBA
  ihdr.writeUInt8(0, 18); // Compression
  ihdr.writeUInt8(0, 19); // Filter
  ihdr.writeUInt8(0, 20); // Interlace
  const ihdrCrc = crc32(ihdr.subarray(4, 21));
  ihdr.writeUInt32BE(ihdrCrc, 21);

  // IDAT Chunk
  const idat = Buffer.alloc(compressed.length + 12);
  idat.writeUInt32BE(compressed.length, 0);
  idat.write('IDAT', 4);
  compressed.copy(idat, 8);
  const idatCrc = crc32(idat.subarray(4, 8 + compressed.length));
  idat.writeUInt32BE(idatCrc, 8 + compressed.length);

  // IEND Chunk
  const iend = Buffer.alloc(12);
  iend.writeUInt32BE(0, 0);
  iend.write('IEND', 4);
  const iendCrc = crc32(iend.subarray(4, 8));
  iend.writeUInt32BE(iendCrc, 8);

  return Buffer.concat([signature, ihdr, idat, iend]);
}

function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc ^= buf[i];
    for (let j = 0; j < 8; j++) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

[16, 32, 48, 128].forEach(size => {
  const png = createPng(size, size);
  fs.writeFileSync(path.join(PUBLIC_ICONS_DIR, `icon-${size}.png`), png);
  console.log(`Generated icon-${size}.png (${size}x${size})`);
});
