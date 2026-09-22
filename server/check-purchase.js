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

const configVisms = {
  server: '94.72.114.174',
  database: 'VISMS',
  user: 'combatadmin',
  password: 'Admin123456',
  options: {
    trustServerCertificate: true,
    encrypt: false,
  },
};

async function checkLastPurchase() {
  let pool = null;
  let poolVisms = null;

  try {
    // Conectar a COMBATARMS
    pool = new sql.ConnectionPool(config);
    await pool.connect();
    console.log('✓ Conectado a COMBATARMS');

    // Conectar a VISMS
    poolVisms = new sql.ConnectionPool(configVisms);
    await poolVisms.connect();
    console.log('✓ Conectado a VISMS');

    // Obtener últimas compras
    console.log('\n=== Últimas compras en el sistema ===\n');
    
    const result = await poolVisms.request()
      .query(`SELECT TOP 5 SRL, oid, ProductNo, TotalPrice, RegDate FROM VISMS_PurchaseLog ORDER BY SRL DESC`);

    if (result.recordset.length === 0) {
      console.log('❌ No hay compras registradas');
      return;
    }

    result.recordset.forEach((purchase, index) => {
      console.log(`${index + 1}. SRL: ${purchase.SRL} | oidUser: ${purchase.oid} | ProductNo: ${purchase.ProductNo} | ${purchase.TotalPrice} NX | ${purchase.RegDate}`);
    });

    const lastPurchase = result.recordset[0];
    console.log(`\n✓ ÚLTIMO ITEM:`);
    console.log(`  - SRL (ID compra): ${lastPurchase.SRL}`);
    console.log(`  - oidUser: ${lastPurchase.oid}`);
    console.log(`  - ProductNo: ${lastPurchase.ProductNo}`);
    console.log(`  - Precio: ${lastPurchase.TotalPrice} NX`);
    console.log(`  - Fecha: ${lastPurchase.RegDate}`);

    // Obtener usuario
    console.log('\n=== Buscando usuario ===\n');
    const userResult = await pool.request()
      .input('oidUser', sql.Int, lastPurchase.oid)
      .query(`SELECT oidUser, strNexonID FROM CBT_User WHERE oidUser = @oidUser`);

    if (userResult.recordset.length > 0) {
      const user = userResult.recordset[0];
      console.log(`✓ Usuario encontrado:`);
      console.log(`  - Username: ${user.strNexonID}`);
    }

    // Obtener ProductID directamente del inventario
    console.log('\n=== Buscando item en inventario ===\n');
    const inventoryResult = await pool.request()
      .input('oidUser', sql.Int, lastPurchase.oid)
      .query(`
        SELECT TOP 1 oidUser, InventorySeqNo, ItemNo, ProductID, StartDate, EndDate 
        FROM CBT_UserInventory 
        WHERE oidUser = @oidUser
        ORDER BY InventorySeqNo DESC
      `);

    if (inventoryResult.recordset.length > 0) {
      const item = inventoryResult.recordset[0];
      console.log(`✓ Item encontrado en inventario:`);
      console.log(`  - InventorySeqNo: ${item.InventorySeqNo}`);
      console.log(`  - ItemNo: ${item.ItemNo}`);
      console.log(`  - ProductID: ${item.ProductID}`);
      console.log(`  - StartDate: ${item.StartDate}`);
      console.log(`  - EndDate: ${item.EndDate}`);
      console.log(`\n✅ Listo para eliminar con InventorySeqNo: ${item.InventorySeqNo}`);
    } else {
      console.log(`❌ Item NO ENCONTRADO en inventario`);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    if (pool) await pool.close();
    if (poolVisms) await poolVisms.close();
    process.exit(0);
  }
}

checkLastPurchase();
