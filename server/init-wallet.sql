-- Crear tabla de billetera (Gcoin balance)
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'CBT_UserWallet')
BEGIN
  CREATE TABLE CBT_UserWallet (
    oidUser INT PRIMARY KEY,
    gcoin INT DEFAULT 0,
    lastUpdated DATETIME DEFAULT GETUTCDATE(),
    FOREIGN KEY (oidUser) REFERENCES CBT_User(oidUser)
  );
  PRINT 'Tabla CBT_UserWallet creada exitosamente';
END;

-- Crear tabla de transacciones
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'CBT_UserTransactions')
BEGIN
  CREATE TABLE CBT_UserTransactions (
    oidTransaction INT IDENTITY(1,1) PRIMARY KEY,
    oidUser INT NOT NULL,
    transactionType VARCHAR(50), -- 'paypal_purchase', 'store_purchase', 'reward', 'refund'
    amount INT,
    gcoinAmount INT,
    description VARCHAR(255),
    paypalOrderId VARCHAR(255),
    status VARCHAR(50) DEFAULT 'completed', -- 'pending', 'completed', 'failed'
    createdAt DATETIME DEFAULT GETUTCDATE(),
    FOREIGN KEY (oidUser) REFERENCES CBT_User(oidUser)
  );
  PRINT 'Tabla CBT_UserTransactions creada exitosamente';
END;

-- Crear índices para mejor rendimiento
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_user_transactions' AND object_id = OBJECT_ID('CBT_UserTransactions'))
BEGIN
  CREATE INDEX idx_user_transactions ON CBT_UserTransactions(oidUser, createdAt DESC);
END;
