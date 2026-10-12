import { Router } from 'express';
import { query, queryGuildDB, queryLog, queryVisms, queryWeb } from '../db.js';

const router = Router();

async function rows(fn, sql, params = {}) {
  try {
    const result = await fn(sql, params);
    return result.recordset || [];
  } catch (e) {
    console.warn('[ADMIN READ]', e.message);
    return [];
  }
}

const ca = (sql, params) => rows(query, sql, params);
const log = (sql, params) => rows(queryLog, sql, params);
const guild = (sql, params) => rows(queryGuildDB, sql, params);
const vis = (sql, params) => rows(queryVisms, sql, params);
const web = (sql, params) => rows(queryWeb, sql, params);
const n = (list) => Number(list?.[0]?.n || 0);

router.get('/overview', async (_req, res) => {
  const characters = n(await ca(`SELECT COUNT(*) as n FROM CBT_User WHERE DeleteDate IS NULL`));
  const onlineNow = n(await ca(`SELECT COUNT(*) as n FROM CBT_User WHERE DeleteDate IS NULL AND Status = 1`));
  const newAccountsToday = n(await ca(`SELECT COUNT(*) as n FROM CBT_User WHERE DeleteDate IS NULL AND CAST(CreateDate AS DATE) = CAST(GETDATE() AS DATE)`));
  const newAccounts7 = n(await ca(`SELECT COUNT(*) as n FROM CBT_User WHERE DeleteDate IS NULL AND CreateDate >= DATEADD(day, -7, GETDATE())`));
  const banned = n(await ca(`SELECT COUNT(*) as n FROM CBT_User WHERE DeleteDate IS NULL AND (Status = 2 OR StatusEndDate > GETDATE())`));
  const matchesRecorded = n(await ca(`SELECT SUM(CAST(WinCnt AS BIGINT)) + SUM(CAST(LoseCnt AS BIGINT)) as n FROM CBT_User WHERE DeleteDate IS NULL`));
  const latest = await ca(`
    SELECT TOP 10 oidUser as id, strNexonID as username, NickName, CreateDate, UserType, Status, lastLoginDate, Exp
    FROM CBT_User WHERE DeleteDate IS NULL ORDER BY CreateDate DESC`);
  const onlineList = await ca(`
    SELECT TOP 40 oidUser as id, strNexonID as username, NickName, Exp, KillCnt as kills, lastLoginDate
    FROM CBT_User WHERE DeleteDate IS NULL AND Status = 1 ORDER BY lastLoginDate DESC`);
  const clans = n(await guild(`SELECT COUNT(*) as n FROM dbo.gdt_Guild`));
  res.json({ onlineNow, matchesRecorded, newAccountsToday, newAccounts7, characters, banned, clans, latest, onlineList });
});

router.get('/players', async (req, res) => {
  const q = String(req.query.q || '').trim();
  const params = {};
  let where = `WHERE DeleteDate IS NULL`;
  if (q) {
    where += ` AND (strNexonID LIKE @q OR NickName LIKE @q)`;
    params.q = `%${q}%`;
  }
  const list = await ca(`
    SELECT TOP 80 oidUser as id, strNexonID as username, NickName, Exp, KillCnt as kills, DeadCnt as deaths,
      WinCnt as wins, LoseCnt as losses, Money, Status, UserType, lastLoginDate, CreateDate, usedNX
    FROM CBT_User ${where}
    ORDER BY lastLoginDate DESC`, params);
  res.json({ data: list, source: 'COMBATARMS.CBT_User' });
});

router.get('/online', async (_req, res) => {
  const list = await ca(`
    SELECT TOP 80 oidUser as id, strNexonID as username, NickName, Exp, KillCnt as kills, lastLoginDate, Status
    FROM CBT_User WHERE DeleteDate IS NULL AND Status = 1
    ORDER BY lastLoginDate DESC`);
  const cu = await log(`SELECT TOP 1 CreateDate, Total_UserCnt FROM CBT_Stat_CU_Ex ORDER BY CreateDate DESC`);
  res.json({ data: list, concurrent: cu[0] || null, source: 'CBT_User.Status=1 + COMBATARMS_LOG.CBT_Stat_CU_Ex' });
});

router.get('/clans', async (_req, res) => {
  const list = await guild(`
    SELECT TOP 80 oidGuild, strName, strID, strNotice, dateCreated, oidUser_master,
      dn_strCharacterName_master, dn_n4TotalRegularMember, dn_n4TotalAssociateMember, codeGuildStatus
    FROM dbo.gdt_Guild ORDER BY oidGuild DESC`);
  res.json({ data: list, source: 'NX_GuildMaster.gdt_Guild' });
});

router.get('/shop', async (_req, res) => {
  const list = await ca(`
    SELECT TOP 80 p.ProductID, p.ProductName, p.Price, p.SalePrice, p.SaleType, p.BonusGP, v.ShopView
    FROM CBT_ProductInfo p
    LEFT JOIN CBT_ProductInfo_ShopView v ON v.ProductID = p.ProductID
    ORDER BY p.ProductID DESC`);
  res.json({ data: list, source: 'CBT_ProductInfo + CBT_ProductInfo_ShopView' });
});

router.get('/economy', async (_req, res) => {
  const codes = n(await web(`SELECT COUNT(*) as n FROM PaymentCodes WHERE status = 'pending'`));
  const refunds = n(await web(`SELECT COUNT(*) as n FROM RefundRequests WHERE status = 'pending'`));
  const nx = await vis(`SELECT SUM(CAST(TotalBalance AS BIGINT)) as n, COUNT(*) as accounts FROM VISMS_UserList`);
  const purchases = await vis(`
    SELECT TOP 20 OrderID, ProductNo, TotalPrice, oid, strNexonID, IPAddress, RegDate, IsGift
    FROM VISMS_PurchaseLog ORDER BY RegDate DESC`);
  res.json({
    pendingCodes: codes,
    pendingRefunds: refunds,
    nxAccounts: nx[0]?.accounts || 0,
    nxTotal: nx[0]?.n || 0,
    purchases,
    source: 'combatarms_web PaymentCodes/RefundRequests + VISMS'
  });
});

router.get('/reports', async (_req, res) => {
  const reviews = await web(`
    SELECT TOP 40 reportSeq, status, note, reviewedBy, reviewedByName, reviewedAt
    FROM report_reviews ORDER BY reviewedAt DESC`);
  const punishments = await web(`
    SELECT TOP 40 id, userId, nickname, type, reason, issuedByName, startsAt, endsAt, liftedAt, createdAt
    FROM punishments ORDER BY createdAt DESC`);
  const ingame = await log(`
    SELECT TOP 40 SeqNo, ReporterOiduser, MainCategory, SubCategory, TargetOiduser, TargetNickName, Message, RegDate
    FROM CBT_UserReportCommon ORDER BY RegDate DESC`);
  res.json({ reviews, punishments, ingame, source: 'combatarms_web + COMBATARMS_LOG.CBT_UserReportCommon' });
});

router.get('/matches', async (_req, res) => {
  let games = await log(`
    SELECT TOP 40 GameUserLogSeqNo as id, oidUser, NickName, RoomNo, GameType, GameMode, MapNo,
      KillCnt, DeadCnt, WinType, StartDate, EndDate, PlayTime, Exp, Money
    FROM CBT_UserGameLog01 ORDER BY EndDate DESC`);
  if (!games.length) {
    games = await log(`
      SELECT TOP 40 GameUserLogSeqNo as id, oidUser, NickName, RoomNo, GameType, GameMode, MapNo,
        KillCnt, DeadCnt, WinType, StartDate, EndDate, PlayTime, Exp, Money
      FROM CBT_UserGameLog02 ORDER BY EndDate DESC`);
  }
  let rooms = await log(`
    SELECT TOP 20 GameRoomLogSeqNo as id, RoomName, RoomNo, MapNo, GameType, PlayerCnt, MaxPlayerCnt,
      StartDate, EndDate, PlayTime, WinTeamType
    FROM CBT_GameRoomLog01 ORDER BY EndDate DESC`);
  if (!rooms.length) {
    rooms = await log(`
      SELECT TOP 20 GameRoomLogSeqNo as id, RoomName, RoomNo, MapNo, GameType, PlayerCnt, MaxPlayerCnt,
        StartDate, EndDate, PlayTime, WinTeamType
      FROM CBT_GameRoomLog02 ORDER BY EndDate DESC`);
  }
  res.json({ games, rooms, source: 'COMBATARMS_LOG CBT_UserGameLog / CBT_GameRoomLog' });
});

router.get('/logins', async (_req, res) => {
  let list = await log(`
    SELECT TOP 50 UserLoginLogSeqNo as id, oidUser, strNexonID as username, NickName, IP, LoginDate, LogoutDate, LogoutStatus, LobbyServerNo
    FROM CBT_UserLoginLog01 ORDER BY LoginDate DESC`);
  if (!list.length) {
    list = await log(`
      SELECT TOP 50 UserLoginLogSeqNo as id, oidUser, strNexonID as username, NickName, IP, LoginDate, LogoutDate, LogoutStatus, LobbyServerNo
      FROM CBT_UserLoginLog02 ORDER BY LoginDate DESC`);
  }
  const mac = await ca(`
    SELECT TOP 20 oiduser, MacAddress, LastLoginDate, HWID FROM CBT_LastLoginMacAddress ORDER BY LastLoginDate DESC`);
  res.json({ data: list, hardware: mac, source: 'COMBATARMS_LOG.CBT_UserLoginLog + CBT_LastLoginMacAddress' });
});

router.get('/linked', async (_req, res) => {
  const discord = await ca(`
    SELECT TOP 80 d.discord_id, d.oidUser, d.data_vinculo, u.strNexonID as username, u.NickName
    FROM DiscordAccounts d
    LEFT JOIN CBT_User u ON u.oidUser = d.oidUser
    ORDER BY d.data_vinculo DESC`);
  const partners = await ca(`
    SELECT TOP 40 oiduser, PartnerCode, MacAddress, RegDate FROM CBT_PartnerUser ORDER BY RegDate DESC`);
  const twofa = await web(`SELECT userId, version, enabledAt FROM two_factor`);
  res.json({ discord, partners, twofa, source: 'DiscordAccounts + CBT_PartnerUser + combatarms_web.two_factor' });
});

router.get('/announcements', async (_req, res) => {
  const ticker = await ca(`SELECT ADMessageNo, ADCommandID, ADMessage, ADURL, Enable FROM CBT_AdvertiseMessage ORDER BY ADMessageNo`);
  const messages = await ca(`
    SELECT TOP 40 MessageSetID, MessageType, MessageNo, CommandID, ViewEnable, ViewDate, Enable, Message, URL
    FROM CBT_AdvertiseMessageInfo ORDER BY ViewDate DESC`);
  const settings = await ca(`SELECT ADReady, CurrentADNo, ADCount, Color, Speed, ShowType FROM CBT_Advertise`);
  res.json({ ticker, messages, settings: settings[0] || null, source: 'CBT_Advertise / CBT_AdvertiseMessage' });
});

router.get('/maps', async (_req, res) => {
  const maps = await ca(`SELECT MapID, Name FROM CBT_GameMap ORDER BY MapID`);
  const modes = await ca(`SELECT Mode, ModeType, Name FROM CBT_GameMode ORDER BY Mode`);
  const open = await ca(`
    SELECT o.ClearanceLevel, o.ModeID, o.MapID, o.IsDefaultMap, o.Enable, o.IsOfficial, m.Name as MapName, g.Name as ModeName
    FROM CBT_MapOpen o
    LEFT JOIN CBT_GameMap m ON m.MapID = o.MapID
    LEFT JOIN CBT_GameMode g ON g.Mode = o.ModeID
    ORDER BY o.ModeID, o.MapID`);
  res.json({ maps, modes, open, source: 'CBT_GameMap + CBT_GameMode + CBT_MapOpen' });
});

router.get('/boosts', async (_req, res) => {
  const events = await ca(`
    SELECT EventID, LobbyServerID, ModeID, MapID, EXPRate, GPRate, BeginTime, EndTime, Enable, [Desc] as description
    FROM CBT_EventEXPGP ORDER BY BeginTime DESC`);
  const hottime = await ca(`
    SELECT SeqNo, EventID, RewardID, BeginTime, EndTime, Enable, DurationHour, Description, PcCafeOnly
    FROM CBT___HottimeRegister ORDER BY BeginTime DESC`);
  res.json({ events, hottime, source: 'CBT_EventEXPGP + CBT___HottimeRegister' });
});

export default router;
