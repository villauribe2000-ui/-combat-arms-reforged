import { Router } from 'express';
import { query } from '../db.js';

const router = Router();

// Generar número de ticket único
function generateTicketNumber() {
  const date = new Date();
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
  const random = Math.random().toString(36).substr(2, 6).toUpperCase();
  return `TK-${dateStr}-${random}`;
}

// Crear ticket de soporte
router.post('/create', async (req, res) => {
  try {
    const { oidUser, username, NickName, subject, description, refundId } = req.body;

    if (!oidUser || !username || !subject) {
      return res.status(400).json({ error: 'Datos incompletos' });
    }

    const ticketNumber = generateTicketNumber();

    const result = await query(
      `INSERT INTO SupportTickets (ticketNumber, oidUser, username, NickName, subject, description, refundId, status, priority)
       OUTPUT INSERTED.id, INSERTED.ticketNumber, INSERTED.createdAt
       VALUES (@ticketNumber, @oidUser, @username, @NickName, @subject, @description, @refundId, 'open', 'normal')`,
      { ticketNumber, oidUser, username, NickName, subject, description, refundId: refundId || null }
    );

    const ticket = result.recordset[0];
    console.log(`[SUPPORT] Nuevo ticket creado: ${ticket.ticketNumber}`);

    res.json({
      success: true,
      ticketId: ticket.id,
      ticketNumber: ticket.ticketNumber,
      message: 'Ticket creado exitosamente',
    });
  } catch (error) {
    console.error('Create ticket error:', error);
    res.status(500).json({ error: 'Error al crear ticket' });
  }
});

// Obtener tickets del usuario
router.get('/user/:username', async (req, res) => {
  try {
    const { username } = req.params;

    const result = await query(
      `SELECT id, ticketNumber, subject, status, priority, createdAt, updatedAt
       FROM SupportTickets
       WHERE username = @username
       ORDER BY createdAt DESC`,
      { username }
    );

    res.json(result.recordset || []);
  } catch (error) {
    console.error('Get user tickets error:', error);
    res.status(500).json({ error: 'Error al obtener tickets' });
  }
});

// Obtener detalles del ticket
router.get('/ticket/:ticketId', async (req, res) => {
  try {
    const { ticketId } = req.params;

    const ticketResult = await query(
      `SELECT id, ticketNumber, oidUser, username, NickName, subject, description, status, priority, refundId, createdAt, updatedAt, resolvedAt, resolvedBy
       FROM SupportTickets
       WHERE id = @ticketId`,
      { ticketId: parseInt(ticketId) }
    );

    if (ticketResult.recordset.length === 0) {
      return res.status(404).json({ error: 'Ticket no encontrado' });
    }

    const ticket = ticketResult.recordset[0];

    // Obtener mensajes
    const messagesResult = await query(
      `SELECT id, senderType, senderUsername, message, createdAt
       FROM SupportMessages
       WHERE ticketId = @ticketId
       ORDER BY createdAt ASC`,
      { ticketId: parseInt(ticketId) }
    );

    res.json({
      ticket,
      messages: messagesResult.recordset || [],
    });
  } catch (error) {
    console.error('Get ticket details error:', error);
    res.status(500).json({ error: 'Error al obtener detalles del ticket' });
  }
});

// Enviar mensaje al ticket
router.post('/message/:ticketId', async (req, res) => {
  try {
    const { ticketId } = req.params;
    const { senderType, senderUsername, message } = req.body;

    if (!senderType || !senderUsername || !message) {
      return res.status(400).json({ error: 'Datos incompletos' });
    }

    if (!['user', 'admin'].includes(senderType)) {
      return res.status(400).json({ error: 'Tipo de remitente inválido' });
    }

    // Verificar que el ticket existe
    const ticketCheck = await query(
      `SELECT id FROM SupportTickets WHERE id = @ticketId`,
      { ticketId: parseInt(ticketId) }
    );

    if (ticketCheck.recordset.length === 0) {
      return res.status(404).json({ error: 'Ticket no encontrado' });
    }

    // Insertar mensaje
    const result = await query(
      `INSERT INTO SupportMessages (ticketId, senderType, senderUsername, message)
       OUTPUT INSERTED.id, INSERTED.createdAt
       VALUES (@ticketId, @senderType, @senderUsername, @message)`,
      { ticketId: parseInt(ticketId), senderType, senderUsername, message }
    );

    const msg = result.recordset[0];

    // Actualizar fecha de actualización del ticket
    await query(
      `UPDATE SupportTickets SET updatedAt = GETDATE() WHERE id = @ticketId`,
      { ticketId: parseInt(ticketId) }
    );

    console.log(`[SUPPORT] Mensaje agregado al ticket #${ticketId}`);

    res.json({
      success: true,
      messageId: msg.id,
      createdAt: msg.createdAt,
    });
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ error: 'Error al enviar mensaje' });
  }
});

// Obtener todos los tickets (para admin)
router.get('/admin/all', async (req, res) => {
  try {
    const result = await query(
      `SELECT id, ticketNumber, username, NickName, subject, status, priority, createdAt, updatedAt, resolvedAt, resolvedBy
       FROM SupportTickets
       ORDER BY 
        CASE WHEN status = 'urgent' THEN 1
             WHEN priority = 'high' THEN 2
             WHEN status = 'open' THEN 3
             WHEN status = 'in-progress' THEN 4
             ELSE 5 END,
        updatedAt DESC`
    );

    res.json(result.recordset || []);
  } catch (error) {
    console.error('Get all tickets error:', error);
    res.status(500).json({ error: 'Error al obtener tickets' });
  }
});

// Actualizar estado del ticket (admin)
router.put('/ticket/:ticketId/status', async (req, res) => {
  try {
    const { ticketId } = req.params;
    const { status, adminUsername } = req.body;

    if (!status || !['open', 'in-progress', 'resolved', 'closed'].includes(status)) {
      return res.status(400).json({ error: 'Estado inválido' });
    }

    const updateFields = `status = @status, updatedAt = GETDATE()${status === 'resolved' ? ', resolvedAt = GETDATE(), resolvedBy = @adminUsername' : ''}`;

    const result = await query(
      `UPDATE SupportTickets 
       SET ${updateFields}
       WHERE id = @ticketId
       OUTPUT INSERTED.status`,
      { ticketId: parseInt(ticketId), status, adminUsername: adminUsername || null }
    );

    if (result.recordset.length === 0) {
      return res.status(404).json({ error: 'Ticket no encontrado' });
    }

    console.log(`[SUPPORT] Ticket #${ticketId} actualizado a: ${status}`);

    res.json({
      success: true,
      message: 'Estado actualizado',
    });
  } catch (error) {
    console.error('Update ticket status error:', error);
    res.status(500).json({ error: 'Error al actualizar estado' });
  }
});

// Obtener tickets de reembolsos
router.get('/admin/refunded-items', async (req, res) => {
  try {
    const result = await query(
      `SELECT 
        r.id as refundId,
        r.oidUser,
        r.username,
        r.NickName,
        r.productName,
        r.nxPaid,
        r.nxCommission,
        r.nxToRefund,
        r.approvedAt,
        r.approvedBy,
        COALESCE(st.id, 0) as hasTicket
       FROM RefundRequests r
       LEFT JOIN SupportTickets st ON st.refundId = r.id
       WHERE r.status = 'approved'
       ORDER BY r.approvedAt DESC`
    );

    res.json(result.recordset || []);
  } catch (error) {
    console.error('Get refunded items error:', error);
    res.status(500).json({ error: 'Error al obtener items reembolsados' });
  }
});

export default router;
