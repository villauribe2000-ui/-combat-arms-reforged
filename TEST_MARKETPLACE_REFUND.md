# Test Script: Marketplace + Refund Integration

## Estado Actual del Sistema

✅ **Backend**: Running en localhost:5000
✅ **Frontend**: Running en localhost:5174  
✅ **Base de datos**: Conectada (COMBATARMS, VISMS, NX_GuildMaster)

---

## Test 1: Verificar Endpoint de Estado Marketplace

### Objetivo
Verificar que el endpoint `/data/purchase-marketplace-status/:purchaseLogId` funciona

### Pasos
```bash
# Obtener una compra del usuario
curl http://localhost:5000/purchase-history/lizysebas26

# Usar un purchaseLogId de respuesta, ej: 26620
curl http://localhost:5000/data/purchase-marketplace-status/26620

# Respuesta esperada:
{
  "isForSale": false,
  "listing": null
}
```

---

## Test 2: Crear Publicación con purchaseLogId

### Objetivo
Verificar que al crear publicación se guarda correctamente el purchaseLogId

### Pasos
```bash
curl -X POST http://localhost:5000/marketplace/create-listing \
  -H "Content-Type: application/json" \
  -d '{
    "oidUser": 123,
    "username": "testuser",
    "NickName": "TestChar",
    "itemName": "Test Item",
    "itemDescription": "Test Description",
    "itemRarity": "común",
    "sellingPrice": 500,
    "quantity": 1,
    "condition": "N/A",
    "imageBase64": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
    "purchaseLogId": 26620
  }'

# Respuesta esperada:
{
  "success": true,
  "listingId": 1,
  "message": "Publicación creada exitosamente",
  "createdAt": "2026-09-21T23:30:00Z"
}
```

---

## Test 3: Verificar Estado Después de Publicar

### Objetivo
Confirmar que marketplace status cambió después de crear publicación

### Pasos
```bash
# Usar el mismo purchaseLogId del Test 2
curl http://localhost:5000/data/purchase-marketplace-status/26620

# Respuesta esperada:
{
  "isForSale": true,
  "listing": {
    "id": 1,
    "status": "active",
    "createdAt": "2026-09-21T23:30:00Z",
    "soldAt": null,
    "soldTo": null
  }
}
```

---

## Test 4: Intentar Reembolso Mientras Está en Venta

### Objetivo
Verificar que el backend rechaza reembolso si item está en marketplace

### Pasos
```bash
curl -X POST http://localhost:5000/refund/request-refund \
  -H "Content-Type: application/json" \
  -d '{
    "oidUser": 123,
    "username": "testuser",
    "NickName": "TestChar",
    "productId": 12345,
    "productName": "Test Item",
    "purchaseLogId": 26620,
    "nxPaid": 500
  }'

# Respuesta esperada (ERROR):
{
  "error": "No puedes reembolsar este item mientras esté en venta en el marketplace. Elimina la publicación primero.",
  "listingId": 1,
  "status": "active"
}

# Status HTTP: 400
```

---

## Test 5: Eliminar Publicación

### Objetivo
Verificar que eliminar publicación libera el purchaseLogId para reembolso

### Pasos
```bash
curl -X DELETE http://localhost:5000/marketplace/listing/1 \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser"
  }'

# Respuesta esperada:
{
  "success": true,
  "message": "Publicación eliminada. Ahora puedes solicitar reembolso para este item.",
  "purchaseLogId": 26620
}
```

---

## Test 6: Verificar Estado Después de Eliminar

### Objetivo
Confirmar que después de eliminar, el item puede ser reembolsado

### Pasos
```bash
curl http://localhost:5000/data/purchase-marketplace-status/26620

# Respuesta esperada:
{
  "isForSale": false,
  "listing": null
}
```

---

## Test 7: Reembolso Ahora Funciona

### Objetivo
Verificar que reembolso es permitido después de eliminar publicación

### Pasos
```bash
curl -X POST http://localhost:5000/refund/request-refund \
  -H "Content-Type: application/json" \
  -d '{
    "oidUser": 123,
    "username": "testuser",
    "NickName": "TestChar",
    "productId": 12345,
    "productName": "Test Item",
    "purchaseLogId": 26620,
    "nxPaid": 500
  }'

# Respuesta esperada (ÉXITO):
{
  "success": true,
  "refundId": 42,
  "message": "Solicitud de reembolso creada. Se descontará 10% de comisión...",
  "details": {
    "nxPaid": 500,
    "nxCommission": 50,
    "nxToRefund": 450,
    "refundsThisWeek": 1
  }
}

# Status HTTP: 200
```

---

## Test 8: Items Disponibles para Vender

### Objetivo
Verificar que items en marketplace NO aparecen en lista de disponibles para vender

### Pasos
1. Crear una publicación activa (Test 2)
2. Llamar endpoint `/data/available-items/testuser`
3. El purchaseLogId de la publicación NO debe aparecer en lista

```bash
curl http://localhost:5000/data/available-items/testuser

# Respuesta: Array de items SIN el purchaseLogId de la publicación activa
```

---

## Test 9: Frontend - Crear Publicación

### Objetivo
Verificar flujo en interfaz gráfica

### Pasos
1. Abrir http://localhost:5174
2. Iniciar sesión
3. Ir a **Marketplace → Vender Item**
4. Seleccionar un item del historial
5. Subir imagen (MUST)
6. Establecer precio
7. ✅ Clickear "Publicar"
8. Ver confirmación: "Publicación creada exitosamente"

---

## Test 10: Frontend - Badge "En Venta"

### Objetivo
Verificar que items en venta muestren badge visual

### Pasos
1. Desde **Historial de Compras**
2. El item recién publicado debe mostrar:
   - Badge azul: "En venta"
   - Botón "Reembolso" deshabilitado
   - Status: "En venta"

---

## Test 11: Frontend - Eliminar Publicación

### Objetivo
Verificar que después de eliminar, badge desaparece

### Pasos
1. Ir a **Mis Publicaciones**
2. Encontrar la publicación creada
3. Clickear **Eliminar**
4. Confirmar
5. Volver a **Historial de Compras**
6. ✅ Badge "En venta" desaparece
7. ✅ Botón "Reembolso" se habilita

---

## Test 12: Frontend - Reembolso Después de Eliminar

### Objetivo
Verificar que reembolso funciona después de eliminar publicación

### Pasos
1. Desde **Historial**, clickear "Reembolso"
2. Ver confirmación: "Solicitud enviada"
3. Estado cambia a "Pendiente" (hourglass icon)
4. ✅ Admin puede aprobar/rechazar

---

## Checklist de Validación Final

- [ ] **Backend**: Todos los endpoints responden sin error
- [ ] **Validación**: Reembolso rechazado si item está en venta
- [ ] **Validación**: Reembolso permitido después de eliminar publicación
- [ ] **Frontend**: Badge "En venta" visible cuando se publica
- [ ] **Frontend**: Botón reembolso deshabilitado cuando en venta
- [ ] **Frontend**: Badge desaparece al eliminar publicación
- [ ] **Frontend**: Botón reembolso se habilita tras eliminar
- [ ] **Base de datos**: purchaseLogId guardado correctamente
- [ ] **Base de datos**: Estados de publicación actualizados correctamente
- [ ] **Performance**: Cargas rápidas sin errores

---

## Resultados Esperados

✅ **TODOS LOS TESTS DEBEN PASAR**

Si alguno falla:
1. Revisar logs del servidor (terminal del backend)
2. Revisar console del navegador (F12)
3. Revisar estructura de datos (mariadb client)
4. Contactar con soporte

---

**Fecha**: Septiembre 21, 2026
**Versión**: 1.0
**Status**: Ready for QA
