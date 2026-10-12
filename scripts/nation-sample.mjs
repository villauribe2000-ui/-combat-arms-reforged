import { query, disconnect } from '../server/db.js';
const r = await query(`SELECT CountryIndex, CountryCode, CountryName FROM CBT_GeoIPDetailInfo WHERE CountryIndex IN (54,101,172,232,226,73,110,16)`);
console.log(r.recordset);
const t = await query(`
  SELECT TOP 3 u.oidUser, u.strNexonID, a.strEmail, u.nationindex, g.CountryName
  FROM CBT_User u
  LEFT JOIN CBT_UserAuth a ON a.oidUser = u.oidUser
  LEFT JOIN CBT_GeoIPDetailInfo g ON g.CountryIndex = u.nationindex
  WHERE u.DeleteDate IS NULL ORDER BY u.oidUser DESC`);
console.log(t.recordset);
await disconnect();
