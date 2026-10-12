import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { queryWeb } from './db.js';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this';
let ready = false;

export async function ensurePinTable() {
  if (ready) return;
  await queryWeb(`
    IF OBJECT_ID('user_login_pins', 'U') IS NULL
    BEGIN
      CREATE TABLE user_login_pins (
        userId INT NOT NULL PRIMARY KEY,
        username NVARCHAR(64) NOT NULL,
        pinHash NVARCHAR(120) NOT NULL,
        updatedAt DATETIME NOT NULL CONSTRAINT DF_user_login_pins_upd DEFAULT (GETDATE())
      );
    END
  `);
  ready = true;
}

export function pinFromBody(v) {
  const pin = String(v || '').replace(/\D/g, '').slice(0, 6);
  return /^\d{6}$/.test(pin) ? pin : '';
}

export function actorFromReq(req) {
  const header = String(req.headers.authorization || '');
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
  if (!token) return null;
  try {
    const decoded = jwt.verify(token, JWT_SECRET, { clockTolerance: 1e12 });
    const username = String(decoded?.username || '');
    const userId = Number(decoded?.userId || decoded?.id || 0);
    if (!username || !userId) return null;
    return { username, userId };
  } catch {
    return null;
  }
}

export async function pinRow(userId) {
  await ensurePinTable();
  const result = await queryWeb(
    `SELECT TOP 1 userId, username, pinHash FROM user_login_pins WHERE userId = @id`,
    { id: Number(userId) },
  );
  return result.recordset?.[0] || null;
}

export async function savePin(userId, username, pin) {
  await ensurePinTable();
  const pinHash = await bcrypt.hash(pin, 10);
  const existing = await pinRow(userId);
  if (existing) {
    await queryWeb(
      `UPDATE user_login_pins SET pinHash = @pinHash, username = @username, updatedAt = GETDATE() WHERE userId = @id`,
      { pinHash, username, id: Number(userId) },
    );
  } else {
    await queryWeb(
      `INSERT INTO user_login_pins (userId, username, pinHash, updatedAt) VALUES (@id, @username, @pinHash, GETDATE())`,
      { id: Number(userId), username, pinHash },
    );
  }
}

export async function checkPin(userId, pin) {
  const row = await pinRow(userId);
  if (!row?.pinHash) return false;
  return bcrypt.compare(pin, String(row.pinHash));
}
