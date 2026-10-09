# Despliegue en Vercel - Combat Arms Reforged

Este proyecto está optimizado para desplegar el frontend en Vercel.

## ✅ Configuración para Vercel

### 1. Variables de Entorno en Vercel Dashboard

En tu proyecto Vercel, ve a **Settings > Environment Variables** y agrega:

```
VITE_API_URL=https://combat-arms-reforged-production.up.railway.app
```

O si tienes tu backend en otro lugar, cambia la URL.

### 2. Build Settings

Vercel detectará automáticamente:
- **Framework**: Vite (React)
- **Build Command**: `npm run build`
- **Output Directory**: `dist`

Si no lo detecta, configura manualmente en **Settings > Build & Deployment**

### 3. Deploy

Simplemente haz push a tu rama `main` o `vercel-frontend`:

```bash
git push origin vercel-frontend
```

Vercel se conectará automáticamente a GitHub y desplegará.

## 🔧 Estructura del Proyecto

- **Frontend**: Todo en `src/`, `public/`, etc.
- **Backend**: En servidor separado (Railway, Render, etc.)
- **Excluidos en Vercel**: Carpeta `server/`, archivos `.py`, etc.

## 🌐 URLs

- **Frontend**: `https://tu-proyecto.vercel.app`
- **Backend**: `https://combat-arms-reforged-production.up.railway.app` (o tu URL)

## 📝 Notas

- El frontend en Vercel es completamente estático
- Todas las llamadas a API van al backend configurado
- Los secretos (contraseñas DB) están seguros en el backend, no se envían al frontend

## 🚀 Próximos Pasos

1. Verifica que el backend esté corriendo
2. Agrega la variable de entorno en Vercel
3. Haz push de los cambios
4. Vercel desplegará automáticamente

¿Problemas? Revisa los logs de Vercel en el dashboard.
