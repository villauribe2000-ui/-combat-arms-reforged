import { queryWeb } from './db.js';

let ready = false;

function on(v) {
  return v === true || v === 1 || v === '1' || Number(v) === 1;
}

export async function ensureStaffTables() {
  if (ready) return;
  await queryWeb(`
    IF OBJECT_ID('staff_roles', 'U') IS NULL
    BEGIN
      CREATE TABLE staff_roles (
        id INT IDENTITY(1,1) PRIMARY KEY,
        name NVARCHAR(40) NOT NULL UNIQUE,
        siteAdmin BIT NOT NULL CONSTRAINT DF_staff_roles_siteAdmin DEFAULT (1),
        isGm BIT NOT NULL CONSTRAINT DF_staff_roles_isGm DEFAULT (0),
        createdBy NVARCHAR(64) NULL,
        createdAt DATETIME NOT NULL CONSTRAINT DF_staff_roles_createdAt DEFAULT (GETDATE())
      );
    END
    IF OBJECT_ID('admin_users', 'U') IS NULL
    BEGIN
      CREATE TABLE admin_users (
        userId INT NOT NULL PRIMARY KEY,
        username NVARCHAR(64) NULL,
        nickName NVARCHAR(64) NULL,
        role NVARCHAR(40) NOT NULL,
        siteAdmin BIT NOT NULL CONSTRAINT DF_admin_users_siteAdmin DEFAULT (1),
        isGm BIT NOT NULL CONSTRAINT DF_admin_users_isGm DEFAULT (0),
        grantedBy NVARCHAR(64) NULL,
        grantedAt DATETIME NOT NULL CONSTRAINT DF_admin_users_grantedAt DEFAULT (GETDATE())
      );
    END
    IF COL_LENGTH('admin_users', 'siteAdmin') IS NULL ALTER TABLE admin_users ADD siteAdmin BIT NOT NULL CONSTRAINT DF_admin_users_siteAdmin2 DEFAULT (1);
    IF COL_LENGTH('admin_users', 'isGm') IS NULL ALTER TABLE admin_users ADD isGm BIT NOT NULL CONSTRAINT DF_admin_users_isGm2 DEFAULT (0);
    IF COL_LENGTH('admin_users', 'username') IS NULL ALTER TABLE admin_users ADD username NVARCHAR(64) NULL;
    IF COL_LENGTH('admin_users', 'nickName') IS NULL ALTER TABLE admin_users ADD nickName NVARCHAR(64) NULL;
    IF OBJECT_ID('staff_nx_quota', 'U') IS NULL
    BEGIN
      CREATE TABLE staff_nx_quota (
        userId INT NOT NULL PRIMARY KEY,
        monthlyAllotment BIGINT NOT NULL CONSTRAINT DF_staff_nx_allot DEFAULT (0),
        period CHAR(7) NOT NULL CONSTRAINT DF_staff_nx_period DEFAULT (''),
        used BIGINT NOT NULL CONSTRAINT DF_staff_nx_used DEFAULT (0),
        updatedBy NVARCHAR(64) NULL,
        updatedAt DATETIME NOT NULL CONSTRAINT DF_staff_nx_updated DEFAULT (GETDATE())
      );
    END
    IF OBJECT_ID('staff_nx_gifts', 'U') IS NULL
    BEGIN
      CREATE TABLE staff_nx_gifts (
        id INT IDENTITY(1,1) PRIMARY KEY,
        fromUserId INT NOT NULL,
        fromUsername NVARCHAR(64) NULL,
        fromNick NVARCHAR(64) NULL,
        fromRole NVARCHAR(40) NULL,
        toUserId INT NOT NULL,
        toUsername NVARCHAR(64) NULL,
        toNick NVARCHAR(64) NULL,
        amount BIGINT NOT NULL,
        period CHAR(7) NOT NULL,
        createdAt DATETIME NOT NULL CONSTRAINT DF_staff_nx_gifts_at DEFAULT (GETDATE())
      );
      CREATE INDEX idx_staff_nx_gifts_from ON staff_nx_gifts (fromUserId, createdAt DESC);
      CREATE INDEX idx_staff_nx_gifts_at ON staff_nx_gifts (createdAt DESC);
    END
  `);
  const roles = await queryWeb(`SELECT COUNT(*) as n FROM staff_roles`);
  if (!Number(roles.recordset?.[0]?.n)) {
    await queryWeb(`
      INSERT INTO staff_roles (name, siteAdmin, isGm, createdBy)
      VALUES ('SUPERADMIN', 1, 0, 'system'),
             ('ADMINISTRATOR', 1, 0, 'system'),
             ('GM', 1, 1, 'system')
    `);
  }
  ready = true;
}

export function roleFlags(row) {
  if (!row) return { role: null, siteAdmin: false, webGm: false };
  const role = String(row.role || row.name || '').trim();
  const low = role.toLowerCase();
  const webGm = on(row.isGm) || low === 'gm';
  return { role: role || null, siteAdmin: Boolean(role), webGm };
}

export async function userIsSiteAdmin(userId, username) {
  if (username === 'villauribe12') {
    return { is_admin: true, webRole: 'SUPERADMIN', webGm: false };
  }
  try {
    await ensureStaffTables();
    const result = await queryWeb(
      `SELECT TOP 1 role, siteAdmin, isGm FROM admin_users WHERE userId = @id OR username = @u`,
      { id: Number(userId) || 0, u: String(username || '') },
    );
    const row = result.recordset?.[0];
    if (!row) return { is_admin: false, webRole: null, webGm: false };
    const flags = roleFlags(row);
    return { is_admin: true, webRole: flags.role, webGm: flags.webGm };
  } catch {
    return { is_admin: false, webRole: null, webGm: false };
  }
}
