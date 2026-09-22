import sql from 'mssql';

const config = {
  server: '94.72.114.174',
  database: 'COMBATARMS',
  user: 'combatadmin',
  password: 'Admin123456',
  options: {
    trustServerCertificate: true,
    encrypt: false,
  },
};

async function deleteLastItem() {
  let pool = null;

  try {
    // Conectar
    pool = new sql.ConnectionPool(config);
    await pool.connect();
    console.log('✓ Conectado a COMBATARMS\n');

    const oidUser = 105320;
    const inventorySeqNo = 68194;

    console.log('=== ANTES DE ELIMINAR ===\n');

    // Verificar que existe
    const beforeResult = await pool.request()
      .input('oidUser', sql.Int, oidUser)
      .input('inventorySeqNo', sql.Int, inventorySeqNo)
      .query(`
        SELECT oidUser, InventorySeqNo, ItemNo, ProductID 
        FROM CBT_UserInventory 
        WHERE oidUser = @oidUser AND InventorySeqNo = @inventorySeqNo
      `);

    if (beforeResult.recordset.length > 0) {
      const item = beforeResult.recordset[0];
      console.log('✓ Item ENCONTRADO:');
      console.log(`  - oidUser: ${item.oidUser}`);
      console.log(`  - InventorySeqNo: ${item.InventorySeqNo}`);
      console.log(`  - ItemNo: ${item.ItemNo}`);
      console.log(`  - ProductID: ${item.ProductID}`);
    } else {
      console.log('❌ Item NO ENCONTRADO');
      return;
    }

    // Eliminar
    console.log('\n=== ELIMINANDO ===\n');
    console.log(`Ejecutando: DELETE FROM CBT_UserInventory WHERE oidUser = ${oidUser} AND InventorySeqNo = ${inventorySeqNo}`);

    const deleteResult = await pool.request()
      .input('oidUser', sql.Int, oidUser)
      .input('inventorySeqNo', sql.Int, inventorySeqNo)
      .query(`DELETE FROM CBT_UserInventory WHERE oidUser = @oidUser AND InventorySeqNo = @inventorySeqNo`);

    console.log(`\n✓ Filas eliminadas: ${deleteResult.rowsAffected[0]}`);

    // Verificar que se eliminó
    console.log('\n=== DESPUÉS DE ELIMINAR ===\n');
    const afterResult = await pool.request()
      .input('oidUser', sql.Int, oidUser)
      .input('inventorySeqNo', sql.Int, inventorySeqNo)
      .query(`
        SELECT oidUser, InventorySeqNo, ItemNo, ProductID 
        FROM CBT_UserInventory 
        WHERE oidUser = @oidUser AND InventorySeqNo = @inventorySeqNo
      `);

    if (afterResult.recordset.length === 0) {
      console.log('✅ ¡ÉXITO! El item ha sido eliminado correctamente');
      console.log(`   - Usuario: lizysebas26 (oidUser: ${oidUser})`);
      console.log(`   - InventorySeqNo: ${inventorySeqNo}`);
      console.log(`   - Precio: 178 NX`);
    } else {
      console.log('❌ El item AÚN EXISTE en la base de datos');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    if (pool) await pool.close();
    process.exit(0);
  }
}

deleteLastItem();
