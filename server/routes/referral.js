import crypto from 'crypto';
import express from 'express';
import { query, queryWeb, queryVisms } from '../db.js';

const router = express.Router();
const NX_REWARD = 20000;
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
/** New accounts must wait before redeeming — blocks instant VPN alt farms. */
const MIN_ACCOUNT_AGE_HOURS = 24;
/** Hard cap per invite code so one farmer cannot mint unlimited NX. */
const MAX_REDEEMS_PER_CODE = 5;
/** Soft rate limit: max successful invites credited to one referrer per day. */
const MAX_REFERRER_REDEEMS_PER_DAY = 3;

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

    const registration = await getRegistrationRow(user.oidUser);
    const registrationIp = cleanIp(registration?.ip);
    if (!registrationIp) {
      return res.status(400).json({
        error: 'Solo cuentas creadas desde la web pueden canjear un código de invitación.',
      });
    }

    const ageHours = accountAgeHours(registration?.createdAt);
    if (ageHours < MIN_ACCOUNT_AGE_HOURS) {
      const left = Math.max(1, Math.ceil(MIN_ACCOUNT_AGE_HOURS - ageHours));
      return res.status(400).json({
        error: `Tu cuenta es muy nueva. Espera ${left} hora(s) más antes de canjear un código (anti-VPN).`,
      });
    }

    // Must redeem from the same IP used at registration — stops home-register / VPN-claim hops.
    if (ip !== registrationIp) {
      console.warn('[REFERRAL] redeem IP mismatch', { guest: user.oidUser, ip, registrationIp });
      return res.status(400).json({
        error: 'Debes canjear el código desde la misma conexión con la que creaste la cuenta.',
      });
    }

    const codeUses = await queryWeb(
      `SELECT COUNT(*) AS uses FROM ReferralRedemptions WHERE referrerOid = @referrerOid`,
      { referrerOid: referrer.oidUser }
    );
    if (Number(codeUses.recordset[0]?.uses || 0) >= MAX_REDEEMS_PER_CODE) {
      return res.status(400).json({
        error: `Este código ya alcanzó el máximo de ${MAX_REDEEMS_PER_CODE} canjes.`,
      });
    }

    const dayUses = await queryWeb(
      `SELECT COUNT(*) AS uses
       FROM ReferralRedemptions
       WHERE referrerOid = @referrerOid
         AND createdAt >= DATEADD(day, -1, GETDATE())`,
      { referrerOid: referrer.oidUser }
    );
    if (Number(dayUses.recordset[0]?.uses || 0) >= MAX_REFERRER_REDEEMS_PER_DAY) {
      return res.status(400).json({
        error: `Este código ya recibió ${MAX_REFERRER_REDEEMS_PER_DAY} invitados hoy. Intenta mañana.`,
      });
    }

    const sameIp = await accountsShareIp(referrer.oidUser, user.oidUser, ip);
    if (sameIp || (registrationIp && await accountsShareIp(referrer.oidUser, user.oidUser, registrationIp))) {
      return res.status(400).json({
        error: 'No puedes canjear un código entre cuentas de la misma IP, aunque el correo sea distinto.',
      });
    }

    const household = await householdAlreadyRedeemed(user.oidUser, ip, registrationIp);
    if (household.blocked) {
      console.warn('[REFERRAL] redeem blocked', {
        guest: user.oidUser,
        ip,
        registrationIp,
        reason: household.reason,
        xff: req.headers['x-forwarded-for'] || null,
        realIp: req.headers['x-real-ip'] || null,
        reqIp: req.ip || null,
      });
      return res.status(400).json({
        error: 'Esta conexión o una cuenta de la misma red ya recibió el premio de invitación. Solo una vez por IP/hogar.',
      });
    }

    // Prefer storing the stable registration IP so VPN hops cannot mint unique referredIp rows.
    const redeemIp = registrationIp || ip;

    let inserted = false;
    try {
      const insert = await queryWeb(
        `INSERT INTO ReferralRedemptions (referrerOid, referredOid, referredUsername, code, referredIp, nxEach)
         SELECT @referrerOid, @referredOid, @referredUsername, @code, @ip, @nx
         WHERE NOT EXISTS (SELECT 1 FROM ReferralRedemptions WHERE referredOid = @referredOid)
           AND NOT EXISTS (SELECT 1 FROM ReferralRedemptions WHERE referredIp = @ip)
           AND NOT EXISTS (
             SELECT 1 FROM ReferralRedemptions r
             INNER JOIN WebRegistrations w ON w.oidUser = r.referredOid
             WHERE w.ip = @registrationIp
           )`,
        {
          referrerOid: referrer.oidUser,
          referredOid: user.oidUser,
          referredUsername: user.username,
          code,
          ip: redeemIp,
          registrationIp,
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
        error: 'Esta cuenta o esta IP ya canjeó un código. El premio es solo una vez por persona y por conexión.',
      });
    }

    const referredPaid = await addNx(user.oidUser, NX_REWARD);
    const referrerPaid = referredPaid ? await addNx(referrer.oidUser, NX_REWARD) : false;
    if (!referredPaid || !referrerPaid) {
      if (referredPaid) await addNx(user.oidUser, -NX_REWARD);
      await queryWeb(`DELETE FROM ReferralRedemptions WHERE referredOid = @referredOid`, { referredOid: user.oidUser });
      return res.status(500).json({
        error: 'No se pudo entregar el NX. Entra al juego una vez y vuelve a intentar.',
      });
    }

    res.json({
      success: true,
      message: `Listo. Tú y ${referrer.username} recibieron ${NX_REWARD.toLocaleString('es-CO')} NX.`,
      reward: NX_REWARD,
    });
  } catch (error) {
    console.error('[REFERRAL] redeem', error.message);
    res.status(500).json({ error: 'No se pudo canjear el código' });
  }
});

export default router;
