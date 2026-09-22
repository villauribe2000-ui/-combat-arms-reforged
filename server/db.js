import sql from 'mssql';

const config = {
  server: process.env.DB_SERVER,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000,
  },
  options: {
    trustServerCertificate: true,
    encrypt: false,
    requestTimeout: 30000, // Aumentar timeout a 30 segundos
  },
};

const configLog = {
  server: process.env.DB_LOG_SERVER,
  database: process.env.DB_LOG_NAME,
  user: process.env.DB_LOG_USER,
  password: process.env.DB_LOG_PASSWORD,
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
  server: process.env.DB_SERVER,
  database: 'NX_GuildMaster',
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
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
    pool = new sql.ConnectionPool(config);
    await pool.connect();
    console.log('✓ Conectado a COMBATARMS');
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
      server: process.env.DB_SERVER,
      database: 'VISMS',
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
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

export async function disconnect() {
  if (pool) await pool.close();
  if (poolLog) await poolLog.close();
  if (poolGuild) await poolGuild.close();
  if (poolVisms) await poolVisms.close();
  console.log('Desconectado de SQL Server');
}
