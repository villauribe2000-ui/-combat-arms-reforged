-- INIT ALL WEB TABLES EN combatarms_web
-- Este script crea TODAS las tablas necesarias en combatarms_web

USE combatarms_web;

-- ==========================================
-- 1. TABLA DE CÓDIGOS DE PAGO
-- ==========================================
IF OBJECT_ID('PaymentCodes', 'U') IS NOT NULL
  DROP TABLE PaymentCodes;

CREATE TABLE PaymentCodes (
  id INT PRIMARY KEY IDENTITY(1,1),
  oidUser INT NOT NULL,
  username NVARCHAR(50) NOT NULL,
  NickName NVARCHAR(50),
  paymentCode NVARCHAR(100) UNIQUE NOT NULL,
  nxAmount DECIMAL(10,2) NOT NULL,
  dollarAmount DECIMAL(10,2) NOT NULL,
  status NVARCHAR(20) DEFAULT 'pending', -- pending, approved, rejected
  createdAt DATETIME DEFAULT GETDATE(),
  approvedAt DATETIME NULL,
  approvedBy NVARCHAR(50) NULL,
  rejectedAt DATETIME NULL,
  rejectionReason NVARCHAR(500) NULL
);

CREATE INDEX idx_payment_code_status ON PaymentCodes(status);
CREATE INDEX idx_payment_code_created ON PaymentCodes(createdAt);
CREATE INDEX idx_payment_code_user ON PaymentCodes(username);

-- ==========================================
-- 2. TABLA DE TICKETS DE SOPORTE
-- ==========================================
IF OBJECT_ID('SupportTickets', 'U') IS NOT NULL
  DROP TABLE SupportTickets;

CREATE TABLE SupportTickets (
  id INT PRIMARY KEY IDENTITY(1,1),
  ticketNumber NVARCHAR(20) UNIQUE NOT NULL,
  oidUser INT NOT NULL,
  username NVARCHAR(50) NOT NULL,
  NickName NVARCHAR(50),
  subject NVARCHAR(255) NOT NULL,
  description NVARCHAR(MAX),
  status NVARCHAR(20) DEFAULT 'open', -- open, in-progress, resolved, closed
  priority NVARCHAR(20) DEFAULT 'normal', -- low, normal, high, urgent
  createdAt DATETIME DEFAULT GETDATE(),
  updatedAt DATETIME DEFAULT GETDATE(),
  resolvedAt DATETIME NULL,
  resolvedBy NVARCHAR(50) NULL
);

CREATE INDEX idx_support_user ON SupportTickets(oidUser);
CREATE INDEX idx_support_status ON SupportTickets(status);
CREATE INDEX idx_support_created ON SupportTickets(createdAt);

-- ==========================================
-- 3. TABLA DE MENSAJES DE TICKETS
-- ==========================================
IF OBJECT_ID('TicketMessages', 'U') IS NOT NULL
  DROP TABLE TicketMessages;

CREATE TABLE TicketMessages (
  id INT PRIMARY KEY IDENTITY(1,1),
  ticketId INT NOT NULL,
  senderType NVARCHAR(20) NOT NULL, -- user, admin
  senderUsername NVARCHAR(50) NOT NULL,
  message NVARCHAR(MAX) NOT NULL,
  createdAt DATETIME DEFAULT GETDATE(),
  FOREIGN KEY (ticketId) REFERENCES SupportTickets(id)
);

CREATE INDEX idx_messages_ticket ON TicketMessages(ticketId);
CREATE INDEX idx_messages_created ON TicketMessages(createdAt);

-- ==========================================
-- 4. TABLA DE SOLICITUDES DE REEMBOLSO
-- ==========================================
IF OBJECT_ID('RefundRequests', 'U') IS NOT NULL
  DROP TABLE RefundRequests;

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
  status NVARCHAR(20) DEFAULT 'pending', -- pending, approved, rejected
  reason NVARCHAR(500),
  createdAt DATETIME DEFAULT GETDATE(),
  approvedAt DATETIME NULL,
  approvedBy NVARCHAR(50) NULL,
  rejectedReason NVARCHAR(500) NULL,
  rejectedAt DATETIME NULL,
  rejectedBy NVARCHAR(50) NULL,
  rejectionReason NVARCHAR(500) NULL
);

CREATE INDEX idx_refund_user ON RefundRequests(oidUser);
CREATE INDEX idx_refund_status ON RefundRequests(status);
CREATE INDEX idx_refund_created ON RefundRequests(createdAt);

-- ==========================================
-- VERIFICACIÓN
-- ==========================================
PRINT '✓ Tabla PaymentCodes';
PRINT '✓ Tabla SupportTickets';
PRINT '✓ Tabla TicketMessages';
PRINT '✓ Tabla RefundRequests';
PRINT '';
PRINT 'Todas las tablas creadas exitosamente en combatarms_web';

SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES 
WHERE TABLE_CATALOG='combatarms_web' 
  AND TABLE_NAME IN ('PaymentCodes', 'SupportTickets', 'TicketMessages', 'RefundRequests')
ORDER BY TABLE_NAME;
