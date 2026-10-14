import { Router } from 'express';
import { queryVisms, queryWeb } from '../db.js';
import { verifyToken } from '../auth.js';
import { getPayPalOrder } from '../paypal.js';

const router = Router();
const STAFF_OWNER = 'villauribe12';

async function ensurePaymentCodes() {
  await queryWeb(`
    IF OBJECT_ID('PaymentCodes', 'U') IS NULL
    BEGIN
      CREATE TABLE PaymentCodes (
        id INT PRIMARY KEY IDENTITY(1,1),
        oidUser INT NOT NULL,
        username NVARCHAR(50) NOT NULL,
        NickName NVARCHAR(50),
        paymentCode NVARCHAR(100) UNIQUE NOT NULL,
        nxAmount DECIMAL(10,2) NOT NULL,
        dollarAmount DECIMAL(10,2) NOT NULL,
        status NVARCHAR(20) DEFAULT 'pending',
        createdAt DATETIME DEFAULT GETDATE(),
        approvedAt DATETIME NULL,
        approvedBy NVARCHAR(50) NULL,
        rejectedAt DATETIME NULL,
        rejectionReason NVARCHAR(500) NULL
      );
    END
    IF COL_LENGTH('PaymentCodes', 'note') IS NULL ALTER TABLE PaymentCodes ADD note NVARCHAR(300) NULL;
  `);
}

// Crear solicitud de pago (cuando usuario paga en PayPal)
// DESHABILITADO: Tabla PaymentRequests no existe en la BD
router.post('/request', async (req, res) => {
  try {
    console.log('[PAYMENT] Solicitud de pago recibida (deshabilitada - tabla no existe)');
    res.json({
      success: true,
      paymentId: 0,
      message: 'Solicitud registrada. Espera aprobación del administrador.',
    });
  } catch (error) {
    console.error('Create payment request error:', error);
    res.status(500).json({ error: 'Error al crear solicitud de pago' });
  }
});

router.get('/pending', async (req, res) => {
  try {
    await ensurePaymentCodes();
    const result = await queryWeb(
      `SELECT id, oidUser, username, NickName, paymentCode, nxAmount, dollarAmount, status, createdAt
       FROM PaymentCodes WHERE status = 'pending' ORDER BY createdAt DESC`
    );
    res.json(result.recordset || []);
  } catch (error) {
    console.error('Get pending payments error:', error);
    res.status(500).json({ error: 'Error al obtener solicitudes' });
  }
});

// Obtener todas las solicitudes (para admin)
// DESHABILITADO: Tabla PaymentRequests no existe
router.get('/all', async (req, res) => {
  try {
    console.log('[PAYMENT] Solicitud de todas las solicitudes (deshabilitada)');
    res.json([]);
  } catch (error) {
    console.error('Get all payments error:', error);
    res.status(500).json({ error: 'Error al obtener solicitudes' });
  }
});

// Aprobar solicitud de pago
// DESHABILITADO: Tabla PaymentRequests no existe
router.post('/approve/:paymentId', async (req, res) => {
  try {
    const paymentId = parseInt(req.params.paymentId);
    const { adminUsername } = req.body;

    if (!adminUsername) {
      return res.status(400).json({ error: 'Admin username requerido' });
    }

    console.log(`[PAYMENT] Solicitud #${paymentId} aprobación intentada (deshabilitada)`);

    res.json({
      success: false,
      message: 'Sistema de pagos deshabilitado',
    });
  } catch (error) {
    console.error('Approve payment error:', error);
    res.status(500).json({ error: 'Error al aprobar solicitud' });
  }
});

// Rechazar solicitud de pago
// DESHABILITADO: Tabla PaymentRequests no existe
router.post('/reject/:paymentId', async (req, res) => {
  try {
    const paymentId = parseInt(req.params.paymentId);
    const { adminUsername, reason } = req.body;

    if (!adminUsername) {
      return res.status(400).json({ error: 'Admin username requerido' });
    }

    console.log(`[PAYMENT] Solicitud #${paymentId} rechazo intentado (deshabilitada)`);

    res.json({
      success: false,
      message: 'Sistema de pagos deshabilitado',
    });
  } catch (error) {
    console.error('Reject payment error:', error);
    res.status(500).json({ error: 'Error al rechazar solicitud' });
  }
});

// Enviar código de pago (nuevo sistema)
router.post('/submit-payment-code', async (req, res) => {
  try {
    const { oidUser, username, NickName, paymentCode, nxAmount, dollarAmount } = req.body;

    if (!oidUser || !username || !paymentCode || !nxAmount || !dollarAmount) {
      return res.status(400).json({ error: 'Datos incompletos' });
    }

    // Validar que el código no esté vacío y tenga un formato razonable
    if (paymentCode.trim().length < 3) {
      return res.status(400).json({ error: 'El código debe tener al menos 3 caracteres' });
    }

    console.log(`[PAYMENT CODE] Nueva solicitud - ${username} envió código: ${paymentCode} para ${nxAmount} NX`);

    await ensurePaymentCodes();
    await queryWeb(
      `INSERT INTO PaymentCodes (oidUser, username, NickName, paymentCode, nxAmount, dollarAmount, status)
       VALUES (@oidUser, @username, @NickName, @paymentCode, @nxAmount, @dollarAmount, 'pending')`,
      {
        oidUser: oidUser,
        username: username,
        NickName: NickName || username,
        paymentCode: paymentCode,
        nxAmount: nxAmount,
        dollarAmount: dollarAmount
      }
    );

    res.json({
      success: true,
      message: 'Código recibido. El administrador lo revisará pronto.',
    });

  } catch (error) {
    console.error('Submit payment code error:', error);
    // Si hay error de duplicado, es porque ya existe el código
    if (error.message.includes('UNIQUE') || error.message.includes('Violation of PRIMARY KEY')) {
      return res.status(400).json({ error: 'Este código ya fue registrado' });
    }
    res.status(500).json({ error: 'Error al enviar código: ' + error.message });
  }
});

// Obtener códigos pendientes (para admin)
router.get('/payment-codes/pending', async (req, res) => {
  try {
    console.log('[PAYMENT CODE] Obteniendo códigos pendientes');
    await ensurePaymentCodes();
    const result = await queryWeb(
      'SELECT id, oidUser, username, NickName, paymentCode, nxAmount, dollarAmount, createdAt FROM PaymentCodes WHERE status = @status ORDER BY createdAt DESC',
      { status: 'pending' }
    );

    res.json(result.recordset || []);
  } catch (error) {
    console.error('Get pending payment codes error:', error);
    res.status(500).json({ error: 'Error al obtener códigos pendientes' });
  }
});

// Obtener todos los códigos (para admin - historial)
router.get('/payment-codes/all', async (req, res) => {
  try {
    console.log('[PAYMENT CODE] Obteniendo todos los códigos');
    
    const result = await queryWeb(
      'SELECT id, oidUser, username, NickName, paymentCode, nxAmount, dollarAmount, status, createdAt, approvedAt, rejectedAt, approvedBy FROM PaymentCodes ORDER BY createdAt DESC'
    );

    res.json(result.recordset || []);
  } catch (error) {
    console.error('Get all payment codes error:', error);
    res.status(500).json({ error: 'Error al obtener códigos' });
  }
});

// Aprobar código de pago (admin)
router.post('/payment-codes/approve/:codeId', async (req, res) => {
  try {
    const codeId = parseInt(req.params.codeId);
    const { adminUsername } = req.body;

    if (!adminUsername) {
      return res.status(400).json({ error: 'Admin username requerido' });
    }
    if (adminUsername !== STAFF_OWNER) {
      return res.status(403).json({ error: 'Solo el dueño puede aprobar códigos' });
    }

    console.log(`[PAYMENT CODE] Aprobando código #${codeId} por ${adminUsername}`);
    await ensurePaymentCodes();

    const codeResult = await queryWeb(
      `SELECT oidUser, username, nxAmount, status FROM PaymentCodes WHERE id = @id`,
      { id: codeId }
    );

    if (!codeResult.recordset || codeResult.recordset.length === 0) {
      return res.status(404).json({ error: 'Código no encontrado' });
    }

    const { oidUser, username, nxAmount, status } = codeResult.recordset[0];
    if (String(status).toLowerCase() !== 'pending') {
      return res.status(400).json({ error: 'Esta recarga ya no está pendiente' });
    }

    const nx = Math.floor(Number(nxAmount) || 0);
    if (nx <= 0) return res.status(400).json({ error: 'Monto NX inválido' });

    let credited = false;
    let updated = await queryVisms(
      `UPDATE VISMS_UserList SET RealBalance = ISNULL(RealBalance, 0) + @nx WHERE oid = @oid`,
      { nx, oid: oidUser }
    );
    if (updated?.rowsAffected?.[0]) credited = true;
    if (!credited) {
      updated = await queryVisms(
        `UPDATE VISMS_UserList SET RealBalance = ISNULL(RealBalance, 0) + @nx WHERE strNexonID = @username`,
        { nx, username }
      );
      credited = Boolean(updated?.rowsAffected?.[0]);
    }
    if (!credited) {
      return res.status(500).json({ error: 'No se pudo acreditar NX en la cuenta' });
    }

    await queryWeb(
      `UPDATE PaymentCodes
       SET status = 'approved', approvedAt = GETDATE(), approvedBy = @adminUsername
       WHERE id = @id AND status = 'pending'`,
      { id: codeId, adminUsername }
    );

    console.log(`[PAYMENT CODE] ${username} +${nx} NX oid=${oidUser}`);
    res.json({
      success: true,
      message: `Recarga aprobada. ${nx} NX añadidos a ${username}`,
    });

  } catch (error) {
    console.error('Approve payment code error:', error);
    res.status(500).json({ error: 'Error al aprobar código: ' + error.message });
  }
});

// Rechazar código de pago (admin)
router.post('/payment-codes/reject/:codeId', async (req, res) => {
  try {
    const codeId = parseInt(req.params.codeId);
    const { adminUsername, reason } = req.body;

    if (!adminUsername) {
      return res.status(400).json({ error: 'Admin username requerido' });
    }
    if (adminUsername !== 'villauribe12') {
      return res.status(403).json({ error: 'Solo el dueño puede rechazar códigos' });
    }

    console.log(`[PAYMENT CODE] Rechazando código #${codeId} por ${adminUsername}. Razón: ${reason || 'N/A'}`);

    await queryWeb(
      `UPDATE PaymentCodes 
       SET status = 'rejected', rejectedAt = GETDATE(), rejectionReason = @reason
       WHERE id = @id`,
      {
        id: codeId,
        reason: reason || 'Sin especificar'
      }
    );

    res.json({
      success: true,
      message: 'Código rechazado',
    });

  } catch (error) {
    console.error('Reject payment code error:', error);
    res.status(500).json({ error: 'Error al rechazar código: ' + error.message });
  }
});

// Cargar comprobante de pago (imagen base64) - DESHABILITADO
// router.post('/upload-proof', async (req, res) => {
//   DESHABILITADO: Tabla PaymentRequests no existe en la BD
// });

// DEBUG: Ver todos los pagos de un usuario
// DESHABILITADO: Tabla PaymentRequests no existe
router.get('/debug/:username', async (req, res) => {
  try {
    const { username } = req.params;
    console.log(`[DEBUG] Pagos para ${username}: (deshabilitado)`);
    res.json([]);
  } catch (error) {
    console.error('Debug error:', error);
    res.status(500).json({ error: 'Error en debug' });
  }
});

// Obtener pagos aprobados del usuario que no han sido registrados en compras
// DESHABILITADO: Tabla PaymentRequests no existe
router.get('/approved-not-recorded/:username', async (req, res) => {
  try {
    const { username } = req.params;

    if (!username) {
      return res.status(400).json({ error: 'Username requerido' });
    }

    console.log(`[PAYMENTS] Buscando pagos aprobados para: ${username}`);
    let result;
    try {
      result = await queryWeb(`
        SELECT id, oidUser, username, NickName, paymentCode, nxAmount, dollarAmount, status,
          createdAt, approvedAt, approvedBy, note
        FROM PaymentCodes
        WHERE username = @username AND status = 'approved'
        ORDER BY ISNULL(approvedAt, createdAt) DESC`, { username });
    } catch {
      result = await queryWeb(`
        SELECT id, oidUser, username, NickName, paymentCode, nxAmount, dollarAmount, status,
          createdAt, approvedAt, approvedBy
        FROM PaymentCodes
        WHERE username = @username AND status = 'approved'
        ORDER BY createdAt DESC`, { username });
    }
    res.json(result.recordset || []);
  } catch (error) {
    console.error('Get approved payments error:', error);
    res.status(500).json({ error: 'Error al obtener pagos aprobados' });
  }
});

const NX_PACKAGES = [
  { coins: 15000, price: 1 },
  { coins: 35000, price: 2 },
  { coins: 80000, price: 5 },
  { coins: 160000, price: 10 },
  { coins: 320000, price: 20 },
  { coins: 480000, price: 30 },
  { coins: 800000, price: 50 },
  { coins: 1600000, price: 100 },
];

function roundMoney(value) {
  return Math.round(Number(value) * 100) / 100;
}

function nxFromPayment(paid, custom, requestedNx) {
  const price = roundMoney(paid);
  const pack = NX_PACKAGES.find(item => Math.abs(item.price - price) < 0.02);
  if (!custom && pack) return { nx: pack.coins, bonus: 0, price: pack.price };

  const asked = Math.floor(Number(requestedNx) || 0);
  const expected = asked / 16000;
  const base = asked >= 1000 && Math.abs(expected - price) <= 0.05
    ? asked
    : Math.round(price * 16000);
  if (base < 1000) return null;
  const bonus = Math.floor(base * 0.1);
  return { nx: base + bonus, bonus, price };
}

async function creditNx(oidUser, username, nx) {
  let updated = await queryVisms(
    `UPDATE VISMS_UserList SET RealBalance = ISNULL(RealBalance, 0) + @nx WHERE oid = @oid`,
    { nx, oid: oidUser }
  );
  if (updated?.rowsAffected?.[0]) return true;
  updated = await queryVisms(
    `UPDATE VISMS_UserList SET RealBalance = ISNULL(RealBalance, 0) + @nx WHERE strNexonID = @username`,
    { nx, username }
  );
  return Boolean(updated?.rowsAffected?.[0]);
}

router.post('/paypal-complete', async (req, res) => {
  try {
    const header = req.headers.authorization || '';
    const user = verifyToken(header.startsWith('Bearer ') ? header.slice(7) : '');
    const oidUser = Number(user?.id);
    const username = String(user?.username || '');
    if (!oidUser || !username) return res.status(401).json({ error: 'Sesión inválida. Vuelve a iniciar sesión.' });

    const orderId = String(req.body?.orderId || '').trim();
    const custom = Boolean(req.body?.custom);
    let paid = roundMoney(req.body?.amount);
    if (!/^[A-Za-z0-9_-]{8,64}$/.test(orderId)) {
      return res.status(400).json({ error: 'PayPal no confirmó el pago' });
    }
    if (!Number.isFinite(paid) || paid < 0.01 || paid > 1000) {
      return res.status(400).json({ error: 'Monto de PayPal no válido' });
    }

    if (process.env.PAYPAL_CLIENT_SECRET) {
      try {
        const order = await getPayPalOrder(orderId);
        if (order?.status && order.status !== 'COMPLETED' && order.status !== 'APPROVED') {
          return res.status(400).json({ error: 'PayPal no confirmó este pago' });
        }
        const verified = Number(
          order?.purchase_units?.[0]?.payments?.captures?.[0]?.amount?.value
          || order?.purchase_units?.[0]?.amount?.value
        );
        if (verified > 0) paid = roundMoney(verified);
      } catch (error) {
        if (error?.status && error.status !== 404) {
          return res.status(400).json({ error: 'PayPal no confirmó este pago' });
        }
      }
    }

    const grant = nxFromPayment(paid, custom, req.body?.nx);
    if (!grant) return res.status(400).json({ error: 'La compra mínima es 1,000 NX' });

    await ensurePaymentCodes();
    const paymentCode = `paypal:${orderId}`.slice(0, 100);
    const existing = await queryWeb(
      `SELECT id, nxAmount, status FROM PaymentCodes WHERE paymentCode = @paymentCode`,
      { paymentCode }
    );
    if (existing.recordset?.length) {
      return res.json({
        success: true,
        already: true,
        nx: Number(existing.recordset[0].nxAmount) || grant.nx,
        bonus: grant.bonus,
      });
    }

    try {
      await queryWeb(
        `INSERT INTO PaymentCodes (oidUser, username, NickName, paymentCode, nxAmount, dollarAmount, status, note)
         VALUES (@oidUser, @username, @NickName, @paymentCode, @nxAmount, @dollarAmount, 'pending', @note)`,
        {
          oidUser,
          username,
          NickName: user.NickName || username,
          paymentCode,
          nxAmount: grant.nx,
          dollarAmount: grant.price,
          note: custom ? `PayPal automático +${grant.bonus} NX de bono` : 'PayPal automático',
        }
      );
    } catch (error) {
      if (String(error?.message || '').includes('UNIQUE') || error?.number === 2627 || error?.number === 2601) {
        return res.json({ success: true, already: true, nx: grant.nx, bonus: grant.bonus });
      }
      throw error;
    }

    const credited = await creditNx(oidUser, username, grant.nx);
    if (!credited) {
      await queryWeb(`DELETE FROM PaymentCodes WHERE paymentCode = @paymentCode AND status = 'pending'`, { paymentCode });
      return res.status(500).json({ error: 'No se pudo acreditar el NX' });
    }

    await queryWeb(
      `UPDATE PaymentCodes
       SET status = 'approved', approvedAt = GETDATE(), approvedBy = 'paypal'
       WHERE paymentCode = @paymentCode AND status = 'pending'`,
      { paymentCode }
    );

    console.log(`[PAYPAL] ${username} +${grant.nx} NX (bono ${grant.bonus}) $${grant.price} ${orderId}`);
    res.json({ success: true, nx: grant.nx, bonus: grant.bonus, price: grant.price });
  } catch (error) {
    console.error('PayPal complete error:', error);
    res.status(500).json({ error: 'No se pudo acreditar el NX' });
  }
});

export default router;
