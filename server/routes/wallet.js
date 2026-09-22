import { Router } from 'express';
import { query, queryVisms } from '../db.js';
import crypto from 'crypto';

const router = Router();

// Paquetes de Gcoin disponibles
const GCOIN_PACKAGES = [
  { id: 1, coins: 100, price: 0.13 },
  { id: 2, coins: 200, price: 0.27 },
  { id: 3, coins: 500, price: 0.67 },
  { id: 4, coins: 1000, price: 1.33 },
  { id: 5, coins: 1500, price: 2.00 },
  { id: 6, coins: 2000, price: 2.67 },
  { id: 7, coins: 3000, price: 4.00 },
  { id: 8, coins: 5000, price: 6.67 },
  { id: 9, coins: 10000, price: 13.33 },
  { id: 10, coins: 20000, price: 26.67 },
  { id: 11, coins: 30000, price: 40.00 },
];

// Get available Gcoin packages
router.get('/packages', (req, res) => {
  try {
    res.json(GCOIN_PACKAGES);
  } catch (error) {
    console.error('Get packages error:', error);
    res.status(500).json({ error: 'Error al obtener paquetes' });
  }
});

// Get user wallet balance (NX)
router.get('/balance/:userId', async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);

    // Obtener el NX (RealBalance) del usuario desde VISMS_UserList
    const result = await queryVisms(
      'SELECT RealBalance FROM VISMS_UserList WHERE oid = @userId',
      { userId }
    );

    if (result.recordset.length === 0) {
      return res.json({ nx: 0 });
    }

    const wallet = result.recordset[0];
    res.json({ nx: wallet.RealBalance || 0 });
  } catch (error) {
    console.error('Get balance error:', error);
    res.status(500).json({ error: 'Error al obtener saldo' });
  }
});

// Get transaction history
router.get('/transactions/:userId', async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    const limit = req.query.limit || 20;

    const result = await query(
      `SELECT TOP (@limit) oidTransaction, transactionType, amount, gcoinAmount, description, status, createdAt
       FROM CBT_UserTransactions
       WHERE oidUser = @userId
       ORDER BY createdAt DESC`,
      { userId, limit: parseInt(limit) }
    );

    res.json(result.recordset || []);
  } catch (error) {
    console.error('Get transactions error:', error);
    res.status(500).json({ error: 'Error al obtener transacciones' });
  }
});

// Crear orden para PayPal.me (solo registro)
router.post('/create-order', async (req, res) => {
  try {
    const { userId, packageId } = req.body;

    if (!userId || !packageId) {
      return res.status(400).json({ error: 'userId y packageId son requeridos' });
    }

    const package_ = GCOIN_PACKAGES.find(p => p.id === packageId);
    if (!package_) {
      return res.status(404).json({ error: 'Paquete no encontrado' });
    }

    // Guardar transacción pendiente en BD
    try {
      await query(
        `INSERT INTO CBT_UserTransactions (oidUser, transactionType, amount, gcoinAmount, description, status)
         VALUES (@userId, 'paypal_purchase', @amount, @gcoinAmount, @description, 'pending')`,
        {
          userId,
          amount: package_.price,
          gcoinAmount: package_.coins,
          description: `Compra de ${package_.coins} NX`,
        }
      );
    } catch (err) {
      console.log('Note: CBT_UserTransactions table may not exist yet');
    }

    // Retornar el link de PayPal.me con el monto
    res.json({
      orderId: `order-${Date.now()}`,
      approveUrl: `https://paypal.me/LBetancourthQuenguan/${package_.price}`,
      packageId: packageId,
      amount: package_.price,
      coins: package_.coins,
    });
  } catch (error) {
    console.error('Create order error:', error);
    res.status(500).json({ error: 'Error al crear orden' });
  }
});

// Webhook de PayPal (recibe notificaciones de pago completado)
router.post('/webhook/paypal', async (req, res) => {
  try {
    // Para PayPal.me, implementaremos un sistema manual de confirmación
    // Este endpoint puede recibir webhooks de PayPal si está configurado
    
    const body = req.body;
    console.log('[WEBHOOK] PayPal notification received:', body);

    // Aquí puedes verificar la firma de PayPal si lo necesitas
    // Por ahora, solo loguea la notificación
    
    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({ error: 'Error procesando webhook' });
  }
});

// Endpoint manual para acreditar NX (después de verificar pago)
router.post('/confirm-payment', async (req, res) => {
  try {
    const { userId, packageId, transactionId } = req.body;

    if (!userId || !packageId) {
      return res.status(400).json({ error: 'userId y packageId son requeridos' });
    }

    const package_ = GCOIN_PACKAGES.find(p => p.id === packageId);
    if (!package_) {
      return res.status(404).json({ error: 'Paquete no encontrado' });
    }

    // Obtener username del usuario
    const userResult = await query(
      'SELECT strNexonID FROM CBT_User WHERE oidUser = @userId',
      { userId }
    );

    if (userResult.recordset.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    const username = userResult.recordset[0].strNexonID;

    // Actualizar NX en VISMS_UserList
    const vismResult = await queryVisms(
      'SELECT RealBalance FROM VISMS_UserList WHERE strNexonID = @username',
      { username }
    );

    let newBalance = package_.coins;
    if (vismResult.recordset.length > 0) {
      newBalance = (vismResult.recordset[0].RealBalance || 0) + package_.coins;
    }

    await queryVisms(
      'UPDATE VISMS_UserList SET RealBalance = @newBalance, TotalBalance = @newBalance WHERE strNexonID = @username',
      { username, newBalance }
    );

    // Registrar transacción completada
    try {
      await query(
        `UPDATE CBT_UserTransactions SET status = 'completed' WHERE oidUser = @userId AND amount = @amount`,
        { userId, amount: package_.price }
      );
    } catch (err) {
      console.log('Note: Transaction update skipped');
    }

    res.json({
      success: true,
      message: `¡${package_.coins} NX acreditados exitosamente!`,
      newBalance: newBalance,
      coins: package_.coins,
    });
  } catch (error) {
    console.error('Confirm payment error:', error);
    res.status(500).json({ error: 'Error al acreditar NX' });
  }
});

// Add NX from level rewards
router.post('/claim-level-reward', async (req, res) => {
  try {
    const { username, level, nxAmount } = req.body;

    if (!username || level === undefined || !nxAmount) {
      return res.status(400).json({ error: 'username, level y nxAmount son requeridos' });
    }

    console.log(`[LEVEL REWARD] Procesando recompensa: ${username}, Nivel ${level}, NX: ${nxAmount}`);

    // Obtener balance actual en VISMS
    const vismResult = await queryVisms(
      'SELECT RealBalance FROM VISMS_UserList WHERE strNexonID = @username',
      { username }
    );

    console.log(`[LEVEL REWARD] Usuario encontrado en VISMS:`, vismResult.recordset.length > 0);

    let newBalance = nxAmount;
    if (vismResult.recordset.length > 0) {
      newBalance = (vismResult.recordset[0].RealBalance || 0) + nxAmount;
      
      // Actualizar si existe
      await queryVisms(
        'UPDATE VISMS_UserList SET RealBalance = @newBalance, TotalBalance = @newBalance, UpdDate = GETDATE() WHERE strNexonID = @username',
        { username, newBalance }
      );
      
      console.log(`[LEVEL REWARD] Balance actualizado: ${newBalance}`);
    } else {
      console.log(`[LEVEL REWARD] Usuario no encontrado en VISMS para ${username}`);
      return res.status(404).json({ error: 'Usuario no encontrado en VISMS' });
    }

    console.log(`[LEVEL REWARD] ✓ ${username} reclamó recompensa del nivel ${level}: +${nxAmount} NX (nuevo balance: ${newBalance})`);

    res.json({
      success: true,
      message: `¡+${nxAmount} NX reclamados del Nivel ${level}!`,
      newBalance: newBalance,
      nx: nxAmount,
    });
  } catch (error) {
    console.error('Claim level reward error:', error);
    res.status(500).json({ error: 'Error al reclamar recompensa: ' + error.message });
  }
});

// Reset level rewards for testing (DEBUG)
router.post('/reset-level-rewards/:username', async (req, res) => {
  try {
    const { username } = req.params;

    if (!username) {
      return res.status(400).json({ error: 'username requerido' });
    }

    console.log(`[DEBUG] Reseteando recompensas de nivel para ${username}`);

    res.json({
      success: true,
      message: `Recompensas de nivel reseteadas para ${username}. Recarga la página.`,
      instruction: 'El frontend debe limpiar su localStorage. Recarga el navegador.',
    });
  } catch (error) {
    console.error('Reset level rewards error:', error);
    res.status(500).json({ error: 'Error al resetear recompensas' });
  }
});

export default router;
