import { queryWeb } from './db.js';

async function insertTestRefund() {
  console.log('🧪 Insertando reembolso de prueba en combatarms_web...\n');

  try {
    // Verificar que la tabla existe
    const tableCheck = await queryWeb(`
      SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_NAME = 'RefundRequests'
    `);

    if (tableCheck.recordset.length === 0) {
      console.error('❌ ERROR: Tabla RefundRequests no existe en combatarms_web');
      process.exit(1);
    }

    console.log('✓ Tabla RefundRequests existe\n');

    // Insertar reembolso de prueba
    console.log('📝 Insertando reembolso de prueba...');
    await queryWeb(`
      INSERT INTO RefundRequests (
        oidUser, 
        username, 
        NickName, 
        productName, 
        nxPaid, 
        nxCommission, 
        nxToRefund, 
        status
      ) 
      VALUES (
        100001,
        'testuser',
        'TestUser',
        'Skin Dragon Fire',
        5000,
        500,
        4500,
        'pending'
      )
    `);

    console.log('✓ Reembolso de prueba insertado\n');

    // Ver los reembolsos pendientes
    console.log('📊 Reembolsos pendientes en BD:');
    const result = await queryWeb(`
      SELECT id, username, NickName, productName, nxPaid, nxCommission, nxToRefund, status, createdAt
      FROM RefundRequests 
      WHERE status = 'pending'
      ORDER BY createdAt DESC
    `);

    if (result.recordset.length === 0) {
      console.log('   (Sin reembolsos pendientes)');
    } else {
      result.recordset.forEach((refund, idx) => {
        console.log(`\n   Reembolso #${refund.id}:`);
        console.log(`   - Usuario: ${refund.username} (${refund.NickName})`);
        console.log(`   - Producto: ${refund.productName}`);
        console.log(`   - NX a devolver: ${refund.nxToRefund}`);
        console.log(`   - Estado: ${refund.status}`);
        console.log(`   - Creado: ${refund.createdAt}`);
      });
    }

    console.log('\n✅ Test completado\n');
    console.log('Ahora abre el panel de admin en http://web-production-86a0.up.railway.app');
    console.log('Ve a la pestaña "↩️ Reembolsos" para ver el reembolso de prueba');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

insertTestRefund()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
