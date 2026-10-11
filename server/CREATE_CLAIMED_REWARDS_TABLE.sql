-- Crear tabla para guardar recompensas reclamadas en combatarms_web

USE combatarms_web;

-- Tabla de recompensas reclamadas por nivel
IF OBJECT_ID('ClaimedLevelRewards', 'U') IS NULL
CREATE TABLE ClaimedLevelRewards (
  id INT PRIMARY KEY IDENTITY(1,1),
  oidUser INT NOT NULL,
  username NVARCHAR(50) NOT NULL,
  level INT NOT NULL,
  nxAmount DECIMAL(10,2) NOT NULL,
  claimedAt DATETIME DEFAULT GETDATE(),
  UNIQUE(oidUser, level)  -- Cada usuario solo puede reclamar cada nivel UNA VEZ
);

-- Índices para búsqueda rápida
CREATE INDEX idx_claimed_rewards_username ON ClaimedLevelRewards(username);
CREATE INDEX idx_claimed_rewards_level ON ClaimedLevelRewards(level);
CREATE INDEX idx_claimed_rewards_user ON ClaimedLevelRewards(oidUser);

PRINT '✓ Tabla ClaimedLevelRewards creada exitosamente';
