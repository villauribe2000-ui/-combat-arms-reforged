import fs from 'fs';
const s = fs.readFileSync('src/ranking-caevo.css', 'utf8');
console.log([...new Set(s.match(/\.ranking-[a-z0-9-]+/g) || [])].join('\n'));
const i = s.indexOf('.ranking-tabs');
console.log('\nTABS', s.slice(i, i+500));
const j = s.indexOf('.ranking-podium');
console.log('\nPODIUM', s.slice(j, j+600));
const k = s.indexOf('.ranking-table');
console.log('\nTABLE', s.slice(k, k+500));
