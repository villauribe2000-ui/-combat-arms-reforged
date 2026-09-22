-- Crear tabla RefundRequests en COMBATARMS
CREATE TABLE RefundRequests (
  id INT PRIMARY KEY IDENTITY(1,1),
  oidUser INT NOT NULL,
  username NVARCHAR(50) NOT NULL,
  NickName NVARCHAR(50),
  productId INT,
  productName NVARCHAR(255),
  purchaseLogId INT, -- SRL de VISMS_PurchaseLog
  inventorySeqNo INT, -- Para eliminar el item
  itemNo INT,
  nxPaid DECIMAL(10,2), -- NX que pagó el usuario
  nxCommission DECIMAL(10,2), -- 10% de comisión
  nxToRefund DECIMAL(10,2), -- NX a devolver (nxPaid - comisión)
  status NVARCHAR(20) DEFAULT 'pending', -- pending, approved, rejected
  reason NVARCHAR(500), -- Razón de rechazo
  createdAt DATETIME DEFAULT GETDATE(),
  approvedAt DATETIME NULL,
  approvedBy NVARCHAR(50) NULL,
  rejectedReason NVARCHAR(500) NULL,
  rejectedAt DATETIME NULL,
  rejectedBy NVARCHAR(50) NULL
);

-- Crear índices para búsqueda rápida
CREATE INDEX idx_refund_user ON RefundRequests(oidUser);
CREATE INDEX idx_refund_status ON RefundRequests(status);
CREATE INDEX idx_refund_created ON RefundRequests(createdAt);

-- Verificar que se creó
SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'RefundRequests';
