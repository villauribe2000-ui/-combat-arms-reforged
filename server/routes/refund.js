import { Router } from 'express';
import { queryWeb } from '../db.js';

const router = Router();

// Obtener reembolsos pendientes (para admin)
router.get('/pending', async (req, res) => {
  try {
    console.log('[REFUND] Obteniendo reembolsos pendientes');
    
    const result = await queryWeb(
      `SELECT id, oidUser, username, NickName, productName, nxPaid, nxCommission, nxToRefund, status, createdAt, approvedAt, approvedBy
       FROM RefundRequests
       WHERE status = 'pending'
       ORDER BY createdAt DESC`
    );

    res.json(result.recordset || []);
  } catch (error) {
    console.error('Get pending refunds error:', error);
    res.status(500).json({ error: 'Error al obtener reembolsos pendientes' });
  }
});

// Aprobar reembolso (admin)
router.post('/approve/:refundId', async (req, res) => {
  try {
    const refundId = parseInt(req.params.refundId);
    const { adminUsername } = req.body;

    if (!adminUsername) {
      return res.status(400).json({ error: 'Admin username requerido' });
    }

    console.log(`[REFUND] Aprobando reembolso #${refundId} por ${adminUsername}`);

    // Obtener datos del reembolso
    const refundResult = await queryWeb(
      'SELECT id, oidUser, username, nxToRefund FROM RefundRequests WHERE id = @id',
      { id: refundId }
    );

    if (!refundResult.recordset || refundResult.recordset.length === 0) {
      return res.status(404).json({ error: 'Reembolso no encontrado' });
    }

    const refund = refundResult.recordset[0];

    // Actualizar estado en combatarms_web
    await queryWeb(
      `UPDATE RefundRequests 
       SET status = 'approved', approvedAt = GETDATE(), approvedBy = @adminUsername
       WHERE id = @id`,
      {
        id: refundId,
        adminUsername: adminUsername
      }
    );

    console.log(`[REFUND] ✓ Reembolso aprobado: ${refund.username} - ${refund.nxToRefund} NX`);

    res.json({
      success: true,
      message: `Reembolso aprobado`,
      details: {
        nxRefunded: refund.nxToRefund
      }
    });

  } catch (error) {
    console.error('Approve refund error:', error);
    res.status(500).json({ error: 'Error al aprobar reembolso: ' + error.message });
  }
});

// Rechazar reembolso (admin)
router.post('/reject/:refundId', async (req, res) => {
  try {
    const refundId = parseInt(req.params.refundId);
    const { adminUsername, reason } = req.body;

    if (!adminUsername) {
      return res.status(400).json({ error: 'Admin username requerido' });
    }

    console.log(`[REFUND] Rechazando reembolso #${refundId} por ${adminUsername}. Razón: ${reason || 'N/A'}`);

    await queryWeb(
      `UPDATE RefundRequests 
       SET status = 'rejected', rejectedAt = GETDATE(), rejectionReason = @reason
       WHERE id = @id`,
      {
        id: refundId,
        reason: reason || 'Sin especificar'
      }
    );

    res.json({
      success: true,
      message: 'Reembolso rechazado',
    });

  } catch (error) {
    console.error('Reject refund error:', error);
    res.status(500).json({ error: 'Error al rechazar reembolso: ' + error.message });
  }
});

export default router;
