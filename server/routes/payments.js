import { Router } from 'express';
import { query, queryVisms, queryWeb } from '../db.js';

const router = Router();

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

// Obtener solicitudes pendientes (para admin)
// DESHABILITADO: Tabla PaymentRequests no existe
router.get('/pending', async (req, res) => {
  try {
    console.log('[PAYMENT] Solicitud de pendientes (deshabilitada)');
    res.json([]);
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
    if (adminUsername !== 'villauribe12') {
      return res.status(403).json({ error: 'Solo el dueño puede aprobar códigos' });
    }

    console.log(`[PAYMENT CODE] Aprobando código #${codeId} por ${adminUsername}`);

    // Obtener datos del código desde combatarms_web
    const codeResult = await queryWeb(
      'SELECT oidUser, username, nxAmount FROM PaymentCodes WHERE id = @id',
      { id: codeId }
    );

    if (!codeResult.recordset || codeResult.recordset.length === 0) {
      return res.status(404).json({ error: 'Código no encontrado' });
    }

    const { oidUser, username, nxAmount } = codeResult.recordset[0];

    // Actualizar estado del código en combatarms_web
    await queryWeb(
      `UPDATE PaymentCodes 
       SET status = 'approved', approvedAt = GETDATE(), approvedBy = @adminUsername
       WHERE id = @id`,
      {
        id: codeId,
        adminUsername: adminUsername
      }
    );

    // Actualizar NX en VISMS (tabla de moneda)
    // Usando queryVisms para conectar a BD VISMS
    const updateResult = await queryVisms(
      `UPDATE VISMS_UserList 
       SET RealBalance = RealBalance + @nxAmount
       WHERE strNexonID = @username`,
      {
        username: username,
        nxAmount: nxAmount
      }
    );

    console.log(`[PAYMENT CODE] ✓ NX añadido: ${username} recibió ${nxAmount} NX`);

    res.json({
      success: true,
      message: `Código aprobado. ${nxAmount} NX añadidos a ${username}`,
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

export default router;
