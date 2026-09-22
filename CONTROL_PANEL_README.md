# Panel de Control - Combat Arms Reforged

Panel de control Python para gestionar el Frontend y Backend en VPS Windows.

## Características

✅ Iniciar/Detener/Reiniciar Frontend y Backend
✅ Ver estado en tiempo real (running, stopped, error)
✅ PID, hora de inicio, puerto
✅ Estadísticas del sistema (CPU, Memoria, Disco)
✅ Registro de logs
✅ Interfaz web moderna y responsive
✅ Controlar todo desde navegador

## Instalación

### 1. Instalar Python (si no está)
```bash
# Descargar desde https://www.python.org/downloads/
# O si tienes Windows Package Manager:
winget install Python.Python.3.11
```

### 2. Instalar dependencias

```bash
# En la carpeta del proyecto
cd C:\combatarms
pip install flask psutil
```

### 3. Crear la carpeta de templates

```bash
mkdir templates
```

El archivo `templates/control-panel.html` ya debe estar ahí.

## Uso

### Iniciar el panel de control

```bash
cd C:\combatarms
python control-panel.py
```

Deberías ver:
```
 * Running on http://0.0.0.0:8000
 * Press CTRL+C to quit
```

### Acceder desde navegador

**En local:** `http://localhost:8000`
**Desde otro PC:** `http://[IP_VPS]:8000`

Ejemplo: `http://94.72.114.174:8000`

## Cómo funciona

El panel controla dos procesos Node.js:

1. **Frontend** - Sirve React compilado + Backend en puerto 80
2. **Backend** - API Node.js (aunque en producción se ejecuta con el Frontend)

### Flujo de ejecución

```
Panel de Control (Python, puerto 8000)
        ↓
    spawns Node.js processes
        ↓
Frontend/Backend (puerto 80, 5000)
```

## Rutas API

El panel expone estas rutas:

- `GET /api/status` - Estado actual
- `POST /api/start/<service>` - Inicia Frontend o Backend
- `POST /api/stop/<service>` - Detiene servicio
- `POST /api/restart/<service>` - Reinicia servicio
- `POST /api/start-all` - Inicia todo
- `POST /api/stop-all` - Detiene todo
- `GET /api/logs` - Obtiene logs

## Logs

Los logs se guardan en: `C:\combatarms\control-panel.log`

Ejemplo:
```
[2024-01-15 10:30:45] START - frontend: PID: 1234
[2024-01-15 10:30:46] START - backend: PID: 1235
[2024-01-15 10:35:12] RESTART - frontend: Reiniciado
```

## Iniciar en segundo plano (VPS)

Opción 1: Usar Task Scheduler de Windows
1. Abre Task Scheduler
2. "Create Basic Task"
3. Nombre: "Combat Arms Control Panel"
4. Trigger: "At system startup"
5. Action: "Start a program"
6. Program: `python.exe`
7. Arguments: `C:\combatarms\control-panel.py`

Opción 2: Usar un .bat

Crea `start-panel.bat`:
```batch
@echo off
cd C:\combatarms
python control-panel.py
pause
```

Luego ejecuta como Administrador.

## Primer arranque en VPS

1. **Subir el código al VPS**
2. **Ejecutar en PowerShell:**
```powershell
cd C:\combatarms
npm install
npm run build
cd server
npm install
cd ..
```

3. **Iniciar el panel:**
```powershell
python control-panel.py
```

4. **Desde navegador:**
   - Ve a `http://94.72.114.174:8000` (reemplaza IP)
   - Click "Iniciar Todo"
   - ¡Listo!

## Solución de problemas

### "Module not found: flask"
```bash
pip install flask
```

### "Module not found: psutil"
```bash
pip install psutil
```

### No se inician los procesos
- Verifica que Node.js esté instalado: `node --version`
- Revisa que la ruta `C:\combatarms` exista
- Mira los logs: `type control-panel.log`

### Puerto 8000 en uso
Cambia el puerto en la línea final del `control-panel.py`:
```python
app.run(host='0.0.0.0', port=8001, debug=False)
```

### No se ve el Frontend
- Asegúrate de que `npm run build` se ejecutó correctamente
- Verifica que existe la carpeta `dist`
- Mira los logs del backend

## Personalización

### Cambiar puerto del panel
En `control-panel.py`, línea final:
```python
app.run(host='0.0.0.0', port=9000, debug=False)  # Cambiar 8000 a 9000
```

### Cambiar rutas del proyecto
En `control-panel.py`:
```python
PROJECT_PATH = r'C:\tu-nueva-ruta'
FRONTEND_PATH = os.path.join(PROJECT_PATH, 'dist')
BACKEND_PATH = os.path.join(PROJECT_PATH, 'server')
```

## Seguridad

⚠️ Este panel NO tiene autenticación. Recomendaciones:

1. **Solo acceso local** - Configura firewall para bloquear puerto 8000
2. **Agregar contraseña** - Modifica `control-panel.py` para requerir token
3. **Usar HTTPS** - Configura certificado SSL
4. **Cambiar puerto** - No uses puertos obvios

## Contacto

¿Problemas? Revisa los logs o contacta al desarrollador.

---

**¡Listo para usar!** 🚀
