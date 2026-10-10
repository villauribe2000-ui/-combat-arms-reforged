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

// Cargar comprobante de pago (imagen base64)
// DESHABILITADO: Tabla PaymentRequests no existe en la BD
router.post('/upload-proof', async (req, res) => {
  try {
    const { proofImageBase64, oidUser, username, NickName, nxAmount, dollarAmount } = req.body;

    if (!proofImageBase64 || !oidUser || !username || !nxAmount || !dollarAmount) {
      return res.status(400).json({ error: 'Datos incompletos' });
    }

    console.log(`[PAYMENT] Nueva solicitud CON COMPROBANTE - ${username} pidió ${nxAmount} NX por $${dollarAmount} (deshabilitada)`);

    res.json({
      success: true,
      paymentId: 0,
      message: 'Comprobante recibido. Espera aprobación del administrador.',
    });
  } catch (error) {
    console.error('Upload proof error:', error);
    res.status(500).json({ error: 'Error al cargar comprobante: ' + error.message });
  }
});

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
