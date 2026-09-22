import 'dotenv/config';
import { query } from './db.js';

async function checkDBStructure() {
  try {
    console.log('\n=== VERIFICANDO ESTRUCTURA DE CBT_User ===\n');
    
    // Obtener todas las columnas
    const columnsResult = await query(`
      SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'CBT_User'
      ORDER BY ORDINAL_POSITION
    `);

    console.log('Columnas en CBT_User:');
    columnsResult.recordset.forEach((col, idx) => {
      console.log(`${idx + 1}. ${col.COLUMN_NAME} (${col.DATA_TYPE}) - Nullable: ${col.IS_NULLABLE}`);
    });

    // Obtener datos de un usuario de ejemplo
    console.log('\n=== DATOS DE EJEMPLO DE UN USUARIO ===\n');
    
    const userResult = await query(`
      SELECT TOP 1 * FROM CBT_User
      WHERE strNexonID IS NOT NULL
      ORDER BY strNexonID
    `);

    if (userResult.recordset.length > 0) {
      const user = userResult.recordset[0];
      console.log('Usuario:', user.strNexonID || user.NickName);
      console.log('\nCampos y valores:');
      Object.entries(user).forEach(([key, value]) => {
        console.log(`  ${key}: ${value}`);
      });
    } else {
      console.log('No hay usuarios en la BD');
    }

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkDBStructure();
