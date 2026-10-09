# ENDPOINTS API - COMBATARMS_WEB

**Base URL**: `/api/combatarms-web`

Todos los endpoints son **READ-ONLY** (solo lectura). NO se modifica la base de datos.

---

## ACTIVIDADES

### GET /activities
Obtener actividades recientes del sistema

**Query Parameters:**
- `limit` (optional): Numero de registros (default: 100)
- `offset` (optional): Offset para paginacion (default: 0)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "userId": 123,
      "type": "login",
      "createdAt": "2024-10-09T10:30:00.000Z"
    }
  ],
  "count": 10
}
```

---

### GET /activities/:userId
Obtener actividades de un usuario especifico

**Path Parameters:**
- `userId`: ID del usuario

**Query Parameters:**
- `limit` (optional): Numero de registros (default: 50)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 5,
      "userId": 123,
      "type": "purchase",
      "createdAt": "2024-10-09T10:30:00.000Z"
    }
  ],
  "count": 5
}
```

**Example:**
```
GET /api/combatarms-web/activities/123?limit=20
```

---

## ADMINISTRADORES

### GET /admin-users
Listar todos los usuarios administradores

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "userId": 50,
      "role": "admin",
      "grantedBy": 1,
      "grantedAt": "2024-01-15T08:00:00.000Z"
    },
    {
      "userId": 51,
      "role": "moderator",
      "grantedBy": 50,
      "grantedAt": "2024-02-01T10:00:00.000Z"
    }
  ],
  "count": 2
}
```

---

## AUDITORIA

### GET /audit
Auditoria de acciones realizadas por administradores

**Query Parameters:**
- `limit` (optional): Numero de registros (default: 100)
- `offset` (optional): Offset para paginacion (default: 0)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 100,
      "actorId": 50,
      "actorName": "Admin123",
      "action": "ban_user",
      "targetId": 789,
      "targetName": "Player456",
      "detail": "Banned for cheating",
      "ip": "192.168.1.1",
      "createdAt": "2024-10-09T12:00:00.000Z"
    }
  ],
  "count": 10
}
```

---

## CASTIGOS

### GET /punishments
Listar castigos (filtrar por estado)

**Query Parameters:**
- `limit` (optional): Numero de registros (default: 100)
- `offset` (optional): Offset para paginacion (default: 0)
- `status` (optional): 'active' | 'lifted' | 'all' (default: 'active')

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 200,
      "userId": 789,
      "nickname": "PlayerName",
      "type": "ban",
      "reason": "Cheating detected",
      "proof": "Evidence link",
      "issuedBy": 50,
      "issuedByName": "Admin123",
      "startsAt": "2024-10-09T00:00:00.000Z",
      "endsAt": "2024-10-16T00:00:00.000Z",
      "liftedAt": null,
      "liftedBy": null,
      "liftedByName": null,
      "liftReason": null,
      "createdAt": "2024-10-09T12:00:00.000Z"
    }
  ],
  "count": 5
}
```

**Examples:**
```
GET /api/combatarms-web/punishments?status=active&limit=20
GET /api/combatarms-web/punishments?status=lifted&limit=50
GET /api/combatarms-web/punishments?status=all
```

---

### GET /punishments/:userId
Castigos de un usuario especifico

**Path Parameters:**
- `userId`: ID del usuario

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 200,
      "userId": 789,
      "nickname": "PlayerName",
      "type": "ban",
      "reason": "Cheating detected",
      "proof": "Evidence link",
      "issuedBy": 50,
      "issuedByName": "Admin123",
      "startsAt": "2024-10-09T00:00:00.000Z",
      "endsAt": "2024-10-16T00:00:00.000Z",
      "liftedAt": null,
      "liftedBy": null,
      "liftedByName": null,
      "liftReason": null,
      "createdAt": "2024-10-09T12:00:00.000Z"
    },
    {
      "id": 205,
      "userId": 789,
      "nickname": "PlayerName",
      "type": "mute",
      "reason": "Spam",
      "proof": null,
      "issuedBy": 51,
      "issuedByName": "Mod456",
      "startsAt": "2024-09-15T10:00:00.000Z",
      "endsAt": "2024-09-22T10:00:00.000Z",
      "liftedAt": "2024-09-22T10:00:00.000Z",
      "liftedBy": 50,
      "liftedByName": "Admin123",
      "liftReason": "Apology accepted",
      "createdAt": "2024-09-15T10:00:00.000Z"
    }
  ],
  "count": 2
}
```

**Example:**
```
GET /api/combatarms-web/punishments/789
```

---

## SESIONES

### GET /sessions
Sesiones activas en el sistema

**Query Parameters:**
- `limit` (optional): Numero de registros (default: 100)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "userId": 123,
      "expiresAt": 1728504000,
      "mfaVersion": "1.0",
      "tokenHash": "REDACTED"
    }
  ],
  "count": 1
}
```

**Note:** El `tokenHash` siempre se devuelve como "REDACTED" por seguridad.

---

## DESCARGAS

### GET /downloads/releases
Obtener releases disponibles para descargar

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "v1.2.3",
      "fileName": "combat-arms-v1.2.3.exe",
      "version": "1.2.3",
      "sizeBytes": 524288000,
      "publishedAt": "2024-10-01T00:00:00.000Z",
      "publishedBy": 1,
      "downloadCount": 1250
    }
  ],
  "count": 1
}
```

---

### GET /downloads/stats
Estadisticas diarias de descargas (ultimos 30 dias)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "day": "2024-10-09",
      "releaseId": "v1.2.3",
      "count": 45
    },
    {
      "day": "2024-10-08",
      "releaseId": "v1.2.3",
      "count": 32
    }
  ],
  "count": 30
}
```

---

## REPORTES

### GET /reports
Resenas de reportes

**Query Parameters:**
- `limit` (optional): Numero de registros (default: 100)
- `status` (optional): 'pending' | 'approved' | 'rejected'

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "reportSeq": 1001,
      "status": "approved",
      "note": "Evidence was clear, action taken",
      "reviewedBy": 50,
      "reviewedByName": "Admin123",
      "reviewedAt": "2024-10-09T14:30:00.000Z"
    }
  ],
  "count": 1
}
```

**Examples:**
```
GET /api/combatarms-web/reports?status=pending
GET /api/combatarms-web/reports?status=approved&limit=50
```

---

## ESTADISTICAS GENERALES

### GET /stats
Obtener estadisticas resumidas del sistema

**Response:**
```json
{
  "success": true,
  "data": {
    "totalActivities": 5420,
    "totalAdmins": 8,
    "activePunishments": 15,
    "activeSessions": 3,
    "totalDownloads": 12450
  }
}
```

---

## COMPONENTES REACT DISPONIBLES

### AdminPanel
Panel de administracion con estadisticas, admins, actividades y castigos

```tsx
import AdminPanel from './components/AdminPanel';

export default function App() {
  return <AdminPanel />;
}
```

**Features:**
- Tabs para diferentes vistas
- Estadisticas en tiempo real
- Tablas con datos paginados
- Filtrado por estado de castigos
- Boton de actualizar

---

### PlayerPunishmentHistory
Buscar historial de castigos de un jugador

```tsx
import PlayerPunishmentHistory from './components/PlayerPunishmentHistory';

export default function App() {
  return <PlayerPunishmentHistory />;
}
```

**Features:**
- Busqueda por ID de usuario
- Muestra todos los castigos (activos e inactivos)
- Detalles de castigos levantados
- Tiempo restante para castigos activos
- Información de quien levanto el castigo

---

## ERRORES COMUNES

### 500 - Error del servidor
```json
{
  "success": false,
  "error": "Database connection failed"
}
```

**Solucion**: Verificar que el servidor SQL esta activo

---

### 400 - Parametros invalidos
```json
{
  "success": false,
  "error": "Invalid user ID"
}
```

**Solucion**: Verificar que los parametros son correctos

---

## NOTAS DE SEGURIDAD

1. **Solo Lectura**: Todos los endpoints son read-only
2. **Hashes Redactados**: Los tokenHash siempre se devuelven como "REDACTED"
3. **Paginacion**: Usar offset/limit para grandes conjuntos de datos
4. **Rate Limiting**: Los endpoints estan protegidos contra abuso
5. **CORS**: Solo acepta requests desde el mismo servidor

---

## CONFIGURACION REQUERIDA

**Credenciales de BD:**
- Host: 94.72.114.174
- Port: 1433
- User: combatadmin
- Pass: Admin123456
- Database: COMBATARMS_WEB

**Variables de entorno (.env):**
```
DB_HOST=94.72.114.174
DB_PORT=1433
DB_USER=combatadmin
DB_PASS=Admin123456
DB_NAME=COMBATARMS_WEB
```

---

## EJEMPLO DE USO COMPLETO

```typescript
// Obtener estadisticas
const stats = await fetch('/api/combatarms-web/stats').then(r => r.json());

// Buscar castigos activos
const punishments = await fetch(
  '/api/combatarms-web/punishments?status=active&limit=50'
).then(r => r.json());

// Obtener historial de castigos de un usuario
const userPunishments = await fetch(
  '/api/combatarms-web/punishments/789'
).then(r => r.json());

// Obtener actividades recientes
const activities = await fetch(
  '/api/combatarms-web/activities?limit=100'
).then(r => r.json());
```

