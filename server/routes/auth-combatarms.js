/**
 * Autenticacion con COMBATARMS (CBT_UserAuth)
 * Valida credenciales contra la BD del juego
 */

import express from 'express';
import { query, queryWeb } from '../db.js';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { userIsSiteAdmin } from '../site-admin.js';
import { actorFromReq, pinFromBody, pinRow, savePin, checkPin, ensurePinTable } from '../login-pin.js';
import { noteReferralVisit } from './referral.js';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this';
const MAX_ACCOUNTS_PER_IP = 2;
const EMAIL_RE = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

let registrationTableReady = null;

function normalizeIp(value) {
  let ip = String(value || '').split(',')[0].trim();
  if (ip.startsWith('::ffff:')) ip = ip.slice(7);
  return ip.slice(0, 45);
}

function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase();
}

export function ensureRegistrationTable() {
  if (!registrationTableReady) {
    registrationTableReady = (async () => {
      await queryWeb(`
        IF OBJECT_ID('WebRegistrations', 'U') IS NULL
        BEGIN
          CREATE TABLE WebRegistrations (
            oidUser INT NOT NULL PRIMARY KEY,
            username NVARCHAR(50) NOT NULL,
            email NVARCHAR(100) NOT NULL,
            ip NVARCHAR(45) NOT NULL,
            createdAt DATETIME NOT NULL DEFAULT GETDATE()
          );
          CREATE INDEX idx_webreg_ip ON WebRegistrations(ip);
          CREATE INDEX idx_webreg_email ON WebRegistrations(email);
        END
      `);

      try {
        await query(`
          INSERT INTO combatarms_web.dbo.WebRegistrations (oidUser, username, email, ip, createdAt)
          SELECT
            a.oidUser,
            LEFT(ISNULL(a.strNexonID, ''), 50),
            LEFT(LOWER(LTRIM(RTRIM(ISNULL(a.strEmail, '')))), 100),
            LEFT(
              CASE
                WHEN LTRIM(RTRIM(a.strLastLoginIP)) LIKE '::ffff:%'
                  THEN SUBSTRING(LTRIM(RTRIM(a.strLastLoginIP)), 8, 45)
                ELSE LTRIM(RTRIM(a.strLastLoginIP))
              END,
            45),
            ISNULL(a.RegDate, GETDATE())
          FROM COMBATARMS.dbo.CBT_UserAuth a
          WHERE a.strLastLoginIP IS NOT NULL
            AND LTRIM(RTRIM(a.strLastLoginIP)) NOT IN ('', '0.0.0.0', '::1', '127.0.0.1', '::ffff:127.0.0.1')
            AND NOT EXISTS (
              SELECT 1 FROM combatarms_web.dbo.WebRegistrations w WHERE w.oidUser = a.oidUser
            )
        `);
      } catch (error) {
        console.warn('[REGISTER] No se pudieron importar las IPs ya guardadas:', error.message);
      }
    })().catch((error) => {
      registrationTableReady = null;
      throw error;
    });
  }
  return registrationTableReady;
}

// Helper: Obtener IP del cliente
function getClientIP(req) {
  const forwarded = req.headers['x-forwarded-for'];
  const raw = (typeof forwarded === 'string' && forwarded.trim())
    ? forwarded
    : (req.headers['x-real-ip'] || req.ip || req.socket?.remoteAddress || req.connection?.remoteAddress || '0.0.0.0');
  return normalizeIp(raw) || '0.0.0.0';
}

// Helper: Generar JWT
function generateToken(userId, username) {
  return jwt.sign(
    { userId: Number(userId) || userId, username },
    JWT_SECRET,
    { expiresIn: '30d' }
  );
}

// Helper: Calcular SHA1 - igual que HASHBYTES('SHA1', password) de SQL Server
// SQL Server HASHBYTES usa UTF-16 LE encoding (NVARCHAR)
function calculateSHA1(password) {
  // SQL Server convierte NVARCHAR a UTF-16 LE antes de hashear
  return crypto.createHash('sha1').update(password, 'utf16le').digest('hex').toUpperCase();
}

// ==========================================
// LOGIN
// ==========================================

// POST /api/auth-combatarms/login - Login con credenciales del juego
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    // Validar datos
    if (!username || !password) {
      return res.status(400).json({
        success: false,
        error: 'Usuario y contraseña son requeridos'
      });
    }

    // Buscar usuario en CBT_UserAuth - OBTENER PASSWORD COMO HEXADECIMAL
    const result = await query(`
      SELECT 
        oidUser,
        strNexonID,
        CONVERT(VARCHAR(max), CONVERT(VARBINARY(max), strPassword), 2) as strPassword,
        strEmail
      FROM COMBATARMS.dbo.CBT_UserAuth
      WHERE strNexonID = '${username}' OR strLNexonID = '${username.toLowerCase()}'
    `);

    if (!result.recordset || result.recordset.length === 0) {
      return res.status(401).json({
        success: false,
        error: 'Usuario o contraseña incorrectos'
      });
    }

    const user = result.recordset[0];

    // Calcular hash SHA1 de la contraseña ingresada
    const passwordHash = calculateSHA1(password);
    
    // El strPassword viene como string hexadecimal desde SQL Server
    const storedPassword = user.strPassword;
    
    // Normalizar a mayúsculas y eliminar espacios
    const storedPasswordNorm = (typeof storedPassword === 'string') 
      ? storedPassword.toUpperCase().trim()
      : storedPassword;

    // DEBUG: Log de ambos hashes
    console.log(`[DEBUG LOGIN] Usuario: ${username}`);
    console.log(`[DEBUG LOGIN] Calculado (Node): ${passwordHash}`);
    console.log(`[DEBUG LOGIN] Guardado (BD):    ${storedPasswordNorm}`);

    if (passwordHash !== storedPasswordNorm) {
      console.log(`[DEBUG LOGIN] ❌ Hash NO coincide`);
      return res.status(401).json({
        success: false,
        error: 'Usuario o contraseña incorrectos'
      });
    }
    
    console.log(`[LOGIN SUCCESS] Usuario ${username} autenticado correctamente`);

    // Generar JWT
    const token = generateToken(user.oidUser, user.strNexonID);

    // Obtener datos del usuario desde CBT_User
    const userDetails = await query(`
      SELECT TOP 1
        oidUser,
        strNexonID,
        NickName,
        Exp,
        Money,
        Status
      FROM COMBATARMS.dbo.CBT_User
      WHERE oidUser = ${user.oidUser}
    `);

    // Obtener balance de dinero desde VISMS
    const balance = await query(`
      SELECT 
        RealBalance,
        BonusBalance,
        TotalBalance
      FROM VISMS.dbo.VISMS_UserList
      WHERE oid = ${user.oidUser}
    `);

    const profile = userDetails.recordset?.[0];
    const wallet = balance.recordset?.[0];
    const staff = await userIsSiteAdmin(user.oidUser, user.strNexonID);
    noteReferralVisit(user.oidUser, user.strNexonID, getClientIP(req)).catch((error) => {
      console.warn('[REFERRAL] login', error.message);
    });

    return res.json({
      success: true,
      token,
      user: {
        userId: user.oidUser,
        id: user.oidUser,
        username: user.strNexonID,
        email: user.strEmail,
        nickname: profile?.NickName,
        experience: profile?.Exp || 0,
        gameCoins: wallet?.RealBalance || 0,
        bonusCoins: wallet?.BonusBalance || 0,
        totalBalance: profile?.Money || 0,
        is_admin: staff.is_admin,
        webRole: staff.webRole,
      }
    });
  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json({
      success: false,
      error: 'Error al procesar el login'
    });
  }
});

// ==========================================
// REGISTRO
// ==========================================

// POST /api/auth-combatarms/register - Registrar nueva cuenta
router.post('/register', async (req, res) => {
  try {
    const { username, password, email } = req.body;
    
    // 🆕 Obtener IP del cliente
    const clientIP = getClientIP(req);
    
    // 🆕 VALIDAR QUE LA IP SE DETECTÓ CORRECTAMENTE
    if (!clientIP || clientIP === '0.0.0.0' || clientIP === '::1' || clientIP === '127.0.0.1') {
      return res.status(400).json({
        success: false,
        error: 'No se pudo detectar tu dirección IP. Intenta de nuevo.'
      });
    }

    // Validar datos
    if (!username || !password || !email) {
      return res.status(400).json({
        success: false,
        error: 'Usuario, contraseña y email son requeridos'
      });
    }

    // Validar formato
    if (username.length < 3 || username.length > 50) {
      return res.status(400).json({
        success: false,
        error: 'El usuario debe tener entre 3 y 50 caracteres'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        error: 'La contraseña debe tener al menos 6 caracteres'
      });
    }

    const normalizedEmail = normalizeEmail(email);
    if (!EMAIL_RE.test(normalizedEmail) || normalizedEmail.length > 100) {
      return res.status(400).json({
        success: false,
        error: 'El correo no es válido. Usa el formato nombre@correo.com'
      });
    }

    const emailTaken = await query(`
      SELECT COUNT(*) as count
      FROM COMBATARMS.dbo.CBT_UserAuth
      WHERE LOWER(LTRIM(RTRIM(strEmail))) = @email
    `, { email: normalizedEmail });

    if (Number(emailTaken.recordset?.[0]?.count || 0) > 0) {
      return res.status(400).json({
        success: false,
        error: 'Este correo ya está registrado. Solo se puede usar en una cuenta.'
      });
    }

    await ensureRegistrationTable();

    const ipCount = await queryWeb(`
      SELECT COUNT(*) as count
      FROM WebRegistrations
      WHERE ip = @ip
    `, { ip: clientIP });

    if (Number(ipCount.recordset?.[0]?.count || 0) >= MAX_ACCOUNTS_PER_IP) {
      return res.status(400).json({
        success: false,
        error: 'No puedes crear esta cuenta. Ya superaste el límite de 2 cuentas por IP.'
      });
    }

    // Validar que el usuario no exista
    const existing = await query(`
      SELECT COUNT(*) as count FROM COMBATARMS.dbo.CBT_UserAuth 
      WHERE strNexonID = @username OR strLNexonID = @usernameLower
    `, {
      username,
      usernameLower: username.toLowerCase()
    });

    if (existing.recordset[0].count > 0) {
      return res.status(400).json({
        success: false,
        error: 'El usuario ya existe'
      });
    }

    // Insertar usuario con parámetros seguros
    const insertAuthResult = await query(`
      INSERT INTO COMBATARMS.dbo.CBT_UserAuth (
        strNexonID,
        strLNexonID,
        strPassword,
        strEmail,
        bIsMailActive,
        RegDate,
        UpdDate,
        strLastMacAddress,
        strLastLoginIP,
        strLastHWID
      ) VALUES (
        @username,
        @usernameLower,
        CONVERT(VARBINARY(20), HASHBYTES('SHA1', @password), 2),
        @email,
        1,
        GETDATE(),
        GETDATE(),
        'AA-BB-CC-DD-EE-FF',
        @clientIP,
        '1111-2222-3333-4444-5555-6666-7777-8888'
      )
      
      SELECT @@IDENTITY as oidUser
    `, {
      username,
      usernameLower: username.toLowerCase(),
      password,
      email: normalizedEmail,
      clientIP
    });

    const oidUser = insertAuthResult.recordset[0].oidUser;

    try {
      await queryWeb(`
        INSERT INTO WebRegistrations (oidUser, username, email, ip)
        VALUES (@oidUser, @username, @email, @ip)
      `, {
        oidUser,
        username: String(username).slice(0, 50),
        email: normalizedEmail,
        ip: clientIP
      });

      const afterCount = await queryWeb(`
        SELECT COUNT(*) as count
        FROM WebRegistrations
        WHERE ip = @ip
      `, { ip: clientIP });

      if (Number(afterCount.recordset?.[0]?.count || 0) > MAX_ACCOUNTS_PER_IP) {
        await queryWeb(`DELETE FROM WebRegistrations WHERE oidUser = @oidUser`, { oidUser });
        await query(`DELETE FROM COMBATARMS.dbo.CBT_UserAuth WHERE oidUser = @oidUser`, { oidUser });
        return res.status(400).json({
          success: false,
          error: 'No puedes crear esta cuenta. Ya superaste el límite de 2 cuentas por IP.'
        });
      }
    } catch (trackError) {
      console.error('[REGISTER] No se pudo guardar la IP de registro:', trackError);
      await query(
        `DELETE FROM COMBATARMS.dbo.CBT_UserAuth WHERE oidUser = @oidUser`,
        { oidUser }
      ).catch((rollbackError) => console.error('[REGISTER] rollback auth', rollbackError));
      return res.status(500).json({
        success: false,
        error: 'Error al registrar la cuenta'
      });
    }

    // Crear nickname reservado
    await query(`
      INSERT INTO COMBATARMS.dbo.CBT_UserNicknames (nickname)
      VALUES (@username)
    `, { username });

    // Crear entrada en VISMS
    await query(`
      INSERT INTO VISMS.dbo.VISMS_UserList (
        ServiceCode,
        oid,
        strNexonID,
        strLNexonID,
        RealBalance,
        BonusBalance,
        TotalBalance,
        RegDate,
        UpdDate
      ) VALUES (
        'ca_classic',
        @oidUser,
        @username,
        @usernameLower,
        0,
        0,
        0,
        GETDATE(),
        GETDATE()
      )
    `, { oidUser, username, usernameLower: username.toLowerCase() });

    // Generar JWT
    const token = generateToken(oidUser, username);
    noteReferralVisit(oidUser, username, getClientIP(req)).catch((error) => {
      console.warn('[REFERRAL] register', error.message);
    });

    return res.json({
      success: true,
      token,
      message: 'Cuenta creada exitosamente',
      user: {
        userId: oidUser,
        id: oidUser,
        username,
        email: normalizedEmail,
        nickname: null,
        level: 0,
        experience: 0,
        gameCoins: 0,
        bonusCoins: 0,
        totalBalance: 0,
        is_admin: false
      }
    });
  } catch (error) {
    console.error('Error en registro:', error);
    res.status(500).json({
      success: false,
      error: 'Error al registrar la cuenta'
    });
  }
});

// ==========================================
// VERIFICAR TOKEN
// ==========================================

// GET /api/auth-combatarms/verify - Verificar token JWT
router.get('/verify', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Token no proporcionado'
      });
    }

    const decoded = jwt.verify(token, JWT_SECRET, { clockTolerance: 1e12 });

    // Obtener datos del usuario
    const result = await query(`
      SELECT 
        oidUser,
        strNexonID,
        strEmail
      FROM COMBATARMS.dbo.CBT_UserAuth
      WHERE oidUser = ${decoded.userId}
    `);

    if (!result.recordset || result.recordset.length === 0) {
      return res.status(401).json({
        success: false,
        error: 'Usuario no encontrado'
      });
    }

    const user = result.recordset[0];

    // Obtener datos del personaje
    const userDetails = await query(`
      SELECT TOP 1
        oidUser,
        strNexonID,
        NickName,
        Exp,
        Money,
        Status
      FROM COMBATARMS.dbo.CBT_User
      WHERE oidUser = ${user.oidUser}
    `);

    // Obtener balance
    const balance = await query(`
      SELECT 
        RealBalance,
        BonusBalance,
        TotalBalance
      FROM VISMS.dbo.VISMS_UserList
      WHERE oid = ${user.oidUser}
    `);

    const profile = userDetails.recordset?.[0];
    const wallet = balance.recordset?.[0];
    const staff = await userIsSiteAdmin(user.oidUser, user.strNexonID);

    return res.json({
      success: true,
      user: {
        userId: user.oidUser,
        id: user.oidUser,
        username: user.strNexonID,
        email: user.strEmail,
        nickname: profile?.NickName,
        experience: profile?.Exp || 0,
        gameCoins: wallet?.RealBalance || 0,
        bonusCoins: wallet?.BonusBalance || 0,
        totalBalance: profile?.Money || 0,
        is_admin: staff.is_admin,
        webRole: staff.webRole,
      }
    });
  } catch (error) {
    console.error('Error verificando token:', error);
    res.status(401).json({
      success: false,
      error: 'Token inválido'
    });
  }
});

// ==========================================
// OBTENER PERFIL
// ==========================================

// GET /api/auth-combatarms/profile/:userId - Obtener perfil del usuario
router.get('/profile/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    // Obtener datos básicos
    const userResult = await query(`
      SELECT 
        oidUser,
        strNexonID,
        strEmail
      FROM COMBATARMS.dbo.CBT_UserAuth
      WHERE oidUser = ${userId}
    `);

    if (!userResult.recordset || userResult.recordset.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Usuario no encontrado'
      });
    }

    const user = userResult.recordset[0];

    // Obtener datos del personaje
    const characterResult = await query(`
      SELECT TOP 1
        oidUser,
        strNexonID,
        NickName,
        Exp,
        Money,
        Status,
        FaceType,
        ClassType,
        genderType,
        CreateDate
      FROM COMBATARMS.dbo.CBT_User
      WHERE oidUser = ${userId}
    `);

    // Obtener balance
    const balanceResult = await query(`
      SELECT 
        RealBalance,
        BonusBalance,
        TotalBalance
      FROM VISMS.dbo.VISMS_UserList
      WHERE oid = ${userId}
    `);

    const character = characterResult.recordset?.[0];
    const wallet = balanceResult.recordset?.[0];
    const staff = await userIsSiteAdmin(user.oidUser, user.strNexonID);

    return res.json({
      success: true,
      profile: {
        userId: user.oidUser,
        id: user.oidUser,
        username: user.strNexonID,
        email: user.strEmail,
        nickname: character?.NickName || 'Sin crear',
        experience: character?.Exp || 0,
        gameCoins: wallet?.RealBalance || 0,
        bonusCoins: wallet?.BonusBalance || 0,
        totalBalance: character?.Money || 0,
        characterClass: character?.ClassType,
        gender: character?.genderType,
        joinDate: character?.CreateDate || user.strNexonID,
        is_admin: staff.is_admin,
        webRole: staff.webRole,
      }
    });
  } catch (error) {
    console.error('Error obteniendo perfil:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener el perfil'
    });
  }
});

// ==========================================
// CAMBIAR CONTRASEÑA
// ==========================================

// POST /api/auth-combatarms/change-password - Cambiar contraseña del usuario
router.post('/change-password', async (req, res) => {
  try {
    const { userId, currentPassword, newPassword, confirmPassword } = req.body;

    // Validar datos
    if (!userId || !currentPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({
        success: false,
        error: 'Todos los campos son requeridos'
      });
    }

    // Validar que las contraseñas nuevas coincidan
    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        success: false,
        error: 'Las contraseñas nuevas no coinciden'
      });
    }

    // Validar longitud mínima
    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        error: 'La contraseña debe tener al menos 6 caracteres'
      });
    }

    // Validar que la contraseña nueva sea diferente a la actual
    if (currentPassword === newPassword) {
      return res.status(400).json({
        success: false,
        error: 'La contraseña nueva debe ser diferente a la actual'
      });
    }

    // Obtener usuario
    const userResult = await query(`
      SELECT 
        oidUser,
        strNexonID,
        CONVERT(VARCHAR(max), CONVERT(VARBINARY(max), strPassword), 2) as strPassword
      FROM COMBATARMS.dbo.CBT_UserAuth
      WHERE oidUser = ${userId}
    `);

    if (!userResult.recordset || userResult.recordset.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Usuario no encontrado'
      });
    }

    const user = userResult.recordset[0];

    // Validar contraseña actual
    const currentPasswordHash = calculateSHA1(currentPassword);
    const storedPasswordNorm = user.strPassword.toUpperCase().trim();

    if (currentPasswordHash !== storedPasswordNorm) {
      console.log(`[CHANGE PASSWORD] Contraseña actual incorrecta para usuario ${user.strNexonID}`);
      return res.status(401).json({
        success: false,
        error: 'La contraseña actual es incorrecta'
      });
    }

    // Actualizar contraseña en BD
    await query(`
      UPDATE COMBATARMS.dbo.CBT_UserAuth
      SET strPassword = CONVERT(VARBINARY(20), HASHBYTES('SHA1', '${newPassword}'), 2),
          UpdDate = GETDATE()
      WHERE oidUser = ${userId}
    `);

    console.log(`[CHANGE PASSWORD SUCCESS] Contraseña cambiada para usuario ${user.strNexonID}`);

    return res.json({
      success: true,
      message: 'Contraseña cambiada exitosamente'
    });
  } catch (error) {
    console.error('Error cambiando contraseña:', error);
    res.status(500).json({
      success: false,
      error: 'Error al cambiar la contraseña'
    });
  }
});

router.get('/pin-status', async (req, res) => {
  try {
    const actor = actorFromReq(req);
    if (!actor) return res.status(401).json({ error: 'login required' });
    await ensurePinTable();
    const row = await pinRow(actor.userId);
    res.json({ hasPin: Boolean(row) });
  } catch (error) {
    console.error('[PIN STATUS]', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/pin-setup', async (req, res) => {
  try {
    const actor = actorFromReq(req);
    if (!actor) return res.status(401).json({ error: 'login required' });
    const pin = pinFromBody(req.body?.pin);
    const confirm = pinFromBody(req.body?.confirm);
    if (!pin) return res.status(400).json({ error: 'El código debe tener 6 dígitos' });
    if (confirm && confirm !== pin) return res.status(400).json({ error: 'Los códigos no coinciden' });
    const row = await pinRow(actor.userId);
    if (row) return res.status(400).json({ error: 'Ya tienes un código. Cámbialo en Account.' });
    await savePin(actor.userId, actor.username, pin);
    res.json({ success: true });
  } catch (error) {
    console.error('[PIN SETUP]', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/pin-verify', async (req, res) => {
  try {
    const actor = actorFromReq(req);
    if (!actor) return res.status(401).json({ error: 'login required' });
    const pin = pinFromBody(req.body?.pin);
    if (!pin) return res.status(400).json({ error: 'El código debe tener 6 dígitos' });
    const row = await pinRow(actor.userId);
    if (!row) return res.status(400).json({ error: 'Debes crear un código de 6 dígitos' });
    const ok = await checkPin(actor.userId, pin);
    if (!ok) return res.status(401).json({ error: 'Código incorrecto' });
    res.json({ success: true });
  } catch (error) {
    console.error('[PIN VERIFY]', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/pin-change', async (req, res) => {
  try {
    const actor = actorFromReq(req);
    if (!actor) return res.status(401).json({ error: 'login required' });
    const currentPin = pinFromBody(req.body?.currentPin);
    const newPin = pinFromBody(req.body?.newPin);
    const confirm = pinFromBody(req.body?.confirm);
    if (!currentPin || !newPin) return res.status(400).json({ error: 'El código debe tener 6 dígitos' });
    if (confirm && confirm !== newPin) return res.status(400).json({ error: 'Los códigos no coinciden' });
    const row = await pinRow(actor.userId);
    if (!row) {
      await savePin(actor.userId, actor.username, newPin);
      return res.json({ success: true });
    }
    const ok = await checkPin(actor.userId, currentPin);
    if (!ok) return res.status(401).json({ error: 'El código actual es incorrecto' });
    await savePin(actor.userId, actor.username, newPin);
    res.json({ success: true });
  } catch (error) {
    console.error('[PIN CHANGE]', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
