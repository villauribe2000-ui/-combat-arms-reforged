import sql from 'mssql';

const config = {
  server: (process.env.DB_SERVER || '94.72.114.174').split(',')[0], // Separar IP del puerto si viene junto
  database: process.env.DB_NAME || 'COMBATARMS',
  user: process.env.DB_USER || 'combatadmin',
  password: process.env.DB_PASSWORD || 'Admin123456',
  port: parseInt(process.env.DB_PORT) || 1433,
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000,
  },
  options: {
    trustServerCertificate: true,
    encrypt: false,
    requestTimeout: 30000,
  },
};

const configLog = {
  server: (process.env.DB_LOG_SERVER || '94.72.114.174').split(',')[0],
  database: process.env.DB_LOG_NAME || 'COMBATARMS_LOG',
  user: process.env.DB_LOG_USER || 'combatadmin',
  password: process.env.DB_LOG_PASSWORD || 'Admin123456',
  port: parseInt(process.env.DB_PORT) || 1433,
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000,
  },
  options: {
    trustServerCertificate: true,
    encrypt: false,
    requestTimeout: 30000,
  },
};

const configGuild = {
  server: (process.env.DB_SERVER || '94.72.114.174').split(',')[0],
  database: 'NX_GuildMaster',
  user: process.env.DB_USER || 'combatadmin',
  password: process.env.DB_PASSWORD || 'Admin123456',
  port: parseInt(process.env.DB_PORT) || 1433,
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000,
  },
  options: {
    trustServerCertificate: true,
    encrypt: false,
    requestTimeout: 30000,
  },
};

let pool = null;
let poolLog = null;
let poolGuild = null;
let poolVisms = null;

export async function getPoolConnection() {
  if (!pool) {
    console.log(`[DB] Conectando a ${config.server}/${config.database} con usuario ${config.user}...`);
    pool = new sql.ConnectionPool(config);
    try {
      await pool.connect();
      console.log('✓ Conectado a COMBATARMS');
    } catch (error) {
      console.error(`❌ Error conectando a COMBATARMS:`, error.message);
      pool = null;
      throw error;
    }
  }
  return pool;
}

export async function getPoolConnectionLog() {
  if (!poolLog) {
    poolLog = new sql.ConnectionPool(configLog);
    await poolLog.connect();
    console.log('✓ Conectado a COMBATARMS_LOG');
  }
  return poolLog;
}

export async function getPoolConnectionGuild() {
  if (!poolGuild) {
    poolGuild = new sql.ConnectionPool(configGuild);
    await poolGuild.connect();
    console.log('✓ Conectado a NX_GuildMaster');
  }
  return poolGuild;
}

export async function getPoolConnectionVisms() {
  if (!poolVisms) {
    const configVisms = {
      server: (process.env.DB_SERVER || '94.72.114.174').split(',')[0],
      database: 'VISMS',
      user: process.env.DB_USER || 'combatadmin',
      password: process.env.DB_PASSWORD || 'Admin123456',
      port: parseInt(process.env.DB_PORT) || 1433,
      pool: {
        max: 10,
        min: 0,
        idleTimeoutMillis: 30000,
      },
      options: {
        trustServerCertificate: true,
        encrypt: false,
      },
    };
    poolVisms = new sql.ConnectionPool(configVisms);
    await poolVisms.connect();
    console.log('✓ Conectado a VISMS');
  }
  return poolVisms;
}

export async function query(sql, params = {}) {
  const pool = await getPoolConnection();
  const request = pool.request();
  
  // Agregar parámetros
  Object.keys(params).forEach(key => {
    request.input(key, params[key]);
  });
  
  return await request.query(sql);
}

export async function queryLog(sql, params = {}) {
  const pool = await getPoolConnectionLog();
  const request = pool.request();
  
  // Agregar parámetros
  Object.keys(params).forEach(key => {
    request.input(key, params[key]);
  });
  
  return await request.query(sql);
}

export async function queryGuildDB(sql, params = {}) {
  const pool = await getPoolConnectionGuild();
  const request = pool.request();
  
  // Agregar parámetros
  Object.keys(params).forEach(key => {
    request.input(key, params[key]);
  });
  
  return await request.query(sql);
}

export async function queryVisms(sql, params = {}) {
  const pool = await getPoolConnectionVisms();
  const request = pool.request();
  
  // Agregar parámetros
  Object.keys(params).forEach(key => {
    request.input(key, params[key]);
  });
  
  return await request.query(sql);
}

// Helper: Obtener oidUser desde username (busca en ambas tablas)
export async function getUserOidByUsername(username) {
  if (!username) return null;
  
  try {
    // Intentar primero en CBT_UserAuth (usuarios nuevos web)
    let result = await query(
      `SELECT oidUser FROM CBT_UserAuth WHERE strNexonID = @username OR strLNexonID = @usernameLower`,
      { username, usernameLower: username.toLowerCase() }
    );
    
    if (result.recordset.length > 0) {
      return result.recordset[0].oidUser;
    }
    
    // Si no encuentra, buscar en CBT_User (usuarios antiguos)
    result = await query(
      `SELECT oidUser FROM CBT_User WHERE strNexonID = @username OR strLNexonID = @usernameLower`,
      { username, usernameLower: username.toLowerCase() }
    );
    
    if (result.recordset.length > 0) {
      return result.recordset[0].oidUser;
    }
    
    return null;
  } catch (error) {
    console.error(`Error getting oidUser for username "${username}":`, error.message);
    return null;
  }
}

export async function disconnect() {
  if (pool) await pool.close();
  if (poolLog) await poolLog.close();
  if (poolGuild) await poolGuild.close();
  if (poolVisms) await poolVisms.close();
  console.log('Desconectado de SQL Server');
}
