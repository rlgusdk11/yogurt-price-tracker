const fs = require('fs');
const path = require('path');
const dir = __dirname;

function extract(name) {
  const raw = fs.readFileSync(path.join(dir, name), 'utf8');
  const start = raw.indexOf('"') + 1;
  const end = raw.lastIndexOf('"');
  return raw.slice(start, end);
}

const files = fs.readdirSync(dir).filter(f => /^chunk\d+\.txt$/.test(f))
  .sort((a, b) => parseInt(a.match(/\d+/)[0]) - parseInt(b.match(/\d+/)[0]));

let total = '';
for (const f of files) {
  const content = extract(f);
  console.log(f, 'content length:', content.length);
  total += content;
}
console.log('total base64 length so far:', total.length);
fs.writeFileSync(path.join(dir, 'combined.b64'), total);
