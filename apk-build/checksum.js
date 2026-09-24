const fs = require('fs');
const path = require('path');
const dir = __dirname;

function extract(name) {
  const raw = fs.readFileSync(path.join(dir, name), 'utf8');
  const start = raw.indexOf('"') + 1;
  const end = raw.lastIndexOf('"');
  return raw.slice(start, end);
}

function checksum(s) {
  let sum = 0;
  for (let i = 0; i < s.length; i++) sum = (sum + s.charCodeAt(i) * (i % 251 + 1)) >>> 0;
  return sum;
}

const files = ['chunk0.txt','chunk1.txt','chunk2.txt','chunk3.txt','chunk4.txt','chunk5.txt','chunk6.txt','chunk7.txt','chunk8.txt','chunk9.txt','chunk10.txt'];
const results = files.map(f => checksum(extract(f)));
console.log(JSON.stringify(results));
