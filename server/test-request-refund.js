import 'dotenv/config';
import { query } from './db.js';

const testData = {
  oidUser: 105320,
  username: 'lizysebas26',
  NickName: 'lizysebas26',
  productId: 24112,
  productName: 'Kriss Orthus_MP61',
  purchaseLogId: 26617,
  nxPaid: 750,
};

async function testRequestRefund() {
  try {
    console.log('=== TEST: Crear solicitud de reembolso ===\n');
    console.log('Datos:', testData);
    console.log('\n');

    // Calcular comisión (10%) y NX a devolver
    const nxCommission = Math.round(testData.nxPaid * 0.1); // 10%
    const nxToRefund = testData.nxPaid - nxCommission;

    console.log(`NX Pagado: ${testData.nxPaid}`);
    console.log(`Comisión (10%): ${nxCommission}`);
    console.log(`A Devolver: ${nxToRefund}\n`);

    // Insertar solicitud de reembolso
    const result = await query(
      `INSERT INTO RefundRequests 
       (oidUser, username, NickName, productId, productName, purchaseLogId, nxPaid, nxCommission, nxToRefund, status)
       OUTPUT INSERTED.id, INSERTED.createdAt
       VALUES (@oidUser, @username, @NickName, @productId, @productName, @purchaseLogId, @nxPaid, @nxCommission, @nxToRefund, 'pending')`,
      { 
        oidUser: testData.oidUser, 
        username: testData.username, 
        NickName: testData.NickName, 
        productId: testData.productId, 
        productName: testData.productName, 
        purchaseLogId: testData.purchaseLogId, 
        nxPaid: testData.nxPaid, 
        nxCommission: nxCommission, 
        nxToRefund: nxToRefund 
      }
    );

    if (result.recordset.length > 0) {
      const refund = result.recordset[0];
      console.log('✅ Solicitud creada exitosamente:');
      console.log(`   ID: ${refund.id}`);
      console.log(`   Fecha: ${new Date(refund.createdAt).toLocaleString('es')}\n`);

      // Verificar que se guardó
      console.log('Verificando que se guardó en BD...');
      const checkResult = await query(
        `SELECT id, oidUser, username, productName, nxPaid, nxCommission, nxToRefund, status, createdAt
         FROM RefundRequests WHERE id = @refundId`,
        { refundId: refund.id }
      );

      if (checkResult.recordset.length > 0) {
        const saved = checkResult.recordset[0];
        console.log('✅ Verificado en BD:');
        console.log(`   ID: ${saved.id}`);
        console.log(`   Usuario: ${saved.username}`);
        console.log(`   Producto: ${saved.productName}`);
        console.log(`   NX Pagado: ${saved.nxPaid}`);
        console.log(`   Comisión: ${saved.nxCommission}`);
        console.log(`   A Devolver: ${saved.nxToRefund}`);
        console.log(`   Estado: ${saved.status}`);
      }
    } else {
      console.log('❌ No se insertó nada');
    }

  } catch (error) {
    console.error('❌ ERROR:', error.message);
    console.error(error);
  }
}

testRequestRefund();
