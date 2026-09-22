# 🚀 Quick Start - Combat Arms

## ¡Las dependencias ya están instaladas!

### Paso 1: Iniciar el Backend (Servidor)

Abre una terminal PowerShell/CMD en la carpeta del proyecto y ejecuta:

```powershell
cd server
npm run dev
```

Deberías ver algo como:
```
✓ Conectado a COMBATARMS
✓ Server running on http://localhost:5000
```

### Paso 2: Iniciar el Frontend (en otra terminal)

En otra terminal, en la carpeta raíz del proyecto:

```powershell
npm run dev
```

Deberías ver algo como:
```
VITE v5.4.8  ready in 123 ms

➜  Local:   http://localhost:5173/
```

### Paso 3: Abrir la aplicación

Abre tu navegador en: **http://localhost:5173**

---

## 🔑 Credenciales de Prueba

Puedes crear una cuenta nueva con cualquier email y contraseña, o usa datos de prueba.

---

## 📝 Notas

- **Backend port**: 5000
- **Frontend port**: 5173
- **Base de datos**: SQL Server en 94.72.114.174

---

## ⚠️ Si algo falla

### Error: "Cannot connect to SQL Server"
- Verificar que SQL Server está corriendo
- Verificar que las credenciales en `server/.env` son correctas
- Verificar que las bases de datos COMBATARMS y COMBATARMS_LOG existen

### Error: "Port 5000 already in use"
- Cambiar el puerto en `server/.env` (agregar `PORT=5001`)

### Error: "Module not found"
- En la carpeta `server`: ejecutar `npm install`
- En la carpeta raíz: ejecutar `npm install`

---

## 🎉 ¡Listo!

La aplicación está funcionando. Puedes:
- ✅ Crear cuenta
- ✅ Iniciar sesión
- ✅ Ver rankings
- ✅ Ver torneos
- ✅ Ver tienda
- ✅ Y más...
