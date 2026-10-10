-- FIX: Renombrar SupportMessages a TicketMessages en combatarms_web

USE combatarms_web;

-- Verificar cuál existe
IF OBJECT_ID('SupportMessages', 'U') IS NOT NULL
BEGIN
  PRINT 'Encontrada tabla SupportMessages, renombrando a TicketMessages...';
  
  -- Eliminar la tabla TicketMessages si existe
  IF OBJECT_ID('TicketMessages', 'U') IS NOT NULL
    DROP TABLE TicketMessages;
  
  -- Renombrar
  EXEC sp_rename 'SupportMessages', 'TicketMessages';
  
  PRINT '✓ Tabla renombrada exitosamente';
END
ELSE IF OBJECT_ID('TicketMessages', 'U') IS NOT NULL
BEGIN
  PRINT '✓ Tabla TicketMessages ya existe';
END
ELSE
BEGIN
  PRINT 'ERROR: No se encontró SupportMessages ni TicketMessages';
END

-- Verificar resultado
SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES 
WHERE TABLE_NAME IN ('SupportMessages', 'TicketMessages', 'SupportTickets');
