import { queryGuildDB, disconnect } from '../server/db.js';
const st = await queryGuildDB(`SELECT codeWaitingStatus, COUNT(*) n FROM dbo.gdt_WaitingMember GROUP BY codeWaitingStatus`);
console.log(st.recordset);
const types = await queryGuildDB(`SELECT codeMemberType, COUNT(*) n FROM dbo.gdt_Member GROUP BY codeMemberType`);
console.log(types.recordset);
const wait = await queryGuildDB(`SELECT TOP 8 oidGuild, oidUser, dn_strCharacterName, codeWaitingStatus, dateCreated FROM dbo.gdt_WaitingMember ORDER BY dateCreated DESC`);
console.log(wait.recordset);
await disconnect();
