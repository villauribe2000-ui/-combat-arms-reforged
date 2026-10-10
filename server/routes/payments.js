import { Router } from 'express';
import { query, queryVisms } from '../db.js';

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

    const { query } = await import('../db.js');
    
    await query(
      `INSERT INTO PaymentCodes (oidUser, username, NickName, paymentCode, nxAmount, dollarAmount, status)
       VALUES (@oidUser, @username, @NickName, @paymentCode, @nxAmount, @dollarAmount, 'pending')`,
      [
        { name: 'oidUser', value: oidUser },
        { name: 'username', value: username },
        { name: 'NickName', value: NickName || username },
        { name: 'paymentCode', value: paymentCode },
        { name: 'nxAmount', value: nxAmount },
        { name: 'dollarAmount', value: dollarAmount }
      ]
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
    
    const { query } = await import('../db.js');
    const result = await query(
      'SELECT id, oidUser, username, NickName, paymentCode, nxAmount, dollarAmount, createdAt FROM PaymentCodes WHERE status = @status ORDER BY createdAt DESC',
      [{ name: 'status', value: 'pending' }]
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
    
    const { query } = await import('../db.js');
    const result = await query(
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

    console.log(`[PAYMENT CODE] Aprobando código #${codeId} por ${adminUsername}`);

    const { query } = await import('../db.js');
    
    // Obtener datos del código
    const codeResult = await query(
      'SELECT oidUser, username, nxAmount FROM PaymentCodes WHERE id = @id',
      [{ name: 'id', value: codeId }]
    );

    if (!codeResult.recordset || codeResult.recordset.length === 0) {
      return res.status(404).json({ error: 'Código no encontrado' });
    }

    const { oidUser, username, nxAmount } = codeResult.recordset[0];

    // Actualizar estado del código
    await query(
      `UPDATE PaymentCodes 
       SET status = 'approved', approvedAt = GETDATE(), approvedBy = @adminUsername
       WHERE id = @id`,
      [
        { name: 'id', value: codeId },
        { name: 'adminUsername', value: adminUsername }
      ]
    );

    // Buscar al usuario en ambas tablas
    const userResult = await query(
      `SELECT TOP 1 oidUser as oidUser FROM CBT_UserAuth WHERE strNexonID = @username
       UNION
       SELECT TOP 1 oidUser FROM CBT_User WHERE strNexonID = @username`,
      [{ name: 'username', value: username }]
    );

    if (userResult.recordset && userResult.recordset.length > 0) {
      const userOid = userResult.recordset[0].oidUser;
      
      // Actualizar NX en VISMS_GameAccount
      await query(
        `UPDATE VISMS_GameAccount 
         SET NXAccount = NXAccount + @nxAmount
         WHERE OidUser = @userOid`,
        [
          { name: 'userOid', value: userOid },
          { name: 'nxAmount', value: nxAmount }
        ]
      );

      console.log(`[PAYMENT CODE] ✓ NX añadido: ${username} recibió ${nxAmount} NX`);
    } else {
      console.warn(`[PAYMENT CODE] ⚠️ Usuario no encontrado: ${username}`);
    }

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

    console.log(`[PAYMENT CODE] Rechazando código #${codeId} por ${adminUsername}. Razón: ${reason || 'N/A'}`);

    const { query } = await import('../db.js');
    
    await query(
      `UPDATE PaymentCodes 
       SET status = 'rejected', rejectedAt = GETDATE(), rejectionReason = @reason
       WHERE id = @id`,
      [
        { name: 'id', value: codeId },
        { name: 'reason', value: reason || 'Sin especificar' }
      ]
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

    console.log(`[PAYMENTS] Buscando pagos aprobados para: ${username} (deshabilitado)`);
    res.json([]);
  } catch (error) {
    console.error('Get approved payments error:', error);
    res.status(500).json({ error: 'Error al obtener pagos aprobados' });
  }
});

export default router;
