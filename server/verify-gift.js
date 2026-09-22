import 'dotenv/config';
import { query } from './db.js';

async function verifyGift() {
  try {
    console.log('[VERIFY] Verificando ProductID 22504...');
    
    // Verificar si el product existe
    const productResult = await query(
      `SELECT ProductID, ProductName FROM CBT_ProductInfo WHERE ProductID = 22504`
    );
    
    if (productResult.recordset.length === 0) {
      console.error('[VERIFY] ✗ ProductID 22504 NO EXISTE en la BD');
      console.log('[VERIFY] Esto es el problema - el producto no existe, por eso no se puede enviar como regalo');
    } else {
      const product = productResult.recordset[0];
      console.log(`[VERIFY] ✓ ProductID encontrado: ${product.ProductName} (ID: ${product.ProductID})`);
    }
    
    // Obtener el usuario pruebavip
    console.log('[VERIFY] Buscando usuario "pruebavip"...');
    const userResult = await query(
      `SELECT oidUser, NickName FROM CBT_User WHERE NickName = 'pruebavip' OR strNexonID = 'pruebavip'`
    );
    
    if (userResult.recordset.length === 0) {
      console.error('[VERIFY] Usuario no encontrado');
      process.exit(1);
    }
    
    const buyerUser = userResult.recordset[0];
    console.log(`[VERIFY] Usuario encontrado: ${buyerUser.NickName} (ID: ${buyerUser.oidUser})`);
    
    // Buscar regalos recientes para este usuario
    console.log(`[VERIFY] Buscando regalos recientes para ${buyerUser.NickName}...`);
    const giftResult = await query(
      `SELECT TOP 20 * FROM CBT_UserStore WHERE oidUser = @oidUser ORDER BY UserStoreSeqNo DESC`,
      { oidUser: buyerUser.oidUser }
    );
    
    console.log(`[VERIFY] Encontrados ${giftResult.recordset.length} items`);
    
    if (giftResult.recordset.length > 0) {
      const lastItem = giftResult.recordset[0];
      console.log('[VERIFY] Último item:');
      console.log(`  - ProductID: ${lastItem.ProductID}`);
      console.log(`  - SendNickname: ${lastItem.SendNickname}`);
      console.log(`  - RecvDate: ${lastItem.RecvDate}`);
    }
    
    process.exit(0);
  } catch (error) {
    console.error('[VERIFY] Error:', error.message);
    process.exit(1);
  }
}

verifyGift();
