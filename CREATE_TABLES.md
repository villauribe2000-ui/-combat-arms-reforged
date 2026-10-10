# Crear Tablas en combatarms_web

## Opción 1: Ejecutar script Node.js (RECOMENDADO)

```bash
cd server
node init-db.js
```

Este script crea automáticamente todas las tablas necesarias en `combatarms_web`:
- PaymentCodes
- SupportTickets  
- TicketMessages
- RefundRequests

## Opción 2: Ejecutar SQL manualmente en SQL Server Management Studio

Conecta a `94.72.114.174:1433` con usuario `combatadmin` / `Admin123456`

Selecciona la BD `combatarms_web` y copia este SQL:

```sql
USE combatarms_web;

-- 1. PaymentCodes
IF OBJECT_ID('PaymentCodes', 'U') IS NULL
CREATE TABLE PaymentCodes (
  id INT PRIMARY KEY IDENTITY(1,1),
  oidUser INT NOT NULL,
  username NVARCHAR(50) NOT NULL,
  NickName NVARCHAR(50),
  paymentCode NVARCHAR(100) UNIQUE NOT NULL,
  nxAmount DECIMAL(10,2) NOT NULL,
  dollarAmount DECIMAL(10,2) NOT NULL,
  status NVARCHAR(20) DEFAULT 'pending',
  createdAt DATETIME DEFAULT GETDATE(),
  approvedAt DATETIME NULL,
  approvedBy NVARCHAR(50) NULL,
  rejectedAt DATETIME NULL,
  rejectionReason NVARCHAR(500) NULL
);

-- 2. SupportTickets
IF OBJECT_ID('SupportTickets', 'U') IS NULL
CREATE TABLE SupportTickets (
  id INT PRIMARY KEY IDENTITY(1,1),
  ticketNumber NVARCHAR(20) UNIQUE NOT NULL,
  oidUser INT NOT NULL,
  username NVARCHAR(50) NOT NULL,
  NickName NVARCHAR(50),
  subject NVARCHAR(255) NOT NULL,
  description NVARCHAR(MAX),
  status NVARCHAR(20) DEFAULT 'open',
  priority NVARCHAR(20) DEFAULT 'normal',
  createdAt DATETIME DEFAULT GETDATE(),
  updatedAt DATETIME DEFAULT GETDATE(),
  resolvedAt DATETIME NULL,
  resolvedBy NVARCHAR(50) NULL
);

-- 3. TicketMessages
IF OBJECT_ID('TicketMessages', 'U') IS NULL
CREATE TABLE TicketMessages (
  id INT PRIMARY KEY IDENTITY(1,1),
  ticketId INT NOT NULL,
  senderType NVARCHAR(20) NOT NULL,
  senderUsername NVARCHAR(50) NOT NULL,
  message NVARCHAR(MAX) NOT NULL,
  createdAt DATETIME DEFAULT GETDATE(),
  FOREIGN KEY (ticketId) REFERENCES SupportTickets(id)
);

-- 4. RefundRequests
IF OBJECT_ID('RefundRequests', 'U') IS NULL
CREATE TABLE RefundRequests (
  id INT PRIMARY KEY IDENTITY(1,1),
  oidUser INT NOT NULL,
  username NVARCHAR(50) NOT NULL,
  NickName NVARCHAR(50),
  productId INT,
  productName NVARCHAR(255),
  purchaseLogId INT,
  inventorySeqNo INT,
  itemNo INT,
  nxPaid DECIMAL(10,2),
  nxCommission DECIMAL(10,2),
  nxToRefund DECIMAL(10,2),
  status NVARCHAR(20) DEFAULT 'pending',
  reason NVARCHAR(500),
  createdAt DATETIME DEFAULT GETDATE(),
  approvedAt DATETIME NULL,
  approvedBy NVARCHAR(50) NULL,
  rejectedReason NVARCHAR(500) NULL,
  rejectedAt DATETIME NULL,
  rejectedBy NVARCHAR(50) NULL,
  rejectionReason NVARCHAR(500) NULL
);

-- Crear índices
CREATE INDEX idx_payment_code_status ON PaymentCodes(status);
CREATE INDEX idx_support_status ON SupportTickets(status);
CREATE INDEX idx_messages_ticket ON TicketMessages(ticketId);
CREATE INDEX idx_refund_status ON RefundRequests(status);

PRINT '✓ Todas las tablas creadas exitosamente';
```

## Verificar que las tablas existen

```sql
SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES 
WHERE TABLE_CATALOG='combatarms_web' 
  AND TABLE_NAME IN ('PaymentCodes', 'SupportTickets', 'TicketMessages', 'RefundRequests')
ORDER BY TABLE_NAME;
```

Debería devolver 4 tablas.
