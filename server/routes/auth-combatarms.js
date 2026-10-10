/**
 * Autenticacion con COMBATARMS (CBT_UserAuth)
 * Valida credenciales contra la BD del juego
 */

import express from 'express';
import { query } from '../db.js';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this';

// Helper: Generar JWT
function generateToken(userId, username) {
  return jwt.sign(
    { userId, username, iat: Date.now() },
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
        totalBalance: profile?.Money || 0
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

    // Validar que el usuario no exista
    const existing = await query(`
      SELECT COUNT(*) as count FROM COMBATARMS.dbo.CBT_UserAuth 
      WHERE strNexonID = '${username}' OR strLNexonID = '${username.toLowerCase()}'
    `);

    if (existing.recordset[0].count > 0) {
      return res.status(400).json({
        success: false,
        error: 'El usuario ya existe'
      });
    }

    // Calcular hash SHA1
    const passwordHash = calculateSHA1(password);
    
    // Insertar usuario - USAR HASHBYTES DIRECTAMENTE COMO SQL SERVER
    await query(`
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
        '${username}',
        '${username.toLowerCase()}',
        CONVERT(VARBINARY(20), HASHBYTES('SHA1', '${password}'), 2),
        '${email}',
        1,
        GETDATE(),
        GETDATE(),
        'AA-BB-CC-DD-EE-FF',
        '181.136.167.82',
        '1111-2222-3333-4444-5555-6666-7777-8888'
      )
    `);

    // Obtener el oidUser del usuario creado
    const newUser = await query(`
      SELECT oidUser FROM COMBATARMS.dbo.CBT_UserAuth 
      WHERE strNexonID = '${username}'
    `);

    const oidUser = newUser.recordset[0].oidUser;

    // Crear nickname reservado (IGUAL AL BOT DE DISCORD)
    await query(`
      INSERT INTO COMBATARMS.dbo.CBT_UserNicknames (nickname)
      VALUES ('${username}')
    `);

    // 🆕 Crear entrada en CBT_User (NECESARIO PARA QUE EL JUEGO FUNCIONE)
    await query(`
      INSERT INTO COMBATARMS.dbo.CBT_User (
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
      ) VALUES (
        ${oidUser},
        '${username}',
        '${username}',
        0,
        0,
        1,
        0,
        0,
        0,
        GETDATE()
      )
    `);

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
        ${oidUser},
        '${username}',
        '${username.toLowerCase()}',
        0,
        0,
        0,
        GETDATE(),
        GETDATE()
      )
    `);

    // Generar JWT
    const token = generateToken(oidUser, username);

    return res.json({
      success: true,
      token,
      message: 'Cuenta creada exitosamente',
      user: {
        userId: oidUser,
        id: oidUser,
        username,
        email,
        nickname: null,
        level: 0,
        experience: 0,
        gameCoins: 0,
        bonusCoins: 0,
        totalBalance: 0
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

    // Verificar JWT
    const decoded = jwt.verify(token, JWT_SECRET);

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
        totalBalance: profile?.Money || 0
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
        joinDate: character?.CreateDate || user.strNexonID
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

export default router;
