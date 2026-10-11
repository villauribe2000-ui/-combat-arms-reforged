import { queryWeb } from './db.js';

async function initializeTables() {
  console.log('🚀 Inicializando tablas en combatarms_web...\n');

  try {
    console.log('[INIT] Comenzando inicialización...');
    // 1. PaymentCodes
    console.log('1️⃣ Creando tabla PaymentCodes...');
    await queryWeb(`
      IF OBJECT_ID('PaymentCodes', 'U') IS NULL
      BEGIN
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
        CREATE INDEX idx_payment_code_status ON PaymentCodes(status);
        CREATE INDEX idx_payment_code_created ON PaymentCodes(createdAt);
        CREATE INDEX idx_payment_code_user ON PaymentCodes(username);
      END
    `);
    console.log('   ✓ PaymentCodes lista');
    console.log('[INIT] PaymentCodes creada o ya existe\n');

    // 2. SupportTickets
    console.log('2️⃣ Creando tabla SupportTickets...');
    await queryWeb(`
      IF OBJECT_ID('SupportTickets', 'U') IS NULL
      BEGIN
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
        CREATE INDEX idx_support_user ON SupportTickets(oidUser);
        CREATE INDEX idx_support_status ON SupportTickets(status);
        CREATE INDEX idx_support_created ON SupportTickets(createdAt);
      END
    `);
    console.log('   ✓ SupportTickets lista\n');

    // 3. TicketMessages
    console.log('3️⃣ Creando tabla TicketMessages...');
    await queryWeb(`
      IF OBJECT_ID('TicketMessages', 'U') IS NULL
      BEGIN
        CREATE TABLE TicketMessages (
          id INT PRIMARY KEY IDENTITY(1,1),
          ticketId INT NOT NULL,
          senderType NVARCHAR(20) NOT NULL,
          senderUsername NVARCHAR(50) NOT NULL,
          message NVARCHAR(MAX) NOT NULL,
          createdAt DATETIME DEFAULT GETDATE(),
          FOREIGN KEY (ticketId) REFERENCES SupportTickets(id)
        );
        CREATE INDEX idx_messages_ticket ON TicketMessages(ticketId);
        CREATE INDEX idx_messages_created ON TicketMessages(createdAt);
      END
    `);
    console.log('   ✓ TicketMessages lista\n');

    // 4. RefundRequests
    console.log('4️⃣ Creando tabla RefundRequests...');
    await queryWeb(`
      IF OBJECT_ID('RefundRequests', 'U') IS NULL
      BEGIN
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
        CREATE INDEX idx_refund_user ON RefundRequests(oidUser);
        CREATE INDEX idx_refund_status ON RefundRequests(status);
        CREATE INDEX idx_refund_created ON RefundRequests(createdAt);
      END
    `);
    console.log('   ✓ RefundRequests lista\n');

    // 5. ClaimedLevelRewards
    console.log('5️⃣ Creando tabla ClaimedLevelRewards...');
    await queryWeb(`
      IF OBJECT_ID('ClaimedLevelRewards', 'U') IS NULL
      BEGIN
        CREATE TABLE ClaimedLevelRewards (
          id INT PRIMARY KEY IDENTITY(1,1),
          oidUser INT NOT NULL,
          username NVARCHAR(50) NOT NULL,
          level INT NOT NULL,
          nxAmount DECIMAL(10,2) NOT NULL,
          claimedAt DATETIME DEFAULT GETDATE(),
          UNIQUE(oidUser, level)
        );
        CREATE INDEX idx_claimed_rewards_username ON ClaimedLevelRewards(username);
        CREATE INDEX idx_claimed_rewards_level ON ClaimedLevelRewards(level);
        CREATE INDEX idx_claimed_rewards_user ON ClaimedLevelRewards(oidUser);
      END
    `);
    console.log('   ✓ ClaimedLevelRewards lista\n');

    console.log('✅ Todas las tablas inicializadas exitosamente en combatarms_web\n');

  } catch (error) {
    console.error('❌ Error durante la inicialización:', error.message);
    process.exit(1);
  }
}

// Ejecutar siempre
console.log('[INIT] Ejecutando inicializador de BD...');
initializeTables()
  .then(() => {
    console.log('[INIT] ✅ Inicialización completada');
    process.exit(0);
  })
  .catch(err => {
    console.error('[INIT] ❌ Error fatal:', err.message);
    process.exit(1);
  });

export { initializeTables };
