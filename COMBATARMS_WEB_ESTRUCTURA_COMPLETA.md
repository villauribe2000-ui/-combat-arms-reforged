# COMBATARMS_WEB - ESTRUCTURA COMPLETA DE BASE DE DATOS

## RESUMEN

Base de datos SQL Server para administracion de Combat Arms Web
- **Servidor**: 94.72.114.174,1433
- **Usuario**: combatadmin
- **Contrasena**: Admin123456
- **Total de tablas**: 20

---

## TABLA 1: activity

**Proposito**: Registrar actividades de usuarios en el sistema

| Columna | Tipo | NULL | Default | Descripcion |
|---------|------|------|---------|-------------|
| id | bigint | NO | - | ID unico de actividad |
| userId | int | NO | - | ID del usuario |
| type | varchar | NO | - | Tipo de actividad (login, logout, etc) |
| createdAt | datetime2 | NO | - | Fecha/hora de la actividad |

---

## TABLA 2: admin_audit

**Proposito**: Auditar acciones de administradores

| Columna | Tipo | NULL | Default | Descripcion |
|---------|------|------|---------|-------------|
| id | bigint | NO | - | ID unico de auditoria |
| actorId | int | SI | - | ID del admin que realizo la accion |
| actorName | nvarchar | SI | - | Nombre del admin |
| action | varchar | NO | - | Accion realizada |
| targetId | int | SI | - | ID del usuario afectado |
| targetName | nvarchar | SI | - | Nombre del usuario afectado |
| detail | nvarchar | SI | - | Detalles de la accion |
| ip | varchar | SI | - | IP del admin |
| createdAt | datetime2 | NO | - | Fecha/hora de la accion |

---

## TABLA 3: admin_users

**Proposito**: Administradores del sistema web

| Columna | Tipo | NULL | Default | Descripcion |
|---------|------|------|---------|-------------|
| userId | int | NO | - | ID del usuario admin |
| role | varchar | NO | - | Rol del admin (admin, moderator, etc) |
| grantedBy | int | SI | - | ID de quien le dio el rol |
| grantedAt | datetime2 | NO | - | Fecha que se le asigno el rol |

---

## TABLA 4: credential_challenges

**Proposito**: Desafios para verificacion de credenciales

| Columna | Tipo | NULL | Default | Descripcion |
|---------|------|------|---------|-------------|
| tokenHash | varchar | NO | - | Hash del token del desafio |
| path | varchar | NO | - | Ruta que se protege |
| expiresAt | bigint | NO | - | Timestamp cuando expira |

---

## TABLA 5: download_daily

**Proposito**: Estadisticas diarias de descargas

| Columna | Tipo | NULL | Default | Descripcion |
|---------|------|------|---------|-------------|
| day | date | NO | - | Dia de la descarga |
| releaseId | varchar | NO | - | ID del release |
| count | bigint | NO | 0 | Cantidad de descargas |

---

## TABLA 6: download_releases

**Proposito**: Releases disponibles para descargar

| Columna | Tipo | NULL | Default | Descripcion |
|---------|------|------|---------|-------------|
| id | varchar | NO | - | ID unico del release |
| fileName | varchar | NO | - | Nombre del archivo |
| version | nvarchar | NO | - | Version del release |
| sizeBytes | bigint | NO | - | Tamano en bytes |
| sha256 | varchar | NO | - | Hash SHA256 del archivo |
| publishedAt | datetime2 | NO | - | Fecha de publicacion |
| publishedBy | int | NO | - | ID de quien publico |
| downloadCount | bigint | NO | 0 | Cantidad total de descargas |

---

## TABLA 7: download_settings

**Proposito**: Configuracion de descargas

| Columna | Tipo | NULL | Default | Descripcion |
|---------|------|------|---------|-------------|
| id | tinyint | NO | - | ID de configuracion (siempre 1) |
| enabled | bit | NO | 0 | Si estan habilitadas las descargas |
| currentRelease | varchar | SI | - | Release actual disponible |
| updatedAt | datetime2 | SI | - | Ultima actualizacion |

---

## TABLA 8: download_tickets

**Proposito**: Tickets de descarga temporal

| Columna | Tipo | NULL | Default | Descripcion |
|---------|------|------|---------|-------------|
| tokenHash | varchar | NO | - | Hash del token de descarga |
| releaseId | varchar | NO | - | Release a descargar |
| expiresAt | bigint | NO | - | Cuando expira el ticket |
| startedAt | datetime2 | SI | - | Cuando comenzo la descarga |

---

## TABLA 9: download_uploads

**Proposito**: Uploads de archivos en progreso

| Columna | Tipo | NULL | Default | Descripcion |
|---------|------|------|---------|-------------|
| id | varchar | NO | - | ID unico del upload |
| ownerId | int | NO | - | ID del usuario que sube |
| fileName | varchar | NO | - | Nombre del archivo |
| version | nvarchar | NO | - | Version del archivo |
| sizeBytes | bigint | NO | - | Tamano total esperado |
| receivedBytes | bigint | NO | 0 | Bytes recibidos hasta ahora |
| expiresAt | bigint | NO | - | Cuando expira el upload |
| leaseToken | varchar | SI | - | Token de lease activo |
| leaseUntil | bigint | NO | 0 | Hasta cuando es valido el lease |
| state | varchar | NO | uploading | Estado (uploading, completed, error) |
| error | nvarchar | SI | - | Mensaje de error si fallo |

---

## TABLA 10: email_verifications

**Proposito**: Verificacion de emails

| Columna | Tipo | NULL | Default | Descripcion |
|---------|------|------|---------|-------------|
| userId | int | NO | - | ID del usuario |
| tokenHash | varchar | NO | - | Hash del token de verificacion |
| email | nvarchar | NO | - | Email a verificar |
| passwordStamp | varchar | NO | - | Stamp de contrasena |
| expiresAt | bigint | NO | - | Cuando expira |

---

## TABLA 11: login_challenges

**Proposito**: Desafios de login (MFA)

| Columna | Tipo | NULL | Default | Descripcion |
|---------|------|------|---------|-------------|
| tokenHash | varchar | NO | - | Hash del token de desafio |
| userId | int | NO | - | ID del usuario |
| passwordStamp | varchar | NO | - | Stamp de contrasena |
| mfaVersion | varchar | NO | - | Version del MFA |
| expiresAt | bigint | NO | - | Cuando expira |

---

## TABLA 12: password_resets

**Proposito**: Solicitudes de reset de contrasena

| Columna | Tipo | NULL | Default | Descripcion |
|---------|------|------|---------|-------------|
| userId | int | NO | - | ID del usuario |
| tokenHash | varchar | NO | - | Hash del token de reset |
| email | nvarchar | NO | - | Email del usuario |
| passwordStamp | varchar | NO | - | Stamp de contrasena anterior |
| expiresAt | bigint | NO | - | Cuando expira el token |

---

## TABLA 13: punishments

**Proposito**: Castigos/Bans de usuarios

| Columna | Tipo | NULL | Default | Descripcion |
|---------|------|------|---------|-------------|
| id | bigint | NO | - | ID unico del castigo |
| userId | int | NO | - | ID del usuario castigado |
| nickname | nvarchar | SI | - | Nickname del usuario |
| type | varchar | NO | - | Tipo de castigo (ban, mute, etc) |
| reason | nvarchar | NO | - | Razon del castigo |
| proof | nvarchar | SI | - | Evidencia del castigo |
| issuedBy | int | SI | - | ID de quien castigo |
| issuedByName | nvarchar | SI | - | Nombre de quien castigo |
| startsAt | datetime2 | NO | - | Fecha inicio del castigo |
| endsAt | datetime2 | SI | - | Fecha fin del castigo (NULL=permanente) |
| liftedAt | datetime2 | SI | - | Fecha en que se levanto |
| liftedBy | int | SI | - | ID de quien levanto el castigo |
| liftedByName | nvarchar | SI | - | Nombre de quien lo levanto |
| liftReason | nvarchar | SI | - | Razon por la que se levanto |
| createdAt | datetime2 | NO | - | Fecha de creacion |

---

## TABLA 14: rate_limits

**Proposito**: Limites de tasa para prevenir abuso

| Columna | Tipo | NULL | Default | Descripcion |
|---------|------|------|---------|-------------|
| limitKey | varchar | NO | - | Clave del limite (user_login, etc) |
| count | int | NO | - | Contador actual |
| resetAt | bigint | NO | - | Timestamp cuando se resetea |

---

## TABLA 15: recovery_codes

**Proposito**: Codigos de recuperacion para MFA

| Columna | Tipo | NULL | Default | Descripcion |
|---------|------|------|---------|-------------|
| userId | int | NO | - | ID del usuario |
| codeHash | varchar | NO | - | Hash del codigo |

---

## TABLA 16: report_reviews

**Proposito**: Resenas de reportes

| Columna | Tipo | NULL | Default | Descripcion |
|---------|------|------|---------|-------------|
| reportSeq | int | NO | - | ID del reporte |
| status | varchar | NO | - | Estado (pending, approved, rejected) |
| note | nvarchar | SI | - | Notas del revisor |
| reviewedBy | int | SI | - | ID del revisor |
| reviewedByName | nvarchar | SI | - | Nombre del revisor |
| reviewedAt | datetime2 | NO | - | Fecha de resena |

---

## TABLA 17: schema_version

**Proposito**: Versionamiento de esquema de BD

| Columna | Tipo | NULL | Default | Descripcion |
|---------|------|------|---------|-------------|
| version | int | NO | - | Numero de version |
| name | nvarchar | NO | - | Nombre de la migracion |
| appliedAt | datetime2 | NO | - | Fecha aplicacion |

---

## TABLA 18: sessions

**Proposito**: Sesiones de usuarios autenticados

| Columna | Tipo | NULL | Default | Descripcion |
|---------|------|------|---------|-------------|
| tokenHash | varchar | NO | - | Hash del token de sesion |
| userId | int | NO | - | ID del usuario |
| passwordStamp | varchar | NO | - | Stamp de contrasena |
| expiresAt | bigint | NO | - | Cuando expira la sesion |
| mfaVersion | varchar | NO | '' | Version de MFA si esta activo |

---

## TABLA 19: two_factor

**Proposito**: Autenticacion de dos factores habilitada

| Columna | Tipo | NULL | Default | Descripcion |
|---------|------|------|---------|-------------|
| userId | int | NO | - | ID del usuario |
| secretCipher | varchar | NO | - | Secret encriptado para TOTP |
| version | varchar | NO | - | Version del MFA |
| lastCounter | bigint | NO | - | Ultimo counter usado |
| enabledAt | datetime2 | NO | - | Fecha que se habilito |

---

## TABLA 20: two_factor_pending

**Proposito**: Setup de dos factores en progreso

| Columna | Tipo | NULL | Default | Descripcion |
|---------|------|------|---------|-------------|
| userId | int | NO | - | ID del usuario |
| setupId | varchar | NO | - | ID unico del setup |
| secretCipher | varchar | NO | - | Secret encriptado temporal |
| sessionHash | varchar | NO | - | Hash de sesion |
| passwordStamp | varchar | NO | - | Stamp de contrasena |
| expiresAt | bigint | NO | - | Cuando expira el setup |

---

## CONEXIONES Y RELACIONES

### Relaciones identificadas:

1. **activity** -> Usuarios del juego (userId puede ser ID de COMBATARMS)
2. **admin_users** -> Usuarios admin (userId puede ser ID de COMBATARMS)
3. **admin_audit** -> Actividades de admins (actorId, targetId del juego)
4. **punishments** -> Usuarios del juego (userId del sistema de juego)
5. **report_reviews** -> Sistema de reportes del juego
6. **sessions** -> Sesiones web (userId del sistema web)
7. **login_challenges** -> MFA para login web
8. **password_resets** -> Reset de contrasenas web
9. **email_verifications** -> Verificacion de emails web
10. **two_factor** -> Autenticacion de dos factores

---

## INTEGRACION CON PAGINA WEB

### Funcionalidades por tabla:

```
AUTENTICACION:
- sessions: Gestionar sesiones activas
- login_challenges: Verificaciones MFA
- email_verifications: Confirmar emails
- password_resets: Reset de contrasenas
- two_factor: 2FA setup
- two_factor_pending: 2FA en progreso
- recovery_codes: Codigos de recuperacion

ADMINISTRACION:
- admin_users: Usuarios con permisos admin
- admin_audit: Log de acciones de admins
- activity: Historial de actividades

SEGURIDAD:
- rate_limits: Prevenir ataques de fuerza bruta
- credential_challenges: Verificacion de credenciales

CASTIGOS:
- punishments: Bans, mutes, etc

DESCARGAS:
- download_releases: Versiones disponibles
- download_daily: Estadisticas diarias
- download_settings: Configuracion
- download_tickets: Tickets de descarga
- download_uploads: Uploads en progreso

REPORTES:
- report_reviews: Resena de reportes

MIGRACIONES:
- schema_version: Historial de migraciones
```

---

## COMO INTEGRAR EN REACT/NODEJS

### 1. Backend (Node.js API)

Crear endpoints para:
- GET /api/admin/users - Listar admins
- GET /api/admin/audit - Auditoria
- GET /api/punishments - Listar castigos
- POST /api/punishments - Crear castigo
- GET /api/sessions - Sesiones activas
- etc.

### 2. Frontend (React)

Crear componentes para:
- Dashboard de administracion
- Panel de castigos
- Historial de actividades
- Estadisticas de descargas
- Sistema de reportes

### 3. Autenticacion

Usar tablas para:
- Validar sesiones
- Verificar 2FA
- Reset de contrasenas
- Verificacion de emails

---

## NOTAS IMPORTANTES

1. **No modificar la BD directamente** - Solo lectura del front-end
2. **Relaciones con COMBATARMS** - userId probablemente es FK a oidUser de COMBATARMS
3. **Seguridad** - Los hashes de tokens/codigos no se deben mostrar al cliente
4. **Timestamps** - Algunos estan en formato bigint (Unix timestamp)
5. **NULL handling** - Muchas columnas son nullable, tener cuidado en validaciones

---

## CREDENCIALES

- Host: 94.72.114.174
- Port: 1433
- User: combatadmin
- Pass: Admin123456
- Database: COMBATARMS_WEB

