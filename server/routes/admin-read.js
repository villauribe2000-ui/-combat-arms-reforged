import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { query, queryGuildDB, queryLog, queryVisms, queryWeb } from '../db.js';
import { ensureStaffTables, roleFlags, mapDbRole, userIsSiteAdmin } from '../site-admin.js';
import { ensureRankMarkTable, rankMarksFor } from '../rank-mark.js';

const JWT_SECRETS = [...new Set([
  process.env.JWT_SECRET,
  'your-secret-key-change-this',
].filter(Boolean))];
const STAFF_OWNER = 'villauribe12';
const UNLIMITED_GM = new Set(['villauribe12', 'john_exe']);

function unlimitedGm(username) {
  return UNLIMITED_GM.has(String(username || '').toLowerCase());
}

function readAuthToken(req) {
  const header = String(req.headers.authorization || req.headers.Authorization || '');
  if (header.startsWith('Bearer ')) return header.slice(7).trim();
  if (header) return header.trim();
  const alt = req.headers['x-access-token'] || req.headers['x-auth-token'];
  if (alt) return String(alt).replace(/^Bearer\s+/i, '').trim();
  return String(req.body?.authToken || req.body?.token || '').trim();
}

function decodeStaffToken(token) {
  if (!token) return null;
  const opts = { clockTolerance: 1e12 };
  for (const secret of JWT_SECRETS) {
    try {
      const decoded = jwt.verify(token, secret, opts);
      const username = String(decoded?.username || '');
      if (!username) continue;
      return { username, userId: Number(decoded?.userId || decoded?.id || 0) || 0 };
    } catch {
      continue;
    }
  }
  return null;
}

function readActorFromRequest(req) {
  const token = readAuthToken(req);
  if (token) {
    try {
      const decoded = jwt.decode(token);
      if (decoded && typeof decoded === 'object') {
        const username = String(decoded.username || '');
        if (username) {
          return { username, userId: Number(decoded.userId || decoded.id || 0) || 0 };
        }
      }
    } catch {
      /* ignore malformed token */
    }
  }
  const username = String(req.body?.actorUsername || req.body?.fromUsername || '').trim();
  const userId = Number(req.body?.actorUserId || req.body?.fromUserId || 0);
  if (username) return { username, userId: Number.isFinite(userId) ? userId : 0 };
  return null;
}

function staffActor(req) {
  return decodeStaffToken(readAuthToken(req)) || readActorFromRequest(req);
}

function requireStaffOwner(req, res) {
  const verified = decodeStaffToken(readAuthToken(req));
  const actor = verified || readActorFromRequest(req);
  if (actor?.username !== STAFF_OWNER) {
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

function asNum(v) {
  if (v == null || v === '') return 0;
  if (typeof v === 'bigint') return Number(v);
  if (typeof v === 'object') {
    if (typeof v.toNumber === 'function') return v.toNumber();
    if (v.low != null) return Number(v.low) + Number(v.high || 0) * 4294967296;
    if (v.value != null) return asNum(v.value);
  }
  const parsed = Number(v);
  return Number.isFinite(parsed) ? parsed : 0;
}

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

  const marks = await rankMarksFor(list.map((p) => p.id));
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
      rankMark: marks[Number(p.id)] || null,
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
  const marks = await rankMarksFor([id]);

  res.json({
    user: {
      ...user,
      rank: grade?.rank ?? 0,
      rankName: grade?.rankName || 'TRAINEE',
      webRole: flags.role,
      webGm: flags.webGm,
      siteAdmin: flags.siteAdmin || superAdmin,
      isGM: user.UserType === 1 || flags.webGm,
      rankMark: marks[id] || null,
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
    SELECT m.ADMessageNo, m.ADCommandID, m.ADMessage, m.ADURL, m.Enable,
           CONVERT(varchar(19), x.ViewDate, 120) AS untilAt
    FROM CBT_AdvertiseMessage m
    OUTER APPLY (
      SELECT TOP 1 ViewDate
      FROM CBT_AdvertiseMessageInfo
      WHERE MessageNo = m.ADMessageNo AND MessageType = 2 AND Enable = 1
      ORDER BY ViewDate
    ) x
    ORDER BY m.ADMessageNo`);
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

async function staffIdentityIds(userId, username) {
  const ids = new Set();
  const add = (v) => {
    const n = Number(v);
    if (Number.isFinite(n) && n > 0) ids.add(n);
  };
  add(userId);
  const uname = String(username || '').trim();
  if (uname) {
    const staff = await web(`SELECT userId FROM admin_users WHERE username = @u`, { u: uname });
    for (const r of staff) add(r.userId);
    const users = await ca(`SELECT oidUser as id FROM CBT_User WHERE strNexonID = @u`, { u: uname });
    for (const r of users) add(r.id);
    const auths = await ca(`SELECT oidUser as id FROM CBT_UserAuth WHERE strNexonID = @u`, { u: uname });
    for (const r of auths) add(r.id);
    const byQuotaName = await web(`SELECT userId FROM staff_nx_quota WHERE username = @u`, { u: uname });
    for (const r of byQuotaName) add(r.userId);
  }
  if (Number(userId) > 0) {
    const byId = await web(`SELECT userId FROM admin_users WHERE userId = @id`, { id: Number(userId) });
    for (const r of byId) add(r.userId);
  }
  return { ids: [...ids], username: uname };
}

async function getQuota(userId, username) {
  const period = await currentPeriod();
  const ident = await staffIdentityIds(userId, username);
  let rows = [];
  if (ident.ids.length) {
    rows = await web(`SELECT userId, monthlyAllotment, period, used FROM staff_nx_quota WHERE userId IN (${ident.ids.join(',')})`);
  }
  if (!rows.length && ident.username) {
    rows = await web(`SELECT userId, monthlyAllotment, period, used FROM staff_nx_quota WHERE username = @u`, { u: ident.username });
  }
  let row = rows.slice().sort((a, b) => asNum(b.monthlyAllotment) - asNum(a.monthlyAllotment))[0];
  const id = asNum(row?.userId || ident.ids[0] || userId);
  if (!row) {
    return { userId: id, monthlyAllotment: 0, used: 0, remaining: 0, period };
  }
  if (String(row.period || '').trim() !== period) {
    await queryWeb(`UPDATE staff_nx_quota SET used = 0, period = @period WHERE userId = @id`, { id: asNum(row.userId), period });
    row.used = 0;
    row.period = period;
  }
  const monthlyAllotment = asNum(row.monthlyAllotment);
  const used = asNum(row.used);
  return { userId: asNum(row.userId) || id, monthlyAllotment, used, remaining: Math.max(0, monthlyAllotment - used), period };
}

async function giftsFor(fromUserId, limit = 80) {
  return web(`
    SELECT TOP (${Number(limit) || 80}) id, fromUserId, fromUsername, fromNick, fromRole,
      toUserId, toUsername, toNick, amount, period, createdAt, message
    FROM staff_nx_gifts
    WHERE fromUserId = @id
    ORDER BY createdAt DESC`, { id: Number(fromUserId) });
}

async function caUserByActor(actor) {
  const userId = Number(actor?.userId || 0);
  const username = String(actor?.username || '');
  if (userId) {
    const byId = await ca(`SELECT TOP 1 oidUser as id, strNexonID as username, NickName FROM CBT_User WHERE oidUser = @id`, { id: userId });
    if (byId[0]) return byId[0];
  }
  if (username) {
    const byName = await ca(`SELECT TOP 1 oidUser as id, strNexonID as username, NickName FROM CBT_User WHERE strNexonID = @u`, { u: username });
    if (byName[0]) return byName[0];
    const byAuth = await ca(`SELECT TOP 1 oidUser as id, strNexonID as username FROM CBT_UserAuth WHERE strNexonID = @u`, { u: username });
    if (byAuth[0]) return { ...byAuth[0], NickName: byAuth[0].username };
  }
  return null;
}

async function lookupStaff(actor) {
  const username = String(actor?.username || '');
  const caUser = await caUserByActor(actor);
  const userId = Number(caUser?.id || actor?.userId || 0);
  const uname = String(caUser?.username || username);
  if (uname === STAFF_OWNER || username === STAFF_OWNER) {
    return {
      userId,
      username: STAFF_OWNER,
      NickName: caUser?.NickName || STAFF_OWNER,
      webRole: 'SUPERADMIN',
      siteAdmin: true,
      webGm: true,
    };
  }
  let row = (await web(`SELECT TOP 1 * FROM admin_users WHERE userId = @id OR username = @u`, { id: userId, u: uname }))[0];
  if (!row && userId) {
    row = (await web(`SELECT TOP 1 userId, role FROM admin_users WHERE userId = @id`, { id: userId }))[0];
  }
  if (!row && uname) {
    row = (await web(`SELECT TOP 1 userId, role FROM admin_users WHERE username = @u`, { u: uname }))[0];
  }
  if (!row) return null;
  const flags = roleFlags(row);
  return {
    userId: Number(row.userId || userId),
    username: uname || row.username,
    NickName: caUser?.NickName || row.nickName || row.NickName,
    ...flags,
    siteAdmin: true,
  };
}

async function loadStaffBundle() {
  await ensureStaffTables();
  const roles = await web(`SELECT id, name, siteAdmin, isGm, createdBy, createdAt FROM staff_roles ORDER BY name`);
  let staffRows = await web(`
    SELECT userId, username, nickName, role, label, siteAdmin, isGm, grantedBy, grantedAt
    FROM admin_users ORDER BY grantedAt DESC`);
  if (!staffRows.length) {
    staffRows = await web(`
      SELECT userId, username, nickName, role, siteAdmin, isGm, grantedBy, grantedAt
      FROM admin_users ORDER BY grantedAt DESC`);
  }
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
    const monthlyAllotment = asNum(q?.monthlyAllotment);
    const used = asNum(q?.used);
    const unlimited = unlimitedGm(user.username || row.username);
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
      grantedBy: /^\d+$/.test(String(row.grantedBy || '')) ? STAFF_OWNER : (row.grantedBy || STAFF_OWNER),
      grantedAt: row.grantedAt,
      monthlyAllotment,
      used,
      remaining: unlimited ? Number.MAX_SAFE_INTEGER : Math.max(0, monthlyAllotment - used),
      unlimited,
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
  const oids = list.map((p) => Number(p.id)).filter((n) => Number.isFinite(n) && n > 0);
  const nxMap = {};
  if (oids.length) {
    const bals = await vis(`
      SELECT oid, strNexonID, ISNULL(RealBalance, 0) as RealBalance
      FROM VISMS_UserList
      WHERE oid IN (${oids.join(',')})`);
    for (const row of bals) nxMap[Number(row.oid)] = asNum(row.RealBalance);
    const missing = list.filter((p) => nxMap[Number(p.id)] == null && p.username);
    if (missing.length) {
      const names = missing.map((p) => String(p.username).replace(/'/g, "''"));
      const extra = await vis(`
        SELECT oid, strNexonID, ISNULL(RealBalance, 0) as RealBalance
        FROM VISMS_UserList
        WHERE strNexonID IN (${names.map((n) => `N'${n}'`).join(',')})`);
      const byName = {};
      for (const row of extra) byName[String(row.strNexonID || '').toLowerCase()] = asNum(row.RealBalance);
      for (const p of missing) {
        const hit = byName[String(p.username).toLowerCase()];
        if (hit != null) nxMap[Number(p.id)] = hit;
      }
    }
  }
  const marks = await rankMarksFor(list.map((p) => p.id));
  res.json({
    data: list.map((p) => {
      const flags = roleFlags(adminMap[p.id]);
      return {
        ...p,
        nx: nxMap[Number(p.id)] ?? 0,
        webRole: flags.role,
        webGm: flags.webGm,
        siteAdmin: flags.siteAdmin,
        isGM: p.UserType === 1 || flags.webGm,
        rankMark: marks[Number(p.id)] || null,
      };
    }),
  });
});

router.post('/players/:id/rank-mark', async (req, res) => {
  const verified = decodeStaffToken(readAuthToken(req));
  if (!verified || verified.username !== STAFF_OWNER) {
    return res.status(403).json({ error: 'Solo el dueño puede asignar el logo FM.' });
  }
  const id = parseInt(req.params.id, 10);
  if (!Number.isFinite(id)) return res.status(400).json({ error: 'invalid id' });
  const mark = String(req.body?.mark || '').trim().toUpperCase();
  if (mark && mark !== 'FM') {
    return res.status(400).json({ error: 'El único logo permanente es FM.' });
  }
  const exists = await ca(`SELECT oidUser as id FROM CBT_User WHERE oidUser = @id`, { id });
  if (!exists.length) return res.status(404).json({ error: 'not found' });
  try {
    await ensureRankMarkTable();
    if (!mark) {
      await queryWeb(`DELETE FROM dbo.WebRankMarks WHERE oidUser = @id`, { id });
    } else {
      await queryWeb(`
        IF EXISTS (SELECT 1 FROM dbo.WebRankMarks WHERE oidUser = @id)
          UPDATE dbo.WebRankMarks SET mark = 'FM', assignedBy = @by, assignedAt = GETDATE() WHERE oidUser = @id
        ELSE
          INSERT INTO dbo.WebRankMarks (oidUser, mark, assignedBy) VALUES (@id, 'FM', @by)
      `, { id, by: verified.username });
    }
    res.json({ ok: true, rankMark: mark || null });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/staff/me', async (req, res) => {
  try {
    await ensureStaffTables();
    const actor = staffActor(req);
    if (!actor) return res.status(401).json({ error: 'login required' });
    let me = await lookupStaff(actor);
    if (!me) {
      const site = await userIsSiteAdmin(actor.userId, actor.username);
      if (!site.is_admin) return res.status(403).json({ error: 'no staff role' });
      const caUser = await caUserByActor(actor);
      me = {
        userId: Number(caUser?.id || actor.userId || 0),
        username: caUser?.username || actor.username,
        NickName: caUser?.NickName,
        webRole: site.webRole || 'STAFF',
        siteAdmin: true,
        webGm: site.webGm,
      };
    }
    const quota = await getQuota(me.userId, me.username);
    const gifts = await giftsFor(quota.userId || me.userId, 80);
    const unlimited = unlimitedGm(actor.username) || unlimitedGm(me.username);
    res.json({
      me,
      quota: unlimited ? { ...quota, remaining: Number.MAX_SAFE_INTEGER, unlimited: true } : quota,
      gifts,
      period: quota.period,
      unlimited,
    });
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
        toUserId, toUsername, toNick, amount, period, createdAt, message
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
    const staffName = user.username || row.username;
    const quota = await getQuota(userId, staffName);
    const gifts = await giftsFor(quota.userId || userId, 80);
    const unlimited = unlimitedGm(staffName);
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
      quota: unlimited ? { ...quota, remaining: Number.MAX_SAFE_INTEGER, unlimited: true } : quota,
      gifts,
      unlimited,
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

async function writeQuotaAllotment(quotaId, username, amount, period, updatedBy, identIds) {
  const ids = [...new Set([quotaId, ...(identIds || [])].map(Number).filter((n) => Number.isFinite(n) && n > 0))];
  const existing = ids.length
    ? await web(`SELECT userId FROM staff_nx_quota WHERE userId IN (${ids.join(',')})`)
    : [];
  const have = new Set(existing.map((r) => Number(r.userId)));
  for (const id of have) {
    try {
      await queryWeb(`
        UPDATE staff_nx_quota
        SET monthlyAllotment = @amount, period = @period, updatedBy = @updatedBy, updatedAt = GETDATE(), username = @username
        WHERE userId = @id`, { id, amount, period, updatedBy, username });
    } catch {
      await queryWeb(`
        UPDATE staff_nx_quota
        SET monthlyAllotment = @amount, period = @period, updatedBy = @updatedBy, updatedAt = GETDATE()
        WHERE userId = @id`, { id, amount, period, updatedBy });
    }
  }
  if (!have.size) {
    try {
      await queryWeb(`
        INSERT INTO staff_nx_quota (userId, monthlyAllotment, period, used, updatedBy, updatedAt, username)
        VALUES (@id, @amount, @period, 0, @updatedBy, GETDATE(), @username)`, { id: quotaId, amount, period, updatedBy, username });
    } catch {
      await queryWeb(`
        INSERT INTO staff_nx_quota (userId, monthlyAllotment, period, used, updatedBy, updatedAt)
        VALUES (@id, @amount, @period, 0, @updatedBy, GETDATE())`, { id: quotaId, amount, period, updatedBy });
    }
  }
}

router.post('/staff/:userId/quota', async (req, res) => {
  try {
    if (!requireStaffOwner(req, res)) return;
    await ensureStaffTables();
    const userId = parseInt(req.params.userId, 10);
    const raw = Math.max(0, Math.floor(Number(req.body?.amount) || 0));
    const mode = String(req.body?.mode || 'set').toLowerCase();
    if (!Number.isFinite(userId)) return res.status(400).json({ error: 'invalid' });
    const period = await currentPeriod();
    const named = (await ca(`SELECT TOP 1 strNexonID as username FROM CBT_User WHERE oidUser = @id`, { id: userId }))[0];
    const fromStaff = (await web(`SELECT TOP 1 username FROM admin_users WHERE userId = @id`, { id: userId }))[0];
    const username = named?.username || fromStaff?.username || '';
    const ident = await staffIdentityIds(userId, username);
    const found = await getQuota(userId, username);
    const quotaId = Number(found.userId || ident.ids[0] || userId);
    const used = asNum(found.used);
    let amount = raw;
    if (mode === 'add') amount = Math.max(0, asNum(found.monthlyAllotment) + raw);
    else if (mode === 'sub') amount = Math.max(used, asNum(found.monthlyAllotment) - raw);
    else if (mode === 'clear') amount = used;
    else amount = used + raw;
    const actor = staffActor(req);
    const updatedBy = Number(actor?.userId) || 0;
    await writeQuotaAllotment(quotaId, username, amount, period, updatedBy, ident.ids);
    res.json({ ok: true, quota: await getQuota(quotaId, username), staff: (await loadStaffBundle()).staff });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/staff/take-nx', async (req, res) => {
  try {
    if (!requireStaffOwner(req, res)) return;
    await ensureStaffTables();
    const actor = staffActor(req);
    const toUserId = parseInt(String(req.body?.toUserId), 10);
    const amount = Math.floor(Number(req.body?.amount) || 0);
    const message = String(req.body?.message || '').trim().slice(0, 300);
    if (!Number.isFinite(toUserId) || amount <= 0) return res.status(400).json({ error: 'invalid amount' });
    const target = (await ca(`
      SELECT TOP 1 oidUser as id, strNexonID as username, NickName
      FROM CBT_User WHERE oidUser = @id AND DeleteDate IS NULL`, { id: toUserId }))[0];
    if (!target) return res.status(404).json({ error: 'player not found' });
    let bal = await queryVisms(`SELECT ISNULL(RealBalance, 0) as RealBalance FROM VISMS_UserList WHERE oid = @oid`, { oid: toUserId });
    if (!bal?.recordset?.[0]) {
      bal = await queryVisms(`SELECT ISNULL(RealBalance, 0) as RealBalance FROM VISMS_UserList WHERE strNexonID = @u`, { u: target.username });
    }
    const current = Math.floor(Number(bal?.recordset?.[0]?.RealBalance || 0));
    if (current <= 0) return res.status(400).json({ error: 'El jugador no tiene NX' });
    const take = Math.min(amount, current);
    const sqlTake = `
      SET RealBalance = ISNULL(RealBalance, 0) - @nx,
          TotalBalance = CASE WHEN ISNULL(TotalBalance, 0) >= @nx THEN ISNULL(TotalBalance, 0) - @nx ELSE 0 END`;
    let updated = await queryVisms(
      `UPDATE VISMS_UserList ${sqlTake} WHERE oid = @oid AND ISNULL(RealBalance, 0) >= @nx`,
      { nx: take, oid: toUserId },
    );
    if (!updated?.rowsAffected?.[0]) {
      updated = await queryVisms(
        `UPDATE VISMS_UserList ${sqlTake} WHERE strNexonID = @u AND ISNULL(RealBalance, 0) >= @nx`,
        { nx: take, u: target.username },
      );
    }
    if (!updated?.rowsAffected?.[0]) {
      return res.status(500).json({ error: 'no se pudo quitar NX en VISMS' });
    }
    const caUser = await caUserByActor(actor);
    const fromUserId = Number(caUser?.id || actor?.userId || 0);
    const period = await currentPeriod();
    try {
      await queryWeb(`
        INSERT INTO staff_nx_gifts (fromUserId, fromUsername, fromNick, fromRole, toUserId, toUsername, toNick, amount, period, message, createdAt)
        VALUES (@fromUserId, @fromUsername, @fromNick, @fromRole, @toUserId, @toUsername, @toNick, @amount, @period, @message, GETDATE())`, {
        fromUserId,
        fromUsername: STAFF_OWNER,
        fromNick: caUser?.NickName || STAFF_OWNER,
        fromRole: 'SUPERADMIN',
        toUserId,
        toUsername: target.username,
        toNick: target.NickName || target.username,
        amount: -take,
        period,
        message: message || 'NX retirado por el dueño',
      });
    } catch {
      await queryWeb(`
        INSERT INTO staff_nx_gifts (fromUserId, toUserId, amount, period, createdAt)
        VALUES (@fromUserId, @toUserId, @amount, @period, GETDATE())`, {
        fromUserId, toUserId, amount: -take, period,
      });
    }
    let left = await queryVisms(`SELECT ISNULL(RealBalance, 0) as RealBalance FROM VISMS_UserList WHERE oid = @oid`, { oid: toUserId });
    if (!left?.recordset?.[0]) {
      left = await queryVisms(`SELECT ISNULL(RealBalance, 0) as RealBalance FROM VISMS_UserList WHERE strNexonID = @u`, { u: target.username });
    }
    res.json({
      ok: true,
      taken: take,
      balance: Math.floor(Number(left?.recordset?.[0]?.RealBalance || 0)),
      gifts: await giftsFor(fromUserId, 80),
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/staff/gift', async (req, res) => {
  try {
    await ensureStaffTables();
    const actor = staffActor(req);
    if (!actor) return res.status(401).json({ error: 'login required' });
    let me = await lookupStaff(actor);
    if (!me) {
      const site = await userIsSiteAdmin(actor.userId, actor.username);
      if (!site.is_admin) return res.status(403).json({ error: 'no staff role' });
      const caUser = await caUserByActor(actor);
      me = {
        userId: Number(caUser?.id || actor.userId || 0),
        username: caUser?.username || actor.username,
        NickName: caUser?.NickName,
        webRole: site.webRole || 'STAFF',
      };
    }
    const username = me.username || actor.username;
    const toUserId = parseInt(String(req.body?.toUserId), 10);
    const amount = Math.floor(Number(req.body?.amount) || 0);
    const message = String(req.body?.message || '').trim().slice(0, 300);
    if (!Number.isFinite(toUserId) || amount <= 0) return res.status(400).json({ error: 'invalid amount' });
    if (amount > 2000000000) return res.status(400).json({ error: 'amount too large' });
    const quota = await getQuota(me.userId, username);
    let fromUserId = Number(quota.userId || me.userId || actor.userId || 0);
    if (!fromUserId) {
      const owner = await ca(`SELECT TOP 1 oidUser as id FROM CBT_User WHERE strNexonID = @u`, { u: STAFF_OWNER });
      fromUserId = Number(owner[0]?.id) || 0;
    }
    const target = (await ca(`
      SELECT TOP 1 oidUser as id, strNexonID as username, NickName
      FROM CBT_User WHERE oidUser = @id AND DeleteDate IS NULL`, { id: toUserId }))[0];
    if (!target) return res.status(404).json({ error: 'player not found' });
    const unlimited = unlimitedGm(username) || unlimitedGm(actor.username);
    if (!unlimited && (quota.monthlyAllotment <= 0 || amount > quota.remaining)) {
      return res.status(400).json({ error: 'No tienes saldo para regalar' });
    }
    let updated = await queryVisms(
      `UPDATE VISMS_UserList SET RealBalance = ISNULL(RealBalance, 0) + @nx WHERE oid = @oid`,
      { nx: amount, oid: toUserId },
    );
    if (!updated?.rowsAffected?.[0]) {
      return res.status(500).json({ error: 'no se pudo acreditar NX en VISMS' });
    }
    const period = quota.period;
    if (!unlimited) {
      const qrow = await web(`SELECT TOP 1 userId FROM staff_nx_quota WHERE userId = @id`, { id: fromUserId });
      if (qrow.length) {
        await queryWeb(`UPDATE staff_nx_quota SET used = used + @amount, period = @period WHERE userId = @id`, {
          id: fromUserId, amount, period,
        });
      } else {
        await queryWeb(`
          INSERT INTO staff_nx_quota (userId, monthlyAllotment, period, used, updatedBy, updatedAt)
          VALUES (@id, 0, @period, @amount, @updatedBy, GETDATE())`, { id: fromUserId, period, amount, updatedBy: fromUserId });
      }
    }
    try {
      await queryWeb(`
        INSERT INTO staff_nx_gifts (fromUserId, fromUsername, fromNick, fromRole, toUserId, toUsername, toNick, amount, period, message, createdAt)
        VALUES (@fromUserId, @fromUsername, @fromNick, @fromRole, @toUserId, @toUsername, @toNick, @amount, @period, @message, GETDATE())`, {
        fromUserId,
        fromUsername: me.username || username,
        fromNick: me.NickName || me.username || username,
        fromRole: me.webRole || (unlimited ? 'SUPERADMIN' : 'STAFF'),
        toUserId,
        toUsername: target.username,
        toNick: target.NickName || target.username,
        amount,
        period,
        message,
      });
    } catch {
      await queryWeb(`
        INSERT INTO staff_nx_gifts (fromUserId, toUserId, amount, period, createdAt)
        VALUES (@fromUserId, @toUserId, @amount, @period, GETDATE())`, {
        fromUserId, toUserId, amount, period,
      });
    }
    const giftCode = `GIFT-${fromUserId}-${Date.now()}`;
    try {
      await queryWeb(`
        INSERT INTO PaymentCodes (oidUser, username, NickName, paymentCode, nxAmount, dollarAmount, status, createdAt, approvedAt, approvedBy, note)
        VALUES (@oidUser, @username, @NickName, @paymentCode, @nxAmount, 0, 'approved', GETDATE(), GETDATE(), @approvedBy, @note)`, {
        oidUser: toUserId,
        username: target.username,
        NickName: target.NickName || target.username,
        paymentCode: giftCode,
        nxAmount: amount,
        approvedBy: fromUserId,
        note: message || `Regalo GM ${me.webRole || ''}`.trim(),
      });
    } catch (payErr) {
      console.warn('[STAFF GIFT] PaymentCodes', payErr.message);
      try {
        await queryWeb(`
          INSERT INTO PaymentCodes (oidUser, username, NickName, paymentCode, nxAmount, dollarAmount, status, createdAt, approvedAt, approvedBy)
          VALUES (@oidUser, @username, @NickName, @paymentCode, @nxAmount, 0, 'approved', GETDATE(), GETDATE(), @approvedBy)`, {
          oidUser: toUserId,
          username: target.username,
          NickName: target.NickName || target.username,
          paymentCode: giftCode,
          nxAmount: amount,
          approvedBy: fromUserId,
        });
      } catch (payErr2) {
        console.warn('[STAFF GIFT] PaymentCodes fallback', payErr2.message);
      }
    }
    const next = unlimited
      ? { ...quota, monthlyAllotment: quota.monthlyAllotment, remaining: Number.MAX_SAFE_INTEGER, unlimited: true }
      : await getQuota(fromUserId, username);
    res.json({ ok: true, quota: { ...next, unlimited }, gifts: await giftsFor(fromUserId, 80) });
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
    const actor = staffActor(req);
    const userId = parseInt(String(req.body?.userId), 10);
    const roleName = String(req.body?.role || '').trim().slice(0, 40);
    if (!Number.isFinite(userId) || !roleName) return res.status(400).json({ error: 'invalid' });
    let grantedById = Number(actor?.userId) || 0;
    if (!grantedById) {
      const owner = await ca(`SELECT TOP 1 oidUser as id FROM CBT_User WHERE strNexonID = @u`, { u: STAFF_OWNER });
      grantedById = Number(owner[0]?.id) || 0;
    }
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
      try {
        await queryWeb(
          `INSERT INTO staff_roles (name, siteAdmin, isGm, createdBy) VALUES (@name, 1, @isGm, @createdBy)`,
          { name: roleName, isGm, createdBy: grantedById },
        );
      } catch {
        roleRow = { name: roleName, siteAdmin: 1, isGm };
      }
      roleRow = roleRow || { name: roleName, siteAdmin: 1, isGm };
    }
    const flags = roleFlags({ role: roleRow.name, siteAdmin: 1, isGm: roleRow.isGm });
    const isGm = flags.webGm ? 1 : 0;
    const dbRole = await mapDbRole(flags.role, isGm);
    const label = flags.role || dbRole;
    const existing = await web(`SELECT TOP 1 userId FROM admin_users WHERE userId = @id`, { id: userId });
    const full = {
      id: userId,
      username: user.username,
      nickName: user.NickName || '',
      role: dbRole,
      label,
      siteAdmin: 1,
      isGm,
      grantedBy: grantedById,
    };
    if (existing.length) {
      try {
        await queryWeb(`
          UPDATE admin_users
          SET username = @username, nickName = @nickName, role = @role, label = @label, siteAdmin = @siteAdmin, isGm = @isGm,
              grantedBy = @grantedBy, grantedAt = GETDATE()
          WHERE userId = @id`, full);
      } catch {
        await queryWeb(`
          UPDATE admin_users SET role = @role, grantedBy = @grantedBy, grantedAt = GETDATE()
          WHERE userId = @id`, { id: userId, role: dbRole, grantedBy: grantedById });
      }
    } else {
      try {
        await queryWeb(`
          INSERT INTO admin_users (userId, username, nickName, role, label, siteAdmin, isGm, grantedBy, grantedAt)
          VALUES (@id, @username, @nickName, @role, @label, @siteAdmin, @isGm, @grantedBy, GETDATE())`, full);
      } catch {
        await queryWeb(`
          INSERT INTO admin_users (userId, role, grantedBy, grantedAt)
          VALUES (@id, @role, @grantedBy, GETDATE())`, { id: userId, role: dbRole, grantedBy: grantedById });
      }
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
