import { query, queryGuildDB, queryLog, queryVisms, queryWeb, disconnect } from '../server/db.js';

async function tryq(name, fn) {
  try {
    const r = await fn();
    console.log('OK', name, (r.recordset || []).length);
  } catch (e) {
    console.log('FAIL', name, e.message);
  }
}

await tryq('players', () => query(`SELECT TOP 2 oidUser, NickName, lastLoginDate FROM CBT_User WHERE DeleteDate IS NULL`));
await tryq('online', () => query(`SELECT COUNT(*) as n FROM CBT_User WHERE Status = 1`));
await tryq('clans', () => queryGuildDB(`SELECT TOP 2 oidGuild, strName FROM dbo.gdt_Guild`));
await tryq('shop', () => query(`SELECT TOP 2 ProductID, ProductName, Price FROM CBT_ProductInfo`));
await tryq('nx', () => queryVisms(`SELECT TOP 2 oid, TotalBalance FROM VISMS_UserList`));
await tryq('purchases', () => queryVisms(`SELECT TOP 2 strNexonID, TotalPrice, RegDate FROM VISMS_PurchaseLog`));
await tryq('codes', () => queryWeb(`SELECT COUNT(*) as n FROM PaymentCodes`));
await tryq('login', () => queryLog(`SELECT TOP 2 NickName, LoginDate FROM CBT_UserLoginLog01`));
await tryq('games', () => queryLog(`SELECT TOP 2 NickName, EndDate FROM CBT_UserGameLog01`));
await tryq('rooms', () => queryLog(`SELECT TOP 2 RoomName FROM CBT_GameRoomLog01`));
await tryq('reports', () => queryLog(`SELECT TOP 2 TargetNickName FROM CBT_UserReportCommon`));
await tryq('discord', () => query(`SELECT TOP 2 discord_id, oidUser FROM DiscordAccounts`));
await tryq('ads', () => query(`SELECT TOP 2 ADMessage FROM CBT_AdvertiseMessage`));
await tryq('maps', () => query(`SELECT TOP 2 MapID, Name FROM CBT_GameMap`));
await tryq('boost', () => query(`SELECT TOP 2 EventID, EXPRate, [Desc] as description FROM CBT_EventEXPGP`));
await tryq('hot', () => query(`SELECT TOP 2 EventID, Description FROM CBT___HottimeRegister`));
await tryq('2fa', () => queryWeb(`SELECT TOP 2 userId, enabledAt FROM two_factor`));
await disconnect();
process.exit(0);
