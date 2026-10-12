import fs from 'fs';
const h = fs.readFileSync(process.env.TEMP + '/caevo-rank.html', 'utf8');
console.log('css', [...new Set(h.match(/\/_next\/static\/css\/[a-z0-9.]+\.css/g) || [])]);
console.log('chunks', [...new Set(h.match(/\/_next\/static\/chunks\/app\/rankings\/[^"']+/g) || [])]);
const start = h.indexOf('<main');
console.log(h.slice(start, start + 2500));
