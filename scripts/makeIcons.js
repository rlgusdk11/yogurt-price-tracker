const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// --- minimal PNG encoder (RGBA, no external deps) ---
const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii');
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

function encodePNG(width, height, rgbaBuffer) {
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  // add filter byte (0) per scanline
  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0;
    rgbaBuffer.copy(raw, y * (stride + 1) + 1, y * stride, y * stride + stride);
  }
  const idatData = zlib.deflateSync(raw);

  return Buffer.concat([
    signature,
    chunk('IHDR', ihdr),
    chunk('IDAT', idatData),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// --- draw a simple yogurt/milk-carton style icon ---
function drawIcon(size) {
  const buf = Buffer.alloc(size * size * 4);
  const bg = [37, 99, 235]; // #2563eb
  const white = [255, 255, 255];
  const cx = size / 2;
  const cy = size / 2;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;

      // rounded-square background
      const cornerR = size * 0.18;
      let inside = true;
      const nearLeft = x < cornerR;
      const nearRight = x > size - cornerR;
      const nearTop = y < cornerR;
      const nearBottom = y > size - cornerR;
      if (nearLeft && nearTop) {
        const dx = cornerR - x;
        const dy = cornerR - y;
        if (dx * dx + dy * dy > cornerR * cornerR) inside = false;
      } else if (nearRight && nearTop) {
        const dx = x - (size - cornerR);
        const dy = cornerR - y;
        if (dx * dx + dy * dy > cornerR * cornerR) inside = false;
      } else if (nearLeft && nearBottom) {
        const dx = cornerR - x;
        const dy = y - (size - cornerR);
        if (dx * dx + dy * dy > cornerR * cornerR) inside = false;
      } else if (nearRight && nearBottom) {
        const dx = x - (size - cornerR);
        const dy = y - (size - cornerR);
        if (dx * dx + dy * dy > cornerR * cornerR) inside = false;
      }

      let r, g, b, a;
      if (!inside) {
        r = 0; g = 0; b = 0; a = 0; // transparent corners
      } else {
        r = bg[0]; g = bg[1]; b = bg[2]; a = 255;

        // simple cup/carton glyph in white: trapezoid body + lid line
        const relX = (x - cx) / size;
        const relY = (y - cy) / size;
        const bodyTop = -0.12;
        const bodyBottom = 0.28;
        const halfWidthTop = 0.16;
        const halfWidthBottom = 0.12;
        if (relY >= bodyTop && relY <= bodyBottom) {
          const t = (relY - bodyTop) / (bodyBottom - bodyTop);
          const halfWidth = halfWidthTop + (halfWidthBottom - halfWidthTop) * t;
          if (Math.abs(relX) <= halfWidth) {
            r = white[0]; g = white[1]; b = white[2]; a = 255;
          }
        }
        // lid
        const lidTop = -0.22;
        const lidBottom = -0.12;
        const lidHalfWidth = 0.19;
        if (relY >= lidTop && relY <= lidBottom && Math.abs(relX) <= lidHalfWidth) {
          r = white[0]; g = white[1]; b = white[2]; a = 255;
        }
        // small spoon/dot accent
        const dotDx = relX - 0.0;
        const dotDy = relY - 0.08;
        if (dotDx * dotDx + dotDy * dotDy < 0.0009) {
          r = bg[0]; g = bg[1]; b = bg[2]; a = 255;
        }
      }

      buf[idx] = r;
      buf[idx + 1] = g;
      buf[idx + 2] = b;
      buf[idx + 3] = a;
    }
  }
  return buf;
}

const outDir = path.join(__dirname, '..', 'public', 'icons');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

for (const size of [192, 512]) {
  const rgba = drawIcon(size);
  const png = encodePNG(size, size, rgba);
  const outPath = path.join(outDir, `icon-${size}.png`);
  fs.writeFileSync(outPath, png);
  console.log('wrote', outPath, png.length, 'bytes');
}
