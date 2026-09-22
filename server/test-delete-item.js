import dotenv from 'dotenv';
dotenv.config();

import { query } from './db.js';

async function testDeleteLastItem(username) {
  try {
    console.log(`\n=== TEST: Eliminar último item de ${username} ===\n`);

    // PASO 1: Obtener oidUser del username
    console.log('📌 PASO 1: Buscando oidUser...');
    const userResult = await query(
      `SELECT oidUser, strNexonID FROM CBT_User WHERE strNexonID = @username`,
      { username }
    );

    if (userResult.recordset.length === 0) {
      console.error(`❌ Usuario no encontrado: ${username}`);
      return;
    }

    const oidUser = userResult.recordset[0].oidUser;
    console.log(`✅ Encontrado: oidUser = ${oidUser}`);

    // PASO 2: Obtener el último item comprado del historial
    console.log('\n📌 PASO 2: Buscando última compra en VISMS_PurchaseLog...');
    const purchaseResult = await query(
      `SELECT TOP 1 SRL, oid, ProductNo, TotalPrice, RegDate FROM VISMS_PurchaseLog 
       WHERE oid = @oidUser
       ORDER BY SRL DESC`,
      { oidUser }
    );

    if (purchaseResult.recordset.length === 0) {
      console.error(`❌ No hay compras registradas para este usuario`);
      return;
    }

    const lastPurchase = purchaseResult.recordset[0];
    const productNo = lastPurchase.ProductNo;
    console.log(`✅ Última compra encontrada:`);
    console.log(`   - SRL (Purchase ID): ${lastPurchase.SRL}`);
    console.log(`   - ProductNo: ${productNo}`);
    console.log(`   - Precio: ${lastPurchase.TotalPrice} NX`);
    console.log(`   - Fecha: ${lastPurchase.RegDate}`);

    // PASO 3: Obtener ProductID del producto
    console.log('\n📌 PASO 3: Buscando ProductID...');
    const productResult = await query(
      `SELECT ProductID, strKor FROM CBT_ProductInfo WHERE ProductNo = @productNo`,
      { productNo }
    );

    if (productResult.recordset.length === 0) {
      console.error(`❌ Producto no encontrado: ${productNo}`);
      return;
    }

    const productId = productResult.recordset[0].ProductID;
    const productName = productResult.recordset[0].strKor;
    console.log(`✅ Producto encontrado:`);
    console.log(`   - ProductID: ${productId}`);
    console.log(`   - Nombre: ${productName}`);

    // PASO 4: Obtener item del inventario
    console.log('\n📌 PASO 4: Buscando item en CBT_UserInventory...');
    const inventoryResult = await query(
      `SELECT TOP 1 oidUser, InventorySeqNo, ItemNo, ProductID, StartDate, EndDate
       FROM CBT_UserInventory
       WHERE oidUser = @oidUser AND ProductID = @productId
       ORDER BY InventorySeqNo DESC`,
      { oidUser, productId }
    );

    if (inventoryResult.recordset.length === 0) {
      console.error(`❌ Item no encontrado en inventario para ProductID: ${productId}`);
      return;
    }

    const inventoryItem = inventoryResult.recordset[0];
    const inventorySeqNo = inventoryItem.InventorySeqNo;
    console.log(`✅ Item encontrado en inventario:`);
    console.log(`   - InventorySeqNo: ${inventorySeqNo}`);
    console.log(`   - ItemNo: ${inventoryItem.ItemNo}`);
    console.log(`   - StartDate: ${inventoryItem.StartDate}`);
    console.log(`   - EndDate: ${inventoryItem.EndDate}`);

    // PASO 5: Eliminar el item
    console.log('\n📌 PASO 5: Eliminando item del inventario...');
    console.log(`   SQL: DELETE FROM CBT_UserInventory WHERE oidUser = ${oidUser} AND InventorySeqNo = ${inventorySeqNo}`);
    
    const deleteResult = await query(
      `DELETE FROM CBT_UserInventory WHERE oidUser = @oidUser AND InventorySeqNo = @inventorySeqNo`,
      { oidUser, inventorySeqNo }
    );

    console.log(`✅ Item eliminado: ${deleteResult.rowsAffected[0]} fila(s) afectada(s)`);

    if (deleteResult.rowsAffected[0] > 0) {
      console.log('\n✅ ¡ÉXITO! Item eliminado correctamente del inventario');
      console.log(`\n📊 Resumen:`);
      console.log(`   - Usuario: ${username} (oidUser: ${oidUser})`);
      console.log(`   - Producto: ${productName} (ProductID: ${productId})`);
      console.log(`   - Precio pagado: ${lastPurchase.TotalPrice} NX`);
      console.log(`   - InventorySeqNo eliminado: ${inventorySeqNo}`);
    } else {
      console.error('\n❌ Error: No se eliminó ningún item');
    }

  } catch (error) {
    console.error('\n❌ Error durante la prueba:', error.message);
    console.error(error);
  }
}

// Ejecutar prueba
const testUsername = process.argv[2] || 'dice'; // Usar el username del argumento o 'dice' por defecto
testDeleteLastItem(testUsername);
