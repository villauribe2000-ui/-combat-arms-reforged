-- Crear tabla RefundRequests en combatarms_web
-- Ejecutar esto en la BD combatarms_web

USE combatarms_web;

-- Verificar si la tabla ya existe y eliminarla
IF OBJECT_ID('RefundRequests', 'U') IS NOT NULL
  DROP TABLE RefundRequests;

-- Crear tabla
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

-- Crear índices
CREATE INDEX idx_refund_user ON RefundRequests(oidUser);
CREATE INDEX idx_refund_status ON RefundRequests(status);
CREATE INDEX idx_refund_created ON RefundRequests(createdAt);

-- Verificar
SELECT 'Tabla RefundRequests creada exitosamente en combatarms_web' as resultado;
SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'RefundRequests';
