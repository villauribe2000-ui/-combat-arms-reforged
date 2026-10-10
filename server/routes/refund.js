import { Router } from 'express';

const router = Router();

// DESHABILITADO: Sistema de reembolsos removido
// La tabla RefundRequests no existe en la base de datos
// Todos los endpoints de reembolsos han sido deshabilitados por solicitud del usuario

// Los siguientes endpoints están comentados y deshabilitados:
// - POST /request-refund
// - GET /total-refunded/:username
// - GET /refund-details/:username
// - GET /pending
// - GET /weekly-count/:username
// - GET /all
// - GET /find-item/:oidUser/:productId
// - POST /approve/:refundId
// - POST /reject/:refundId
// - GET /item/:oidUser/:inventorySeqNo
// - POST /process
// - POST /remove-item

export default router;
