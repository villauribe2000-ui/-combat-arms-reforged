import crypto from 'crypto';
import express from 'express';
import sql from 'mssql';
import { getPoolConnection, query } from '../db.js';

const router = express.Router();
const STAFF_OWNER = 'villauribe12';
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const CODE_LEN = 30;
const DEFAULT_REWARDS = [449, 450];

let ready = null;

export function normalizePromoCode(value) {
  return String(value || '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 50);
}

export function formatPromoCode(value) {
  const clean = normalizePromoCode(value);
  return clean.replace(/(.{5})/g, '$1-').replace(/-$/, '');
}

function makePromoCode(length = CODE_LEN) {
  const bytes = crypto.randomBytes(length);
  let code = '';
  for (let i = 0; i < length; i += 1) code += ALPHABET[bytes[i] % ALPHABET.length];
  return code;
}

function userFromRequest(req) {
  const oidUser = Number(req.user?.id || req.user?.userId);
  const username = String(req.user?.username || '').slice(0, 50);
  if (!oidUser || !username) return null;
  return { oidUser, username };
}

function requireOwner(req, res) {
  const user = userFromRequest(req);
  if (!user) {
    res.status(401).json({ error: 'Sesión inválida' });
    return null;
  }
  if (user.username !== STAFF_OWNER) {
    res.status(403).json({ error: 'Solo el dueño puede gestionar códigos promo' });
    return null;
  }
  return user;
}

async function ensureRewardTable() {
  await query(`
    IF OBJECT_ID('CBT_CouponReward', 'U') IS NULL
    BEGIN
      CREATE TABLE CBT_CouponReward (
        id INT IDENTITY(1,1) PRIMARY KEY,
        CouponNo NVARCHAR(50) NOT NULL,
        ProductID INT NOT NULL,
        SortOrder INT NOT NULL CONSTRAINT DF_CBT_CouponReward_sort DEFAULT (0),
        Message NVARCHAR(150) NULL,
        CONSTRAINT UQ_CBT_CouponReward UNIQUE (CouponNo, ProductID)
      );
      CREATE INDEX idx_coupon_reward_code ON CBT_CouponReward(CouponNo);
    END
  `);
}

async function ensureCouponProcedure() {
  await query(`
    CREATE OR ALTER PROCEDURE [dbo].[cbp_coupon_register]
      @couponno     nvarchar(50),
      @oiduser      int,
      @outputerror  int output
    AS
    BEGIN
      SET NOCOUNT ON;
      SET XACT_ABORT OFF;

      DECLARE @cnt int, @usedate datetime, @productid int, @out_userInboxElementId int, @msg nvarchar(150)

      SET @couponno = UPPER(REPLACE(REPLACE(LTRIM(RTRIM(@couponno)), N'-', N''), N' ', N''))
      SELECT @cnt = 0, @outputerror = 0
      SET @out_userInboxElementId = -1

      BEGIN TRY
        BEGIN TRAN

        SELECT @cnt = COUNT(*), @usedate = MAX(RegDate)
        FROM CBT_CouponRegister WITH (UPDLOCK, HOLDLOCK)
        WHERE CouponNo = @couponno
           OR (LEN(@couponno) = 16 AND LEFT(CouponNo, 16) = @couponno)

        IF (@cnt = 0 OR @cnt > 1)
        BEGIN
          SET @outputerror = 1
          GOTO FAIL
        END

        IF (@usedate IS NOT NULL)
        BEGIN
          SET @outputerror = 2
          GOTO FAIL
        END

        IF OBJECT_ID('CBT_CouponReward', 'U') IS NOT NULL
           AND EXISTS (SELECT 1 FROM CBT_CouponReward WHERE CouponNo = @couponno)
        BEGIN
          DECLARE reward_cursor CURSOR LOCAL FAST_FORWARD FOR
            SELECT ProductID, ISNULL(NULLIF(LTRIM(RTRIM(Message)), N''), N'COUPON ITEM')
            FROM CBT_CouponReward
            WHERE CouponNo = @couponno
            ORDER BY SortOrder, id

          OPEN reward_cursor
          FETCH NEXT FROM reward_cursor INTO @productid, @msg
          WHILE @@FETCH_STATUS = 0
          BEGIN
            SET @out_userInboxElementId = -1
            EXEC dbo.cbp____userstore_insert_by_combatarms
              @receiver = @oiduser,
              @productId = @productid,
              @message = @msg,
              @count = 1,
              @expirationTime = NULL,
              @out_userInboxElementId = @out_userInboxElementId OUTPUT

            IF (@out_userInboxElementId < 0)
            BEGIN
              CLOSE reward_cursor
              DEALLOCATE reward_cursor
              SET @outputerror = 3
              GOTO FAIL
            END
            FETCH NEXT FROM reward_cursor INTO @productid, @msg
          END
          CLOSE reward_cursor
          DEALLOCATE reward_cursor
        END
        ELSE
        BEGIN
          EXEC dbo.cbp____userstore_insert_by_combatarms
            @receiver = @oiduser,
            @productId = 449,
            @message = N'COUPON ITEM',
            @count = 1,
            @expirationTime = NULL,
            @out_userInboxElementId = @out_userInboxElementId OUTPUT
          IF (@out_userInboxElementId < 0)
          BEGIN
            SET @outputerror = 3
            GOTO FAIL
          END

          SET @out_userInboxElementId = -1
          EXEC dbo.cbp____userstore_insert_by_combatarms
            @receiver = @oiduser,
            @productId = 450,
            @message = N'COUPON ITEM',
            @count = 1,
            @expirationTime = NULL,
            @out_userInboxElementId = @out_userInboxElementId OUTPUT
          IF (@out_userInboxElementId < 0)
          BEGIN
            SET @outputerror = 3
            GOTO FAIL
          END
        END

        UPDATE CBT_CouponRegister
        SET oiduser = @oiduser, RegDate = GETDATE()
        WHERE RegDate IS NULL
          AND (
            CouponNo = @couponno
            OR (LEN(@couponno) = 16 AND LEFT(CouponNo, 16) = @couponno)
          )

        IF (@@ROWCOUNT <> 1)
        BEGIN
          SET @outputerror = 2
          GOTO FAIL
        END

        COMMIT TRAN
        RETURN 0

      FAIL:
        IF @@TRANCOUNT > 0 ROLLBACK TRAN
        RETURN -1
      END TRY
      BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRAN
        SET @outputerror = 5
        RETURN -1
      END CATCH
    END
  `);
}

export function ensurePromoTables() {
  if (!ready) {
    ready = (async () => {
      await ensureRewardTable();
      await ensureCouponProcedure();
    })().catch((error) => {
      ready = null;
      throw error;
    });
  }
  return ready;
}

async function rewardsFor(code) {
  const rows = await query(
    `SELECT r.ProductID, r.SortOrder, r.Message, p.ProductName
     FROM CBT_CouponReward r
     LEFT JOIN CBT_ProductInfo p ON p.ProductID = r.ProductID
     WHERE r.CouponNo = @code
     ORDER BY r.SortOrder, r.id`,
    { code }
  );
  return rows.recordset.map((row, index) => ({
    productId: Number(row.ProductID),
    name: row.ProductName || `Producto ${row.ProductID}`,
    sortOrder: Number(row.SortOrder ?? index),
    message: row.Message || 'COUPON ITEM',
  }));
}

async function mapCode(row) {
  const code = String(row.CouponNo || '');
  const rewards = await rewardsFor(code);
  const usedByOid = Number(row.oiduser || 0);
  let usedBy = null;
  if (usedByOid > 0) {
    const user = await query(
      `SELECT TOP 1 strNexonID AS username, NickName
       FROM CBT_User WHERE oidUser = @oid`,
      { oid: usedByOid }
    );
    usedBy = {
      oidUser: usedByOid,
      username: user.recordset[0]?.username || String(usedByOid),
      nick: user.recordset[0]?.NickName || '',
    };
  }
  return {
    code,
    displayCode: formatPromoCode(code),
    used: Boolean(row.RegDate),
    usedAt: row.RegDate || null,
    usedBy,
    rewards: rewards.length ? rewards : DEFAULT_REWARDS.map((productId, sortOrder) => ({
      productId,
      name: `Producto ${productId}`,
      sortOrder,
      message: 'COUPON ITEM',
      fallback: true,
    })),
  };
}

async function replaceRewards(code, rewards) {
  await query(`DELETE FROM CBT_CouponReward WHERE CouponNo = @code`, { code });
  const list = Array.isArray(rewards) ? rewards : [];
  for (let i = 0; i < list.length; i += 1) {
    const productId = Math.floor(Number(list[i]?.productId ?? list[i]));
    if (!Number.isFinite(productId) || productId <= 0) continue;
    const message = String(list[i]?.message || 'COUPON ITEM').trim().slice(0, 150) || 'COUPON ITEM';
    await query(
      `INSERT INTO CBT_CouponReward (CouponNo, ProductID, SortOrder, Message)
       VALUES (@code, @productId, @sortOrder, @message)`,
      { code, productId, sortOrder: i, message }
    );
  }
}

function redeemErrorMessage(code) {
  switch (Number(code)) {
    case 1: return 'Este código no es válido.';
    case 2: return 'Este código ya fue usado.';
    case 3: return 'No se pudieron entregar los ítems. Entra al juego una vez (crea personaje) y vuelve a intentar.';
    case 5: return 'Error del servidor al canjear. Intenta de nuevo.';
    default: return 'No se pudo canjear el código.';
  }
}

router.post('/redeem', async (req, res) => {
  const user = userFromRequest(req);
  if (!user) return res.status(401).json({ error: 'Sesión inválida' });

  const code = normalizePromoCode(req.body?.code);
  if (code.length < 8) {
    return res.status(400).json({ error: 'Escribe el código completo (6 bloques)' });
  }

  try {
    await ensurePromoTables();
    const pool = await getPoolConnection();
    const request = pool.request();
    request.input('couponno', sql.NVarChar(50), code);
    request.input('oiduser', sql.Int, user.oidUser);
    request.output('outputerror', sql.Int);
    const result = await request.execute('cbp_coupon_register');
    const outputError = Number(result.output.outputerror || 0);
    if (outputError !== 0) {
      return res.status(400).json({ error: redeemErrorMessage(outputError), code: outputError });
    }

    const rewards = await rewardsFor(code);
    res.json({
      success: true,
      message: 'Código canjeado. Los ítems están en tu bandeja de entrada del juego.',
      displayCode: formatPromoCode(code),
      rewards: rewards.map((r) => ({ productId: r.productId, name: r.name })),
    });
  } catch (error) {
    console.error('[PROMO] redeem', error.message);
    res.status(500).json({ error: 'No se pudo canjear el código' });
  }
});

router.get('/admin', async (req, res) => {
  const owner = requireOwner(req, res);
  if (!owner) return;
  try {
    await ensurePromoTables();
    const list = await query(
      `SELECT CouponNo, oiduser, RegDate
       FROM CBT_CouponRegister
       ORDER BY CASE WHEN RegDate IS NULL THEN 0 ELSE 1 END, CouponNo`
    );
    const codes = [];
    for (const row of list.recordset) {
      codes.push(await mapCode(row));
    }
    res.json({ codes });
  } catch (error) {
    console.error('[PROMO] admin list', error.message);
    res.status(500).json({ error: 'No se pudieron cargar los códigos' });
  }
});

router.post('/admin', async (req, res) => {
  const owner = requireOwner(req, res);
  if (!owner) return;
  try {
    await ensurePromoTables();
    let code = normalizePromoCode(req.body?.code);
    if (!code) code = makePromoCode();
    if (code.length < 8 || code.length > 50) {
      return res.status(400).json({ error: 'El código debe tener entre 8 y 50 caracteres' });
    }
    const rewards = Array.isArray(req.body?.rewards) ? req.body.rewards : [];
    if (!rewards.length) {
      return res.status(400).json({ error: 'Agrega al menos una recompensa (producto)' });
    }

    const exists = await query(
      `SELECT TOP 1 CouponNo FROM CBT_CouponRegister WHERE CouponNo = @code`,
      { code }
    );
    if (exists.recordset[0]) {
      return res.status(400).json({ error: 'Ese código ya existe' });
    }

    await query(
      `INSERT INTO CBT_CouponRegister (CouponNo, oiduser, RegDate) VALUES (@code, 0, NULL)`,
      { code }
    );
    await replaceRewards(code, rewards);
    const row = await query(
      `SELECT CouponNo, oiduser, RegDate FROM CBT_CouponRegister WHERE CouponNo = @code`,
      { code }
    );
    res.json({ success: true, code: await mapCode(row.recordset[0]) });
  } catch (error) {
    console.error('[PROMO] admin create', error.message);
    res.status(500).json({ error: error.message || 'No se pudo crear el código' });
  }
});

router.put('/admin/:code', async (req, res) => {
  const owner = requireOwner(req, res);
  if (!owner) return;
  try {
    await ensurePromoTables();
    const current = normalizePromoCode(req.params.code);
    if (!current) return res.status(400).json({ error: 'Código inválido' });

    const existing = await query(
      `SELECT CouponNo, oiduser, RegDate FROM CBT_CouponRegister WHERE CouponNo = @code`,
      { code: current }
    );
    if (!existing.recordset[0]) return res.status(404).json({ error: 'Código no encontrado' });

    let nextCode = normalizePromoCode(req.body?.code || current);
    if (nextCode.length < 8 || nextCode.length > 50) {
      return res.status(400).json({ error: 'El código debe tener entre 8 y 50 caracteres' });
    }

    if (nextCode !== current) {
      const clash = await query(
        `SELECT TOP 1 CouponNo FROM CBT_CouponRegister WHERE CouponNo = @code`,
        { code: nextCode }
      );
      if (clash.recordset[0]) {
        return res.status(400).json({ error: 'Ese código ya existe' });
      }
      await query(
        `UPDATE CBT_CouponRegister SET CouponNo = @next WHERE CouponNo = @current`,
        { next: nextCode, current }
      );
      await query(
        `UPDATE CBT_CouponReward SET CouponNo = @next WHERE CouponNo = @current`,
        { next: nextCode, current }
      );
    }

    if (Array.isArray(req.body?.rewards)) {
      if (!req.body.rewards.length) {
        return res.status(400).json({ error: 'Agrega al menos una recompensa (producto)' });
      }
      await replaceRewards(nextCode, req.body.rewards);
    }

    if (req.body?.reset === true) {
      await query(
        `UPDATE CBT_CouponRegister SET oiduser = 0, RegDate = NULL WHERE CouponNo = @code`,
        { code: nextCode }
      );
    }

    const row = await query(
      `SELECT CouponNo, oiduser, RegDate FROM CBT_CouponRegister WHERE CouponNo = @code`,
      { code: nextCode }
    );
    res.json({ success: true, code: await mapCode(row.recordset[0]) });
  } catch (error) {
    console.error('[PROMO] admin update', error.message);
    res.status(500).json({ error: error.message || 'No se pudo actualizar el código' });
  }
});

router.delete('/admin/:code', async (req, res) => {
  const owner = requireOwner(req, res);
  if (!owner) return;
  try {
    await ensurePromoTables();
    const code = normalizePromoCode(req.params.code);
    if (!code) return res.status(400).json({ error: 'Código inválido' });
    await query(`DELETE FROM CBT_CouponReward WHERE CouponNo = @code`, { code });
    const deleted = await query(`DELETE FROM CBT_CouponRegister WHERE CouponNo = @code`, { code });
    if (!(deleted.rowsAffected?.[0] > 0)) {
      return res.status(404).json({ error: 'Código no encontrado' });
    }
    res.json({ success: true });
  } catch (error) {
    console.error('[PROMO] admin delete', error.message);
    res.status(500).json({ error: 'No se pudo eliminar el código' });
  }
});

export default router;
