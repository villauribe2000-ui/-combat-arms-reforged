import 'dotenv/config';
import { query } from './db.js';

async function exploreDatabase() {
  try {
    console.log('🔍 Explorando estructura de CBT_User...\n');

    // Obtener información de columnas de CBT_User
    const columnsResult = await query(`
      SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = 'CBT_User'
      ORDER BY ORDINAL_POSITION
    `);

    console.log('📋 Columnas en CBT_User:');
    console.log('=====================================');
    columnsResult.recordset.forEach(col => {
      console.log(`  ${col.COLUMN_NAME} (${col.DATA_TYPE}) ${col.IS_NULLABLE === 'YES' ? '[NULL]' : '[NOT NULL]'}`);
    });

    console.log('\n🔍 Explorando valores de un usuario para ver qué puede ser NX...\n');

    // Obtener datos de un usuario con más detalles
    const userResult = await query(`
      SELECT TOP 1 * FROM CBT_User WHERE DeleteDate IS NULL
    `);

    if (userResult.recordset.length > 0) {
      const user = userResult.recordset[0];
      console.log('📊 Datos de usuario de ejemplo:');
      console.log('=====================================');
      Object.keys(user).forEach(key => {
        console.log(`  ${key}: ${user[key]}`);
      });
    }

    console.log('\n🔍 Buscando tablas relacionadas con dinero/NX...\n');

    // Buscar tablas que contengan "Money", "Cash", "NX", etc.
    const tablesResult = await query(`
      SELECT TABLE_NAME
      FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_SCHEMA = 'dbo'
      AND (TABLE_NAME LIKE '%Money%' OR TABLE_NAME LIKE '%Cash%' OR TABLE_NAME LIKE '%NX%' OR TABLE_NAME LIKE '%Coin%')
    `);

    if (tablesResult.recordset.length > 0) {
      console.log('💰 Tablas relacionadas con dinero encontradas:');
      tablesResult.recordset.forEach(table => {
        console.log(`  - ${table.TABLE_NAME}`);
      });
    } else {
      console.log('  No se encontraron tablas específicas de dinero');
    }

    console.log('\n🔍 Buscando columnas con nombres similares a NX/Cash/Money...\n');

    // Buscar columnas en cualquier tabla que tengan nombres similares
    const fieldsResult = await query(`
      SELECT TABLE_NAME, COLUMN_NAME, DATA_TYPE
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE COLUMN_NAME LIKE '%Cash%' 
         OR COLUMN_NAME LIKE '%NX%'
         OR COLUMN_NAME LIKE '%Money%'
         OR COLUMN_NAME LIKE '%Coin%'
      ORDER BY TABLE_NAME, COLUMN_NAME
    `);

    if (fieldsResult.recordset.length > 0) {
      console.log('🎯 Campos relacionados con dinero:');
      fieldsResult.recordset.forEach(field => {
        console.log(`  ${field.TABLE_NAME}.${field.COLUMN_NAME} (${field.DATA_TYPE})`);
      });
    }

    console.log('\n✅ Exploración completada');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

exploreDatabase();
