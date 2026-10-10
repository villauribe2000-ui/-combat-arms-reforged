-- TEST: Insertar un reembolso de prueba en combatarms_web

USE combatarms_web;

-- Verificar que la tabla existe
IF OBJECT_ID('RefundRequests', 'U') IS NULL
BEGIN
  PRINT 'ERROR: Tabla RefundRequests no existe en combatarms_web';
END
ELSE
BEGIN
  -- Insertar reembolso de prueba
  INSERT INTO RefundRequests (
    oidUser, 
    username, 
    NickName, 
    productName, 
    nxPaid, 
    nxCommission, 
    nxToRefund, 
    status
  ) 
  VALUES (
    100001,
    'testuser',
    'TestUser',
    'Skin Dragon Fire',
    5000,
    500,
    4500,
    'pending'
  );

  PRINT '✓ Reembolso de prueba insertado';
  
  -- Ver los reembolsos pendientes
  SELECT 'Reembolsos pendientes:' as info;
  SELECT id, username, NickName, productName, nxPaid, nxCommission, nxToRefund, status, createdAt
  FROM RefundRequests 
  WHERE status = 'pending';
END
