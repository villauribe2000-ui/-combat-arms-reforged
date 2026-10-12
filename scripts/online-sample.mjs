import { queryLog, disconnect } from '../server/db.js';
const open1 = await queryLog(`SELECT TOP 20 oidUser, NickName, strNexonID, LoginDate, LogoutDate, LogoutStatus FROM CBT_UserLoginLog01 WHERE LogoutDate IS NULL ORDER BY LoginDate DESC`);
const open2 = await queryLog(`SELECT TOP 20 oidUser, NickName, LoginDate, LogoutDate FROM CBT_UserLoginLog02 WHERE LogoutDate IS NULL ORDER BY LoginDate DESC`);
const recent = await queryLog(`SELECT TOP 5 oidUser, NickName, LoginDate, LogoutDate, LogoutStatus FROM CBT_UserLoginLog01 ORDER BY LoginDate DESC`);
console.log('open01', open1.recordset);
console.log('open02', open2.recordset);
console.log('recent', recent.recordset);
await disconnect();
