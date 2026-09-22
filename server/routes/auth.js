import { Router } from 'express';
import { query, queryVisms } from '../db.js';
import { generateToken, hashPassword, verifyPassword } from '../auth.js';
import jwt from 'jsonwebtoken';

const router = Router();

// Signup
router.post('/signup', async (req, res) => {
  try {
    const { username, password, confirmPassword, email } = req.body;

    console.log('[SIGNUP] Iniciando registro para:', username);

    // Validaciones
    if (!username || !password || !confirmPassword || !email) {
      return res.status(400).json({ error: 'Todos los campos son requeridos' });
    }

    if (username.includes(' ')) {
      return res.status(400).json({ error: 'El login no puede contener espacios' });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ error: 'Las contraseñas no coinciden' });
    }

    if (password.length < 6 || password.length > 20) {
      return res.status(400).json({ error: 'La contraseña debe tener entre 6 y 20 caracteres' });
    }

    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Email inválido. Usa el formato: tu@email.com' });
    }

    console.log('[SIGNUP] Validaciones pasadas');

    // Verificar si el usuario ya existe
    const userCheck = await query(
      'SELECT oidUser FROM CBT_User WHERE strNexonID = @username',
      { username }
    );

    if (userCheck.recordset.length > 0) {
      return res.status(400).json({ error: 'El usuario ya está en uso' });
    }

    console.log('[SIGNUP] Usuario no existe, creando...');

    // Insertar en CBT_User - SOLO campos que sabemos que existen
    const insertResult = await query(
      `INSERT INTO CBT_User (strNexonID, NickName, CreateDate, UserType, Status)
       OUTPUT INSERTED.oidUser, INSERTED.strNexonID, INSERTED.NickName
       VALUES (@username, @username, GETUTCDATE(), 0, 0)`,
      { username }
    );

    console.log('[SIGNUP] Usuario creado en CBT_User');

    const user = insertResult.recordset[0];
    const oidUser = user.oidUser;

    console.log('[SIGNUP] OID:', oidUser);

    // Guardar contraseña en tabla separada
    try {
      await query(
        `IF NOT EXISTS (SELECT 1 FROM CBT_UserAuth WHERE strNexonID = @username)
         INSERT INTO CBT_UserAuth (strNexonID, strPassword, strEmail, RegDate)
         VALUES (@username, @password, @email, GETUTCDATE())`,
        { 
          username, 
          password,
          email
        }
      );
      console.log('[SIGNUP] Contraseña guardada en CBT_UserAuth');
    } catch (authError) {
      console.log('[SIGNUP] Auth error (no crítico):', authError.message);
    }

    const token = generateToken({
      id: oidUser,
      username: user.strNexonID,
      NickName: user.NickName,
      is_admin: false
    });

    console.log(`[CUENTA CREADA] Usuario: ${username}, OID: ${oidUser}`);

    res.status(201).json({
      message: 'Cuenta creada exitosamente',
      user: {
        id: oidUser,
        username: user.strNexonID,
        NickName: user.NickName,
        is_admin: false
      },
      token
    });

  } catch (error) {
    console.error('[SIGNUP] Error completo:', error);
    res.status(500).json({ error: 'Error al crear usuario: ' + (error.message || 'Error desconocido') });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    // Validar campos
    if (!username || !password) {
      return res.status(400).json({ error: 'Usuario y contraseña son requeridos' });
    }

    // Primero buscar en CBT_UserAuth (usuarios nuevos)
    let authResult = await query(
      `SELECT oidUser, strNexonID, strPassword
       FROM CBT_UserAuth
       WHERE strNexonID = @username`,
      { username }
    );

    let oidUser = null;
    let storedPassword = null;

    if (authResult.recordset.length > 0) {
      // Usuario encontrado en CBT_UserAuth
      const userAuth = authResult.recordset[0];
      oidUser = userAuth.oidUser;
      storedPassword = userAuth.strPassword;
    } else {
      // Usuario no en CBT_UserAuth, buscar en CBT_User (usuarios legacy)
      const userResult = await query(
        `SELECT oidUser, strPassword
         FROM CBT_User
         WHERE strNexonID = @username`,
        { username }
      );

      if (userResult.recordset.length === 0) {
        return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });
      }

      const user = userResult.recordset[0];
      oidUser = user.oidUser;
      storedPassword = user.strPassword;
    }

    // Comparar contraseña (está en texto plano en BD)
    if (storedPassword !== password) {
      return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });
    }

    // Obtener datos del usuario desde CBT_User
    const userResult = await query(
      `SELECT oidUser, strNexonID, NickName
       FROM CBT_User
       WHERE oidUser = @oidUser`,
      { oidUser }
    );

    if (userResult.recordset.length === 0) {
      return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });
    }

    const user = userResult.recordset[0];

    // Detectar si es admin (sebasadmin)
    const is_admin = user.strNexonID === 'sebasadmin';

    // Generar token con el NickName incluido
    const token = generateToken({
      id: user.oidUser,
      username: user.strNexonID,
      NickName: user.NickName,
      is_admin: is_admin
    });

    res.json({
      message: 'Login exitoso',
      user: {
        id: user.oidUser,
        username: user.strNexonID,
        NickName: user.NickName,
        is_admin: is_admin
      },
      token,
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Error al iniciar sesión' });
  }
});

// Get current user
router.get('/me', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No autorizado' });
    }

    const token = authHeader.substring(7);
    
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const username = decoded.username;
      const nickName = decoded.NickName;
      const oidUser = decoded.id;
      const is_admin = decoded.is_admin || username === 'sebasadmin'; // Fallback check

      // Obtener GP (Money) y UserType de CBT_User - con timeout
      let gp = 0;
      let userType = 0;
      let userExp = 0;
      try {
        const gpResult = await Promise.race([
          query('SELECT Money, UserType, Exp FROM CBT_User WHERE strNexonID = @username', { username }),
          new Promise((_, reject) => setTimeout(() => reject(new Error('GP timeout')), 5000))
        ]);
        gp = gpResult.recordset[0]?.Money || 0;
        userType = gpResult.recordset[0]?.UserType || 0;
        userExp = gpResult.recordset[0]?.Exp || 0;
      } catch (e) {
        console.log('Error getting GP/UserType:', e.message);
        gp = 0;
        userType = 0;
        userExp = 0;
      }

      // Calcular nivel a partir de experiencia
      let level = 0;
      if (userType === 1) {
        level = 99; // GM
      } else {
        // Tabla de niveles completa (65 niveles)
        const levelThresholds = [
          {"exp": 0, "nivel": 0},
          {"exp": 550, "nivel": 1},
          {"exp": 1200, "nivel": 2},
          {"exp": 2500, "nivel": 3},
          {"exp": 5000, "nivel": 4},
          {"exp": 8700, "nivel": 5},
          {"exp": 15000, "nivel": 6},
          {"exp": 22000, "nivel": 7},
          {"exp": 30500, "nivel": 8},
          {"exp": 40500, "nivel": 9},
          {"exp": 52000, "nivel": 10},
          {"exp": 65000, "nivel": 11},
          {"exp": 81000, "nivel": 12},
          {"exp": 99000, "nivel": 13},
          {"exp": 119000, "nivel": 14},
          {"exp": 141000, "nivel": 15},
          {"exp": 166000, "nivel": 16},
          {"exp": 194000, "nivel": 17},
          {"exp": 225000, "nivel": 18},
          {"exp": 259000, "nivel": 19},
          {"exp": 296000, "nivel": 20},
          {"exp": 336000, "nivel": 21},
          {"exp": 379000, "nivel": 22},
          {"exp": 425000, "nivel": 23},
          {"exp": 474000, "nivel": 24},
          {"exp": 526000, "nivel": 25},
          {"exp": 580000, "nivel": 26},
          {"exp": 638000, "nivel": 27},
          {"exp": 699000, "nivel": 28},
          {"exp": 763000, "nivel": 29},
          {"exp": 830000, "nivel": 30},
          {"exp": 900000, "nivel": 31},
          {"exp": 983000, "nivel": 32},
          {"exp": 1074000, "nivel": 33},
          {"exp": 1173000, "nivel": 34},
          {"exp": 1280000, "nivel": 35},
          {"exp": 1400000, "nivel": 36},
          {"exp": 1533000, "nivel": 37},
          {"exp": 1679000, "nivel": 38},
          {"exp": 1838000, "nivel": 39},
          {"exp": 2010000, "nivel": 40},
          {"exp": 2200000, "nivel": 41},
          {"exp": 2408000, "nivel": 42},
          {"exp": 2634000, "nivel": 43},
          {"exp": 2878000, "nivel": 44},
          {"exp": 3140000, "nivel": 45},
          {"exp": 3420000, "nivel": 46},
          {"exp": 3718000, "nivel": 47},
          {"exp": 4034000, "nivel": 48},
          {"exp": 4368000, "nivel": 49},
          {"exp": 4720000, "nivel": 50},
          {"exp": 5100000, "nivel": 51},
          {"exp": 5500000, "nivel": 52},
          {"exp": 6000000, "nivel": 53},
          {"exp": 6800000, "nivel": 54},
          {"exp": 8000000, "nivel": 55},
          {"exp": 9200000, "nivel": 56},
          {"exp": 10400000, "nivel": 57},
          {"exp": 11600000, "nivel": 58},
          {"exp": 12800000, "nivel": 59},
          {"exp": 14000000, "nivel": 60},
          {"exp": 29000000, "nivel": 61},
          {"exp": 44000000, "nivel": 62},
          {"exp": 59000000, "nivel": 63},
          {"exp": 74000000, "nivel": 64},
          {"exp": 89000000, "nivel": 65}
        ];
        
        for (let i = levelThresholds.length - 1; i >= 0; i--) {
          if (userExp >= levelThresholds[i].exp) {
            level = levelThresholds[i].nivel;
            break;
          }
        }
      }

      // Obtener NX real de VISMS - con timeout
      let nx = 0;
      try {
        const vismResult = await Promise.race([
          queryVisms('SELECT RealBalance FROM VISMS_UserList WHERE strNexonID = @username', { username }),
          new Promise((_, reject) => setTimeout(() => reject(new Error('NX timeout')), 5000))
        ]);
        nx = vismResult.recordset[0]?.RealBalance || 0;
      } catch (e) {
        console.log('Error getting NX:', e.message);
        nx = 0;
      }

      res.json({
        id: oidUser,
        username: username,
        NickName: nickName,
        nx: nx,
        gp: gp,
        Money: gp,
        is_admin: is_admin,
        level: level,
        UserType: userType
      });
    } catch (decodeError) {
      console.error('Token decode error:', decodeError);
      res.status(401).json({ error: 'Token inválido' });
    }
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Error al obtener usuario' });
  }
});

// Update user profile
router.put('/profile', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No autorizado' });
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const username = decoded.username;

    const { avatar_url, bio } = req.body;

    // Actualizar perfil (por ahora solo guardamos en memoria/token)
    // La BD de Combat Arms no tiene estos campos
    // En un sistema real, crearías una tabla separate de perfiles

    const result = await query(
      `SELECT oidUser as id, strNexonID as username, NickName, KillCnt as kills, DeadCnt as deaths
       FROM CBT_User WHERE strNexonID = @username`,
      { username }
    );

    if (result.recordset.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    res.json({
      ...result.recordset[0],
      avatar_url,
      bio
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Error al actualizar perfil' });
  }
});

// DEBUG: Ver estructura de CBT_User
router.get('/debug-user/:username', async (req, res) => {
  try {
    const result = await query(
      `SELECT * FROM CBT_User WHERE strNexonID = @username`,
      { username: req.params.username }
    );

    if (result.recordset.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    const user = result.recordset[0];
    console.log('[DEBUG] Campos disponibles en CBT_User para', req.params.username, ':', Object.keys(user));
    console.log('[DEBUG] Datos completos:', user);

    res.json({
      campos: Object.keys(user),
      datos: user
    });
  } catch (error) {
    console.error('Debug error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get user profile by username
router.get('/profile/:username', async (req, res) => {
  try {
    const result = await query(
      `SELECT oidUser as id, strNexonID as username, NickName, KillCnt as kills, DeadCnt as deaths, 
              WinCnt as wins, LoseCnt as losses, Money, UserType, Exp
       FROM CBT_User WHERE strNexonID = @username`,
      { username: req.params.username }
    );

    if (result.recordset.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    const user = result.recordset[0];

    res.json({
      id: user.id,
      username: user.username,
      NickName: user.NickName,
      kills: user.kills,
      deaths: user.deaths,
      wins: user.wins,
      losses: user.losses,
      Money: user.Money,
      Exp: user.Exp || 0,
      UserType: user.UserType,
      clan: null
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: 'Error al obtener perfil' });
  }
});

export default router;
