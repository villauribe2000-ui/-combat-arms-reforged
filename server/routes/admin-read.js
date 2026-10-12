import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { query, queryGuildDB, queryLog, queryVisms, queryWeb } from '../db.js';
import { ensureStaffTables, roleFlags } from '../site-admin.js';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this';
const STAFF_OWNER = 'villauribe12';

function staffActor(req) {
  const header = String(req.headers.authorization || '');
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!token) return null;
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const username = String(decoded?.username || '');
    if (!username) return null;
    return { username, userId: Number(decoded?.userId || 0) };
  } catch {
    return null;
  }
}

function requireStaffOwner(req, res) {
  if (staffActor(req)?.username !== STAFF_OWNER) {
    res.status(403).json({ error: 'Solo el dueño puede cambiar roles' });
    return false;
  }
  return true;
}

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
  await ensureStaffTables();
  const admins = await web(`SELECT userId, role, siteAdmin, isGm FROM admin_users`);
  const adminMap = {};
  for (const row of admins) adminMap[Number(row.userId)] = row;
  if (role === 'gm') {
    const gmIds = admins.filter((r) => roleFlags(r).webGm).map((r) => Number(r.userId)).filter(Number.isFinite);
    where += gmIds.length
      ? ` AND (u.UserType = 1 OR u.oidUser IN (${gmIds.join(',')}))`
      : ` AND u.UserType = 1`;
  }
  if (role === 'player') where += ` AND ISNULL(u.UserType, 0) <> 1`;
  if (role === 'admin') {
    const ids = admins.filter((r) => roleFlags(r).siteAdmin).map((r) => Number(r.userId)).filter(Number.isFinite);
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
    const flags = roleFlags(adminMap[p.id]);
    const superAdmin = p.username === 'villauribe12' || String(flags.role || '').toLowerCase() === 'superadmin';
    return {
      ...p,
      webRole: flags.role,
      webGm: flags.webGm,
      siteAdmin: flags.siteAdmin || superAdmin,
      superAdmin,
      isGM: p.UserType === 1 || flags.webGm,
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
  await ensureStaffTables();
  const admins = await web(`SELECT userId, role, siteAdmin, isGm FROM admin_users WHERE userId = @id`, p);
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
  const flags = roleFlags(admins[0]);
  const superAdmin = user.username === 'villauribe12' || String(flags.role || '').toLowerCase() === 'superadmin';

  res.json({
    user: {
      ...user,
      rank: grade?.rank ?? 0,
      rankName: grade?.rankName || 'TRAINEE',
      webRole: flags.role,
      webGm: flags.webGm,
      siteAdmin: flags.siteAdmin || superAdmin,
      isGM: user.UserType === 1 || flags.webGm,
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

function saleLabel(type) {
  const n = Number(type);
  if (n === 1) return 'GP';
  if (n === 0) return 'NX';
  if (n === 3) return 'NX';
  return 'GP';
}

function periodLabel(period, consume) {
  const p = Number(period || 0);
  const c = Number(consume || 0);
  if (c === 3 || p >= 200 || p <= 0) return 'PERM';
  return `X${p}`;
}

router.get('/shop', async (req, res) => {
  const q = String(req.query.q || '').trim();
  const inShop = n(await ca(`SELECT COUNT(*) as n FROM CBT_ProductInfo_ShopView WHERE ShopView = 1`));
  let products = [];
  if (q) {
    const params = { q: `%${q}%` };
    let where = `p.ProductName LIKE @q`;
    if (/^\d+$/.test(q)) {
      params.id = parseInt(q, 10);
      where += ` OR p.ProductID = @id OR p.ItemNo00 = @id`;
    }
    products = await ca(`
      SELECT TOP 80 p.ProductID, p.ProductName, p.Price, p.SalePrice, p.SaleType, p.ItemNo00, p.Period00, p.ConsumeType00, v.ShopView,
        CASE WHEN g.Gift = 1 THEN 1 ELSE 0 END as giftable
      FROM CBT_ProductInfo p
      LEFT JOIN CBT_ProductInfo_ShopView v ON v.ProductID = p.ProductID
      LEFT JOIN CBT_ProductInfo_Gift g ON g.ProductID = p.ProductID
      WHERE ${where}
      ORDER BY CASE WHEN v.ShopView = 1 THEN 0 ELSE 1 END, p.ProductID`, params);
  } else {
    products = await ca(`
      SELECT TOP 120 p.ProductID, p.ProductName, p.Price, p.SalePrice, p.SaleType, p.ItemNo00, p.Period00, p.ConsumeType00, v.ShopView,
        CASE WHEN g.Gift = 1 THEN 1 ELSE 0 END as giftable
      FROM CBT_ProductInfo p
      INNER JOIN CBT_ProductInfo_ShopView v ON v.ProductID = p.ProductID AND v.ShopView = 1
      LEFT JOIN CBT_ProductInfo_Gift g ON g.ProductID = p.ProductID
      LEFT JOIN CBT_ProductInfo_FirstBuy f ON f.ProductID = p.ProductID
      WHERE g.Gift = 1 OR f.ProductID IS NOT NULL
         OR p.ProductID IN (SELECT ProductID FROM CBT_ProductInfo_ShopEvent UNION SELECT EventProductID FROM CBT_ProductInfo_ShopEvent)
      ORDER BY p.ProductID`);
    if (products.length < 8) {
      products = await ca(`
        SELECT TOP 60 p.ProductID, p.ProductName, p.Price, p.SalePrice, p.SaleType, p.ItemNo00, p.Period00, p.ConsumeType00, v.ShopView,
          CASE WHEN g.Gift = 1 THEN 1 ELSE 0 END as giftable
        FROM CBT_ProductInfo p
        INNER JOIN CBT_ProductInfo_ShopView v ON v.ProductID = p.ProductID AND v.ShopView = 1
        LEFT JOIN CBT_ProductInfo_Gift g ON g.ProductID = p.ProductID
        WHERE p.ItemNo00 IN (9049, 9040, 9041) OR g.Gift = 1
        ORDER BY p.ItemNo00, p.Period00`);
    }
  }

  const eventsRaw = await ca(`
    SELECT e.ProductID, e.EventType, e.Start, e.[End] as Ends, e.EventProductID, e.Message,
      p.ProductName, g.ProductName as GiftName
    FROM CBT_ProductInfo_ShopEvent e
    LEFT JOIN CBT_ProductInfo p ON p.ProductID = e.ProductID
    LEFT JOIN CBT_ProductInfo g ON g.ProductID = e.EventProductID
    ORDER BY e.[End] DESC`);
  const now = Date.now();
  const events = eventsRaw.map((e) => ({
    ...e,
    for: 'Own use',
    status: e.Ends && new Date(e.Ends).getTime() < now ? 'ENDED' : 'ACTIVE',
  }));

  const buyRows = await log(`
    SELECT TOP 80 loggedAt, buyer, productId, currency, price
    FROM CBT_CharacterBuyProductLog ORDER BY loggedAt DESC`);
  const pids = [...new Set(buyRows.map((b) => b.productId).filter((n) => Number.isFinite(n)))];
  const uids = [...new Set(buyRows.map((b) => b.buyer).filter((n) => Number.isFinite(n)))];
  let pmap = {};
  let umap = {};
  if (pids.length) {
    const names = await ca(`SELECT ProductID, ProductName, ItemNo00 FROM CBT_ProductInfo WHERE ProductID IN (${pids.join(',')})`);
    pmap = Object.fromEntries(names.map((p) => [p.ProductID, p]));
  }
  if (uids.length) {
    const users = await ca(`SELECT oidUser as id, NickName, strNexonID as username FROM CBT_User WHERE oidUser IN (${uids.join(',')})`);
    umap = Object.fromEntries(users.map((u) => [u.id, u]));
  }
  const purchases = buyRows.map((b) => ({
    ...b,
    ProductName: pmap[b.productId]?.ProductName || `Product #${b.productId}`,
    ItemNo: pmap[b.productId]?.ItemNo00 || null,
    NickName: umap[b.buyer]?.NickName || umap[b.buyer]?.username || `#${b.buyer}`,
    currency: String(b.currency || '').trim().toUpperCase(),
  }));

  const groups = {};
  for (const p of products) {
    const key = p.ItemNo00 || p.ProductID;
    if (!groups[key]) {
      groups[key] = {
        itemNo: p.ItemNo00,
        name: p.ProductName,
        image: p.ItemNo00 ? `https://caevo.net/items/${p.ItemNo00}.png` : null,
        variants: [],
      };
    }
    groups[key].variants.push({
      id: p.ProductID,
      period: periodLabel(p.Period00, p.ConsumeType00),
      currency: saleLabel(p.SaleType),
      price: p.SalePrice || p.Price,
      base: p.Price,
      inShop: Number(p.ShopView) === 1,
      giftable: Number(p.giftable) === 1,
      hot: false,
      neu: false,
      sale: Number(p.SalePrice) > 0 && Number(p.SalePrice) < Number(p.Price),
    });
  }

  res.json({
    groups: Object.values(groups),
    events,
    purchases,
    inShop,
    source: 'CBT_ProductInfo + ShopView/Gift/ShopEvent + CBT_CharacterBuyProductLog',
  });
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

function reportCategory(main, sub) {
  const mains = {
    1: 'Abuse',
    2: 'Cheat',
    3: 'Team kill',
    4: 'Bug play',
    5: 'Harassment',
    6: 'Bad language',
    7: 'Other',
  };
  const label = mains[Number(main)] || `Category ${main ?? '—'}`;
  return Number(sub) ? `${label} / ${sub}` : label;
}

function normalizeReviewStatus(status) {
  const s = String(status || '').toLowerCase();
  if (s === 'handled' || s === 'closed' || s === 'done') return 'handled';
  if (s === 'dismissed' || s === 'rejected') return 'dismissed';
  return 'open';
}

router.get('/reports', async (_req, res) => {
  const list = await log(`
    SELECT TOP 200 SeqNo, ReporterOiduser, MainCategory, SubCategory, TargetOiduser, TargetNickName, Message, RegDate
    FROM CBT_UserReportCommon ORDER BY RegDate DESC`);
  const reviews = await web(`
    SELECT reportSeq, status, note, reviewedBy, reviewedByName, reviewedAt FROM report_reviews`);
  const reviewMap = {};
  for (const r of reviews) reviewMap[r.reportSeq] = r;
  const ids = [...new Set(list.flatMap((r) => [r.ReporterOiduser, r.TargetOiduser]).filter((n) => Number.isFinite(n)))];
  let users = [];
  if (ids.length) {
    users = await ca(`SELECT oidUser as id, strNexonID as username, NickName, UserType FROM CBT_User WHERE oidUser IN (${ids.join(',')})`);
  }
  const userMap = Object.fromEntries(users.map((u) => [u.id, u]));
  const data = list.map((r) => {
    const review = reviewMap[r.SeqNo];
    const reporter = userMap[r.ReporterOiduser] || {};
    const target = userMap[r.TargetOiduser] || {};
    return {
      ...r,
      id: r.SeqNo,
      reporterName: reporter.NickName || reporter.username || `#${r.ReporterOiduser}`,
      reporterUser: reporter.username || null,
      reportedName: r.TargetNickName || target.NickName || target.username || `#${r.TargetOiduser}`,
      category: reportCategory(r.MainCategory, r.SubCategory),
      status: review ? normalizeReviewStatus(review.status) : 'open',
      note: review?.note || '',
      reviewedByName: review?.reviewedByName || null,
      reviewedAt: review?.reviewedAt || null,
    };
  });
  const counts = {
    open: data.filter((r) => r.status === 'open').length,
    handled: data.filter((r) => r.status === 'handled').length,
    dismissed: data.filter((r) => r.status === 'dismissed').length,
    all: data.length,
  };
  res.json({ data, counts, source: 'COMBATARMS_LOG.CBT_UserReportCommon + combatarms_web.report_reviews' });
});

router.get('/reports/:seq', async (req, res) => {
  const seq = parseInt(req.params.seq, 10);
  if (!Number.isFinite(seq)) return res.status(400).json({ error: 'invalid id' });
  const rows = await log(`
    SELECT TOP 1 SeqNo, ReporterOiduser, MainCategory, SubCategory, TargetOiduser, TargetNickName, Message, RegDate
    FROM CBT_UserReportCommon WHERE SeqNo = @seq`, { seq });
  if (!rows.length) return res.status(404).json({ error: 'not found' });
  const chat = await log(`
    SELECT SeqNo, RegDate, ChatLog FROM CBT_UserReportChatLog WHERE ReportCommonSeqNo = @seq ORDER BY RegDate`, { seq });
  const match = (await log(`
    SELECT TOP 1 ReportCommonSeqNo, RoomID, ModeID, GoalScore, AlphaScore, BravoScore, UserNum, KillCnt
    FROM CBT_UserReportInGameLog WHERE ReportCommonSeqNo = @seq`, { seq }))[0] || null;
  const review = (await web(`SELECT TOP 1 * FROM report_reviews WHERE reportSeq = @seq`, { seq }))[0] || null;
  res.json({ report: rows[0], chat, match, review });
});

router.post('/reports/:seq/review', async (req, res) => {
  const seq = parseInt(req.params.seq, 10);
  const status = normalizeReviewStatus(req.body?.status);
  if (!Number.isFinite(seq) || status === 'open') return res.status(400).json({ error: 'invalid' });
  const note = String(req.body?.note || '').slice(0, 500);
  const reviewedByName = String(req.body?.reviewedByName || 'admin').slice(0, 50);
  const reviewedBy = parseInt(String(req.body?.reviewedBy || 0), 10) || 0;
  const existing = await web(`SELECT TOP 1 reportSeq FROM report_reviews WHERE reportSeq = @seq`, { seq });
  if (existing.length) {
    await web(`
      UPDATE report_reviews
      SET status = @status, note = @note, reviewedBy = @reviewedBy, reviewedByName = @reviewedByName, reviewedAt = SYSUTCDATETIME()
      WHERE reportSeq = @seq`, { seq, status, note, reviewedBy, reviewedByName });
  } else {
    await web(`
      INSERT INTO report_reviews (reportSeq, status, note, reviewedBy, reviewedByName, reviewedAt)
      VALUES (@seq, @status, @note, @reviewedBy, @reviewedByName, SYSUTCDATETIME())`,
    { seq, status, note, reviewedBy, reviewedByName });
  }
  res.json({ ok: true, status });
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
  const ticker = await ca(`
    SELECT ADMessageNo, ADCommandID, ADMessage, ADURL, Enable
    FROM CBT_AdvertiseMessage ORDER BY ADMessageNo`);
  const scheduled = await ca(`
    SELECT MessageSetID, MessageType, MessageNo, CommandID, ViewEnable, ViewDate, Enable, Message, URL
    FROM CBT_AdvertiseMessageInfo ORDER BY ViewDate DESC`);
  const settings = (await ca(`SELECT ADReady, CurrentADNo, ADCount, Color, Speed, ShowType FROM CBT_Advertise`))[0] || {};
  const nowRow = await ca(`SELECT GETDATE() as now`);
  const showing = ticker.filter((m) => Number(m.Enable) === 1);
  const current = showing.find((m) => m.ADMessageNo === settings.CurrentADNo) || showing[0] || null;
  res.json({
    ticker: ticker.map((m) => ({
      ...m,
      status: Number(m.Enable) === 1 ? 'ON' : 'OFF',
      click: m.ADURL || '—',
    })),
    scheduled: scheduled.map((m) => ({
      ...m,
      change: Number(m.Enable) === 1 ? 'Enable' : Number(m.ViewEnable) === 1 ? 'Show' : 'Update',
      click: m.URL || '—',
    })),
    settings,
    current,
    showingNow: Boolean(Number(settings.ADReady) === 1 && current),
    serverNow: nowRow[0]?.now || new Date().toISOString(),
    source: 'CBT_Advertise + CBT_AdvertiseMessage + CBT_AdvertiseMessageInfo',
  });
});

const LOBBY_NAMES = {
  2: 'Level 2',
  3: 'Normal lobby (3)',
  4: 'Clan lobby (4)',
  5: 'Recreation lobby (5)',
  6: 'Level 6',
  7: 'Level 7',
};

router.get('/maps', async (_req, res) => {
  const modes = await ca(`SELECT Mode, ModeType, Name FROM CBT_GameMode ORDER BY Mode`);
  const open = await ca(`
    SELECT o.ClearanceLevel, o.ModeID, o.MapID, o.IsDefaultMap, o.Enable, o.IsOfficial, m.Name as MapName, g.Name as ModeName
    FROM CBT_MapOpen o
    LEFT JOIN CBT_GameMap m ON m.MapID = o.MapID
    LEFT JOIN CBT_GameMode g ON g.Mode = o.ModeID
    ORDER BY o.ClearanceLevel, o.ModeID, m.Name`);
  const levels = [...new Set(open.map((r) => r.ClearanceLevel))].sort((a, b) => a - b);
  const lobbies = {};
  for (const lv of levels) {
    const rows = open.filter((r) => r.ClearanceLevel === lv);
    const byMode = {};
    for (const r of rows) {
      if (!byMode[r.ModeID]) {
        byMode[r.ModeID] = { modeId: r.ModeID, name: r.ModeName || `Mode ${r.ModeID}`, maps: [] };
      }
      byMode[r.ModeID].maps.push({
        mapId: r.MapID,
        name: r.MapName || `Map ${r.MapID}`,
        enable: Number(r.Enable) === 1,
        defaultMap: Number(r.IsDefaultMap) === 1,
      });
    }
    lobbies[lv] = Object.values(byMode).map((m) => ({
      ...m,
      on: m.maps.filter((x) => x.enable).length,
      total: m.maps.length,
    }));
  }
  res.json({
    levels: levels.map((lv) => ({ id: lv, label: LOBBY_NAMES[lv] || `Level ${lv}` })),
    lobbies,
    modeCount: modes.length,
    source: 'CBT_MapOpen + CBT_GameMap + CBT_GameMode',
  });
});

router.get('/boosts', async (_req, res) => {
  const nowRow = await ca(`SELECT GETDATE() as now`);
  const now = nowRow[0]?.now ? new Date(nowRow[0].now) : new Date();
  const modes = await ca(`SELECT Mode, Name FROM CBT_GameMode`);
  const maps = await ca(`SELECT MapID, Name FROM CBT_GameMap`);
  const modeMap = Object.fromEntries(modes.map((m) => [m.Mode, m.Name]));
  const mapMap = Object.fromEntries(maps.map((m) => [m.MapID, m.Name]));
  const events = await ca(`
    SELECT EventID, LobbyServerID, ModeID, MapID, EXPRate, GPRate, BeginTime, EndTime, Enable, [Desc] as description
    FROM CBT_EventEXPGP ORDER BY EventID DESC`);
  const data = events.map((e) => {
    const start = e.BeginTime ? new Date(e.BeginTime) : null;
    const end = e.EndTime ? new Date(e.EndTime) : null;
    let status = 'ENDED';
    if (start && end && now >= start && now <= end && Number(e.Enable) === 1) status = 'RUNNING';
    else if (start && now < start && Number(e.Enable) === 1) status = 'SCHEDULED';
    const modeName = e.ModeID < 0 ? 'All modes' : (modeMap[e.ModeID] || `Mode ${e.ModeID}`);
    const mapName = e.MapID < 0 ? 'all maps' : (mapMap[e.MapID] || `Map ${e.MapID}`);
    return {
      ...e,
      name: e.description || `Event ${e.EventID}`,
      where: `${modeName} · ${mapName}`,
      expLabel: `+${Number(e.EXPRate || 0)}`,
      gpLabel: `x${Number(e.GPRate || 0)}`,
      status,
    };
  });
  const running = data.filter((e) => e.status === 'RUNNING');
  const expSum = running.reduce((s, e) => s + Number(e.EXPRate || 0), 0);
  const gpSum = running.reduce((s, e) => s + Number(e.GPRate || 0), 0);
  res.json({
    data,
    running: running.length,
    expSum,
    gpSum,
    serverNow: now.toISOString(),
    source: 'CBT_EventEXPGP',
  });
});

async function currentPeriod() {
  const row = (await web(`SELECT CONVERT(char(7), GETDATE(), 126) as p`))[0];
  if (row?.p) return String(row.p).slice(0, 7);
  const d = new Date();
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

async function getQuota(userId) {
  const period = await currentPeriod();
  const id = Number(userId);
  let row = (await web(`SELECT userId, monthlyAllotment, period, used FROM staff_nx_quota WHERE userId = @id`, { id }))[0];
  if (!row) {
    return { userId: id, monthlyAllotment: 0, used: 0, remaining: 0, period };
  }
  if (String(row.period || '') !== period) {
    await queryWeb(`UPDATE staff_nx_quota SET used = 0, period = @period WHERE userId = @id`, { id, period });
    row.used = 0;
    row.period = period;
  }
  const monthlyAllotment = Number(row.monthlyAllotment || 0);
  const used = Number(row.used || 0);
  return { userId: id, monthlyAllotment, used, remaining: Math.max(0, monthlyAllotment - used), period };
}

async function giftsFor(fromUserId, limit = 80) {
  return web(`
    SELECT TOP (${Number(limit) || 80}) id, fromUserId, fromUsername, fromNick, fromRole,
      toUserId, toUsername, toNick, amount, period, createdAt
    FROM staff_nx_gifts
    WHERE fromUserId = @id
    ORDER BY createdAt DESC`, { id: Number(fromUserId) });
}

async function lookupStaff(actor) {
  const username = actor?.username;
  const userId = Number(actor?.userId || 0);
  if (username === STAFF_OWNER) {
    const users = await ca(`SELECT TOP 1 oidUser as id, strNexonID as username, NickName FROM CBT_User WHERE strNexonID = @u`, { u: STAFF_OWNER });
    const user = users[0] || { id: userId, username: STAFF_OWNER, NickName: STAFF_OWNER };
    return { ...user, userId: Number(user.id || userId), username: STAFF_OWNER, webRole: 'SUPERADMIN', siteAdmin: true, webGm: true };
  }
  let row = null;
  if (userId) row = (await web(`SELECT TOP 1 userId, username, nickName, role, siteAdmin, isGm FROM admin_users WHERE userId = @id`, { id: userId }))[0];
  if (!row && username) row = (await web(`SELECT TOP 1 userId, username, nickName, role, siteAdmin, isGm FROM admin_users WHERE username = @u`, { u: username }))[0];
  if (!row) return null;
  const flags = roleFlags(row);
  return { userId: Number(row.userId), username: row.username || username, NickName: row.nickName, ...flags, siteAdmin: true };
}

async function loadStaffBundle() {
  await ensureStaffTables();
  const roles = await web(`SELECT id, name, siteAdmin, isGm, createdBy, createdAt FROM staff_roles ORDER BY name`);
  const staffRows = await web(`
    SELECT userId, username, nickName, role, siteAdmin, isGm, grantedBy, grantedAt
    FROM admin_users ORDER BY grantedAt DESC`);
  const ids = staffRows.map((r) => Number(r.userId)).filter(Number.isFinite);
  let users = [];
  if (ids.length) {
    users = await ca(`
      SELECT u.oidUser as id, u.strNexonID as username, u.NickName, u.Exp, u.UserType, u.Status,
        a.strEmail as email
      FROM CBT_User u
      LEFT JOIN CBT_UserAuth a ON a.oidUser = u.oidUser
      WHERE u.oidUser IN (${ids.join(',')})`);
  }
  const byId = Object.fromEntries(users.map((u) => [Number(u.id), u]));
  const quotas = ids.length
    ? await web(`SELECT userId, monthlyAllotment, period, used FROM staff_nx_quota WHERE userId IN (${ids.join(',')})`)
    : [];
  const period = await currentPeriod();
  const quotaMap = {};
  for (const q of quotas) quotaMap[Number(q.userId)] = q;
  const staff = [];
  for (const row of staffRows) {
    const flags = roleFlags(row);
    const user = byId[Number(row.userId)] || {};
    let q = quotaMap[Number(row.userId)];
    if (q && String(q.period || '') !== period) {
      await queryWeb(`UPDATE staff_nx_quota SET used = 0, period = @period WHERE userId = @id`, { id: Number(row.userId), period });
      q = { ...q, used: 0, period };
    }
    const monthlyAllotment = Number(q?.monthlyAllotment || 0);
    const used = Number(q?.used || 0);
    staff.push({
      userId: Number(row.userId),
      username: user.username || row.username,
      NickName: user.NickName || row.nickName,
      email: user.email || null,
      Exp: user.Exp,
      UserType: user.UserType,
      webRole: flags.role,
      siteAdmin: flags.siteAdmin,
      webGm: flags.webGm,
      isGM: user.UserType === 1 || flags.webGm,
      grantedBy: row.grantedBy,
      grantedAt: row.grantedAt,
      monthlyAllotment,
      used,
      remaining: Math.max(0, monthlyAllotment - used),
      period,
    });
  }
  return { staff, roles: roles.map((r) => ({ ...r, siteAdmin: roleFlags({ ...r, role: r.name }).siteAdmin, isGm: roleFlags({ ...r, role: r.name, isGm: r.isGm }).webGm })), period };
}

router.get('/staff', async (_req, res) => {
  try {
    const bundle = await loadStaffBundle();
    res.json({ ...bundle, source: 'combatarms_web.admin_users + staff_roles' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/staff/search', async (req, res) => {
  const q = String(req.query.q || '').trim();
  if (q.length < 2) return res.json({ data: [] });
  await ensureStaffTables();
  const params = {};
  let where = `u.DeleteDate IS NULL`;
  if (q.startsWith('#') && /^\d+$/.test(q.slice(1))) {
    where += ` AND u.oidUser = @oid`;
    params.oid = parseInt(q.slice(1), 10);
  } else if (/^\d+$/.test(q) && q.length <= 8) {
    where += ` AND u.oidUser = @oid`;
    params.oid = parseInt(q, 10);
  } else {
    where += ` AND (u.strNexonID LIKE @q OR u.NickName LIKE @q OR a.strEmail LIKE @q)`;
    params.q = `%${q}%`;
  }
  const list = await ca(`
    SELECT TOP 25 u.oidUser as id, u.strNexonID as username, u.NickName, u.Exp, u.UserType, u.Status,
      a.strEmail as email
    FROM CBT_User u
    LEFT JOIN CBT_UserAuth a ON a.oidUser = u.oidUser
    WHERE ${where}
    ORDER BY u.oidUser DESC`, params);
  const staffRows = await web(`SELECT userId, role, siteAdmin, isGm FROM admin_users`);
  const adminMap = {};
  for (const row of staffRows) adminMap[Number(row.userId)] = row;
  res.json({
    data: list.map((p) => {
      const flags = roleFlags(adminMap[p.id]);
      return { ...p, webRole: flags.role, webGm: flags.webGm, siteAdmin: flags.siteAdmin, isGM: p.UserType === 1 || flags.webGm };
    }),
  });
});

router.get('/staff/me', async (req, res) => {
  try {
    await ensureStaffTables();
    const actor = staffActor(req);
    if (!actor) return res.status(401).json({ error: 'login required' });
    const me = await lookupStaff(actor);
    if (!me) return res.status(403).json({ error: 'no staff role' });
    const quota = await getQuota(me.userId);
    const gifts = await giftsFor(me.userId, 80);
    res.json({ me, quota, gifts, period: quota.period });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/staff/gifts', async (req, res) => {
  try {
    await ensureStaffTables();
    const actor = staffActor(req);
    if (!actor) return res.status(401).json({ error: 'login required' });
    const me = await lookupStaff(actor);
    if (!me) return res.status(403).json({ error: 'no staff role' });
    const q = String(req.query.q || '').trim();
    const params = {};
    let where = '1=1';
    if (q) {
      where += ` AND (fromUsername LIKE @q OR fromNick LIKE @q OR toUsername LIKE @q OR toNick LIKE @q)`;
      params.q = `%${q}%`;
    }
    const gifts = await web(`
      SELECT TOP 200 id, fromUserId, fromUsername, fromNick, fromRole,
        toUserId, toUsername, toNick, amount, period, createdAt
      FROM staff_nx_gifts
      WHERE ${where}
      ORDER BY createdAt DESC`, params);
    res.json({ gifts, period: await currentPeriod() });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/staff/:userId/desk', async (req, res) => {
  try {
    await ensureStaffTables();
    const userId = parseInt(req.params.userId, 10);
    if (!Number.isFinite(userId)) return res.status(400).json({ error: 'invalid' });
    const row = (await web(`SELECT TOP 1 userId, username, nickName, role, siteAdmin, isGm, grantedBy, grantedAt FROM admin_users WHERE userId = @id`, { id: userId }))[0];
    if (!row) return res.status(404).json({ error: 'not staff' });
    const flags = roleFlags(row);
    const user = (await ca(`SELECT TOP 1 oidUser as id, strNexonID as username, NickName FROM CBT_User WHERE oidUser = @id`, { id: userId }))[0] || {};
    const quota = await getQuota(userId);
    const gifts = await giftsFor(userId, 80);
    res.json({
      staff: {
        userId,
        username: user.username || row.username,
        NickName: user.NickName || row.nickName,
        webRole: flags.role,
        webGm: flags.webGm,
        siteAdmin: flags.siteAdmin,
        grantedBy: row.grantedBy,
        grantedAt: row.grantedAt,
      },
      quota,
      gifts,
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/staff/:userId/quota', async (req, res) => {
  try {
    if (!requireStaffOwner(req, res)) return;
    await ensureStaffTables();
    const userId = parseInt(req.params.userId, 10);
    const amount = Math.max(0, Math.floor(Number(req.body?.amount) || 0));
    if (!Number.isFinite(userId)) return res.status(400).json({ error: 'invalid' });
    const period = await currentPeriod();
    const existing = await web(`SELECT TOP 1 userId FROM staff_nx_quota WHERE userId = @id`, { id: userId });
    const updatedBy = STAFF_OWNER;
    if (existing.length) {
      await queryWeb(`
        UPDATE staff_nx_quota
        SET monthlyAllotment = @amount, period = @period, updatedBy = @updatedBy, updatedAt = GETDATE()
        WHERE userId = @id`, { id: userId, amount, period, updatedBy });
    } else {
      await queryWeb(`
        INSERT INTO staff_nx_quota (userId, monthlyAllotment, period, used, updatedBy, updatedAt)
        VALUES (@id, @amount, @period, 0, @updatedBy, GETDATE())`, { id: userId, amount, period, updatedBy });
    }
    res.json({ ok: true, quota: await getQuota(userId), staff: (await loadStaffBundle()).staff });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/staff/gift', async (req, res) => {
  try {
    await ensureStaffTables();
    const actor = staffActor(req);
    if (!actor) return res.status(401).json({ error: 'login required' });
    const me = await lookupStaff(actor);
    if (!me) {
      return res.status(403).json({ error: 'no staff role' });
    }
    const username = actor.username;
    const toUserId = parseInt(String(req.body?.toUserId), 10);
    const amount = Math.floor(Number(req.body?.amount) || 0);
    if (!Number.isFinite(toUserId) || amount <= 0) return res.status(400).json({ error: 'invalid amount' });
    if (amount > 50000000) return res.status(400).json({ error: 'amount too large' });
    const target = (await ca(`
      SELECT TOP 1 oidUser as id, strNexonID as username, NickName
      FROM CBT_User WHERE oidUser = @id AND DeleteDate IS NULL`, { id: toUserId }))[0];
    if (!target) return res.status(404).json({ error: 'player not found' });
    const quota = await getQuota(me.userId);
    const unlimited = username === STAFF_OWNER;
    if (!unlimited && quota.monthlyAllotment <= 0) {
      return res.status(400).json({ error: 'sin cupo mensual' });
    }
    if (!unlimited && amount > quota.remaining) {
      return res.status(400).json({ error: `cupo insuficiente. Quedan ${quota.remaining} NX` });
    }
    let updated = await queryVisms(
      `UPDATE VISMS_UserList SET RealBalance = ISNULL(RealBalance, 0) + @nx WHERE oid = @oid`,
      { nx: amount, oid: toUserId },
    );
    if (!updated?.rowsAffected?.[0]) {
      updated = await queryVisms(
        `UPDATE VISMS_UserList SET RealBalance = ISNULL(RealBalance, 0) + @nx WHERE strNexonID = @u`,
        { nx: amount, u: target.username },
      );
    }
    if (!updated?.rowsAffected?.[0]) {
      return res.status(500).json({ error: 'no se pudo acreditar NX en VISMS' });
    }
    const period = quota.period;
    if (!unlimited) {
      const qrow = await web(`SELECT TOP 1 userId FROM staff_nx_quota WHERE userId = @id`, { id: me.userId });
      if (qrow.length) {
        await queryWeb(`UPDATE staff_nx_quota SET used = used + @amount, period = @period WHERE userId = @id`, {
          id: me.userId, amount, period,
        });
      } else {
        await queryWeb(`
          INSERT INTO staff_nx_quota (userId, monthlyAllotment, period, used, updatedBy, updatedAt)
          VALUES (@id, 0, @period, @amount, @u, GETDATE())`, { id: me.userId, period, amount, u: username });
      }
    }
    await queryWeb(`
      INSERT INTO staff_nx_gifts (fromUserId, fromUsername, fromNick, fromRole, toUserId, toUsername, toNick, amount, period, createdAt)
      VALUES (@fromUserId, @fromUsername, @fromNick, @fromRole, @toUserId, @toUsername, @toNick, @amount, @period, GETDATE())`, {
      fromUserId: me.userId,
      fromUsername: me.username || username,
      fromNick: me.NickName || me.username || username,
      fromRole: me.webRole || (unlimited ? 'SUPERADMIN' : 'STAFF'),
      toUserId,
      toUsername: target.username,
      toNick: target.NickName || target.username,
      amount,
      period,
    });
    const next = unlimited ? quota : await getQuota(me.userId);
    res.json({ ok: true, quota: next, gifts: await giftsFor(me.userId, 80) });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/staff/roles', async (req, res) => {
  try {
    if (!requireStaffOwner(req, res)) return;
    await ensureStaffTables();
    const name = String(req.body?.name || '').trim().slice(0, 40);
    if (name.length < 2) return res.status(400).json({ error: 'invalid role' });
    const siteAdmin = 1;
    const isGm = req.body?.isGm ? 1 : 0;
    const createdBy = String(req.body?.createdBy || 'admin').slice(0, 64);
    const existing = await web(`SELECT TOP 1 id FROM staff_roles WHERE name = @name`, { name });
    if (existing.length) {
      await queryWeb(
        `UPDATE staff_roles SET siteAdmin = @siteAdmin, isGm = @isGm WHERE name = @name`,
        { name, siteAdmin, isGm },
      );
    } else {
      await queryWeb(
        `INSERT INTO staff_roles (name, siteAdmin, isGm, createdBy) VALUES (@name, @siteAdmin, @isGm, @createdBy)`,
        { name, siteAdmin, isGm, createdBy },
      );
    }
    res.json(await loadStaffBundle());
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/staff', async (req, res) => {
  try {
    if (!requireStaffOwner(req, res)) return;
    await ensureStaffTables();
    const userId = parseInt(String(req.body?.userId), 10);
    const roleName = String(req.body?.role || '').trim().slice(0, 40);
    const grantedBy = String(req.body?.grantedByName || 'admin').slice(0, 64);
    if (!Number.isFinite(userId) || !roleName) return res.status(400).json({ error: 'invalid' });
    const users = await ca(`
      SELECT TOP 1 u.oidUser as id, u.strNexonID as username, u.NickName
      FROM CBT_User u WHERE u.oidUser = @id`, { id: userId });
    if (!users.length) return res.status(404).json({ error: 'player not found' });
    const user = users[0];
    if (user.username === 'villauribe12' && roleName.toLowerCase() !== 'superadmin') {
      return res.status(400).json({ error: 'cannot demote superadmin' });
    }
    let roleRow = (await web(`SELECT TOP 1 name, siteAdmin, isGm FROM staff_roles WHERE name = @name`, { name: roleName }))[0];
    if (!roleRow) {
      const isGm = roleName.toLowerCase() === 'gm' ? 1 : 0;
      await queryWeb(
        `INSERT INTO staff_roles (name, siteAdmin, isGm, createdBy) VALUES (@name, 1, @isGm, @createdBy)`,
        { name: roleName, isGm, createdBy: grantedBy },
      );
      roleRow = { name: roleName, siteAdmin: 1, isGm };
    }
    const flags = roleFlags({ role: roleRow.name, siteAdmin: 1, isGm: roleRow.isGm });
    const existing = await web(`SELECT TOP 1 userId FROM admin_users WHERE userId = @id`, { id: userId });
    if (existing.length) {
      await queryWeb(`
        UPDATE admin_users
        SET username = @username, nickName = @nickName, role = @role, siteAdmin = @siteAdmin, isGm = @isGm,
            grantedBy = @grantedBy, grantedAt = GETDATE()
        WHERE userId = @id`, {
        id: userId,
        username: user.username,
        nickName: user.NickName || '',
        role: flags.role,
        siteAdmin: 1,
        isGm: flags.webGm ? 1 : 0,
        grantedBy,
      });
    } else {
      await queryWeb(`
        INSERT INTO admin_users (userId, username, nickName, role, siteAdmin, isGm, grantedBy, grantedAt)
        VALUES (@id, @username, @nickName, @role, @siteAdmin, @isGm, @grantedBy, GETDATE())`, {
        id: userId,
        username: user.username,
        nickName: user.NickName || '',
        role: flags.role,
        siteAdmin: 1,
        isGm: flags.webGm ? 1 : 0,
        grantedBy,
      });
    }
    res.json(await loadStaffBundle());
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.delete('/staff/:userId', async (req, res) => {
  try {
    if (!requireStaffOwner(req, res)) return;
    await ensureStaffTables();
    const userId = parseInt(req.params.userId, 10);
    if (!Number.isFinite(userId)) return res.status(400).json({ error: 'invalid' });
    const row = await web(`SELECT TOP 1 username, role FROM admin_users WHERE userId = @id`, { id: userId });
    if (row[0]?.username === 'villauribe12' || String(row[0]?.role || '').toLowerCase() === 'superadmin') {
      return res.status(400).json({ error: 'cannot remove superadmin' });
    }
    await queryWeb(`DELETE FROM admin_users WHERE userId = @id`, { id: userId });
    res.json(await loadStaffBundle());
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
