import { Router } from 'express';
import { query, queryVisms } from '../db.js';

const router = Router();

// Crear publicación (vender item)
router.post('/create-listing', async (req, res) => {
  try {
    const { oidUser, username, NickName, itemName, itemDescription, itemRarity, sellingPrice, quantity, condition, imageBase64, purchaseLogId } = req.body;

    if (!oidUser || !username || !itemName || !sellingPrice || !purchaseLogId) {
      return res.status(400).json({ error: 'Datos incompletos. El purchaseLogId es requerido' });
    }

    if (sellingPrice < 1) {
      return res.status(400).json({ error: 'El precio debe ser mayor a 0' });
    }

    // Obtener el ProductID desde VISMS_PurchaseLog usando purchaseLogId
    let productId = null;
    try {
      const purchaseResult = await queryVisms(
        `SELECT ProductNo FROM VISMS_PurchaseLog WHERE SRL = @purchaseLogId`,
        { purchaseLogId: parseInt(purchaseLogId) }
      );
      
      if (purchaseResult.recordset.length > 0) {
        productId = purchaseResult.recordset[0].ProductNo;
        console.log(`[MARKETPLACE] Obtenido ProductID ${productId} para purchaseLogId ${purchaseLogId}`);
      }
    } catch (e) {
      console.warn(`[MARKETPLACE] No se pudo obtener ProductID para ${purchaseLogId}:`, e.message);
    }

    const result = await query(
      `INSERT INTO MarketplaceListings 
       (oidUser, username, NickName, itemName, itemDescription, itemRarity, sellingPrice, quantity, condition, imageBase64, purchaseLogId, productId, status)
       OUTPUT INSERTED.id, INSERTED.createdAt
       VALUES (@oidUser, @username, @NickName, @itemName, @itemDescription, @itemRarity, @sellingPrice, @quantity, @condition, @imageBase64, @purchaseLogId, @productId, 'active')`,
      {
        oidUser,
        username,
        NickName,
        itemName,
        itemDescription: itemDescription || null,
        itemRarity: itemRarity || 'común',
        sellingPrice: parseInt(sellingPrice),
        quantity: quantity || 1,
        condition: 'N/A',
        imageBase64: imageBase64 || null,
        purchaseLogId: parseInt(purchaseLogId),
        productId: productId,
      }
    );

    const listing = result.recordset[0];
    console.log(`[MARKETPLACE] Nueva publicación creada: ${itemName} por ${username} (purchaseLogId: ${purchaseLogId}, productId: ${productId})`);

    res.json({
      success: true,
      listingId: listing.id,
      message: 'Publicación creada exitosamente',
      createdAt: listing.createdAt,
    });
  } catch (error) {
    console.error('Create listing error:', error);
    res.status(500).json({ error: 'Error al crear publicación' });
  }
});

// Obtener todas las publicaciones activas (marketplace)
router.get('/listings', async (req, res) => {
  try {
    const { page = 1, limit = 20, search = '', rarity = '' } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let whereClause = "status = 'active'";
    const params = {};

    if (search) {
      whereClause += " AND (itemName LIKE @search OR NickName LIKE @search)";
      params.search = `%${search}%`;
    }

    if (rarity && rarity !== 'all') {
      whereClause += " AND itemRarity = @rarity";
      params.rarity = rarity;
    }

    // Total de registros
    const countResult = await query(
      `SELECT COUNT(*) as total FROM MarketplaceListings WHERE ${whereClause}`,
      params
    );
    const total = countResult.recordset[0].total;

    // Listings
    const result = await query(
      `SELECT id, oidUser, username, NickName, itemName, itemDescription, itemRarity, sellingPrice, quantity, condition, imageBase64, status, createdAt, updatedAt
       FROM MarketplaceListings
       WHERE ${whereClause}
       ORDER BY createdAt DESC
       OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY`,
      { ...params, offset, limit: parseInt(limit) }
    );

    res.json({
      listings: result.recordset || [],
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error('Get listings error:', error);
    res.status(500).json({ error: 'Error al obtener publicaciones' });
  }
});

// Obtener publicaciones de un usuario
router.get('/user/:username', async (req, res) => {
  try {
    const { username } = req.params;
    
    console.log(`[MARKETPLACE] Obteniendo publicaciones para usuario: ${username}`);

    const result = await query(
      `SELECT id, oidUser, username, NickName, itemName, itemDescription, itemRarity, sellingPrice, quantity, condition, imageBase64, status, createdAt, updatedAt, soldAt, soldTo
       FROM MarketplaceListings
       WHERE username = @username
       ORDER BY createdAt DESC`,
      { username }
    );

    console.log(`[MARKETPLACE] Encontradas ${result.recordset.length} publicaciones para ${username}`);
    res.json(result.recordset || []);
  } catch (error) {
    console.error('Get user listings error:', error);
    res.status(500).json({ error: 'Error al obtener publicaciones del usuario' });
  }
});

// Obtener detalles de una publicación
router.get('/listing/:listingId', async (req, res) => {
  try {
    const { listingId } = req.params;

    const result = await query(
      `SELECT id, oidUser, username, NickName, itemName, itemDescription, itemRarity, sellingPrice, quantity, condition, imageBase64, status, createdAt, updatedAt, soldAt, soldTo
       FROM MarketplaceListings
       WHERE id = @listingId`,
      { listingId: parseInt(listingId) }
    );

    if (result.recordset.length === 0) {
      return res.status(404).json({ error: 'Publicación no encontrada' });
    }

    res.json(result.recordset[0]);
  } catch (error) {
    console.error('Get listing error:', error);
    res.status(500).json({ error: 'Error al obtener publicación' });
  }
});

// Comprar item del marketplace
router.post('/purchase/:listingId', async (req, res) => {
  try {
    const { listingId } = req.params;
    const { buyerId, buyerUsername, buyerNickName } = req.body;

    if (!buyerId || !buyerUsername) {
      return res.status(400).json({ error: 'Datos incompletos del comprador' });
    }

    console.log(`[MARKETPLACE PURCHASE] Iniciando compra - Listing: ${listingId}, Comprador: ${buyerUsername}`);

    // Obtener detalles del listing
    const listingResult = await query(
      `SELECT * FROM MarketplaceListings WHERE id = @listingId`,
      { listingId: parseInt(listingId) }
    );

    if (listingResult.recordset.length === 0) {
      return res.status(404).json({ error: 'Publicación no encontrada' });
    }

    const listing = listingResult.recordset[0];

    // Verificar que no esté vendido
    if (listing.status !== 'active') {
      return res.status(400).json({ error: 'Este item ya no está disponible' });
    }

    // Verificar que el comprador no sea el vendedor
    if (listing.oidUser === buyerId) {
      return res.status(400).json({ error: 'No puedes comprar tu propio item' });
    }

    // Obtener balance del comprador desde VISMS
    const buyerBalanceResult = await queryVisms(
      `SELECT RealBalance FROM VISMS_UserList WHERE oid = @buyerId`,
      { buyerId }
    );

    if (buyerBalanceResult.recordset.length === 0) {
      return res.status(400).json({ error: 'Usuario no encontrado' });
    }

    const buyerBalance = buyerBalanceResult.recordset[0].RealBalance;
    console.log(`[MARKETPLACE PURCHASE] Balance del comprador: ${buyerBalance}, Precio: ${listing.sellingPrice}`);

    // Verificar que tenga suficiente NX
    if (buyerBalance < listing.sellingPrice) {
      return res.status(400).json({ 
        error: 'NX insuficiente',
        required: listing.sellingPrice,
        current: buyerBalance,
        needed: listing.sellingPrice - buyerBalance,
      });
    }

    // PASO 1: Restar NX al comprador (desde VISMS)
    await queryVisms(
      `UPDATE VISMS_UserList SET RealBalance = RealBalance - @price, TotalBalance = TotalBalance - @price, UpdDate = GETDATE() 
       WHERE oid = @buyerId`,
      { buyerId, price: listing.sellingPrice }
    );
    console.log(`[MARKETPLACE PURCHASE] NX restado del comprador: -${listing.sellingPrice} NX`);

    // PASO 2: Agregar NX al vendedor (desde VISMS)
    await queryVisms(
      `UPDATE VISMS_UserList SET RealBalance = RealBalance + @price, TotalBalance = TotalBalance + @price, UpdDate = GETDATE() 
       WHERE oid = @sellerId`,
      { sellerId: listing.oidUser, price: listing.sellingPrice }
    );
    console.log(`[MARKETPLACE PURCHASE] NX agregado al vendedor: +${listing.sellingPrice} NX`);

    // PASO 3: Enviar item al comprador como regalo (usando stored procedure)
    // Usar el productId guardado en la publicación
    if (!listing.productId) {
      console.warn(`[MARKETPLACE] No hay productId para enviar gift en listing ${listingId}. Saltando envío.`);
    } else {
      try {
        // El stored procedure cbp_user_send_gift envía el item al inbox del comprador
        const giftResult = await query(
          `EXEC cbp_user_send_gift 
           @oiduser=?, 
           @sendoiduser=?, 
           @sendnickname=?, 
           @productid=?, 
           @productno=?, 
           @orderno=?, 
           @gifttype=?, 
           @message=?, 
           @expire=?, 
           @error=?`,
          [
            buyerId,
            1,
            'Marketplace',
            listing.productId,
            listing.productId,
            0,
            0,
            `Item comprado en Marketplace: ${listing.itemName}`,
            30,
            0
          ]
        );
        console.log(`[MARKETPLACE PURCHASE] Item enviado exitosamente al inbox del comprador (productId: ${listing.productId})`);
        console.log(`[MARKETPLACE PURCHASE] Gift result:`, giftResult);
      } catch (giftError) {
        console.error(`[MARKETPLACE] Error al enviar gift:`, giftError.message);
        console.error(`[MARKETPLACE] Error completo:`, giftError);
        // No fallar la compra si hay error en gift, solo loguear
      }
    }

    // PASO 4: Marcar listing como vendido
    await query(
      `UPDATE MarketplaceListings 
       SET status = 'sold', soldAt = GETDATE(), soldTo = @buyerUsername, updatedAt = GETDATE()
       WHERE id = @listingId`,
      { listingId: parseInt(listingId), buyerUsername }
    );

    // PASO 5: Crear registro de transacción
    await query(
      `INSERT INTO MarketplaceTransactions 
       (listingId, sellerId, sellerUsername, buyerId, buyerUsername, itemName, price, quantity, status)
       VALUES (@listingId, @sellerId, @sellerUsername, @buyerId, @buyerUsername, @itemName, @price, @quantity, 'completed')`,
      {
        listingId: parseInt(listingId),
        sellerId: listing.oidUser,
        sellerUsername: listing.username,
        buyerId,
        buyerUsername,
        itemName: listing.itemName,
        price: listing.sellingPrice,
        quantity: listing.quantity,
      }
    );

    console.log(`[MARKETPLACE] Compra completada: ${buyerUsername} compró ${listing.itemName} de ${listing.username} por ${listing.sellingPrice} NX`);

    res.json({
      success: true,
      message: 'Compra completada exitosamente',
      details: {
        itemName: listing.itemName,
        price: listing.sellingPrice,
        seller: listing.NickName,
        buyerNewBalance: buyerBalance - listing.sellingPrice,
      },
    });
  } catch (error) {
    console.error('Purchase error:', error);
    res.status(500).json({ error: 'Error al procesar compra' });
  }
});
// Obtener historial de transacciones del usuario
router.get('/transactions/:username', async (req, res) => {
  try {
    const { username } = req.params;
    const { type = 'all' } = req.query; // 'all', 'sold', 'bought'

    let whereClause = '';
    if (type === 'sold') {
      whereClause = 'WHERE sellerUsername = @username';
    } else if (type === 'bought') {
      whereClause = 'WHERE buyerUsername = @username';
    } else {
      whereClause = 'WHERE sellerUsername = @username OR buyerUsername = @username';
    }

    const result = await query(
      `SELECT * FROM MarketplaceTransactions
       ${whereClause}
       ORDER BY transactionDate DESC`,
      { username }
    );

    res.json(result.recordset || []);
  } catch (error) {
    console.error('Get transactions error:', error);
    res.status(500).json({ error: 'Error al obtener transacciones' });
  }
});

// Cancelar/eliminar publicación
router.delete('/listing/:listingId', async (req, res) => {
  try {
    const { listingId } = req.params;
    const { username } = req.body;

    if (!username) {
      return res.status(400).json({ error: 'Usuario requerido' });
    }

    // Verificar que sea el propietario
    const listingResult = await query(
      `SELECT * FROM MarketplaceListings WHERE id = @listingId`,
      { listingId: parseInt(listingId) }
    );

    if (listingResult.recordset.length === 0) {
      return res.status(404).json({ error: 'Publicación no encontrada' });
    }

    const listing = listingResult.recordset[0];

    if (listing.username !== username) {
      return res.status(403).json({ error: 'No tienes permiso para eliminar esta publicación' });
    }

    if (listing.status !== 'active') {
      return res.status(400).json({ error: 'Solo puedes eliminar publicaciones activas' });
    }

    // Eliminar publicación (marcar como removed)
    await query(
      `UPDATE MarketplaceListings SET status = 'removed', updatedAt = GETDATE() WHERE id = @listingId`,
      { listingId: parseInt(listingId) }
    );

    console.log(`[MARKETPLACE] Publicación eliminada: ${listing.itemName} (purchaseLogId: ${listing.purchaseLogId}). Item disponible nuevamente para reembolso.`);

    res.json({
      success: true,
      message: 'Publicación eliminada. Ahora puedes solicitar reembolso para este item.',
      purchaseLogId: listing.purchaseLogId,
    });
  } catch (error) {
    console.error('Delete listing error:', error);
    res.status(500).json({ error: 'Error al eliminar publicación' });
  }
});

// Obtener estadísticas del usuario en el marketplace
router.get('/stats/:username', async (req, res) => {
  try {
    const { username } = req.params;

    const stats = await query(
      `SELECT 
        COUNT(CASE WHEN sellerUsername = @username AND status = 'completed' THEN 1 END) as itemsSold,
        SUM(CASE WHEN sellerUsername = @username AND status = 'completed' THEN price ELSE 0 END) as totalEarned,
        COUNT(CASE WHEN buyerUsername = @username AND status = 'completed' THEN 1 END) as itemsBought,
        SUM(CASE WHEN buyerUsername = @username AND status = 'completed' THEN price ELSE 0 END) as totalSpent,
        COUNT(CASE WHEN username = @username AND status = 'active' THEN 1 END) as activeListings
       FROM MarketplaceTransactions mt
       RIGHT JOIN MarketplaceListings ml ON mt.listingId = ml.id
       WHERE ml.username = @username OR mt.sellerUsername = @username OR mt.buyerUsername = @username`,
      { username }
    );

    res.json(stats.recordset[0] || {});
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ error: 'Error al obtener estadísticas' });
  }
});

export default router;
