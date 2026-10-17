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
    requestTimeout: 30000,
  },
};

const configWeb = {
  server: (process.env.DB_SERVER || '94.72.114.174').split(',')[0],
  database: 'combatarms_web',
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

const pools = {
  main: null,
  log: null,
  guild: null,
  visms: null,
  web: null,
};

function isClosedError(error) {
  const msg = String(error?.message || '').toLowerCase();
  const code = String(error?.code || '');
  return code === 'ECONNCLOSED'
    || code === 'ENOTOPEN'
    || code === 'ECONNRESET'
    || code === 'ESOCKET'
    || msg.includes('connection is closed')
    || msg.includes('connection lost')
    || msg.includes('socket hang up');
}

function releasePool(key) {
  const current = pools[key];
  pools[key] = null;
  current?.close().catch(() => {});
}

async function acquirePool(key, poolConfig, label) {
  const current = pools[key];
  if (current && current.connected === false) {
    releasePool(key);
  }
  if (pools[key]) return pools[key];

  const created = new sql.ConnectionPool(poolConfig);
  created.on('error', (error) => {
    console.error(`[DB] ${label}:`, error?.message || error);
    if (pools[key] === created) pools[key] = null;
  });
  try {
    await created.connect();
    pools[key] = created;
    console.log(`✓ Conectado a ${label}`);
    return created;
  } catch (error) {
    if (pools[key] === created) pools[key] = null;
    created.close().catch(() => {});
    throw error;
  }
}

async function runQuery(key, poolConfig, label, text, params = {}) {
  const exec = async () => {
    const active = await acquirePool(key, poolConfig, label);
    const request = active.request();
    Object.keys(params).forEach((name) => {
      request.input(name, params[name]);
    });
    return request.query(text);
  };

  try {
    return await exec();
  } catch (error) {
    if (!isClosedError(error)) throw error;
    console.warn(`[DB] ${label} reconectando: ${error.message}`);
    releasePool(key);
    return exec();
  }
}

export async function getPoolConnection() {
  return acquirePool('main', config, 'COMBATARMS');
}

export async function getPoolConnectionLog() {
  return acquirePool('log', configLog, 'COMBATARMS_LOG');
}

export async function getPoolConnectionGuild() {
  return acquirePool('guild', configGuild, 'NX_GuildMaster');
}

export async function getPoolConnectionVisms() {
  return acquirePool('visms', configVisms, 'VISMS');
}

export async function getPoolConnectionWeb() {
  return acquirePool('web', configWeb, 'combatarms_web');
}

export async function query(text, params = {}) {
  return runQuery('main', config, 'COMBATARMS', text, params);
}

export async function queryLog(text, params = {}) {
  return runQuery('log', configLog, 'COMBATARMS_LOG', text, params);
}

export async function queryGuildDB(text, params = {}) {
  return runQuery('guild', configGuild, 'NX_GuildMaster', text, params);
}

export async function queryVisms(text, params = {}) {
  return runQuery('visms', configVisms, 'VISMS', text, params);
}

export async function queryWeb(text, params = {}) {
  return runQuery('web', configWeb, 'combatarms_web', text, params);
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
  for (const key of Object.keys(pools)) {
    const current = pools[key];
    pools[key] = null;
    if (current) {
      try { await current.close(); } catch {}
    }
  }
  console.log('Desconectado de SQL Server');
}
