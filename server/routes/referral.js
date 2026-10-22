import crypto from 'crypto';
import express from 'express';
import { query, queryWeb, queryVisms } from '../db.js';

const router = express.Router();
const NX_REWARD = 20000;
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const STAFF_OWNER = 'villauribe12';

let tablesReady = null;

function cleanIp(value) {
  let ip = String(value || '').split(',')[0].trim();
  if (ip.startsWith('::ffff:')) ip = ip.slice(7);
  if (ip === '::1') ip = '127.0.0.1';
  if (!ip || ip === '0.0.0.0' || ip.toLowerCase() === 'unknown') return '';
  return ip.slice(0, 45);
}

/**
 * Prefer Express req.ip (respects trust proxy). Do not trust client-sent
 * X-Real-Ip / trailing X-Forwarded-For hops — those are spoofable and were
 * used to bypass one-redeem-per-IP.
 */
export function clientIp(req) {
  const fromExpress = cleanIp(req.ip || req.socket?.remoteAddress || '');
  if (fromExpress) return fromExpress;

  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.trim()) {
    const hops = forwarded.split(',').map((part) => cleanIp(part)).filter(Boolean);
    // Leftmost hop is the original client when the proxy appends.
    if (hops.length) return hops[0];
  }
  return '';
}

function makeCode() {
  const bytes = crypto.randomBytes(6);
  let code = 'EV';
  for (let i = 0; i < bytes.length; i += 1) code += ALPHABET[bytes[i] % ALPHABET.length];
  return code;
}

export function ensureReferralTables() {
  if (!tablesReady) {
    tablesReady = queryWeb(`
      IF OBJECT_ID('ReferralCodes', 'U') IS NULL
      BEGIN
        CREATE TABLE ReferralCodes (
          oidUser INT NOT NULL PRIMARY KEY,
          username NVARCHAR(50) NOT NULL,
          code NVARCHAR(12) NOT NULL UNIQUE,
          createdAt DATETIME NOT NULL DEFAULT GETDATE()
        );
      END
      IF OBJECT_ID('ReferralIps', 'U') IS NULL
      BEGIN
        CREATE TABLE ReferralIps (
          oidUser INT NOT NULL,
          ip NVARCHAR(45) NOT NULL,
          lastSeen DATETIME NOT NULL DEFAULT GETDATE(),
          CONSTRAINT PK_ReferralIps PRIMARY KEY (oidUser, ip)
        );
      END
      IF OBJECT_ID('ReferralRedemptions', 'U') IS NULL
      BEGIN
        CREATE TABLE ReferralRedemptions (
          id INT IDENTITY(1,1) PRIMARY KEY,
          referrerOid INT NOT NULL,
          referredOid INT NOT NULL UNIQUE,
          referredUsername NVARCHAR(50) NOT NULL,
          code NVARCHAR(12) NOT NULL,
          referredIp NVARCHAR(45) NOT NULL UNIQUE,
          nxEach INT NOT NULL,
          createdAt DATETIME NOT NULL DEFAULT GETDATE()
        );
        CREATE INDEX idx_referral_referrer ON ReferralRedemptions(referrerOid);
      END
      IF OBJECT_ID('ReferralRedeemRequests', 'U') IS NULL
      BEGIN
        CREATE TABLE ReferralRedeemRequests (
          id INT IDENTITY(1,1) PRIMARY KEY,
          referrerOid INT NOT NULL,
          referrerUsername NVARCHAR(50) NOT NULL,
          referredOid INT NOT NULL,
          referredUsername NVARCHAR(50) NOT NULL,
          code NVARCHAR(12) NOT NULL,
          referredIp NVARCHAR(45) NOT NULL,
          registrationIp NVARCHAR(45) NULL,
          referrerIp NVARCHAR(45) NULL,
          nxEach INT NOT NULL,
          status NVARCHAR(20) NOT NULL DEFAULT 'pending',
          createdAt DATETIME NOT NULL DEFAULT GETDATE(),
          reviewedAt DATETIME NULL,
          reviewedBy NVARCHAR(50) NULL
        );
        CREATE INDEX idx_referral_req_status ON ReferralRedeemRequests(status, id DESC);
        CREATE INDEX idx_referral_req_user ON ReferralRedeemRequests(referredOid, status);
      END
    `).catch((error) => {
      tablesReady = null;
      throw error;
    });
  }
  return tablesReady;
}

async function rememberIp(oidUser, ip) {
  if (!oidUser || !ip) return;
  await queryWeb(
    `MERGE ReferralIps AS target
     USING (SELECT @oidUser AS oidUser, @ip AS ip) AS source
     ON target.oidUser = source.oidUser AND target.ip = source.ip
     WHEN MATCHED THEN UPDATE SET lastSeen = GETDATE()
     WHEN NOT MATCHED THEN INSERT (oidUser, ip) VALUES (source.oidUser, source.ip);`,
    { oidUser, ip }
  );
}

async function ensureCode(oidUser, username) {
  const existing = await queryWeb(
    `SELECT code FROM ReferralCodes WHERE oidUser = @oidUser`,
    { oidUser }
  );
  if (existing.recordset[0]?.code) return existing.recordset[0].code;

  for (let attempt = 0; attempt < 8; attempt += 1) {
    const code = makeCode();
    try {
      await queryWeb(
        `INSERT INTO ReferralCodes (oidUser, username, code) VALUES (@oidUser, @username, @code)`,
        { oidUser, username: String(username || '').slice(0, 50), code }
      );
      return code;
    } catch (error) {
      const message = String(error?.message || '');
      if (message.includes('PK_') || message.includes('PRIMARY KEY') || error?.number === 2627) {
        const again = await queryWeb(`SELECT code FROM ReferralCodes WHERE oidUser = @oidUser`, { oidUser });
        if (again.recordset[0]?.code) return again.recordset[0].code;
      }
      if (!message.includes('UNIQUE') && error?.number !== 2601) throw error;
    }
  }
  throw new Error('No se pudo crear el código');
}

async function addNx(oidUser, amount) {
  const result = await queryVisms(
    `UPDATE VISMS_UserList
     SET RealBalance = CASE
           WHEN ISNULL(RealBalance, 0) + @amount < 0 THEN 0
           ELSE ISNULL(RealBalance, 0) + @amount
         END,
         TotalBalance = CASE
           WHEN ISNULL(TotalBalance, 0) + @amount < 0 THEN 0
           ELSE ISNULL(TotalBalance, 0) + @amount
         END
     WHERE oid = @oidUser`,
    { oidUser, amount }
  );
  return (result.rowsAffected?.[0] || 0) > 0;
}

/**
 * When several referred accounts later share one IP, keep the oldest
 * redemption and claw back the rest (VPN claim → home login farm).
 */
async function clawbackExtraHouseholdRedemptions(ip) {
  const clean = cleanIp(ip);
  if (!clean) return 0;

  const rows = await queryWeb(
    `SELECT r.id, r.referrerOid, r.referredOid, r.referredUsername, r.nxEach, r.createdAt
     FROM ReferralRedemptions r
     WHERE r.referredOid IN (
       SELECT oidUser FROM ReferralIps WHERE ip = @ip
       UNION
       SELECT oidUser FROM WebRegistrations WHERE ip = @ip
     )
        OR r.referredIp = @ip
     ORDER BY r.createdAt ASC, r.id ASC`,
    { ip: clean }
  );
  if (rows.recordset.length <= 1) return 0;

  let removed = 0;
  for (const row of rows.recordset.slice(1)) {
    await addNx(row.referredOid, -Number(row.nxEach || NX_REWARD));
    await addNx(row.referrerOid, -Number(row.nxEach || NX_REWARD));
    await queryWeb(`DELETE FROM ReferralRedemptions WHERE id = @id`, { id: row.id });
    removed += 1;
    console.warn('[REFERRAL] clawback household duplicate', {
      ip: clean,
      id: row.id,
      referred: row.referredUsername,
      referredOid: row.referredOid,
      referrerOid: row.referrerOid,
    });
  }
  return removed;
}

export async function noteReferralVisit(oidUser, username, ip) {
  const id = Number(oidUser);
  const rawIp = Array.isArray(ip) ? ip[0] : ip;
  let clean = String(rawIp || '').split(',')[0].trim();
  if (clean.startsWith('::ffff:')) clean = clean.slice(7);
  if (clean === '::1') clean = '127.0.0.1';
  if (!id || !clean || clean === '0.0.0.0') return;
  await ensureReferralTables();
  await rememberIp(id, clean.slice(0, 45));
  await ensureCode(id, username);
  try {
    await clawbackExtraHouseholdRedemptions(clean);
  } catch (error) {
    console.warn('[REFERRAL] clawback', error.message);
  }
}

async function accountsShareIp(referrerOid, guestOid, ip) {
  const seen = await queryWeb(
    `SELECT TOP 1 owner.ip
     FROM ReferralIps owner
     INNER JOIN ReferralIps guest ON guest.ip = owner.ip
     WHERE owner.oidUser = @referrerOid AND guest.oidUser = @guestOid`,
    { referrerOid, guestOid }
  );
  if (seen.recordset[0]) return true;

  try {
    const registered = await queryWeb(
      `SELECT oidUser, ip FROM WebRegistrations WHERE oidUser IN (@referrerOid, @guestOid)`,
      { referrerOid, guestOid }
    );
    const ownerRegs = registered.recordset.filter((row) => Number(row.oidUser) === Number(referrerOid)).map((row) => cleanIp(row.ip));
    const guestRegs = registered.recordset.filter((row) => Number(row.oidUser) === Number(guestOid)).map((row) => cleanIp(row.ip));
    if (ownerRegs.some((ownerIp) => ownerIp && (ownerIp === ip || guestRegs.includes(ownerIp)))) return true;
  } catch (error) {
    console.warn('[REFERRAL] registro IP', error.message);
  }

  const logins = await query(
    `SELECT oidUser, strLastLoginIP
     FROM COMBATARMS.dbo.CBT_UserAuth
     WHERE oidUser IN (@referrerOid, @guestOid)`,
    { referrerOid, guestOid }
  ).catch(() => ({ recordset: [] }));
  const ownerLogin = cleanIp(logins.recordset.find((row) => Number(row.oidUser) === Number(referrerOid))?.strLastLoginIP);
  const guestLogin = cleanIp(logins.recordset.find((row) => Number(row.oidUser) === Number(guestOid))?.strLastLoginIP);
  if (ownerLogin && (ownerLogin === ip || ownerLogin === guestLogin)) return true;
  if (guestLogin && guestLogin === ip && ownerLogin && ownerLogin === guestLogin) return true;
  return false;
}

async function getRegistrationRow(guestOid) {
  try {
    const row = await queryWeb(
      `SELECT TOP 1 ip, createdAt FROM WebRegistrations WHERE oidUser = @guestOid ORDER BY createdAt ASC`,
      { guestOid }
    );
    return row.recordset[0] || null;
  } catch (error) {
    console.warn('[REFERRAL] WebRegistrations', error.message);
    return null;
  }
}

async function getRegistrationIp(guestOid) {
  return cleanIp((await getRegistrationRow(guestOid))?.ip);
}

function accountAgeHours(createdAt) {
  if (!createdAt) return 0;
  const ms = Date.now() - new Date(createdAt).getTime();
  return ms / (1000 * 60 * 60);
}

/**
 * Block if this connection, registration IP, guest IP history, or any
 * household account that shared an IP already redeemed.
 * Stops VPN-at-claim → later home-IP farming.
 */
async function householdAlreadyRedeemed(guestOid, currentIp, registrationIp) {
  const ips = [...new Set([currentIp, registrationIp].map(cleanIp).filter(Boolean))];

  for (const ip of ips) {
    const direct = await queryWeb(
      `SELECT TOP 1 id FROM ReferralRedemptions WHERE referredIp = @ip`,
      { ip }
    );
    if (direct.recordset[0]) return { blocked: true, reason: 'ip' };
  }

  if (registrationIp) {
    const regUsed = await queryWeb(
      `SELECT TOP 1 r.id
       FROM ReferralRedemptions r
       INNER JOIN WebRegistrations w ON w.oidUser = r.referredOid
       WHERE w.ip = @registrationIp`,
      { registrationIp }
    ).catch(() => ({ recordset: [] }));
    if (regUsed.recordset[0]) return { blocked: true, reason: 'reg-ip' };
  }

  const history = await queryWeb(
    `SELECT TOP 1 r.id
     FROM ReferralRedemptions r
     WHERE r.referredIp IN (
       SELECT ip FROM ReferralIps WHERE oidUser = @guestOid
       UNION
       SELECT ip FROM WebRegistrations WHERE oidUser = @guestOid
     )`,
    { guestOid }
  ).catch(() => ({ recordset: [] }));
  if (history.recordset[0]) return { blocked: true, reason: 'history' };

  const household = await queryWeb(
    `SELECT TOP 1 r.id
     FROM ReferralIps guest
     INNER JOIN ReferralIps other
       ON other.ip = guest.ip AND other.oidUser <> guest.oidUser
     INNER JOIN ReferralRedemptions r
       ON r.referredOid = other.oidUser OR r.referredIp = guest.ip
     WHERE guest.oidUser = @guestOid`,
    { guestOid }
  );
  if (household.recordset[0]) return { blocked: true, reason: 'household' };

  try {
    const regHousehold = await queryWeb(
      `SELECT TOP 1 r.id
       FROM WebRegistrations guest
       INNER JOIN WebRegistrations other
         ON other.ip = guest.ip AND other.oidUser <> guest.oidUser
       INNER JOIN ReferralRedemptions r
         ON r.referredOid = other.oidUser OR r.referredIp = guest.ip
       WHERE guest.oidUser = @guestOid`,
      { guestOid }
    );
    if (regHousehold.recordset[0]) return { blocked: true, reason: 'household' };
  } catch (error) {
    console.warn('[REFERRAL] household WebRegistrations', error.message);
  }

  // Anyone who later shared the guest's current/home IPs already claimed.
  if (ips.length) {
    const sharedClaim = await queryWeb(
      `SELECT TOP 1 r.id
       FROM ReferralIps shared
       INNER JOIN ReferralRedemptions r ON r.referredOid = shared.oidUser
       WHERE shared.ip IN (${ips.map((_, i) => `@ip${i}`).join(', ')})
         AND shared.oidUser <> @guestOid`,
      Object.fromEntries([['guestOid', guestOid], ...ips.map((ip, i) => [`ip${i}`, ip])])
    );
    if (sharedClaim.recordset[0]) return { blocked: true, reason: 'shared-claim' };
  }

  return { blocked: false };
}

function userFromRequest(req) {
  const oidUser = Number(req.user?.id || req.user?.userId);
  const username = String(req.user?.username || '').slice(0, 50);
  if (!oidUser || !username) return null;
  return { oidUser, username };
}

function requireOwner(req, res) {
  const user = userFromRequest(req);
  if (!user) {
    res.status(401).json({ error: 'Sesión inválida' });
    return null;
  }
  if (user.username !== STAFF_OWNER) {
    res.status(403).json({ error: 'Solo el dueño puede revisar solicitudes de invitación' });
    return null;
  }
  return user;
}

async function getKnownIp(oidUser) {
  const reg = cleanIp((await getRegistrationRow(oidUser))?.ip);
  if (reg) return reg;
  const ref = await queryWeb(
    `SELECT TOP 1 ip FROM ReferralIps WHERE oidUser = @oidUser ORDER BY lastSeen DESC`,
    { oidUser }
  ).catch(() => ({ recordset: [] }));
  const fromRef = cleanIp(ref.recordset[0]?.ip);
  if (fromRef) return fromRef;
  const login = await query(
    `SELECT TOP 1 strLastLoginIP FROM COMBATARMS.dbo.CBT_UserAuth WHERE oidUser = @oidUser`,
    { oidUser }
  ).catch(() => ({ recordset: [] }));
  return cleanIp(login.recordset[0]?.strLastLoginIP);
}

router.get('/me', async (req, res) => {
  try {
    const user = userFromRequest(req);
    if (!user) return res.status(401).json({ error: 'Sesión inválida' });
    const ip = clientIp(req);
    await noteReferralVisit(user.oidUser, user.username, ip);

    const redeemed = await queryWeb(
      `SELECT TOP 1 code, createdAt FROM ReferralRedemptions WHERE referredOid = @oidUser`,
      { oidUser: user.oidUser }
    );
    const pending = await queryWeb(
      `SELECT TOP 1 id, code, status, createdAt
       FROM ReferralRedeemRequests
       WHERE referredOid = @oidUser AND status = 'pending'
       ORDER BY id DESC`,
      { oidUser: user.oidUser }
    );
    const stats = await queryWeb(
      `SELECT COUNT(*) AS uses, ISNULL(SUM(nxEach), 0) AS earned
       FROM ReferralRedemptions WHERE referrerOid = @oidUser`,
      { oidUser: user.oidUser }
    );
    const recent = await queryWeb(
      `SELECT TOP 12 referredUsername, createdAt
       FROM ReferralRedemptions
       WHERE referrerOid = @oidUser
       ORDER BY id DESC`,
      { oidUser: user.oidUser }
    );
    const codeRow = await queryWeb(
      `SELECT code FROM ReferralCodes WHERE oidUser = @oidUser`,
      { oidUser: user.oidUser }
    );

    res.json({
      code: codeRow.recordset[0]?.code || '',
      reward: NX_REWARD,
      redeemed: Boolean(redeemed.recordset[0]),
      redeemedCode: redeemed.recordset[0]?.code || null,
      pending: Boolean(pending.recordset[0]),
      pendingCode: pending.recordset[0]?.code || null,
      uses: Number(stats.recordset[0]?.uses || 0),
      earned: Number(stats.recordset[0]?.earned || 0),
      recent: recent.recordset.map((row) => ({
        username: row.referredUsername,
        at: row.createdAt,
      })),
    });
  } catch (error) {
    console.error('[REFERRAL] me', error.message);
    res.status(500).json({ error: 'No se pudo cargar tu código de invitación' });
  }
});

router.post('/redeem', async (req, res) => {
  const user = userFromRequest(req);
  if (!user) return res.status(401).json({ error: 'Sesión inválida' });

  const code = String(req.body?.code || '').trim().toUpperCase().replace(/\s+/g, '');
  const ip = clientIp(req);
  if (!/^[A-Z0-9]{6,12}$/.test(code)) {
    return res.status(400).json({ error: 'Escribe un código válido' });
  }
  if (!ip) {
    return res.status(400).json({ error: 'No se pudo verificar tu conexión. Inténtalo de nuevo.' });
  }

  try {
    await noteReferralVisit(user.oidUser, user.username, ip);

    const owner = await queryWeb(
      `SELECT oidUser, username FROM ReferralCodes WHERE code = @code`,
      { code }
    );
    const referrer = owner.recordset[0];
    if (!referrer) return res.status(404).json({ error: 'Ese código no existe' });
    if (Number(referrer.oidUser) === user.oidUser) {
      return res.status(400).json({ error: 'No puedes canjear tu propio código' });
    }

    const already = await queryWeb(
      `SELECT TOP 1 id FROM ReferralRedemptions WHERE referredOid = @oidUser`,
      { oidUser: user.oidUser }
    );
    if (already.recordset[0]) {
      return res.status(400).json({ error: 'Esta cuenta ya canjeó un código. Solo se puede usar una vez.' });
    }

    const pending = await queryWeb(
      `SELECT TOP 1 id, code FROM ReferralRedeemRequests
       WHERE referredOid = @oidUser AND status = 'pending'`,
      { oidUser: user.oidUser }
    );
    if (pending.recordset[0]) {
      return res.status(400).json({
        error: `Ya tienes una solicitud pendiente con el código ${pending.recordset[0].code}. Espera la revisión del admin.`,
      });
    }

    const registrationIp = cleanIp((await getRegistrationRow(user.oidUser))?.ip) || ip;
    const referrerIp = await getKnownIp(referrer.oidUser);

    let inserted = false;
    try {
      const insert = await queryWeb(
        `INSERT INTO ReferralRedeemRequests
          (referrerOid, referrerUsername, referredOid, referredUsername, code, referredIp, registrationIp, referrerIp, nxEach, status)
         SELECT @referrerOid, @referrerUsername, @referredOid, @referredUsername, @code, @referredIp, @registrationIp, @referrerIp, @nx, 'pending'
         WHERE NOT EXISTS (
           SELECT 1 FROM ReferralRedeemRequests
           WHERE referredOid = @referredOid AND status = 'pending'
         )
         AND NOT EXISTS (
           SELECT 1 FROM ReferralRedemptions WHERE referredOid = @referredOid
         )`,
        {
          referrerOid: referrer.oidUser,
          referrerUsername: String(referrer.username || '').slice(0, 50),
          referredOid: user.oidUser,
          referredUsername: user.username,
          code,
          referredIp: ip,
          registrationIp,
          referrerIp: referrerIp || '',
          nx: NX_REWARD,
        }
      );
      inserted = (insert.rowsAffected?.[0] || 0) > 0;
    } catch (error) {
      if (error?.number === 2601 || error?.number === 2627) inserted = false;
      else throw error;
    }

    if (!inserted) {
      return res.status(400).json({
        error: 'No se pudo crear la solicitud. Puede que ya exista una pendiente o un canje aprobado.',
      });
    }

    res.json({
      success: true,
      pending: true,
      message: `Solicitud enviada. El admin revisará el canje de ${code}. Cuando la apruebe, tú y ${referrer.username} recibirán ${NX_REWARD.toLocaleString('es-CO')} NX.`,
      reward: NX_REWARD,
    });
  } catch (error) {
    console.error('[REFERRAL] redeem request', error.message);
    res.status(500).json({ error: 'No se pudo enviar la solicitud de canje' });
  }
});

router.get('/admin/requests', async (req, res) => {
  const owner = requireOwner(req, res);
  if (!owner) return;
  try {
    await ensureReferralTables();
    const status = String(req.query?.status || 'pending').toLowerCase();
    const filter = ['pending', 'approved', 'rejected', 'all'].includes(status) ? status : 'pending';
    const rows = await queryWeb(
      filter === 'all'
        ? `SELECT TOP 200 * FROM ReferralRedeemRequests ORDER BY
             CASE status WHEN 'pending' THEN 0 WHEN 'approved' THEN 1 ELSE 2 END,
             id DESC`
        : `SELECT TOP 200 * FROM ReferralRedeemRequests WHERE status = @status ORDER BY id DESC`,
      filter === 'all' ? {} : { status: filter }
    );
    res.json({
      requests: rows.recordset.map((row) => ({
        id: row.id,
        code: row.code,
        status: row.status,
        nxEach: row.nxEach,
        createdAt: row.createdAt,
        reviewedAt: row.reviewedAt,
        reviewedBy: row.reviewedBy,
        referrer: { oidUser: row.referrerOid, username: row.referrerUsername, ip: row.referrerIp || '' },
        referred: {
          oidUser: row.referredOid,
          username: row.referredUsername,
          ip: row.referredIp || '',
          registrationIp: row.registrationIp || '',
        },
        sameIp: Boolean(
          row.referredIp
          && row.referrerIp
          && cleanIp(row.referredIp) === cleanIp(row.referrerIp)
        ),
      })),
    });
  } catch (error) {
    console.error('[REFERRAL] admin list', error.message);
    res.status(500).json({ error: 'No se pudieron cargar las solicitudes' });
  }
});

router.post('/admin/requests/:id/approve', async (req, res) => {
  const owner = requireOwner(req, res);
  if (!owner) return;
  const id = Number(req.params.id);
  if (!id) return res.status(400).json({ error: 'Solicitud inválida' });

  try {
    await ensureReferralTables();
    const found = await queryWeb(
      `SELECT TOP 1 * FROM ReferralRedeemRequests WHERE id = @id`,
      { id }
    );
    const row = found.recordset[0];
    if (!row) return res.status(404).json({ error: 'Solicitud no encontrada' });
    if (row.status !== 'pending') {
      return res.status(400).json({ error: `Esta solicitud ya está ${row.status}` });
    }

    const already = await queryWeb(
      `SELECT TOP 1 id FROM ReferralRedemptions WHERE referredOid = @referredOid`,
      { referredOid: row.referredOid }
    );
    if (already.recordset[0]) {
      await queryWeb(
        `UPDATE ReferralRedeemRequests
         SET status = 'rejected', reviewedAt = GETDATE(), reviewedBy = @by
         WHERE id = @id AND status = 'pending'`,
        { id, by: owner.username }
      );
      return res.status(400).json({ error: 'Esa cuenta ya tiene un canje aprobado. Solicitud marcada como rechazada.' });
    }

    const redeemIp = cleanIp(row.registrationIp) || cleanIp(row.referredIp) || '0.0.0.0';
    let inserted = false;
    try {
      const insert = await queryWeb(
        `INSERT INTO ReferralRedemptions (referrerOid, referredOid, referredUsername, code, referredIp, nxEach)
         SELECT @referrerOid, @referredOid, @referredUsername, @code, @ip, @nx
         WHERE NOT EXISTS (SELECT 1 FROM ReferralRedemptions WHERE referredOid = @referredOid)`,
        {
          referrerOid: row.referrerOid,
          referredOid: row.referredOid,
          referredUsername: row.referredUsername,
          code: row.code,
          ip: redeemIp,
          nx: row.nxEach || NX_REWARD,
        }
      );
      inserted = (insert.rowsAffected?.[0] || 0) > 0;
    } catch (error) {
      if (error?.number === 2601 || error?.number === 2627) {
        // referredIp unique collision — retry with unique suffix marker
        const altIp = `${redeemIp}#${row.referredOid}`.slice(0, 45);
        const insert2 = await queryWeb(
          `INSERT INTO ReferralRedemptions (referrerOid, referredOid, referredUsername, code, referredIp, nxEach)
           SELECT @referrerOid, @referredOid, @referredUsername, @code, @ip, @nx
           WHERE NOT EXISTS (SELECT 1 FROM ReferralRedemptions WHERE referredOid = @referredOid)`,
          {
            referrerOid: row.referrerOid,
            referredOid: row.referredOid,
            referredUsername: row.referredUsername,
            code: row.code,
            ip: altIp,
            nx: row.nxEach || NX_REWARD,
          }
        );
        inserted = (insert2.rowsAffected?.[0] || 0) > 0;
      } else throw error;
    }

    if (!inserted) {
      return res.status(400).json({ error: 'No se pudo registrar el canje aprobado' });
    }

    const amount = Number(row.nxEach || NX_REWARD);
    const referredPaid = await addNx(row.referredOid, amount);
    const referrerPaid = referredPaid ? await addNx(row.referrerOid, amount) : false;
    if (!referredPaid || !referrerPaid) {
      if (referredPaid) await addNx(row.referredOid, -amount);
      await queryWeb(`DELETE FROM ReferralRedemptions WHERE referredOid = @referredOid`, {
        referredOid: row.referredOid,
      });
      return res.status(500).json({
        error: 'No se pudo entregar el NX. El jugador debe entrar al juego una vez (VISMS) y reintentas aprobar.',
      });
    }

    await queryWeb(
      `UPDATE ReferralRedeemRequests
       SET status = 'approved', reviewedAt = GETDATE(), reviewedBy = @by
       WHERE id = @id AND status = 'pending'`,
      { id, by: owner.username }
    );

    res.json({
      success: true,
      message: `Aprobado. ${row.referredUsername} y ${row.referrerUsername} recibieron ${amount.toLocaleString('es-CO')} NX.`,
    });
  } catch (error) {
    console.error('[REFERRAL] approve', error.message);
    res.status(500).json({ error: 'No se pudo aprobar la solicitud' });
  }
});

router.post('/admin/requests/:id/reject', async (req, res) => {
  const owner = requireOwner(req, res);
  if (!owner) return;
  const id = Number(req.params.id);
  if (!id) return res.status(400).json({ error: 'Solicitud inválida' });

  try {
    await ensureReferralTables();
    const result = await queryWeb(
      `UPDATE ReferralRedeemRequests
       SET status = 'rejected', reviewedAt = GETDATE(), reviewedBy = @by
       WHERE id = @id AND status = 'pending'`,
      { id, by: owner.username }
    );
    if (!(result.rowsAffected?.[0] > 0)) {
      return res.status(400).json({ error: 'No hay solicitud pendiente con ese id' });
    }
    res.json({ success: true, message: 'Solicitud rechazada. No se entregó NX.' });
  } catch (error) {
    console.error('[REFERRAL] reject', error.message);
    res.status(500).json({ error: 'No se pudo rechazar la solicitud' });
  }
});

export default router;
