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
  const role = String(req.query.role || 'all');
  const status = String(req.query.status || 'all');
  const page = Math.max(1, parseInt(String(req.query.page || '1'), 10) || 1);
  const limit = 25;
  const offset = (page - 1) * limit;
  const params = { offset, limit };
  let where = `u.DeleteDate IS NULL`;

  if (q.startsWith('#') && /^\d+$/.test(q.slice(1))) {
    where += ` AND u.oidUser = @oid`;
    params.oid = parseInt(q.slice(1), 10);
  } else if (/^\d+$/.test(q) && q.length <= 8) {
    where += ` AND u.oidUser = @oid`;
    params.oid = parseInt(q, 10);
  } else if (q) {
    where += ` AND (u.strNexonID LIKE @q OR u.NickName LIKE @q OR a.strEmail LIKE @q OR CAST(u.oidUser AS VARCHAR(20)) LIKE @q)`;
    params.q = `%${q}%`;
  }

  if (status === 'online') where += ` AND u.Status = 1`;
  if (status === 'banned') {
    where += ` AND (u.Status = 2 OR (u.StatusEndDate IS NOT NULL AND u.StatusEndDate > GETDATE()) OR (a.BlockEndDate IS NOT NULL AND a.BlockEndDate > GETDATE()))`;
  }
  if (status === 'active') {
    where += ` AND u.Status <> 2 AND (u.StatusEndDate IS NULL OR u.StatusEndDate < GETDATE()) AND (a.BlockEndDate IS NULL OR a.BlockEndDate < GETDATE())`;
  }
  if (role === 'gm') where += ` AND u.UserType = 1`;
  if (role === 'player') where += ` AND ISNULL(u.UserType, 0) <> 1`;

  const admins = await web(`SELECT userId, role FROM admin_users`);
  const adminMap = {};
  for (const row of admins) adminMap[row.userId] = row.role;
  if (role === 'admin') {
    const ids = admins.map((r) => Number(r.userId)).filter((n) => Number.isFinite(n));
    where += ids.length ? ` AND u.oidUser IN (${ids.join(',')})` : ` AND 1 = 0`;
  }

  const total = n(await ca(`
    SELECT COUNT(*) as n
    FROM CBT_User u
    LEFT JOIN CBT_UserAuth a ON a.oidUser = u.oidUser
    WHERE ${where}`, params));

  const list = await ca(`
    SELECT u.oidUser as id, u.strNexonID as username, u.NickName, u.Exp, u.UserType, u.Status,
      u.CreateDate, u.lastLoginDate, u.NationCode, u.nationindex, u.StatusEndDate,
      a.strEmail as email, a.BlockEndDate,
      g.CountryCode, g.CountryName
    FROM CBT_User u
    LEFT JOIN CBT_UserAuth a ON a.oidUser = u.oidUser
    LEFT JOIN CBT_GeoIPDetailInfo g ON g.CountryIndex = u.nationindex
    WHERE ${where}
    ORDER BY u.oidUser DESC
    OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY`, params);

  const data = list.map((p) => {
    const banned = p.Status === 2 || (p.StatusEndDate && new Date(p.StatusEndDate) > new Date()) || (p.BlockEndDate && new Date(p.BlockEndDate) > new Date());
    const webRole = adminMap[p.id];
    return {
      ...p,
      webRole: webRole || null,
      isGM: p.UserType === 1,
      accountStatus: banned ? 'banned' : 'active',
    };
  });

  res.json({
    data,
    total,
    page,
    limit,
    showingFrom: data.length ? offset + 1 : 0,
    showingTo: offset + data.length,
    source: 'CBT_User + CBT_UserAuth + CBT_GeoIPDetailInfo',
  });
});

router.get('/players/:id', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!Number.isFinite(id)) return res.status(400).json({ error: 'invalid id' });
  const p = { id };

  const users = await ca(`
    SELECT u.oidUser as id, u.strNexonID as username, u.NickName, u.Exp, u.Money, u.UserType, u.Status,
      u.CreateDate, u.lastLoginDate, u.NationCode, u.nationindex, u.StatusEndDate, u.SilenceEndDate,
      u.KillCnt, u.DeadCnt, u.WinCnt, u.LoseCnt, u.HeadShotCnt, u.PlayRoundCnt, u.usedNX,
      a.strEmail as email, a.bIsMailActive, a.BlockStartDate, a.BlockEndDate, a.RegDate as authRegDate,
      g.CountryCode, g.CountryName
    FROM CBT_User u
    LEFT JOIN CBT_UserAuth a ON a.oidUser = u.oidUser
    LEFT JOIN CBT_GeoIPDetailInfo g ON g.CountryIndex = u.nationindex
    WHERE u.oidUser = @id`, p);
  if (!users.length) return res.status(404).json({ error: 'not found' });
  const user = users[0];

  const grade = (await ca(`
    SELECT TOP 1 GradeLevel as rank, GradeName as rankName
    FROM CBT_GradeInfo WHERE @exp >= MinExp AND @exp <= MaxExp`, { exp: user.Exp || 0 }))[0] || null;
  const grades = await ca(`SELECT GradeLevel, GradeName, MinExp, MaxExp FROM CBT_GradeInfo ORDER BY GradeLevel`);
  const admins = await web(`SELECT userId, role FROM admin_users WHERE userId = @id`, p);
  const twofa = await web(`SELECT userId, enabledAt FROM two_factor WHERE userId = @id`, p);
  const nx = await vis(`SELECT TOP 1 TotalBalance, RealBalance, BonusBalance FROM VISMS_UserList WHERE oid = @id`, p);
  const discord = await ca(`SELECT TOP 1 discord_id, data_vinculo FROM DiscordAccounts WHERE oidUser = @id`, p);

  let matches = await log(`
    SELECT TOP 40 g.EndDate, g.GameMode, g.GameType, g.MapNo, g.KillCnt, g.DeadCnt, g.Assist, g.WinType, g.PlayEndType,
      m.Name as ModeName, mp.Name as MapName
    FROM CBT_UserGameLog01 g
    LEFT JOIN COMBATARMS.dbo.CBT_GameMode m ON m.Mode = g.GameMode
    LEFT JOIN COMBATARMS.dbo.CBT_GameMap mp ON mp.MapID = g.MapNo
    WHERE g.oidUser = @id AND g.EndDate >= DATEADD(day, -90, GETDATE())
    ORDER BY g.EndDate DESC`, p);
  if (!matches.length) {
    matches = await log(`
      SELECT TOP 40 g.EndDate, g.GameMode, g.GameType, g.MapNo, g.KillCnt, g.DeadCnt, g.Assist, g.WinType, g.PlayEndType,
        m.Name as ModeName, mp.Name as MapName
      FROM CBT_UserGameLog02 g
      LEFT JOIN COMBATARMS.dbo.CBT_GameMode m ON m.Mode = g.GameMode
      LEFT JOIN COMBATARMS.dbo.CBT_GameMap mp ON mp.MapID = g.MapNo
      WHERE g.oidUser = @id AND g.EndDate >= DATEADD(day, -90, GETDATE())
      ORDER BY g.EndDate DESC`, p);
  }
  if (matches.length && !matches[0].ModeName) {
    const modes = await ca(`SELECT Mode, Name FROM CBT_GameMode`);
    const maps = await ca(`SELECT MapID, Name FROM CBT_GameMap`);
    const modeMap = Object.fromEntries(modes.map((x) => [x.Mode, x.Name]));
    const mapMap = Object.fromEntries(maps.map((x) => [x.MapID, x.Name]));
    matches = matches.map((row) => ({ ...row, ModeName: modeMap[row.GameMode], MapName: mapMap[row.MapNo] }));
  }

  const nicks = await log(`
    SELECT PreviousNickName, CurrentNickName, RegDate
    FROM CBT_UserNickNameChangeHistory WHERE oiduser = @id ORDER BY RegDate DESC`, p);
  const punishments = await web(`
    SELECT id, type, reason, issuedByName, startsAt, endsAt, liftedAt, liftedByName, createdAt
    FROM punishments WHERE userId = @id ORDER BY createdAt DESC`, p);
  const bans = await log(`
    SELECT TOP 20 BanDate, BanType, BanPeriod, Reason, BanNickName, GMOidUser
    FROM CBT_BanUserList WHERE BanOidUser = @id ORDER BY BanDate DESC`, p);
  const inventory = await ca(`
    SELECT TOP 80 i.InventorySeqNo, i.ItemNo, i.ProductID, i.StartDate, i.EndDate, i.remaincount, inf.Name, inf.ItemGrade
    FROM CBT_UserInventory i
    LEFT JOIN CBT_ItemInfo inf ON inf.ItemNo = i.ItemNo
    WHERE i.oidUser = @id
    ORDER BY i.InventorySeqNo DESC`, p);
  const inbox = await ca(`
    SELECT TOP 40 UserStoreSeqNo, ProductID, GiftType, SendNickname, Message, RecvDate, enddate, ConfirmType
    FROM CBT_UserStore WHERE OidUser = @id ORDER BY RecvDate DESC`, p);
  const purchases = await vis(`
    SELECT TOP 40 OrderID, ProductNo, TotalPrice, PaymentType, IsGift, RegDate, strNexonID
    FROM VISMS_PurchaseLog WHERE oid = @id ORDER BY RegDate DESC`, p);
  const friends = await ca(`
    SELECT TOP 40 f.oidFriend, f.RegDate, u.NickName, u.strNexonID as username
    FROM CBT_MessengerFriend f
    LEFT JOIN CBT_User u ON u.oidUser = f.oidFriend
    WHERE f.oidUser = @id
    ORDER BY f.RegDate DESC`, p);
  const member = await guild(`SELECT TOP 1 oidGuild FROM dbo.gdt_Member WHERE oidUser = @id OR oidCharacter = @id`, p);
  let clan = null;
  if (member[0]?.oidGuild) {
    const clans = await guild(`
      SELECT oidGuild, strName, strID, dn_strCharacterName_master, dn_n4TotalRegularMember
      FROM dbo.gdt_Guild WHERE oidGuild = @gid`, { gid: member[0].oidGuild });
    clan = clans[0] || null;
  }
  const reports = await log(`
    SELECT TOP 30 SeqNo, ReporterOiduser, MainCategory, SubCategory, TargetOiduser, TargetNickName, Message, RegDate
    FROM CBT_UserReportCommon WHERE TargetOiduser = @id OR ReporterOiduser = @id ORDER BY RegDate DESC`, p);

  const now = new Date();
  const banned = user.Status === 2 || (user.StatusEndDate && new Date(user.StatusEndDate) > now) || (user.BlockEndDate && new Date(user.BlockEndDate) > now);
  const muted = user.SilenceEndDate && new Date(user.SilenceEndDate) > now;
  const webRole = admins[0]?.role || null;
  const superAdmin = user.username === 'villauribe12' || String(webRole || '').toLowerCase() === 'superadmin';

  res.json({
    user: {
      ...user,
      rank: grade?.rank ?? 0,
      rankName: grade?.rankName || 'TRAINEE',
      webRole,
      isGM: user.UserType === 1,
      superAdmin,
      accountStatus: banned ? 'banned' : 'active',
      muted: Boolean(muted),
      emailVerified: Boolean(user.bIsMailActive),
      twofa: Boolean(twofa[0]),
      twofaSince: twofa[0]?.enabledAt || null,
      nx: nx[0]?.TotalBalance ?? 0,
      discord: discord[0] || null,
      countryCode: user.CountryCode,
      countryName: user.CountryName,
    },
    grades,
    matches: matches.map((row) => ({
      ...row,
      result: row.WinType === 1 ? 'WIN' : (row.PlayEndType && row.PlayEndType !== 0 ? 'LEFT' : (row.WinType === 0 ? 'LOSS' : 'LEFT')),
    })),
    nicks,
    punishments,
    bans,
    inventory,
    inbox,
    purchases,
    friends,
    clan,
    reports,
  });
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

function winnerLabel(type) {
  const n = Number(type);
  if (n === 1) return 'ALPHA';
  if (n === 2) return 'BRAVO';
  if (n > 2) return `SLOT ${n - 1}`;
  return '—';
}

router.get('/matches', async (req, res) => {
  const q = String(req.query.q || '').trim();
  const mode = req.query.mode !== undefined && req.query.mode !== '' ? parseInt(String(req.query.mode), 10) : null;
  const days = req.query.days === undefined || req.query.days === '' ? 7 : parseInt(String(req.query.days), 10);
  const page = Math.max(1, parseInt(String(req.query.page || '1'), 10) || 1);
  const limit = 25;
  const offset = (page - 1) * limit;
  const params = { offset, limit };
  let where = `r.PlayerCnt > 0`;
  if (Number.isFinite(days) && days > 0) {
    where += ` AND r.EndDate >= DATEADD(day, -@days, GETDATE())`;
    params.days = days;
  }

  if (q) {
    let oid = null;
    if (q.startsWith('#') && /^\d+$/.test(q.slice(1))) oid = parseInt(q.slice(1), 10);
    else if (/^\d+$/.test(q) && q.length <= 8) oid = parseInt(q, 10);
    else {
      const found = await ca(`
        SELECT TOP 20 oidUser FROM CBT_User
        WHERE strNexonID LIKE @q OR NickName LIKE @q`, { q: `%${q}%` });
      const ids = found.map((r) => r.oidUser).filter((n) => Number.isFinite(n));
      if (!ids.length) {
        const modes = await ca(`SELECT Mode, Name FROM CBT_GameMode ORDER BY Mode`);
        return res.json({ data: [], total: 0, page, limit, showingFrom: 0, showingTo: 0, modes });
      }
      where += ` AND r.RoomKeyNo IN (
        SELECT RoomKeyNo FROM CBT_UserGameLog01 WHERE oidUser IN (${ids.join(',')})
        UNION
        SELECT RoomKeyNo FROM CBT_UserGameLog02 WHERE oidUser IN (${ids.join(',')})
      )`;
    }
    if (oid) {
      params.oid = oid;
      where += ` AND r.RoomKeyNo IN (
        SELECT RoomKeyNo FROM CBT_UserGameLog01 WHERE oidUser = @oid
        UNION
        SELECT RoomKeyNo FROM CBT_UserGameLog02 WHERE oidUser = @oid
      )`;
    }
  }

  if (Number.isFinite(mode)) {
    params.mode = mode;
    where += ` AND (
      SELECT TOP 1 GameMode FROM CBT_UserGameLog01 u WHERE u.RoomKeyNo = r.RoomKeyNo
    ) = @mode`;
  }

  const total = n(await log(`SELECT COUNT(*) as n FROM CBT_GameRoomLog01 r WHERE ${where}`, params));
  const list = await log(`
    SELECT r.GameRoomLogSeqNo as id, r.EndDate, r.MapNo, r.GameType, r.GameModeType, r.PlayerCnt,
      r.MaxPlayerCnt, r.WinTeamType, r.PlayTime, r.RestrictWeapon, r.RoomKeyNo,
      (SELECT TOP 1 GameMode FROM CBT_UserGameLog01 u WHERE u.RoomKeyNo = r.RoomKeyNo) as GameMode
    FROM CBT_GameRoomLog01 r
    WHERE ${where}
    ORDER BY r.EndDate DESC
    OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY`, params);

  const modes = await ca(`SELECT Mode, Name FROM CBT_GameMode ORDER BY Mode`);
  const maps = await ca(`SELECT MapID, Name FROM CBT_GameMap`);
  const modeMap = Object.fromEntries(modes.map((x) => [x.Mode, x.Name]));
  const mapMap = Object.fromEntries(maps.map((x) => [x.MapID, x.Name]));

  const data = list.map((row) => ({
    ...row,
    ModeName: modeMap[row.GameMode] || modeMap[row.GameType] || '—',
    MapName: mapMap[row.MapNo] || `Map ${row.MapNo}`,
    TypeName: row.RestrictWeapon ? 'Restricted' : 'Normal',
    Winner: winnerLabel(row.WinTeamType),
    Length: `${Number(row.PlayTime || 0)}m`,
  }));

  res.json({
    data,
    total,
    page,
    limit,
    showingFrom: data.length ? offset + 1 : 0,
    showingTo: offset + data.length,
    modes,
    source: 'COMBATARMS_LOG.CBT_GameRoomLog01 + CBT_UserGameLog01',
  });
});

router.get('/matches/room/:key', async (req, res) => {
  const key = parseInt(req.params.key, 10);
  if (!Number.isFinite(key)) return res.status(400).json({ error: 'invalid' });
  let players = await log(`
    SELECT TOP 16 oidUser, NickName, TeamType, KillCnt, DeadCnt, Assist, WinType, GameMode, MapNo, PlayTime
    FROM CBT_UserGameLog01 WHERE RoomKeyNo = @key ORDER BY KillCnt DESC`, { key });
  if (!players.length) {
    players = await log(`
      SELECT TOP 16 oidUser, NickName, TeamType, KillCnt, DeadCnt, Assist, WinType, GameMode, MapNo, PlayTime
      FROM CBT_UserGameLog02 WHERE RoomKeyNo = @key ORDER BY KillCnt DESC`, { key });
  }
  res.json({ players });
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
