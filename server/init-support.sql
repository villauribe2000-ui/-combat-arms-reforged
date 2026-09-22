-- Crear tabla de Tickets de Soporte
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
  refundId INT NULL, -- Relacionado con reembolso
  createdAt DATETIME DEFAULT GETDATE(),
  updatedAt DATETIME DEFAULT GETDATE(),
  resolvedAt DATETIME NULL,
  resolvedBy NVARCHAR(50) NULL
);

-- Crear tabla de Mensajes de Soporte
CREATE TABLE SupportMessages (
  id INT PRIMARY KEY IDENTITY(1,1),
  ticketId INT NOT NULL,
  senderType NVARCHAR(20) NOT NULL, -- user, admin
  senderUsername NVARCHAR(50) NOT NULL,
  message NVARCHAR(MAX) NOT NULL,
  createdAt DATETIME DEFAULT GETDATE(),
  FOREIGN KEY (ticketId) REFERENCES SupportTickets(id)
);

-- Crear índices
CREATE INDEX idx_support_user ON SupportTickets(oidUser);
CREATE INDEX idx_support_status ON SupportTickets(status);
CREATE INDEX idx_support_refund ON SupportTickets(refundId);
CREATE INDEX idx_messages_ticket ON SupportMessages(ticketId);
CREATE INDEX idx_messages_created ON SupportMessages(createdAt);

-- Verificar que se crearon
SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME IN ('SupportTickets', 'SupportMessages');
