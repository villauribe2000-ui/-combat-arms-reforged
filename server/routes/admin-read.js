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
  const inventoryStats = (await ca(`
    SELECT
      COUNT(*) as total,
      SUM(CASE WHEN i.EndDate IS NULL OR i.EndDate > GETDATE() THEN 1 ELSE 0 END) as active,
      SUM(CASE WHEN i.EndDate IS NOT NULL AND i.EndDate <= GETDATE() THEN 1 ELSE 0 END) as expired
    FROM CBT_UserInventory i
    WHERE i.oidUser = @id`, p))[0] || { total: 0, active: 0, expired: 0 };
  let inventory = await ca(`
    SELECT TOP 250 i.InventorySeqNo, i.ItemNo, i.ProductID, i.StartDate, i.EndDate, i.remaincount, i.UseType,
      inf.Name, inf.ItemGrade, inf.ItemType, p.ProductName
    FROM CBT_UserInventory i
    LEFT JOIN CBT_ItemInfo inf ON inf.ItemNo = i.ItemNo
    LEFT JOIN CBT_ProductInfo p ON p.ProductID = i.ProductID
    WHERE i.oidUser = @id
    ORDER BY i.StartDate DESC`, p);
  if (!inventory.length) {
    inventory = await ca(`
      SELECT TOP 250 i.InventorySeqNo, i.ItemNo, i.ProductID, i.StartDate, i.EndDate, i.remaincount, i.UseType,
        inf.Name, inf.ItemGrade, inf.ItemType
      FROM CBT_UserInventory i
      LEFT JOIN CBT_ItemInfo inf ON inf.ItemNo = i.ItemNo
      WHERE i.oidUser = @id
      ORDER BY i.StartDate DESC`, p);
  }
  let inbox = await ca(`
    SELECT TOP 80 s.UserStoreSeqNo, s.ProductID, s.GiftType, s.SendNickname, s.Message, s.RecvDate, s.enddate, s.ConfirmType,
      p.ProductName
    FROM CBT_UserStore s
    LEFT JOIN CBT_ProductInfo p ON p.ProductID = s.ProductID
    WHERE s.OidUser = @id
    ORDER BY s.RecvDate DESC`, p);
  if (!inbox.length) {
    inbox = await ca(`
      SELECT TOP 80 UserStoreSeqNo, ProductID, GiftType, SendNickname, Message, RecvDate, enddate, ConfirmType
      FROM CBT_UserStore WHERE OidUser = @id ORDER BY RecvDate DESC`, p);
  }
  let purchases = await vis(`
    SELECT TOP 80 l.OrderID, l.ProductNo, l.TotalPrice, l.PaymentType, l.IsGift, l.RegDate, l.strNexonID, pl.ProductName
    FROM VISMS_PurchaseLog l
    LEFT JOIN VISMS_ProductList pl ON pl.ProductNo = l.ProductNo
    WHERE l.oid = @id
    ORDER BY l.RegDate DESC`, p);
  if (!purchases.length) {
    purchases = await vis(`
      SELECT TOP 80 OrderID, ProductNo, TotalPrice, PaymentType, IsGift, RegDate, strNexonID
      FROM VISMS_PurchaseLog WHERE oid = @id ORDER BY RegDate DESC`, p);
  }
  const detail = (await ca(`
    SELECT TOP 1 NutShotCnt, SpyKillCnt, CoopKill, CoopDead, CoopSuccess, CoopPlayNum,
      HumanKillCnt, HumanDeathCnt, HumanWin, InfectKillCnt, InfectDeathCnt, InfectWin, QuaRanTinePlayNum
    FROM CBT_UserDetailInfo WHERE oiduser = @id`, p))[0] || null;
  let kicks = await ca(`
    SELECT TOP 40 logId, loggedAt, userId, kickReason, forfeited
    FROM CBT_CharacterKickedLog WHERE userId = @id ORDER BY loggedAt DESC`, p);
  if (!kicks.length) {
    kicks = await log(`
      SELECT TOP 40 logId, loggedAt, userId, kickReason, forfeited
      FROM CBT_CharacterKickedLog WHERE userId = @id ORDER BY loggedAt DESC`, p);
  }
  const kickCounts = (await ca(`
    SELECT TOP 1 oiduser, nomanercnt, bugplaycnt, defamationcnt, hackprogramusecnt, etc, kicktype, kicktypedecription
    FROM CBT_UserKickReason WHERE oiduser = @id`, p))[0] || null;
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
    inventoryStats: {
      total: Number(inventoryStats.total || 0),
      active: Number(inventoryStats.active || 0),
      expired: Number(inventoryStats.expired || 0),
    },
    inbox,
    purchases,
    detail,
    kicks,
    kickCounts,
    friends,
    clan,
    reports,
  });
});

let ccuTableReady = false;
async function ensureCcuSamples() {
  if (ccuTableReady) return;
  await web(`
    IF OBJECT_ID('ccu_samples', 'U') IS NULL
    BEGIN
      CREATE TABLE ccu_samples (
        id INT IDENTITY(1,1) PRIMARY KEY,
        sampledAt DATETIME NOT NULL DEFAULT GETDATE(),
        onlineCount INT NOT NULL
      );
      CREATE INDEX idx_ccu_sampled ON ccu_samples(sampledAt);
    END`);
  ccuTableReady = true;
}

function hourKey(date) {
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return null;
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getUTCFullYear()}-${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())} ${p(d.getUTCHours())}`;
}

function bumpHour(map, date, value) {
  const key = hourKey(date);
  if (!key) return;
  map[key] = Math.max(map[key] || 0, Number(value) || 0);
}

router.get('/online', async (_req, res) => {
  const list = await ca(`
    SELECT u.oidUser as id, u.strNexonID as username, u.NickName, u.Exp, u.KillCnt as kills,
      u.lastLoginDate, u.Status, u.UserType, u.NationCode, u.CreateDate,
      a.strEmail as email, g.CountryCode, g.CountryName
    FROM CBT_User u
    LEFT JOIN CBT_UserAuth a ON a.oidUser = u.oidUser
    LEFT JOIN CBT_GeoIPDetailInfo g ON g.CountryIndex = u.nationindex
    WHERE u.DeleteDate IS NULL AND u.Status = 1
    ORDER BY ISNULL(u.lastLoginDate, u.CreateDate) DESC`);
  const onlineNow = list.length;
  const now = new Date();

  await ensureCcuSamples().catch(() => {});
  const lastSample = await web(`SELECT TOP 1 sampledAt FROM ccu_samples ORDER BY sampledAt DESC`);
  const lastAt = lastSample[0]?.sampledAt ? new Date(lastSample[0].sampledAt).getTime() : 0;
  if (!lastAt || now.getTime() - lastAt > 45000) {
    await web(`INSERT INTO ccu_samples (sampledAt, onlineCount) VALUES (GETDATE(), @n)`, { n: onlineNow }).catch(() => {});
  }

  const stored = await web(`
    SELECT sampledAt, onlineCount FROM ccu_samples
    WHERE sampledAt >= DATEADD(hour, -48, GETDATE())
    ORDER BY sampledAt`);
  const cuSamples = await log(`
    SELECT CreateDate, Total_UserCnt FROM CBT_Stat_CU_Ex
    WHERE CreateDate >= DATEADD(hour, -48, GETDATE())
    ORDER BY CreateDate`);
  const sessions = await log(`
    SELECT oidUser, LoginDate, LogoutDate
    FROM CBT_UserLoginLog01
    WHERE LoginDate >= DATEADD(hour, -50, GETDATE())
       OR ISNULL(LogoutDate, GETDATE()) >= DATEADD(hour, -48, GETDATE())`);

  const hourMap = {};
  for (const row of stored) bumpHour(hourMap, row.sampledAt, row.onlineCount);
  for (const row of cuSamples) bumpHour(hourMap, row.CreateDate, row.Total_UserCnt);

  const end = new Date(now);
  end.setUTCMinutes(0, 0, 0);
  end.setUTCSeconds(0, 0);
  const hours = [];
  for (let i = 47; i >= 0; i -= 1) {
    const start = new Date(end.getTime() - i * 3600000);
    const stop = new Date(start.getTime() + 3600000);
    const key = hourKey(start);
    const seen = new Set();
    for (const s of sessions) {
      const from = new Date(s.LoginDate).getTime();
      const to = s.LogoutDate ? new Date(s.LogoutDate).getTime() : now.getTime();
      if (Number.isNaN(from) || Number.isNaN(to)) continue;
      if (from < stop.getTime() && to > start.getTime()) seen.add(s.oidUser);
    }
    if (i === 0) {
      for (const p of list) seen.add(p.id);
    }
    hourMap[key] = Math.max(hourMap[key] || 0, seen.size);
    hours.push({ t: start.toISOString(), peak: hourMap[key] || 0 });
  }

  const todayKey = hourKey(now).slice(0, 10);
  const todayPeaks = hours.filter((h) => hourKey(h.t)?.startsWith(todayKey)).map((h) => h.peak);
  const allPeaks = hours.map((h) => h.peak);

  res.json({
    data: list.map((p) => ({ ...p, isGM: p.UserType === 1 })),
    onlineNow,
    sampledAt: now.toISOString(),
    peakToday: Math.max(onlineNow, ...todayPeaks, 0),
    peak48: Math.max(onlineNow, ...allPeaks, 0),
    hourly: hours,
    source: 'CBT_User.Status=1 + CBT_UserLoginLog01 + combatarms_web.ccu_samples',
  });
});

function memberRole(type, masterId, userId) {
  if (Number(userId) === Number(masterId) || Number(type) === 1) return 'LEADER';
  if (Number(type) === 3) return 'OFFICER';
  return 'MEMBER';
}

router.get('/clans', async (_req, res) => {
  const list = await guild(`
    SELECT g.oidGuild, g.strName, g.strID, g.strNotice, g.dateCreated, g.oidUser_master,
      g.dn_strCharacterName_master, g.dn_n4TotalRegularMember, g.dn_n4TotalAssociateMember, g.codeGuildStatus,
      (SELECT COUNT(*) FROM dbo.gdt_Member m WHERE m.oidGuild = g.oidGuild) as members,
      (SELECT COUNT(*) FROM dbo.gdt_WaitingMember w WHERE w.oidGuild = g.oidGuild AND w.codeWaitingStatus = 1) as applications
    FROM dbo.gdt_Guild g
    ORDER BY (SELECT COUNT(*) FROM dbo.gdt_Member m WHERE m.oidGuild = g.oidGuild) DESC, g.oidGuild`);
  const stats = await ca(`SELECT oiduser_group, Exp, WinCnt, LoseCnt, DrawCnt, KillCnt, DeadCnt FROM CBT_ClanInfo`);
  const statMap = Object.fromEntries(stats.map((s) => [s.oiduser_group, s]));
  const data = list.map((g) => {
    const s = statMap[g.oidGuild] || {};
    return {
      ...g,
      members: Number(g.members || 0),
      applications: Number(g.applications || 0),
      wins: Number(s.WinCnt || 0),
      losses: Number(s.LoseCnt || 0),
      draws: Number(s.DrawCnt || 0),
      exp: Number(s.Exp || 0),
      kills: Number(s.KillCnt || 0),
      deaths: Number(s.DeadCnt || 0),
    };
  });
  res.json({ data, total: data.length, source: 'NX_GuildMaster.gdt_Guild + CBT_ClanInfo' });
});

router.get('/clans/:id', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!Number.isFinite(id)) return res.status(400).json({ error: 'invalid id' });
  const p = { id };
  const clans = await guild(`
    SELECT oidGuild, strName, strID, strNotice, dateCreated, oidUser_master, oidCharacter_master,
      dn_strCharacterName_master, dn_n4TotalRegularMember, dn_n4TotalAssociateMember, codeGuildStatus
    FROM dbo.gdt_Guild WHERE oidGuild = @id`, p);
  if (!clans.length) return res.status(404).json({ error: 'not found' });
  const clan = clans[0];
  const roster = await guild(`
    SELECT oidUser, oidCharacter, dn_strCharacterName, codeMemberType, codeMemberGroup, dateCreated
    FROM dbo.gdt_Member WHERE oidGuild = @id
    ORDER BY CASE WHEN codeMemberType = 1 THEN 0 ELSE 1 END, dateCreated`, p);
  const applications = await guild(`
    SELECT oidUser, dn_strCharacterName, codeWaitingStatus, dateCreated
    FROM dbo.gdt_WaitingMember WHERE oidGuild = @id AND codeWaitingStatus = 1
    ORDER BY dateCreated DESC`, p);
  const stats = (await ca(`
    SELECT TOP 1 Exp, Point, KillCnt, DeadCnt, WinCnt, LoseCnt, DrawCnt, Notice
    FROM CBT_ClanInfo WHERE oiduser_group = @id`, p))[0] || {};
  const ids = roster.map((m) => Number(m.oidUser)).filter((n) => Number.isFinite(n));
  let users = [];
  if (ids.length) {
    users = await ca(`
      SELECT oidUser as id, strNexonID as username, NickName, Exp, UserType, lastLoginDate
      FROM CBT_User WHERE oidUser IN (${ids.join(',')})`);
  }
  const userMap = Object.fromEntries(users.map((u) => [u.id, u]));
  res.json({
    clan: {
      ...clan,
      members: roster.length,
      applications: applications.length,
      exp: Number(stats.Exp || 0),
      wins: Number(stats.WinCnt || 0),
      losses: Number(stats.LoseCnt || 0),
      draws: Number(stats.DrawCnt || 0),
      kills: Number(stats.KillCnt || 0),
      deaths: Number(stats.DeadCnt || 0),
      notice: stats.Notice || clan.strNotice || '',
    },
    roster: roster.map((m) => {
      const u = userMap[m.oidUser] || {};
      return {
        ...m,
        id: m.oidUser,
        username: u.username || null,
        NickName: u.NickName || m.dn_strCharacterName,
        isGM: u.UserType === 1,
        lastLoginDate: u.lastLoginDate || null,
        role: memberRole(m.codeMemberType, clan.oidUser_master, m.oidUser),
      };
    }),
    applications,
  });
});

router.get('/shop', async (_req, res) => {
  const list = await ca(`
    SELECT TOP 80 p.ProductID, p.ProductName, p.Price, p.SalePrice, p.SaleType, p.BonusGP, v.ShopView
    FROM CBT_ProductInfo p
    LEFT JOIN CBT_ProductInfo_ShopView v ON v.ProductID = p.ProductID
    ORDER BY p.ProductID DESC`);
  res.json({ data: list, source: 'CBT_ProductInfo + CBT_ProductInfo_ShopView' });
});

function ymdAdd(ymd, delta) {
  const [y, m, d] = String(ymd).split('-').map((x) => parseInt(x, 10));
  const dt = new Date(Date.UTC(y, m - 1, d + delta));
  return dt.toISOString().slice(0, 10);
}

router.get('/economy', async (req, res) => {
  const days = [7, 30, 90].includes(parseInt(String(req.query.days), 10))
    ? parseInt(String(req.query.days), 10)
    : 30;
  const p = { days };

  const shop = (await log(`
    SELECT
      COUNT(*) as purchases,
      SUM(CASE WHEN currency LIKE 'Gp%' THEN CAST(price AS BIGINT) ELSE 0 END) as gpSpent,
      SUM(CASE WHEN currency LIKE 'Nx%' THEN CAST(price AS BIGINT) ELSE 0 END) as nxSpent
    FROM CBT_CharacterBuyProductLog
    WHERE loggedAt >= DATEADD(day, -@days, GETDATE())`, p))[0] || {};

  const billing = (await vis(`
    SELECT COUNT(*) as orders,
      SUM(CAST(TotalPrice AS BIGINT)) as nx,
      SUM(CASE WHEN IsGift = 1 THEN 1 ELSE 0 END) as gifts
    FROM VISMS_PurchaseLog
    WHERE RegDate >= DATEADD(day, -@days, GETDATE())`, p))[0] || {};

  const heldNx = (await vis(`
    SELECT SUM(CAST(TotalBalance AS BIGINT)) as nx,
      COUNT(*) as accounts,
      SUM(CASE WHEN TotalBalance > 0 THEN 1 ELSE 0 END) as withNx
    FROM VISMS_UserList`))[0] || {};

  const heldGp = (await ca(`
    SELECT SUM(CAST(Money AS BIGINT)) as gp
    FROM CBT_User WHERE DeleteDate IS NULL`))[0] || {};

  const dailyShop = await log(`
    SELECT CONVERT(varchar(10), loggedAt, 120) as d,
      SUM(CASE WHEN currency LIKE 'Gp%' THEN CAST(price AS BIGINT) ELSE 0 END) as gp,
      SUM(CASE WHEN currency LIKE 'Nx%' THEN CAST(price AS BIGINT) ELSE 0 END) as nx
    FROM CBT_CharacterBuyProductLog
    WHERE loggedAt >= DATEADD(day, -@days, GETDATE())
    GROUP BY CONVERT(varchar(10), loggedAt, 120)
    ORDER BY d`, p);

  const todayRow = await log(`SELECT CONVERT(varchar(10), GETDATE(), 120) as d`);
  const today = todayRow[0]?.d || new Date().toISOString().slice(0, 10);
  const dayMap = Object.fromEntries(dailyShop.map((r) => [r.d, r]));
  const daily = [];
  for (let i = days - 1; i >= 0; i -= 1) {
    const d = ymdAdd(today, -i);
    const row = dayMap[d] || {};
    daily.push({
      t: `${d}T00:00:00.000Z`,
      d,
      gp: Number(row.gp || 0),
      nx: Number(row.nx || 0),
    });
  }

  res.json({
    days,
    purchases: Number(shop.purchases || 0),
    gpSpent: Number(shop.gpSpent || 0),
    nxSpent: Number(shop.nxSpent || 0),
    nxOrders: Number(billing.orders || 0),
    nxBilling: Number(billing.nx || 0),
    nxGifts: Number(billing.gifts || 0),
    nxHeld: Number(heldNx.nx || 0),
    nxAccounts: Number(heldNx.withNx || 0),
    gpHeld: Number(heldGp.gp || 0),
    daily,
    source: 'CBT_CharacterBuyProductLog + VISMS_PurchaseLog + VISMS_UserList + CBT_User.Money',
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

function howLoginEnded(status, playEnd) {
  const s = Number(status);
  const p = Number(playEnd);
  if (s === 1 || p === 0) return 'Logged out';
  if (s === 12 || s === 7777) return 'Moved lobby';
  if (s === 9) return 'Disconnected';
  if (s === 0) return 'Connection lost';
  return `Status ${Number.isFinite(s) ? s : '—'}`;
}

function stayLabel(seconds) {
  const sec = Math.max(0, Number(seconds) || 0);
  const mins = Math.floor(sec / 60);
  return `${mins}min`;
}

router.get('/logins', async (req, res) => {
  const q = String(req.query.q || '').trim();
  const days = req.query.days === undefined || req.query.days === '' ? 7 : parseInt(String(req.query.days), 10);
  const page = Math.max(1, parseInt(String(req.query.page || '1'), 10) || 1);
  const limit = 25;
  const offset = (page - 1) * limit;
  const params = { offset, limit };
  let where = '1 = 1';
  if (Number.isFinite(days) && days > 0) {
    where += ' AND LoginDate >= DATEADD(day, -@days, GETDATE())';
    params.days = days;
  }
  if (q.startsWith('#') && /^\d+$/.test(q.slice(1))) {
    where += ' AND oidUser = @oid';
    params.oid = parseInt(q.slice(1), 10);
  } else if (/^\d+$/.test(q) && q.length <= 8) {
    where += ' AND oidUser = @oid';
    params.oid = parseInt(q, 10);
  } else if (q) {
    where += ' AND (NickName LIKE @q OR strNexonID LIKE @q OR CAST(oidUser AS VARCHAR(20)) LIKE @q)';
    params.q = `%${q}%`;
  }

  const fromTable = async (table) => {
    const total = n(await log(`SELECT COUNT(*) as n FROM ${table} WHERE ${where}`, params));
    const list = await log(`
      SELECT UserLoginLogSeqNo as id, oidUser, strNexonID as username, NickName, IP,
        LoginDate, LogoutDate, LogoutStatus, PlayEndType, LobbyServerNo,
        DATEDIFF(second, LoginDate, LogoutDate) as staySeconds
      FROM ${table}
      WHERE ${where}
      ORDER BY LoginDate DESC
      OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY`, params);
    return { total, list };
  };

  let result = await fromTable('CBT_UserLoginLog01');
  if (!result.total) result = await fromTable('CBT_UserLoginLog02');

  res.json({
    data: result.list.map((row) => ({
      ...row,
      stayed: stayLabel(row.staySeconds),
      ended: howLoginEnded(row.LogoutStatus, row.PlayEndType),
    })),
    total: result.total,
    page,
    limit,
    showingFrom: result.list.length ? offset + 1 : 0,
    showingTo: offset + result.list.length,
    source: 'COMBATARMS_LOG.CBT_UserLoginLog01',
  });
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
