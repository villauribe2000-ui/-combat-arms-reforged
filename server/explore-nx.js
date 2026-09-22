import 'dotenv/config';
import { query } from './db.js';

async function exploreNX() {
  try {
    console.log('🔍 Explorando tablas de NX...\n');

    // Explorar CBT_NXGradeCurrentNo
    console.log('📋 Estructura de CBT_NXGradeCurrentNo:');
    const nxGradeColumns = await query(`
      SELECT COLUMN_NAME, DATA_TYPE
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = 'CBT_NXGradeCurrentNo'
      ORDER BY ORDINAL_POSITION
    `);
    nxGradeColumns.recordset.forEach(col => {
      console.log(`  ${col.COLUMN_NAME} (${col.DATA_TYPE})`);
    });

    // Ver datos
    console.log('\n📊 Datos de CBT_NXGradeCurrentNo (primeros 3):');
    const nxGradeData = await query(`
      SELECT TOP 3 * FROM CBT_NXGradeCurrentNo
    `);
    if (nxGradeData.recordset.length > 0) {
      nxGradeData.recordset.forEach((row, i) => {
        console.log(`\n  Fila ${i + 1}:`);
        Object.keys(row).forEach(key => {
          console.log(`    ${key}: ${row[key]}`);
        });
      });
    }

    // Explorar CBT_NXSale_Unlock
    console.log('\n\n📋 Estructura de CBT_NXSale_Unlock:');
    const nxUnlockColumns = await query(`
      SELECT COLUMN_NAME, DATA_TYPE
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = 'CBT_NXSale_Unlock'
      ORDER BY ORDINAL_POSITION
    `);
    nxUnlockColumns.recordset.forEach(col => {
      console.log(`  ${col.COLUMN_NAME} (${col.DATA_TYPE})`);
    });

    // Ver datos
    console.log('\n📊 Datos de CBT_NXSale_Unlock (primeros 3):');
    const nxUnlockData = await query(`
      SELECT TOP 3 * FROM CBT_NXSale_Unlock
    `);
    if (nxUnlockData.recordset.length > 0) {
      nxUnlockData.recordset.forEach((row, i) => {
        console.log(`\n  Fila ${i + 1}:`);
        Object.keys(row).forEach(key => {
          console.log(`    ${key}: ${row[key]}`);
        });
      });
    }

    // Buscar si existe relación con usuario
    console.log('\n\n🔍 Buscando si existe tabla con NX por usuario...');
    const userNXResult = await query(`
      SELECT TABLE_NAME
      FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_SCHEMA = 'dbo'
      AND TABLE_NAME LIKE '%NX%'
      ORDER BY TABLE_NAME
    `);

    console.log('📊 Todas las tablas con NX:');
    userNXResult.recordset.forEach(table => {
      console.log(`  - ${table.TABLE_NAME}`);
    });

    console.log('\n✅ Exploración completada');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

exploreNX();
