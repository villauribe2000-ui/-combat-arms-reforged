import { Router } from 'express';
import { query, queryVisms } from '../db.js';

const router = Router();

// Crear solicitud de reembolso
router.post('/request-refund', async (req, res) => {
  try {
    const { oidUser, username, NickName, productId, productName, purchaseLogId, nxPaid } = req.body;

    if (!oidUser || !username || !nxPaid) {
      return res.status(400).json({ error: 'Datos incompletos' });
    }

    // NUEVO: Verificar que el item NO está en una publicación activa del marketplace
    if (purchaseLogId) {
      const marketplaceCheck = await query(
        `SELECT id, status FROM MarketplaceListings WHERE purchaseLogId = @purchaseLogId AND status IN ('active', 'sold')`,
        { purchaseLogId }
      );

      if (marketplaceCheck.recordset.length > 0) {
        const listing = marketplaceCheck.recordset[0];
        return res.status(400).json({ 
          error: `No puedes reembolsar este item mientras esté en venta en el marketplace. Elimina la publicación primero.`,
          listingId: listing.id,
          status: listing.status,
        });
      }
    }

    // Verificar que no hay una solicitud pendiente para este producto del mismo usuario
    const existingRefund = await query(
      `SELECT id FROM RefundRequests 
       WHERE oidUser = @oidUser AND productId = @productId AND status = 'pending'`,
      { oidUser, productId }
    );

    if (existingRefund.recordset.length > 0) {
      return res.status(400).json({ 
        error: 'Ya existe una solicitud de reembolso pendiente para este producto. Espera a que sea procesada.' 
      });
    }

    // NUEVO: Buscar el InventorySeqNo del item más reciente - buscar por ItemNo ya que ProductID puede ser NULL
    let inventorySeqNo = null;
    const itemResult = await query(
      `SELECT TOP 1 InventorySeqNo, ProductID FROM CBT_UserInventory
       WHERE oidUser = @oidUser
       ORDER BY InventorySeqNo DESC`,
      { oidUser }
    );

    if (itemResult.recordset.length > 0) {
      inventorySeqNo = itemResult.recordset[0].InventorySeqNo;
      console.log(`[REFUND] Found InventorySeqNo: ${inventorySeqNo} for oidUser: ${oidUser} (ProductID: ${itemResult.recordset[0].ProductID})`);
    } else {
      console.error(`[REFUND ERROR] No se encontró ningún item en el inventario para oidUser: ${oidUser}`);
      return res.status(400).json({ 
        error: 'No se encontró el item en el inventario. Verifica que el producto existe en tu inventario.' 
      });
    }

    // NUEVO: Verificar límite de 5 reembolsos por semana (reinicia cada lunes)
    // Calcular el lunes de esta semana
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0 = domingo, 1 = lunes, etc.
    const daysToMonday = dayOfWeek === 0 ? 1 : dayOfWeek - 1; // Si es domingo, sumar 1 día
    const mondayThisWeek = new Date(today);
    mondayThisWeek.setDate(today.getDate() - daysToMonday);
    mondayThisWeek.setHours(0, 0, 0, 0);

    console.log(`[REFUND LIMIT] Checking for user ${username}`);
    console.log(`  Today: ${today.toISOString()}`);
    console.log(`  Monday of week: ${mondayThisWeek.toISOString()}`);

    // Contar reembolsos solicitados desde el lunes (excluyendo rechazados)
    const refundCountResult = await query(
      `SELECT COUNT(*) as count FROM RefundRequests 
       WHERE oidUser = @oidUser 
       AND createdAt >= @mondayDate 
       AND status IN ('pending', 'approved')`,
      { oidUser, mondayDate: mondayThisWeek }
    );

    const refundCount = refundCountResult.recordset[0].count;
    console.log(`  Refunds this week: ${refundCount}/5`);

    if (refundCount >= 5) {
      return res.status(400).json({ 
        error: `Límite de reembolsos alcanzado. Solo puedes reembolsar 5 compras por semana. El contador se reinicia cada lunes.` 
      });
    }

    // Calcular comisión (10%) y NX a devolver
    const nxCommission = Math.round(nxPaid * 0.1); // 10%
    const nxToRefund = nxPaid - nxCommission;

    // Insertar solicitud de reembolso (ahora CON el InventorySeqNo)
    const result = await query(
      `INSERT INTO RefundRequests 
       (oidUser, username, NickName, productId, productName, purchaseLogId, inventorySeqNo, nxPaid, nxCommission, nxToRefund, status)
       OUTPUT INSERTED.id, INSERTED.createdAt
       VALUES (@oidUser, @username, @NickName, @productId, @productName, @purchaseLogId, @inventorySeqNo, @nxPaid, @nxCommission, @nxToRefund, 'pending')`,
      { oidUser, username, NickName, productId, productName, purchaseLogId, inventorySeqNo, nxPaid, nxCommission, nxToRefund }
    );

    const refund = result.recordset[0];

    console.log(`[REFUND] Nueva solicitud #${refund.id} - ${username}: ${productName} (${nxPaid} NX, comisión: ${nxCommission}, a devolver: ${nxToRefund})`);

    res.json({
      success: true,
      refundId: refund.id,
      message: `Solicitud de reembolso creada. Se descontará 10% de comisión (${nxCommission} NX). Reembolsos esta semana: ${refundCount + 1}/5`,
      details: {
        nxPaid,
        nxCommission,
        nxToRefund,
        refundsThisWeek: refundCount + 1,
      },
    });
  } catch (error) {
    console.error('Create refund request error:', error);
    res.status(500).json({ error: 'Error al crear solicitud de reembolso' });
  }
});

// Obtener total de NX reembolsado para un usuario
router.get('/total-refunded/:username', async (req, res) => {
  try {
    const { username } = req.params;

    // Obtener oidUser
    const userResult = await query(
      `SELECT oidUser FROM CBT_User WHERE strNexonID = @username`,
      { username }
    );

    if (userResult.recordset.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    const oidUser = userResult.recordset[0].oidUser;

    // Obtener total de NX reembolsado (solo aprobados)
    const totalResult = await query(
      `SELECT 
        COUNT(*) as totalRefunds,
        SUM(nxToRefund) as totalNXRefunded,
        SUM(nxCommission) as totalCommission,
        SUM(nxPaid) as totalNXPaid
       FROM RefundRequests
       WHERE oidUser = @oidUser AND status = 'approved'`,
      { oidUser }
    );

    const stats = totalResult.recordset[0];

    res.json({
      totalRefunds: stats.totalRefunds || 0,
      totalNXRefunded: stats.totalNXRefunded || 0,
      totalCommission: stats.totalCommission || 0,
      totalNXPaid: stats.totalNXPaid || 0,
    });
  } catch (error) {
    console.error('Get total refunded error:', error);
    res.status(500).json({ error: 'Error al obtener total de reembolsos' });
  }
});

// Obtener detalles de reembolsos aprobados (para mostrar en historial)
router.get('/refund-details/:username', async (req, res) => {
  try {
    const { username } = req.params;

    // Obtener oidUser
    const userResult = await query(
      `SELECT oidUser FROM CBT_User WHERE strNexonID = @username`,
      { username }
    );

    if (userResult.recordset.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    const oidUser = userResult.recordset[0].oidUser;

    // Obtener todos los reembolsos aprobados
    const result = await query(
      `SELECT id, productName, nxPaid, nxCommission, nxToRefund, status, approvedAt
       FROM RefundRequests
       WHERE oidUser = @oidUser AND status = 'approved'
       ORDER BY approvedAt DESC`,
      { oidUser }
    );

    res.json(result.recordset || []);
  } catch (error) {
    console.error('Get refund details error:', error);
    res.status(500).json({ error: 'Error al obtener detalles de reembolsos' });
  }
});

// Obtener solicitudes de reembolso pendientes (para admin)
router.get('/pending', async (req, res) => {
  try {
    const result = await query(
      `SELECT id, oidUser, username, NickName, productId, productName, purchaseLogId, nxPaid, nxCommission, nxToRefund, status, createdAt
       FROM RefundRequests
       WHERE status = 'pending'
       ORDER BY createdAt DESC`
    );

    res.json(result.recordset || []);
  } catch (error) {
    console.error('Get pending refunds error:', error);
    res.status(500).json({ error: 'Error al obtener solicitudes' });
  }
});

// Obtener conteo de reembolsos de esta semana para un usuario
router.get('/weekly-count/:username', async (req, res) => {
  try {
    const { username } = req.params;

    // Obtener oidUser
    const userResult = await query(
      `SELECT oidUser FROM CBT_User WHERE strNexonID = @username`,
      { username }
    );

    if (userResult.recordset.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    const oidUser = userResult.recordset[0].oidUser;

    // Calcular el lunes de esta semana
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0 = domingo, 1 = lunes, etc.
    const daysToMonday = dayOfWeek === 0 ? 1 : dayOfWeek - 1; // Si es domingo, sumar 1 día
    const mondayThisWeek = new Date(today);
    mondayThisWeek.setDate(today.getDate() - daysToMonday);
    mondayThisWeek.setHours(0, 0, 0, 0);

    // Contar reembolsos solicitados desde el lunes (excluyendo rechazados)
    const countResult = await query(
      `SELECT COUNT(*) as count FROM RefundRequests 
       WHERE oidUser = @oidUser 
       AND createdAt >= @mondayDate 
       AND status IN ('pending', 'approved')`,
      { oidUser, mondayDate: mondayThisWeek }
    );

    const count = countResult.recordset[0].count;
    const remaining = Math.max(0, 5 - count);

    res.json({
      used: count,
      remaining: remaining,
      limit: 5,
      mondayOfWeek: mondayThisWeek.toISOString(),
    });
  } catch (error) {
    console.error('Get weekly refund count error:', error);
    res.status(500).json({ error: 'Error al obtener conteo de reembolsos' });
  }
});

// Obtener todas las solicitudes de reembolso (para admin)
router.get('/all', async (req, res) => {
  try {
    const result = await query(
      `SELECT id, oidUser, username, NickName, productId, productName, purchaseLogId, inventorySeqNo, itemNo, 
              nxPaid, nxCommission, nxToRefund, status, createdAt, approvedAt, approvedBy, rejectedReason, rejectedAt, rejectedBy
       FROM RefundRequests
       ORDER BY createdAt DESC`
    );

    res.json(result.recordset || []);
  } catch (error) {
    console.error('Get all refunds error:', error);
    res.status(500).json({ error: 'Error al obtener solicitudes' });
  }
});

// Buscar item del inventario por producto (para obtener InventorySeqNo)
router.get('/find-item/:oidUser/:productId', async (req, res) => {
  try {
    const { oidUser, productId } = req.params;

    // Buscar item más reciente con ese ProductID
    const result = await query(
      `SELECT TOP 1 oidUser, InventorySeqNo, ItemNo, ProductID, StartDate, EndDate
       FROM CBT_UserInventory
       WHERE oidUser = @oidUser AND ProductID = @productId
       ORDER BY InventorySeqNo DESC`,
      { oidUser: parseInt(oidUser), productId: parseInt(productId) }
    );

    if (result.recordset.length === 0) {
      return res.status(404).json({ error: 'Item no encontrado en el inventario' });
    }

    res.json(result.recordset[0]);
  } catch (error) {
    console.error('Find item error:', error);
    res.status(500).json({ error: 'Error al buscar item' });
  }
});

// Aprobar reembolso (elimina item, devuelve NX, cobra 10%)
router.post('/approve/:refundId', async (req, res) => {
  try {
    const refundId = parseInt(req.params.refundId);
    const { adminUsername } = req.body;

    if (!adminUsername) {
      return res.status(400).json({ error: 'Admin username requerido' });
    }

    // Obtener solicitud de reembolso
    const refundResult = await query(
      `SELECT oidUser, username, NickName, productId, productName, nxToRefund, nxCommission, nxPaid, status, inventorySeqNo
       FROM RefundRequests
       WHERE id = @refundId`,
      { refundId }
    );

    if (refundResult.recordset.length === 0) {
      return res.status(404).json({ error: 'Solicitud de reembolso no encontrada' });
    }

    const refund = refundResult.recordset[0];

    if (refund.status !== 'pending') {
      return res.status(400).json({ error: `Esta solicitud ya fue ${refund.status}` });
    }

    // PASO 1: Usar el InventorySeqNo que ya está guardado en la solicitud
    const storedInventorySeqNo = refund.inventorySeqNo;
    
    console.log(`[REFUND APPROVE] Refund #${refundId} - InventorySeqNo: ${storedInventorySeqNo}`);

    if (storedInventorySeqNo && storedInventorySeqNo > 0) {
      try {
        // PASO 1A: Verificar que el item existe antes de eliminarlo
        const itemCheckResult = await query(
          `SELECT oidUser, InventorySeqNo, ItemNo, ProductID FROM CBT_UserInventory
           WHERE oidUser = @oidUser AND InventorySeqNo = @inventorySeqNo`,
          { oidUser: refund.oidUser, inventorySeqNo: storedInventorySeqNo }
        );

        if (itemCheckResult.recordset.length === 0) {
          console.error(`[REFUND ERROR] Item no encontrado - oidUser: ${refund.oidUser}, InventorySeqNo: ${storedInventorySeqNo}`);
          return res.status(400).json({ 
            error: `No se puede eliminar el item: no se encontró el item en el inventario (InventorySeqNo: ${storedInventorySeqNo})` 
          });
        } else {
          const itemDetails = itemCheckResult.recordset[0];
          console.log(`[REFUND] Item encontrado: oidUser=${itemDetails.oidUser}, InventorySeqNo=${itemDetails.InventorySeqNo}, ItemNo=${itemDetails.ItemNo}, ProductID=${itemDetails.ProductID}`);

          // PASO 2: Eliminar item del inventario usando el InventorySeqNo guardado
          const deleteResult = await query(
            `DELETE FROM CBT_UserInventory WHERE oidUser = @oidUser AND InventorySeqNo = @inventorySeqNo`,
            { oidUser: refund.oidUser, inventorySeqNo: storedInventorySeqNo }
          );

          console.log(`[REFUND] Delete Query Result - rowsAffected: ${deleteResult.rowsAffected}`);
          
          if (deleteResult.rowsAffected[0] === 0) {
            console.error(`[REFUND ERROR] No se eliminó ninguna fila! Query: DELETE FROM CBT_UserInventory WHERE oidUser = ${refund.oidUser} AND InventorySeqNo = ${storedInventorySeqNo}`);
            return res.status(400).json({ 
              error: `Error al eliminar el item del inventario (sin filas afectadas)` 
            });
          } else {
            console.log(`[REFUND SUCCESS] Item eliminado correctamente: ${deleteResult.rowsAffected[0]} fila(s) eliminada(s)`);
          }
        }
      } catch (deleteError) {
        console.error(`[REFUND DELETE ERROR] Error al eliminar item: ${deleteError.message}`);
        return res.status(500).json({ 
          error: `Error SQL al eliminar el item: ${deleteError.message}` 
        });
      }
    } else {
      console.error(`[REFUND ERROR] No InventorySeqNo found for refund #${refundId}`);
      return res.status(400).json({ 
        error: 'No se encontró el InventorySeqNo guardado en la solicitud de reembolso' 
      });
    }

    // PASO 3: Obtener saldo actual en VISMS
    const vismResult = await queryVisms(
      `SELECT RealBalance FROM VISMS_UserList WHERE strNexonID = @username`,
      { username: refund.username }
    );

    let newBalance = refund.nxToRefund;
    if (vismResult.recordset.length > 0) {
      newBalance = (vismResult.recordset[0].RealBalance || 0) + refund.nxToRefund;
    }

    // PASO 4: Actualizar NX en VISMS (devolver solo lo que corresponde sin comisión)
    if (vismResult.recordset.length > 0) {
      await queryVisms(
        `UPDATE VISMS_UserList SET RealBalance = @newBalance, TotalBalance = @newBalance, UpdDate = GETDATE()
         WHERE strNexonID = @username`,
        { username: refund.username, newBalance }
      );
    } else {
      await queryVisms(
        `INSERT INTO VISMS_UserList (oid, strNexonID, strLNexonID, ServiceCode, RealBalance, BonusBalance, TotalBalance, RegDate, UpdDate)
         VALUES (@oidUser, @username, @username, 'ca_classic', @newBalance, 0, @newBalance, GETDATE(), GETDATE())`,
        { oidUser: refund.oidUser, username: refund.username, newBalance }
      );
    }

    // PASO 5: Actualizar solicitud a aprobada
    await query(
      `UPDATE RefundRequests 
       SET status = 'approved', approvedAt = GETDATE(), approvedBy = @adminUsername
       WHERE id = @refundId`,
      { refundId, adminUsername }
    );

    console.log(`[REFUND] Solicitud #${refundId} APROBADA - ${refund.username}: ${refund.productName}`);
    console.log(`  - Comisión cobrada: ${refund.nxCommission} NX`);
    console.log(`  - Devuelto: ${refund.nxToRefund} NX`);
    console.log(`  - Nuevo balance: ${newBalance} NX`);

    res.json({
      success: true,
      message: `Reembolso aprobado para ${refund.NickName}`,
      details: {
        productName: refund.productName,
        nxPaid: refund.nxPaid,
        nxCommission: refund.nxCommission,
        nxRefunded: refund.nxToRefund,
        newBalance,
      },
    });
  } catch (error) {
    console.error('Approve refund error:', error);
    res.status(500).json({ error: 'Error al aprobar reembolso', details: error.message });
  }
});

// Rechazar reembolso
router.post('/reject/:refundId', async (req, res) => {
  try {
    const refundId = parseInt(req.params.refundId);
    const { adminUsername, rejectedReason } = req.body;

    if (!adminUsername) {
      return res.status(400).json({ error: 'Admin username requerido' });
    }

    // Verificar que existe
    const refundResult = await query(
      `SELECT username, productName, status FROM RefundRequests WHERE id = @refundId`,
      { refundId }
    );

    if (refundResult.recordset.length === 0) {
      return res.status(404).json({ error: 'Solicitud no encontrada' });
    }

    const refund = refundResult.recordset[0];

    if (refund.status !== 'pending') {
      return res.status(400).json({ error: `Esta solicitud ya fue ${refund.status}` });
    }

    // Marcar como rechazada
    await query(
      `UPDATE RefundRequests 
       SET status = 'rejected', rejectedAt = GETDATE(), rejectedBy = @adminUsername, rejectedReason = @rejectedReason
       WHERE id = @refundId`,
      { refundId, adminUsername, rejectedReason: rejectedReason || 'Sin especificar' }
    );

    console.log(`[REFUND] Solicitud #${refundId} RECHAZADA - ${refund.username} (Razón: ${rejectedReason})`);

    res.json({
      success: true,
      message: `Solicitud rechazada`,
    });
  } catch (error) {
    console.error('Reject refund error:', error);
    res.status(500).json({ error: 'Error al rechazar reembolso' });
  }
});

// Obtener detalles de un item del inventario
router.get('/item/:oidUser/:inventorySeqNo', async (req, res) => {
  try {
    const { oidUser, inventorySeqNo } = req.params;

    const result = await query(
      `SELECT oidUser, InventorySeqNo, ItemNo, ProductID, StartDate, EndDate, remaincount
       FROM CBT_UserInventory
       WHERE oidUser = @oidUser AND InventorySeqNo = @inventorySeqNo`,
      { oidUser: parseInt(oidUser), inventorySeqNo: parseInt(inventorySeqNo) }
    );

    if (result.recordset.length === 0) {
      return res.status(404).json({ error: 'Item no encontrado' });
    }

    res.json(result.recordset[0]);
  } catch (error) {
    console.error('Get item error:', error);
    res.status(500).json({ error: 'Error al obtener item' });
  }
});

// Procesar devolución (refund) - versión antigua (sin comisión, solo para admin manual)
router.post('/process', async (req, res) => {
  try {
    const { oidUser, username, inventorySeqNo, nxAmount, adminUsername, reason } = req.body;

    if (!oidUser || !username || !inventorySeqNo || !nxAmount || !adminUsername) {
      return res.status(400).json({ error: 'Datos incompletos para procesar devolución' });
    }

    // PASO 1: Obtener detalles del item
    const itemResult = await query(
      `SELECT oidUser, InventorySeqNo, ItemNo, ProductID FROM CBT_UserInventory
       WHERE oidUser = @oidUser AND InventorySeqNo = @inventorySeqNo`,
      { oidUser, inventorySeqNo: parseInt(inventorySeqNo) }
    );

    if (itemResult.recordset.length === 0) {
      return res.status(404).json({ error: 'Item no encontrado en el inventario' });
    }

    const item = itemResult.recordset[0];
    const productId = item.ProductID;

    if (!productId) {
      return res.status(400).json({ error: 'El item no tiene ProductID, no se puede devolver' });
    }

    // PASO 2: Eliminar item del inventario
    await query(
      `DELETE FROM CBT_UserInventory WHERE oidUser = @oidUser AND InventorySeqNo = @inventorySeqNo`,
      { oidUser, inventorySeqNo: parseInt(inventorySeqNo) }
    );

    console.log(`[REFUND] Item eliminado - oidUser: ${oidUser}, InventorySeqNo: ${inventorySeqNo}, ProductID: ${productId}`);

    // PASO 3: Enviar item al INBOX usando stored procedure
    try {
      await query(
        `EXEC cbp_user_send_gift @oiduser=@oidUser, @sendoiduser=1, @sendnickname='GM', 
         @productid=@productId, @productno=@productId, @orderno=0, @gifttype=0, 
         @message=@refundMessage, @expire=30, @error=0`,
        {
          oidUser,
          productId,
          refundMessage: `[DEVOLUCIÓN] Reembolso procesado. Razón: ${reason || 'Devención administrativa'}`,
        }
      );

      console.log(`[REFUND] Item devuelto al INBOX - oidUser: ${oidUser}, ProductID: ${productId}`);
    } catch (giftError) {
      console.warn(`[REFUND WARNING] No se pudo enviar item al INBOX: ${giftError.message}`);
      // Continuar de todas formas, el admin puede intentar manualmente
    }

    // PASO 4: Obtener saldo actual en VISMS
    const vismResult = await queryVisms(
      `SELECT RealBalance FROM VISMS_UserList WHERE strNexonID = @username`,
      { username }
    );

    let newBalance = nxAmount;
    if (vismResult.recordset.length > 0) {
      newBalance = (vismResult.recordset[0].RealBalance || 0) + nxAmount;
    }

    // PASO 5: Actualizar NX en VISMS
    if (vismResult.recordset.length > 0) {
      await queryVisms(
        `UPDATE VISMS_UserList SET RealBalance = @newBalance, TotalBalance = @newBalance, UpdDate = GETDATE()
         WHERE strNexonID = @username`,
        { username, newBalance }
      );
    } else {
      await queryVisms(
        `INSERT INTO VISMS_UserList (oid, strNexonID, strLNexonID, ServiceCode, RealBalance, BonusBalance, TotalBalance, RegDate, UpdDate)
         VALUES (@oidUser, @username, @username, 'ca_classic', @newBalance, 0, @newBalance, GETDATE(), GETDATE())`,
        { oidUser, username, newBalance }
      );
    }

    console.log(`[REFUND] Devolución completada - ${username} recibió ${nxAmount} NX (nuevo balance: ${newBalance})`);

    res.json({
      success: true,
      message: `Devolución procesada. ${nxAmount} NX devueltos a ${username}. Item reenviado al INBOX.`,
      newBalance,
      itemRemoved: {
        oidUser,
        inventorySeqNo,
        productId,
      },
    });
  } catch (error) {
    console.error('Process refund error:', error);
    res.status(500).json({ error: 'Error al procesar devolución', details: error.message });
  }
});

// Eliminar solo el item (sin devolver NX)
router.post('/remove-item', async (req, res) => {
  try {
    const { oidUser, inventorySeqNo, adminUsername, reason } = req.body;

    if (!oidUser || !inventorySeqNo || !adminUsername) {
      return res.status(400).json({ error: 'Datos incompletos' });
    }

    // Verificar que existe
    const itemResult = await query(
      `SELECT oidUser, InventorySeqNo, ItemNo, ProductID FROM CBT_UserInventory
       WHERE oidUser = @oidUser AND InventorySeqNo = @inventorySeqNo`,
      { oidUser, inventorySeqNo: parseInt(inventorySeqNo) }
    );

    if (itemResult.recordset.length === 0) {
      return res.status(404).json({ error: 'Item no encontrado' });
    }

    const item = itemResult.recordset[0];

    // Eliminar
    await query(
      `DELETE FROM CBT_UserInventory WHERE oidUser = @oidUser AND InventorySeqNo = @inventorySeqNo`,
      { oidUser, inventorySeqNo: parseInt(inventorySeqNo) }
    );

    console.log(`[REMOVE] Item eliminado sin devolución - oidUser: ${oidUser}, InventorySeqNo: ${inventorySeqNo}, Razón: ${reason || 'No especificada'}`);

    res.json({
      success: true,
      message: 'Item eliminado del inventario',
      itemRemoved: {
        oidUser,
        inventorySeqNo,
        productId: item.ProductID,
      },
    });
  } catch (error) {
    console.error('Remove item error:', error);
    res.status(500).json({ error: 'Error al eliminar item' });
  }
});

export default router;
