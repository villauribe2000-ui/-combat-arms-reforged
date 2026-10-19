import { queryWeb } from './db.js';

let ready = null;

export function ensureRankMarkTable() {
  if (!ready) {
    ready = queryWeb(`
      IF OBJECT_ID('dbo.WebRankMarks', 'U') IS NULL
      BEGIN
        CREATE TABLE dbo.WebRankMarks (
          oidUser INT NOT NULL PRIMARY KEY,
          mark VARCHAR(8) NOT NULL,
          assignedBy VARCHAR(64) NOT NULL,
          assignedAt DATETIME NOT NULL CONSTRAINT DF_WebRankMarks_assignedAt DEFAULT GETDATE()
        );
      END
    `).catch((error) => {
      ready = null;
      throw error;
    });
  }
  return ready;
}

export async function rankMarksFor(ids) {
  const clean = [...new Set(ids.map((id) => Number(id)).filter((id) => Number.isFinite(id) && id > 0))];
  if (!clean.length) return {};
  try {
    await ensureRankMarkTable();
    const result = await queryWeb(
      `SELECT oidUser, mark FROM dbo.WebRankMarks WHERE oidUser IN (${clean.join(',')})`
    );
    const map = {};
    for (const row of result.recordset || []) {
      const mark = String(row.mark || '').trim().toUpperCase();
      if (mark === 'FM') map[Number(row.oidUser)] = 'FM';
    }
    return map;
  } catch (error) {
    console.warn('[RANK MARK]', error.message);
    return {};
  }
}
