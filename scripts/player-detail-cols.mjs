import { query, queryLog, queryGuildDB, queryVisms, queryWeb, disconnect } from '../server/db.js';
const id = 1034;
const u = await query(`SELECT TOP 1 oidUser, strNexonID, NickName, Exp, Money FROM CBT_User WHERE oidUser=@id`, { id });
console.log('user', u.recordset[0]);
try {
  const m = await queryLog(`SELECT TOP 3 EndDate, GameMode, MapNo, WinType, PlayEndType FROM CBT_UserGameLog01 WHERE oidUser=@id ORDER BY EndDate DESC`, { id });
  console.log('matches', m.recordset);
} catch (e) { console.log('matches fail', e.message); }
try {
  const mem = await queryGuildDB(`SELECT TOP 1 * FROM dbo.gdt_Member`);
  console.log('member cols', Object.keys(mem.recordset[0] || {}));
} catch (e) { console.log('member', e.message); }
const nx = await queryVisms(`SELECT TOP 1 TotalBalance FROM VISMS_UserList WHERE oid=@id`, { id });
console.log('nx', nx.recordset);
await disconnect();
