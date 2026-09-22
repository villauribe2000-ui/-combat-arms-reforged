-- Tabla para publicaciones de marketplace
CREATE TABLE MarketplaceListings (
  id INT PRIMARY KEY IDENTITY(1,1),
  oidUser INT NOT NULL,
  username NVARCHAR(100) NOT NULL,
  NickName NVARCHAR(100) NOT NULL,
  itemName NVARCHAR(255) NOT NULL,
  itemDescription NVARCHAR(MAX),
  itemRarity NVARCHAR(50),
  sellingPrice INT NOT NULL,  -- Precio en NX
  quantity INT DEFAULT 1,
  condition NVARCHAR(50),  -- Nuevo, Como nuevo, Usado, etc
  imageBase64 NVARCHAR(MAX),  -- Foto del item (base64)
  purchaseLogId INT NOT NULL,  -- Link a VISMS_PurchaseLog
  productId INT,  -- ProductID para enviar como gift
  status NVARCHAR(50) DEFAULT 'active',  -- active, sold, removed
  createdAt DATETIME DEFAULT GETDATE(),
  updatedAt DATETIME DEFAULT GETDATE(),
  soldAt DATETIME NULL,
  soldTo NVARCHAR(100) NULL
);

-- Tabla para transacciones/historial de compras del marketplace
CREATE TABLE MarketplaceTransactions (
  id INT PRIMARY KEY IDENTITY(1,1),
  listingId INT NOT NULL FOREIGN KEY REFERENCES MarketplaceListings(id),
  sellerId INT NOT NULL,
  sellerUsername NVARCHAR(100) NOT NULL,
  buyerId INT NOT NULL,
  buyerUsername NVARCHAR(100) NOT NULL,
  itemName NVARCHAR(255) NOT NULL,
  price INT NOT NULL,
  quantity INT DEFAULT 1,
  transactionDate DATETIME DEFAULT GETDATE(),
  status NVARCHAR(50) DEFAULT 'completed'  -- completed, pending, cancelled
);

-- Índices para mejora de rendimiento
CREATE INDEX idx_marketplace_status ON MarketplaceListings(status);
CREATE INDEX idx_marketplace_user ON MarketplaceListings(oidUser, status);
CREATE INDEX idx_marketplace_created ON MarketplaceListings(createdAt DESC);
CREATE INDEX idx_transactions_seller ON MarketplaceTransactions(sellerId);
CREATE INDEX idx_transactions_buyer ON MarketplaceTransactions(buyerId);
