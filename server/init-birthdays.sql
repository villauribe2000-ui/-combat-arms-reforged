-- Agregar columna birth_date a la tabla CBT_User si no existe
IF NOT EXISTS (SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
              WHERE TABLE_NAME='CBT_User' AND COLUMN_NAME='birth_date')
BEGIN
    ALTER TABLE CBT_User ADD birth_date DATE NULL;
    PRINT 'Columna birth_date agregada a CBT_User';
END
ELSE
BEGIN
    PRINT 'Columna birth_date ya existe en CBT_User';
END
GO

-- Crear tabla de regalos de cumpleaños si no existe
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
    PRINT 'Tabla birthday_gifts creada';
END
ELSE
BEGIN
    PRINT 'Tabla birthday_gifts ya existe';
END
GO
