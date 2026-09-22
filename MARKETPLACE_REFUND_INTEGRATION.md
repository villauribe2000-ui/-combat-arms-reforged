# Integración Marketplace + Sistema de Reembolsos

## ✅ Cambios Implementados

### 1. Base de Datos - MarketplaceListings
- Columna `purchaseLogId` agregada para vincular publicaciones con compras en VISMS_PurchaseLog

### 2. Frontend - MarketplacePage.tsx
- Ahora **requiere seleccionar un item** del historial de compras
- Pasa `purchaseLogId` al crear publicación
- Items reembolsados NO aparecen en lista de disponibles
- Items con reembolso pendiente NO aparecen en lista de disponibles

### 3. Frontend - PurchaseHistoryPage.tsx
- Items en venta muestran **badge azul "En venta"**
- Botón de reembolso **deshabilitado** mientras esté en venta
- Carga estado de marketplace para cada compra desde el backend
- Error claro al intentar reembolso

### 4. Backend - refund.js
- **Valida** que item NO esté en publicación activa/vendida del marketplace
- Si está en venta: rechaza reembolso con mensaje claro
- Permite reembolso solo si publicación fue eliminada

### 5. Backend - marketplace.js
- Al eliminar publicación: `purchaseLogId` queda disponible para nuevos reembolsos
- Publicación se marca como `removed` (no eliminada de BD)

### 6. Backend - data.js
- Nuevo endpoint: `/data/purchase-marketplace-status/:purchaseLogId`
- Retorna si item está en venta y detalles de publicación

### 7. API Client - api.ts
- Nuevo método: `getPurchaseMarketplaceStatus(purchaseLogId)`
- Método actualizado: `createMarketplaceListing(..., purchaseLogId)`

---

## 🧪 Casos de Prueba

### Caso 1: Publicar Item (Flujo Normal)
1. Ir a **Marketplace → Vender Item**
2. Seleccionar un item del historial
3. Subir imagen (obligatoria)
4. Establecer precio
5. ✅ Publicación creada con `purchaseLogId` guardado
6. En **Historial de Compras** → Item muestra badge "En venta" azul

### Caso 2: Intentar Reembolso con Item en Venta
1. Item está en venta (badge azul visible)
2. Clickear botón de reembolso
3. ❌ Botón está deshabilitado
4. Tooltip: "En venta"

### Caso 3: Eliminar Publicación → Permite Reembolso
1. Ir a **Mis Publicaciones**
2. Clickear **Eliminar** en publicación activa
3. ✅ Publicación eliminada
4. Ir a **Historial de Compras**
5. Badge "En venta" desaparece
6. ✅ Botón de reembolso ahora HABILITADO
7. Puede solicitar reembolso normalmente

### Caso 4: Intenta Reembolso via API (mientras está en venta)
1. Item está en publicación activa
2. Hacer POST a `/refund/request-refund` con `purchaseLogId`
3. ❌ Backend rechaza con status 400
4. Mensaje: "No puedes reembolsar este item mientras esté en venta. Elimina la publicación primero."

---

## 📊 Estados de Item

```
DISPONIBLE
├── No está en marketplace
├── No tiene reembolso pendiente
└── ✅ Puede vender O reembolsar

EN VENTA (ACTIVO)
├── purchaseLogId en MarketplaceListings.status = 'active'
├── ❌ NO puede reembolsar
└── ✅ Puede eliminar publicación

VENDIDO
├── MarketplaceListings.status = 'sold'
├── ❌ NO puede reembolsar (item ya no le pertenece)
└── ❌ NO puede eliminar

REEMBOLSO PENDIENTE
├── RefundRequests.status = 'pending'
├── ❌ NO puede vender
└── ⏳ Esperando aprobación del admin

REEMBOLSO APROBADO
├── RefundRequests.status = 'approved'
├── Item eliminado del inventario
└── NX devuelto (menos 10% comisión)

REEMBOLSO RECHAZADO
├── RefundRequests.status = 'rejected'
├── Item sigue en inventario
└── ✅ Puede intentar reembolso otra vez
```

---

## 🔄 Flujo Completo: Vender → Cambiar Idea → Reembolsar

1. **Usuario compra item** → `VISMS_PurchaseLog` + `CBT_UserInventory`
2. **Usuario vende item** → `MarketplaceListings` (purchaseLogId guardado)
3. **Item aparece en venta** → Badge "En venta" en historial
4. **Usuario cambia idea**:
   - Elimina publicación → `status = 'removed'`
   - Badge "En venta" desaparece
   - Botón reembolso se habilita
5. **Usuario solicita reembolso**:
   - Backend verifica que NO está en venta ✅
   - Reembolso creado con comisión 10%
6. **Admin aprueba**:
   - Item eliminado de inventario
   - NX devuelto (90% del precio pagado)

---

## 🛡️ Validaciones Implementadas

| Acción | Validación | Resultado |
|--------|-----------|-----------|
| Publicar item | Item no está reembolsado | ✅ Permitido |
| Publicar item | Item NO en pending refund | ✅ Permitido |
| Reembolsar | Item NO está en venta | ✅ Permitido |
| Reembolsar | Item está en venta activa | ❌ Rechazado |
| Reembolsar | Item está vendido | ❌ Rechazado |
| Eliminar publicación | Usuario es propietario | ✅ Permitido |
| Eliminar publicación | Solo activas | ✅ Permitido |

---

## 💾 Puntos Clave de Base de Datos

### MarketplaceListings
```sql
id, oidUser, username, NickName, itemName, itemDescription, 
itemRarity, sellingPrice, quantity, condition, imageBase64, 
purchaseLogId (NUEVO), status, createdAt, updatedAt, soldAt, soldTo
```

### RefundRequests
```sql
-- Cuando se rechaza refund:
- Verificar que purchaseLogId NO esté en MarketplaceListings (active o sold)
- Si está → rechazar reembolso
```

---

## 🚀 Endpoints Actualizados

### GET `/data/purchase-marketplace-status/:purchaseLogId`
**Obtiene estado de marketplace para un item**
```json
{
  "isForSale": true,
  "listing": {
    "id": 42,
    "status": "active",
    "createdAt": "2024-09-21T10:30:00Z",
    "soldAt": null,
    "soldTo": null
  }
}
```

### POST `/marketplace/create-listing`
**Ahora requiere `purchaseLogId`**
```json
{
  "oidUser": 123,
  "username": "user",
  "NickName": "CharName",
  "itemName": "Item",
  "sellingPrice": 1000,
  "imageBase64": "data:image/...",
  "purchaseLogId": 26620  // NUEVO - requerido
}
```

### POST `/refund/request-refund`
**Ahora verifica marketplace**
- Si `purchaseLogId` está en marketplace (active/sold)
- Rechaza con status 400

---

## ✨ Beneficios

1. **Transparencia**: Usuarios ven claramente qué items están en venta
2. **Prevención de conflictos**: No se puede vender y reembolsar el mismo item
3. **Control total**: Usuario puede cambiar idea eliminando publicación
4. **Trazabilidad**: Cada publicación vinculada a compra específica
5. **Seguridad**: El backend valida en todos los puntos

---

## 📝 Para Probar

```bash
# 1. Asegurar que servidores estén corriendo
npm run dev          # Frontend en http://localhost:5174
npm start            # Backend en http://localhost:5000

# 2. Iniciar sesión
- Username: cualquier usuario con compras
- Ir a Marketplace → Vender Item
- Seleccionar item, subir imagen, establecer precio
- Ir a Historial → Ver badge "En venta"
- Intentar reembolso → Botón deshabilitado
- Ir a Mis Publicaciones → Eliminar publicación
- Volver a Historial → Badge desaparece, botón habilitado
```

---

**Fecha**: Septiembre 21, 2026
**Status**: ✅ Completo
**Código**: Git ready para commit
