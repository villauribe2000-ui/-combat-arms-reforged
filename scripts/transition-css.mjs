import https from 'https';
import fs from 'fs';

function get(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'user-agent': 'Mozilla/5.0' } }, res => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        const loc = res.headers.location.startsWith('http') ? res.headers.location : `https://caevo.net${res.headers.location}`;
        return get(loc).then(resolve, reject);
      }
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    }).on('error', reject);
  });
}

const css = await get('https://caevo.net/_next/static/css/ff0e95e07901ce90.css');
const keys = ['page-transition', 'page-transition-orbit', 'page-transition-emblem', 'page-transition-wordmark', 'page-transition-status', 'page-transition-track'];
for (const key of keys) {
  const i = css.indexOf('.' + key);
  console.log('\n====', key, i);
  if (i >= 0) console.log(css.slice(Math.max(0, i - 40), i + 900));
}
fs.writeFileSync('tmp-caevo-layout.css', css);
console.log('\nbytes', css.length);
