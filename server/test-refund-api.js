// Test del endpoint /api/refund/pending

const API_URL = process.env.API_URL || 'https://web-production-86a0.up.railway.app';

async function testRefundAPI() {
  console.log('🧪 Testeando endpoint /api/refund/pending\n');
  console.log(`🌐 URL: ${API_URL}/api/refund/pending\n`);

  try {
    console.log('📡 Haciendo request...');
    const response = await fetch(`${API_URL}/api/refund/pending`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    console.log(`✓ Status: ${response.status} ${response.statusText}\n`);

    const data = await response.json();

    if (!Array.isArray(data)) {
      console.error('❌ ERROR: La respuesta no es un array');
      console.error('Respuesta:', data);
      process.exit(1);
    }

    console.log(`✓ Reembolsos pendientes encontrados: ${data.length}\n`);

    if (data.length === 0) {
      console.log('⚠️ No hay reembolsos pendientes');
    } else {
      data.forEach((refund, idx) => {
        console.log(`Reembolso #${idx + 1}:`);
        console.log(`  - ID: ${refund.id}`);
        console.log(`  - Usuario: ${refund.username}`);
        console.log(`  - Producto: ${refund.productName}`);
        console.log(`  - NX a devolver: ${refund.nxToRefund}`);
        console.log(`  - Estado: ${refund.status}`);
        console.log(`  - Creado: ${refund.createdAt}`);
        console.log('');
      });
    }

    console.log('✅ Test completado exitosamente\n');

  } catch (error) {
    console.error('❌ Error en el request:', error.message);
    process.exit(1);
  }
}

testRefundAPI()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
