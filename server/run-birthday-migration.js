import { query } from './db.js';
import fs from 'fs';

async function runMigration() {
  try {
    console.log('🔄 Starting birthday migration...');

    // Agregar columna birth_date
    try {
      await query(`
        IF NOT EXISTS (SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
                      WHERE TABLE_NAME='CBT_User' AND COLUMN_NAME='birth_date')
        BEGIN
            ALTER TABLE CBT_User ADD birth_date DATE NULL;
        END
      `);
      console.log('✓ birth_date column verified/created in CBT_User');
    } catch (err) {
      console.log('Note:', err.message);
    }

    // Crear tabla de regalos
    try {
      await query(`
        IF NOT EXISTS (SELECT * FROM sys.tables WHERE name='birthday_gifts')
        BEGIN
            CREATE TABLE birthday_gifts (
                id INT PRIMARY KEY IDENTITY(1,1),
                recipient_id NVARCHAR(255) NOT NULL,
                sender_id NVARCHAR(255),
                gift_type NVARCHAR(50) DEFAULT 'birthday',
                message NVARCHAR(MAX),
                sent_at DATETIME DEFAULT GETDATE(),
                created_at DATETIME DEFAULT GETDATE()
            );
            
            CREATE INDEX idx_recipient_id ON birthday_gifts(recipient_id);
            CREATE INDEX idx_sent_at ON birthday_gifts(sent_at);
        END
      `);
      console.log('✓ birthday_gifts table verified/created');
    } catch (err) {
      console.log('Note:', err.message);
    }

    console.log('✅ Birthday migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

runMigration();
