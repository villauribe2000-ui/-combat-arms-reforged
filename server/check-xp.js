import { query } from './db.js';
import dotenv from 'dotenv';

dotenv.config();

async function checkXP() {
  try {
    console.log('🔍 Revisando XP en la base de datos...\n');

    // Obtener los primeros 10 usuarios con su XP
    const result = await query(
      `SELECT TOP 10 
         oid,
         strNexonID,
         Exp,
         Kill,
         ChaExp,
         ChaKill
       FROM CBT_User
       ORDER BY oid DESC`
    );

    if (!result.recordset || result.recordset.length === 0) {
      console.log('❌ No se encontraron usuarios');
      return;
    }

    console.log('📊 USUARIOS Y SU XP:\n');
    console.log('┌─────────────────────┬─────────────────┬──────────────────┐');
    console.log('│ Usuario             │ Exp             │ Kill             │');
    console.log('├─────────────────────┼─────────────────┼──────────────────┤');
    
    result.recordset.forEach(user => {
      const username = user.strNexonID.padEnd(20);
      const exp = (user.Exp || 0).toString().padEnd(15);
      const kill = (user.Kill || 0).toString().padEnd(15);
      console.log(`│ ${username}│ ${exp}│ ${kill} │`);
    });
    
    console.log('└─────────────────────┴─────────────────┴──────────────────┘\n');

    // Revisar una cuenta específica
    console.log('\n🔎 Buscando cuentas específicas de prueba:\n');
    
    const testAccounts = ['pruebavip', 'sebasadmin', 'SEBASVIP_', 'testuser'];
    
    for (const account of testAccounts) {
      const resultTest = await query(
        `SELECT 
           oid,
           strNexonID,
           Exp,
           Kill,
           ChaExp,
           ChaKill,
           Level,
           Rank
         FROM CBT_User
         WHERE strNexonID = @username`,
        { username: account }
      );

      if (resultTest.recordset && resultTest.recordset.length > 0) {
        const user = resultTest.recordset[0];
        console.log(`✓ ${user.strNexonID}:`);
        console.log(`  - Exp: ${user.Exp || 0}`);
        console.log(`  - Kill: ${user.Kill || 0}`);
        console.log(`  - Level: ${user.Level || 0}`);
        console.log(`  - Rank: ${user.Rank || 0}`);
        console.log('');
      }
    }

    // Verificar la estructura de la tabla
    console.log('\n📋 ESTRUCTURA DE LA TABLA CBT_User:\n');
    const schemaResult = await query(
      `SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE
       FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_NAME = 'CBT_User'
       ORDER BY ORDINAL_POSITION`
    );

    if (schemaResult.recordset) {
      schemaResult.recordset.forEach(col => {
        console.log(`  ${col.COLUMN_NAME}: ${col.DATA_TYPE} ${col.IS_NULLABLE === 'YES' ? '(nullable)' : '(not null)'}`);
      });
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    process.exit(0);
  }
}

checkXP();
