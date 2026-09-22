# Combat Arms Server Setup Guide

## Instalación del Backend

### 1. Instalar dependencias

```bash
cd server
npm install
```

### 2. Crear la base de datos en SQL Server

1. Abre SQL Server Management Studio (SSMS)
2. Conectate al servidor: `94.72.114.174`
3. Usuario: `combatadmin` / Contraseña: `Admin123456`
4. Crea dos bases de datos:
   - `COMBATARMS` (principal)
   - `COMBATARMS_LOG` (logs)

5. Ejecuta el script SQL para crear las tablas:
```sql
-- Ejecutar en COMBATARMS database
-- Copiar contenido de server/create_tables.sql y ejecutar
```

### 3. Verificar configuración de variables de entorno

El archivo `server/.env` ya contiene:
- `DB_SERVER`: 94.72.114.174
- `DB_NAME`: COMBATARMS
- `DB_USER`: combatadmin
- `DB_PASSWORD`: Admin123456
- `JWT_SECRET`: Cambiar en producción

### 4. Iniciar el servidor

**Desarrollo:**
```bash
npm run dev
```

**Producción:**
```bash
npm start
```

El servidor correrá en `http://localhost:5000`

## Configuración del Frontend

### 1. Actualizar `.env.local`

```
VITE_API_URL=http://localhost:5000/api
```

### 2. Iniciar el frontend

```bash
npm run dev
```

## Estructura de Rutas API

### Autenticación
- `POST /api/auth/signup` - Crear nueva cuenta
- `POST /api/auth/login` - Iniciar sesión
- `GET /api/auth/me` - Obtener usuario actual

### Datos
- `GET /api/tournaments` - Obtener torneos
- `GET /api/players/top?limit=5` - Top jugadores
- `GET /api/players?page=1&limit=20` - Listar jugadores
- `GET /api/players/:id` - Obtener jugador por ID
- `GET /api/stats/players-count` - Total de jugadores
- `GET /api/clans` - Obtener clanes
- `GET /api/products?category=all` - Obtener productos

## Notas de Seguridad

1. **JWT_SECRET**: Cambiar en producción a una clave segura
2. **CORS**: Configurado para `localhost`, actualizar en producción
3. **Credenciales**: No guardar credenciales en el código, usar variables de entorno
4. **HTTPS**: Usar HTTPS en producción

## Troubleshooting

### Error: Cannot connect to SQL Server
- Verificar que el servidor `94.72.114.174` sea accesible
- Verificar credenciales en `.env`
- Verificar que las bases de datos estén creadas

### Error: Tables don't exist
- Ejecutar el script `create_tables.sql` en SQL Server Management Studio

### Puerto 5000 en uso
- Cambiar el puerto en `.env` con la variable `PORT`

