import { queryWeb, disconnect } from '../server/db.js';

const before = await queryWeb(
  `SELECT oidUser, username, birthDate, lastClaimedYear, lastClaimedAt, nxAwarded
   FROM BirthdayRewards
   WHERE oidUser = 22 OR LOWER(username) LIKE '%dano%' OR LOWER(username) LIKE '%idoreon%' OR LOWER(username) LIKE '%idoreson%'`,
  {}
);
console.log('before', before.recordset);

const del = await queryWeb(
  `DELETE FROM BirthdayRewards
   WHERE oidUser = 22 OR LOWER(username) LIKE '%dano%' OR LOWER(username) LIKE '%idoreon%' OR LOWER(username) LIKE '%idoreson%'`,
  {}
);
console.log('deleted', del.rowsAffected);

const after = await queryWeb(
  `SELECT oidUser, username, birthDate FROM BirthdayRewards
   WHERE oidUser = 22 OR LOWER(username) LIKE '%dano%' OR LOWER(username) LIKE '%idoreon%'`,
  {}
);
console.log('after', after.recordset);
await disconnect();
