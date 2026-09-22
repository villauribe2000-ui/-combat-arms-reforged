-- Crear tabla de solicitudes de pago
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'PaymentRequests')
BEGIN
  CREATE TABLE PaymentRequests (
    id INT IDENTITY(1,1) PRIMARY KEY,
    oidUser INT NOT NULL,
    username NVARCHAR(255) NOT NULL,
    NickName NVARCHAR(255) NOT NULL,
    nxAmount INT NOT NULL,
    dollarAmount DECIMAL(10,2) NOT NULL,
    status NVARCHAR(50) DEFAULT 'pending', -- pending, approved, rejected
    createdAt DATETIME DEFAULT GETUTCDATE(),
    approvedAt DATETIME NULL,
    approvedBy NVARCHAR(255) NULL,
    rejectedReason NVARCHAR(500) NULL,
    FOREIGN KEY (oidUser) REFERENCES CBT_User(oidUser)
  );
  PRINT 'Tabla PaymentRequests creada exitosamente';
END;

-- Crear índices
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_payment_status' AND object_id = OBJECT_ID('PaymentRequests'))
BEGIN
  CREATE INDEX idx_payment_status ON PaymentRequests(status, createdAt DESC);
END;

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_payment_user' AND object_id = OBJECT_ID('PaymentRequests'))
BEGIN
  CREATE INDEX idx_payment_user ON PaymentRequests(oidUser);
END;
