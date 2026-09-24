const fs = require('fs');
const path = require('path');
const dir = __dirname;
const b64 = fs.readFileSync(path.join(dir, 'combined.b64'), 'utf8');
const buf = Buffer.from(b64, 'base64');
fs.writeFileSync(path.join(dir, 'yogurt-price-tracker-android.zip'), buf);
console.log('zip bytes:', buf.length);
