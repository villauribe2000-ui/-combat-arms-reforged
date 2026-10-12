import { query, disconnect } from '../server/db.js';
const lv = await query(`SELECT ClearanceLevel, COUNT(*) n FROM CBT_MapOpen GROUP BY ClearanceLevel ORDER BY ClearanceLevel`);
console.log('levels', lv.recordset);
const modes = await query(`SELECT Mode, ModeType, Name FROM CBT_GameMode ORDER BY Mode`);
console.log('modes', modes.recordset);
const sample = await query(`
  SELECT TOP 15 o.ClearanceLevel, o.ModeID, o.MapID, o.IsDefaultMap, o.Enable, o.IsOfficial, m.Name as MapName, g.Name as ModeName
  FROM CBT_MapOpen o
  LEFT JOIN CBT_GameMap m ON m.MapID=o.MapID
  LEFT JOIN CBT_GameMode g ON g.Mode=o.ModeID
  WHERE o.ClearanceLevel=2 AND o.ModeID=0
  ORDER BY m.Name`);
console.log('tdm', sample.recordset);
const cols = await query(`SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='CBT_MapOpen'`);
console.log(cols.recordset.map(r=>r.COLUMN_NAME));
const cnt = await query(`SELECT COUNT(*) n FROM CBT_MapOpen`);
console.log('open', cnt.recordset);
await disconnect();
