import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Cargar .env explícitamente
dotenv.config({ path: path.join(__dirname, '.env') });

// Verificar que las variables se cargaron
console.log('✓ Variables cargadas:');
console.log(`  DB_SERVER: ${process.env.DB_SERVER}`);
console.log(`  DB_NAME: ${process.env.DB_NAME}`);
console.log(`  DB_USER: ${process.env.DB_USER}`);

// Ahora importar db
import { query } from './db.js';

async function checkLastPurchase() {
  try {
    console.log('\n=== Buscando últimas compras ===\n');

    // Obtener últimas 10 compras
    const result = await query(
      `SELECT TOP 10 
        SRL, oid, ProductNo, TotalPrice, RegDate,
        CASE WHEN oid IN (SELECT oidUser FROM CBT_User LIMIT 1) THEN 'ACTIVO' ELSE 'OK' END as Status
       FROM VISMS_PurchaseLog
       ORDER BY SRL DESC`
    );

    if (result.recordset.length === 0) {
      console.log('❌ No hay compras registradas');
      return;
    }

    console.log('✓ Últimas 10 compras encontradas:\n');
    
    result.recordset.forEach((purchase, index) => {
      console.log(`${index + 1}. SRL: ${purchase.SRL}`);
      console.log(`   oidUser: ${purchase.oid}`);
      console.log(`   ProductNo: ${purchase.ProductNo}`);
      console.log(`   Precio: ${purchase.TotalPrice} NX`);
      console.log(`   Fecha: ${purchase.RegDate}`);
      console.log('');
    });

    console.log('✓ El último item es SRL:', result.recordset[0].SRL);
    console.log('✓ oidUser:', result.recordset[0].oid);
    console.log('✓ ProductNo:', result.recordset[0].ProductNo);
    console.log('✓ Precio:', result.recordset[0].TotalPrice, 'NX');

  } catch (error) {
    console.error('❌ Error:', error.message);
  }

  process.exit(0);
}

checkLastPurchase();
