import { query, queryWeb, disconnect } from '../server/db.js';

const users = await query(
  `SELECT TOP 20 u.oidUser, u.strNexonID, u.NickName
   FROM CBT_User u
   WHERE u.strNexonID LIKE @q OR u.NickName LIKE @q`,
  { q: '%dano%' }
);
console.log('users', users.recordset);

const webHits = await queryWeb(
  `SELECT id, oidUser, username, level, nxAmount
   FROM ClaimedLevelRewards
   WHERE LOWER(username) LIKE '%dano%'`,
  {}
);
console.log('web by name', webHits.recordset);

for (const u of users.recordset || []) {
  const rows = await queryWeb(
    `SELECT id, oidUser, username, level, nxAmount FROM ClaimedLevelRewards WHERE oidUser = @id OR username = @u`,
    { id: u.oidUser, u: u.strNexonID }
  );
  console.log('claims', u.strNexonID, rows.recordset);
  const del = await queryWeb(
    `DELETE FROM ClaimedLevelRewards WHERE oidUser = @id OR username = @u`,
    { id: u.oidUser, u: u.strNexonID }
  );
  console.log('deleted', u.strNexonID, del.rowsAffected);
}

const delName = await queryWeb(
  `DELETE FROM ClaimedLevelRewards WHERE LOWER(username) LIKE '%dano%'`,
  {}
);
console.log('deleted by name', delName.rowsAffected);

await disconnect();
