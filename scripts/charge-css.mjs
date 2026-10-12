import fs from 'fs';
import https from 'https';

function get(url) {
  return new Promise((resolve, reject) => {
    https.get(url, res => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return get(res.headers.location.startsWith('http') ? res.headers.location : `https://caevo.net${res.headers.location}`).then(resolve, reject);
      }
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    }).on('error', reject);
  });
}

const html = await get('https://caevo.net/charge');
const cssHrefs = [...html.matchAll(/\/_next\/static\/css\/[^"]+\.css/g)].map(m => m[0]);
console.log('css', cssHrefs);
const i = html.indexOf('<main');
console.log(html.slice(i, i + 4000));
for (const href of cssHrefs) {
  const css = await get(`https://caevo.net${href}`);
  if (css.includes('.charge') || css.includes('nx-store') || css.includes('checkout')) {
    fs.writeFileSync('src/charge-caevo.css', css);
    console.log('wrote', href, css.length);
  }
}
