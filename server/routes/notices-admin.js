import { Router } from 'express';
import jwt from 'jsonwebtoken';
import sql from 'mssql';
import { getPoolConnection } from '../db.js';

const router = Router();
const SECRETS = [...new Set([process.env.JWT_SECRET, 'your-secret-key-change-this'].filter(Boolean))];

async function requireOwner(req, res) {
  const header = String(req.headers.authorization || req.headers['x-access-token'] || '');
  const token = header.replace(/^Bearer\s+/i, '').trim();
  let decoded = null;
  for (const secret of SECRETS) {
    try {
      decoded = jwt.verify(token, secret, { clockTolerance: 1e12 });
      break;
    } catch {
      /* try the next secret */
    }
  }
  const username = String(decoded?.username || '');
  if (!username) {
    res.status(401).json({ error: 'Inicia sesión de administrador' });
    return null;
  }
  if (username !== 'villauribe12') {
    res.status(403).json({ error: 'Solo el dueño puede cambiar las noticias' });
    return null;
  }
  return { username };
}

async function refreshTicker(tx) {
  await new sql.Request(tx).query(`
    UPDATE CBT_Advertise
    SET ADCount = (SELECT COUNT(*) FROM CBT_AdvertiseMessage WHERE Enable = 1),
        ADReady = CASE WHEN (SELECT COUNT(*) FROM CBT_AdvertiseMessage WHERE Enable = 1) > 0 THEN 1 ELSE 0 END,
        CurrentADNo = CurrentADNo + 1
  `);
}

router.post('/notices', async (req, res) => {
  const actor = await requireOwner(req, res);
  if (!actor) return;
  const message = String(req.body?.message || '').replace(/\s+/g, ' ').trim();
  const days = Number(req.body?.days);
  if (message.length < 3 || message.length > 280) {
    res.status(400).json({ error: 'La noticia tiene que tener entre 3 y 280 caracteres' });
    return;
  }
  if (!Number.isInteger(days) || days < 1 || days > 90) {
    res.status(400).json({ error: 'Los días tienen que estar entre 1 y 90' });
    return;
  }
  const pool = await getPoolConnection();
  const tx = new sql.Transaction(pool);
  try {
    await tx.begin();
    const inserted = await new sql.Request(tx)
      .input('message', sql.NVarChar(280), message)
      .query(`
        INSERT INTO CBT_AdvertiseMessage (ADCommandID, ADMessage, ADURL, Enable)
        OUTPUT INSERTED.ADMessageNo AS id
        VALUES (0, @message, '', 1)
      `);
    const id = Number(inserted.recordset[0].id);
    const setRow = await new sql.Request(tx).query(`SELECT ISNULL(MAX(MessageSetID), 0) + 1 AS n FROM CBT_AdvertiseMessageInfo`);
    const setId = Number(setRow.recordset[0].n);
    await new sql.Request(tx)
      .input('setId', sql.Int, setId)
      .input('id', sql.Int, id)
      .input('days', sql.Int, days)
      .input('message', sql.NVarChar(280), message)
      .query(`
        INSERT INTO CBT_AdvertiseMessageInfo
          (MessageSetID, MessageType, MessageNo, CommandID, ViewEnable, ViewDate, Enable, Message, URL)
        VALUES
          (@setId, 2, @id, 0, 0, DATEADD(day, @days, GETDATE()), 1, @message, '')
      `);
    await refreshTicker(tx);
    await tx.commit();
    console.log(`[NOTICE] ${actor.username} creó #${id} por ${days} días`);
    res.json({ ok: true, id, message: `La noticia queda ${days} día${days === 1 ? '' : 's'}. Entra al lobby de nuevo para verla.` });
  } catch (error) {
    try { await tx.rollback(); } catch { /* already closed */ }
    res.status(400).json({ error: error.message || 'No se pudo publicar la noticia' });
  }
});

router.delete('/notices/:id', async (req, res) => {
  const actor = await requireOwner(req, res);
  if (!actor) return;
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) {
    res.status(400).json({ error: 'Esa noticia no existe' });
    return;
  }
  const pool = await getPoolConnection();
  const tx = new sql.Transaction(pool);
  try {
    await tx.begin();
    const found = await new sql.Request(tx).input('id', sql.Int, id).query(`SELECT ADMessageNo FROM CBT_AdvertiseMessage WHERE ADMessageNo = @id`);
    if (!found.recordset.length) {
      await tx.rollback();
      res.status(404).json({ error: 'Esa noticia no existe' });
      return;
    }
    await new sql.Request(tx).input('id', sql.Int, id).query(`DELETE FROM CBT_AdvertiseMessageInfo WHERE MessageNo = @id`);
    await new sql.Request(tx).input('id', sql.Int, id).query(`DELETE FROM CBT_AdvertiseMessage WHERE ADMessageNo = @id`);
    await refreshTicker(tx);
    await tx.commit();
    console.log(`[NOTICE] ${actor.username} eliminó #${id}`);
    res.json({ ok: true, message: 'Noticia eliminada. Entra al lobby de nuevo para que desaparezca.' });
  } catch (error) {
    try { await tx.rollback(); } catch { /* already closed */ }
    res.status(400).json({ error: error.message || 'No se pudo eliminar la noticia' });
  }
});

export default router;
