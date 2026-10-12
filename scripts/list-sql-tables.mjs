import sql from '../server/node_modules/mssql/index.js';
import { writeFileSync } from 'fs';

const base = {
  server: (process.env.DB_SERVER || '94.72.114.174').split(',')[0],
  user: process.env.DB_USER || 'combatadmin',
  password: process.env.DB_PASSWORD || 'Admin123456',
  port: parseInt(process.env.DB_PORT || '1433', 10),
  options: { trustServerCertificate: true, encrypt: false, requestTimeout: 30000 },
  pool: { max: 2, min: 0, idleTimeoutMillis: 10000 },
};

const dbs = ['COMBATARMS', 'COMBATARMS_LOG', 'NX_GuildMaster', 'VISMS', 'combatarms_web', 'COMBATARMS_WEB'];

async function inspect(name) {
  const pool = new sql.ConnectionPool({ ...base, database: name });
  try {
    await pool.connect();
    const tables = await pool.request().query(`
      SELECT TABLE_SCHEMA, TABLE_NAME
      FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_TYPE = 'BASE TABLE'
      ORDER BY TABLE_SCHEMA, TABLE_NAME
    `);
    const cols = await pool.request().query(`
      SELECT TABLE_SCHEMA, TABLE_NAME, COLUMN_NAME, DATA_TYPE
      FROM INFORMATION_SCHEMA.COLUMNS
      ORDER BY TABLE_SCHEMA, TABLE_NAME, ORDINAL_POSITION
    `);
    await pool.close();
    return { ok: true, tables: tables.recordset, columns: cols.recordset };
  } catch (e) {
    try { await pool.close(); } catch {}
    return { ok: false, error: e.message };
  }
}

const out = {};
for (const db of dbs) {
  console.log('Inspect', db);
  out[db] = await inspect(db);
  if (out[db].ok) console.log('  tables', out[db].tables.length);
  else console.log('  fail', out[db].error);
}
writeFileSync('scripts/sql-tables.json', JSON.stringify(out, null, 2));
console.log('wrote scripts/sql-tables.json');
process.exit(0);
