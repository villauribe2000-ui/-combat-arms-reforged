import 'dotenv/config';
import { query } from './db.js';

async function testGift() {
  try {
    console.log('[TEST] Iniciando prueba de envío de regalo...');
    
    // Primero obtener un usuario real
    console.log('[TEST] Buscando usuarios válidos...');
    const usersResult = await query(
      `SELECT TOP 1 oidUser, NickName FROM CBT_User WHERE DeleteDate IS NULL`
    );
    
    if (usersResult.recordset.length === 0) {
      console.error('[TEST] No hay usuarios en la BD');
      process.exit(1);
    }
    
    const targetUser = usersResult.recordset[0];
    console.log(`[TEST] Usuario encontrado: ${targetUser.NickName} (ID: ${targetUser.oidUser})`);
    
    // Parámetros de prueba
    const buyerId = targetUser.oidUser;
    const productId = 1000; // ID del producto
    const message = 'Prueba de regalo desde Marketplace';
    
    console.log(`[TEST] Enviando regalo:`);
    console.log(`  - Buyer ID: ${buyerId}`);
    console.log(`  - Buyer Nickname: ${targetUser.NickName}`);
    console.log(`  - Product ID: ${productId}`);
    console.log(`  - Message: ${message}`);
    
    // Ejecutar el stored procedure
    const result = await query(
      `EXEC cbp_user_send_gift 
       @oiduser=@buyerId, 
       @sendoiduser=1, 
       @sendnickname='Marketplace', 
       @productid=@productId, 
       @productno=@productId, 
       @orderno=0, 
       @gifttype=0, 
       @message=@message, 
       @expire=30, 
       @error=0`,
      {
        buyerId,
        productId,
        message,
      }
    );
    
    console.log('[TEST] ✓ Regalo enviado exitosamente');
    console.log('[TEST] Resultado:', result);
    process.exit(0);
  } catch (error) {
    console.error('[TEST] ✗ Error al enviar regalo:', error.message);
    console.error('[TEST] Full error:', error);
    process.exit(1);
  }
}

testGift();
