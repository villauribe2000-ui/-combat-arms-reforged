import { Router } from 'express';
import { query, queryVisms } from '../db.js';

const router = Router();

// Crear solicitud de pago (cuando usuario paga en PayPal)
router.post('/request', async (req, res) => {
  try {
    const { oidUser, username, NickName, nxAmount, dollarAmount } = req.body;

    if (!oidUser || !username || !nxAmount || !dollarAmount) {
      return res.status(400).json({ error: 'Faltan datos requeridos' });
    }

    // Insertar solicitud pendiente
    const result = await query(
      `INSERT INTO PaymentRequests (oidUser, username, NickName, nxAmount, dollarAmount, status)
       OUTPUT INSERTED.id, INSERTED.createdAt
       VALUES (@oidUser, @username, @NickName, @nxAmount, @dollarAmount, 'pending')`,
      { oidUser, username, NickName, nxAmount, dollarAmount }
    );

    const payment = result.recordset[0];

    console.log(`[PAYMENT] Nueva solicitud #${payment.id} - ${username} pidió ${nxAmount} NX por $${dollarAmount}`);

    res.json({
      success: true,
      paymentId: payment.id,
      message: 'Solicitud registrada. Espera aprobación del administrador.',
    });
  } catch (error) {
    console.error('Create payment request error:', error);
    res.status(500).json({ error: 'Error al crear solicitud de pago' });
  }
});

// Obtener solicitudes pendientes (para admin)
router.get('/pending', async (req, res) => {
  try {
    const result = await query(
      `SELECT id, oidUser, username, NickName, nxAmount, dollarAmount, status, createdAt
       FROM PaymentRequests
       WHERE status = 'pending'
       ORDER BY createdAt DESC`
    );

    res.json(result.recordset || []);
  } catch (error) {
    console.error('Get pending payments error:', error);
    res.status(500).json({ error: 'Error al obtener solicitudes' });
  }
});

// Obtener todas las solicitudes (para admin)
router.get('/all', async (req, res) => {
  try {
    const result = await query(
      `SELECT id, oidUser, username, NickName, nxAmount, dollarAmount, status, createdAt, approvedAt, approvedBy, rejectedReason
       FROM PaymentRequests
       ORDER BY createdAt DESC`
    );

    res.json(result.recordset || []);
  } catch (error) {
    console.error('Get all payments error:', error);
    res.status(500).json({ error: 'Error al obtener solicitudes' });
  }
});

// Aprobar solicitud de pago
router.post('/approve/:paymentId', async (req, res) => {
  try {
    const paymentId = parseInt(req.params.paymentId);
    const { adminUsername } = req.body;

    if (!adminUsername) {
      return res.status(400).json({ error: 'Admin username requerido' });
    }

    // Obtener datos de la solicitud
    const paymentResult = await query(
      `SELECT oidUser, username, nxAmount FROM PaymentRequests WHERE id = @paymentId AND status = 'pending'`,
      { paymentId }
    );

    if (paymentResult.recordset.length === 0) {
      return res.status(404).json({ error: 'Solicitud no encontrada o ya procesada' });
    }

    const payment = paymentResult.recordset[0];

    // Obtener saldo actual del usuario en VISMS
    const vismResult = await queryVisms(
      `SELECT RealBalance FROM VISMS_UserList WHERE strNexonID = @username`,
      { username: payment.username }
    );

    let newBalance = payment.nxAmount;
    if (vismResult.recordset.length > 0) {
      newBalance = (vismResult.recordset[0].RealBalance || 0) + payment.nxAmount;
    }

    // Actualizar NX en VISMS
    if (vismResult.recordset.length > 0) {
      await queryVisms(
        `UPDATE VISMS_UserList SET RealBalance = @newBalance, TotalBalance = @newBalance, UpdDate = GETDATE() WHERE strNexonID = @username`,
        { username: payment.username, newBalance }
      );
    } else {
      // Crear registro si no existe
      await queryVisms(
        `INSERT INTO VISMS_UserList (oid, strNexonID, strLNexonID, ServiceCode, RealBalance, BonusBalance, TotalBalance, RegDate, UpdDate)
         VALUES (@oidUser, @username, @username, 'ca_classic', @newBalance, 0, @newBalance, GETDATE(), GETDATE())`,
        { oidUser: payment.oidUser, username: payment.username, newBalance }
      );
    }

    // Marcar solicitud como aprobada
    await query(
      `UPDATE PaymentRequests SET status = 'approved', approvedAt = GETDATE(), approvedBy = @adminUsername WHERE id = @paymentId`,
      { paymentId, adminUsername }
    );

    console.log(`[PAYMENT] Solicitud #${paymentId} APROBADA - ${payment.username} recibió ${payment.nxAmount} NX`);

    res.json({
      success: true,
      message: `${payment.nxAmount} NX acreditados a ${payment.username}`,
      newBalance: newBalance,
      payment: payment,
    });
  } catch (error) {
    console.error('Approve payment error:', error);
    res.status(500).json({ error: 'Error al aprobar solicitud' });
  }
});

// Rechazar solicitud de pago
router.post('/reject/:paymentId', async (req, res) => {
  try {
    const paymentId = parseInt(req.params.paymentId);
    const { adminUsername, reason } = req.body;

    if (!adminUsername) {
      return res.status(400).json({ error: 'Admin username requerido' });
    }

    // Verificar que existe
    const paymentResult = await query(
      `SELECT username, nxAmount FROM PaymentRequests WHERE id = @paymentId AND status = 'pending'`,
      { paymentId }
    );

    if (paymentResult.recordset.length === 0) {
      return res.status(404).json({ error: 'Solicitud no encontrada o ya procesada' });
    }

    const payment = paymentResult.recordset[0];

    // Marcar como rechazada
    await query(
      `UPDATE PaymentRequests SET status = 'rejected', approvedAt = GETDATE(), approvedBy = @adminUsername, rejectedReason = @reason WHERE id = @paymentId`,
      { paymentId, adminUsername, reason: reason || 'Sin especificar' }
    );

    console.log(`[PAYMENT] Solicitud #${paymentId} RECHAZADA - ${payment.username} (Razón: ${reason})`);

    res.json({
      success: true,
      message: `Solicitud rechazada`,
    });
  } catch (error) {
    console.error('Reject payment error:', error);
    res.status(500).json({ error: 'Error al rechazar solicitud' });
  }
});

// Cargar comprobante de pago (imagen base64)
router.post('/upload-proof', async (req, res) => {
  try {
    const { proofImageBase64, oidUser, username, NickName, nxAmount, dollarAmount } = req.body;

    if (!proofImageBase64 || !oidUser || !username || !nxAmount || !dollarAmount) {
      return res.status(400).json({ error: 'Datos incompletos' });
    }

    // Crear nueva solicitud con comprobante
    const result = await query(
      `INSERT INTO PaymentRequests (oidUser, username, NickName, nxAmount, dollarAmount, status, proofImageBase64)
       OUTPUT INSERTED.id, INSERTED.createdAt
       VALUES (@oidUser, @username, @NickName, @nxAmount, @dollarAmount, 'pending', @proofImageBase64)`,
      { oidUser, username, NickName, nxAmount, dollarAmount, proofImageBase64 }
    );

    const newPayment = result.recordset[0];
    console.log(`[PAYMENT] Nueva solicitud #${newPayment.id} CON COMPROBANTE - ${username} pidió ${nxAmount} NX por $${dollarAmount}`);

    res.json({
      success: true,
      paymentId: newPayment.id,
      message: 'Comprobante recibido. Espera aprobación del administrador.',
    });
  } catch (error) {
    console.error('Upload proof error:', error);
    res.status(500).json({ error: 'Error al cargar comprobante' });
  }
});

// DEBUG: Ver todos los pagos de un usuario
router.get('/debug/:username', async (req, res) => {
  try {
    const { username } = req.params;

    const result = await query(
      `SELECT id, username, nxAmount, status, createdAt, approvedAt, approvedBy FROM PaymentRequests WHERE username = @username ORDER BY createdAt DESC`,
      { username }
    );

    console.log(`[DEBUG] Pagos para ${username}:`, result.recordset);

    res.json(result.recordset || []);
  } catch (error) {
    console.error('Debug error:', error);
    res.status(500).json({ error: 'Error en debug' });
  }
});

// Obtener pagos aprobados del usuario que no han sido registrados en compras
router.get('/approved-not-recorded/:username', async (req, res) => {
  try {
    const { username } = req.params;

    if (!username) {
      return res.status(400).json({ error: 'Username requerido' });
    }

    console.log(`[PAYMENTS] Buscando pagos aprobados para: ${username}`);

    // Obtener todos los pagos aprobados (sin filtro de mes, el frontend se encarga)
    const result = await query(
      `SELECT id, nxAmount, dollarAmount, approvedAt
       FROM PaymentRequests
       WHERE username = @username 
         AND status = 'approved'
       ORDER BY approvedAt DESC`,
      { username }
    );

    console.log(`[PAYMENTS] Pagos encontrados para ${username}:`, result.recordset);

    res.json(result.recordset || []);
  } catch (error) {
    console.error('Get approved payments error:', error);
    res.status(500).json({ error: 'Error al obtener pagos aprobados' });
  }
});

export default router;
