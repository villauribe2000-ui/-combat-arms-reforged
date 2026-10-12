import { readFileSync, writeFileSync } from 'fs';
const data = JSON.parse(readFileSync('scripts/sql-tables.json', 'utf8'));

function names(db) {
  return (data[db]?.tables || []).map(t => `${t.TABLE_SCHEMA}.${t.TABLE_NAME}`);
}

const interesting = /user|login|map|product|boost|clan|guild|game|match|announce|link|online|session|grade|invent|shop|store|nx|auth|nick|log|event|item|mode|channel|room|punish|ban|report|wallet|pay|mail|gift|event/i;

const summary = {};
for (const [db, info] of Object.entries(data)) {
  if (!info.ok) { summary[db] = { error: info.error }; continue; }
  const tables = names(db);
  const cols = {};
  for (const c of info.columns) {
    const k = `${c.TABLE_SCHEMA}.${c.TABLE_NAME}`;
    (cols[k] ||= []).push(`${c.COLUMN_NAME}:${c.DATA_TYPE}`);
  }
  summary[db] = {
    count: tables.length,
    all: tables,
    interesting: tables.filter(t => interesting.test(t)).map(t => ({ table: t, columns: cols[t] })),
  };
}

writeFileSync('scripts/sql-summary.json', JSON.stringify(summary, null, 2));
for (const [db, s] of Object.entries(summary)) {
  console.log('\n====', db, s.count || s.error);
  if (s.all) console.log(s.all.join('\n'));
}
