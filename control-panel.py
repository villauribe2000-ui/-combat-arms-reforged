import os
import subprocess
import time
import threading
from flask import Flask, render_template, jsonify, request
from datetime import datetime
import json

try:
    import psutil
except ImportError:
    psutil = None

app = Flask(__name__)

# Variables globales para gestionar procesos
processes = {
    'frontend': None,
    'backend': None
}

process_info = {
    'frontend': {'status': 'stopped', 'pid': None, 'started_at': None},
    'backend': {'status': 'stopped', 'pid': None, 'started_at': None}
}

# Rutas del proyecto
PROJECT_PATH = r'C:\combatarms'
FRONTEND_PATH = os.path.join(PROJECT_PATH, 'dist')
BACKEND_PATH = os.path.join(PROJECT_PATH, 'server')

def log_action(action, service, details=""):
    """Registra las acciones en un archivo de log"""
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    log_message = f"[{timestamp}] {action} - {service}: {details}\n"
    with open(os.path.join(PROJECT_PATH, 'control-panel.log'), 'a') as f:
        f.write(log_message)
    print(log_message.strip())

def check_process_alive(process):
    """Verifica si un proceso sigue corriendo"""
    if process is None:
        return False
    return process.poll() is None

def start_frontend():
    """Inicia el servidor frontend (Express sirve dist)"""
    global processes
    
    if check_process_alive(processes['frontend']):
        return {'success': False, 'message': 'Frontend ya está corriendo'}
    
    try:
        os.chdir(PROJECT_PATH)
        
        log_action("INFO", "frontend", "Iniciando servidor Node.js...")
        
        # Iniciar el servidor (Node.js en puerto 80)
        # Busca server.js en el backend
        server_path = os.path.join(BACKEND_PATH, 'server.js')
        
        if not os.path.exists(server_path):
            return {'success': False, 'message': f'Error: No existe {server_path}'}
        
        process = subprocess.Popen(
            ['node', server_path],
            cwd=BACKEND_PATH,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            creationflags=subprocess.CREATE_NEW_PROCESS_GROUP if os.name == 'nt' else 0
        )
        
        processes['frontend'] = process
        process_info['frontend']['status'] = 'running'
        process_info['frontend']['pid'] = process.pid
        process_info['frontend']['started_at'] = datetime.now().isoformat()
        
        log_action("START", "frontend", f"PID: {process.pid}")
        return {'success': True, 'message': f'Frontend iniciado (PID: {process.pid})'}
    
    except Exception as e:
        log_action("ERROR", "frontend", str(e))
        process_info['frontend']['status'] = 'error'
        return {'success': False, 'message': f'Error: {str(e)}'}

def start_backend():
    """Inicia el backend de Node.js"""
    global processes
    
    if check_process_alive(processes['backend']):
        return {'success': False, 'message': 'Backend ya está corriendo'}
    
    try:
        log_action("INFO", "backend", "Iniciando servidor Node.js...")
        
        server_path = os.path.join(BACKEND_PATH, 'server.js')
        
        if not os.path.exists(server_path):
            return {'success': False, 'message': f'Error: No existe {server_path}'}
        
        process = subprocess.Popen(
            ['node', 'server.js'],
            cwd=BACKEND_PATH,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            creationflags=subprocess.CREATE_NEW_PROCESS_GROUP if os.name == 'nt' else 0
        )
        
        processes['backend'] = process
        process_info['backend']['status'] = 'running'
        process_info['backend']['pid'] = process.pid
        process_info['backend']['started_at'] = datetime.now().isoformat()
        
        log_action("START", "backend", f"PID: {process.pid}")
        return {'success': True, 'message': f'Backend iniciado (PID: {process.pid})'}
    
    except Exception as e:
        log_action("ERROR", "backend", str(e))
        process_info['backend']['status'] = 'error'
        return {'success': False, 'message': f'Error: {str(e)}'}

def stop_service(service):
    """Detiene un servicio"""
    global processes
    
    if service not in ['frontend', 'backend']:
        return {'success': False, 'message': 'Servicio inválido'}
    
    process = processes[service]
    
    if not check_process_alive(process):
        process_info[service]['status'] = 'stopped'
        process_info[service]['pid'] = None
        return {'success': False, 'message': f'{service.capitalize()} no está corriendo'}
    
    try:
        # En Windows, terminar proceso
        if os.name == 'nt':
            os.killpg(os.getpgid(process.pid), 9)
        else:
            process.terminate()
            process.wait(timeout=5)
        
        processes[service] = None
        process_info[service]['status'] = 'stopped'
        process_info[service]['pid'] = None
        
        log_action("STOP", service, "Detenido")
        return {'success': True, 'message': f'{service.capitalize()} detenido'}
    
    except Exception as e:
        log_action("ERROR", service, f"Error al detener: {str(e)}")
        return {'success': False, 'message': f'Error: {str(e)}'}

def restart_service(service):
    """Reinicia un servicio"""
    stop_result = stop_service(service)
    time.sleep(2)
    
    if service == 'frontend':
        start_result = start_frontend()
    else:
        start_result = start_backend()
    
    log_action("RESTART", service, "Reiniciado")
    return start_result

def get_system_stats():
    """Obtiene estadísticas del sistema"""
    try:
        if psutil is None:
            return {'cpu': 0, 'memory': 0, 'disk': 0, 'memory_gb': 0}
        
        cpu_percent = psutil.cpu_percent(interval=1)
        memory = psutil.virtual_memory()
        disk = psutil.disk_usage('C:\\')
        
        return {
            'cpu': round(cpu_percent, 1),
            'memory': round(memory.percent, 1),
            'disk': round(disk.percent, 1),
            'memory_gb': round(memory.used / (1024**3), 1)
        }
    except:
        return {'cpu': 0, 'memory': 0, 'disk': 0, 'memory_gb': 0}

# ========== RUTAS API ==========

@app.route('/api/status', methods=['GET'])
def get_status():
    """Obtiene el estado actual de los servicios"""
    # Verificar si los procesos aún están vivos
    for service in ['frontend', 'backend']:
        if processes[service] and not check_process_alive(processes[service]):
            process_info[service]['status'] = 'stopped'
            processes[service] = None
    
    return jsonify({
        'services': process_info,
        'system': get_system_stats()
    })

@app.route('/api/start/<service>', methods=['POST'])
def api_start(service):
    """Inicia un servicio"""
    if service == 'frontend':
        result = start_frontend()
    elif service == 'backend':
        result = start_backend()
    else:
        result = {'success': False, 'message': 'Servicio inválido'}
    
    return jsonify(result)

@app.route('/api/stop/<service>', methods=['POST'])
def api_stop(service):
    """Detiene un servicio"""
    result = stop_service(service)
    return jsonify(result)

@app.route('/api/restart/<service>', methods=['POST'])
def api_restart(service):
    """Reinicia un servicio"""
    result = restart_service(service)
    return jsonify(result)

@app.route('/api/start-all', methods=['POST'])
def api_start_all():
    """Inicia todos los servicios"""
    results = {
        'frontend': start_frontend(),
        'backend': start_backend()
    }
    return jsonify(results)

@app.route('/api/stop-all', methods=['POST'])
def api_stop_all():
    """Detiene todos los servicios"""
    results = {
        'frontend': stop_service('frontend'),
        'backend': stop_service('backend')
    }
    return jsonify(results)

@app.route('/api/logs', methods=['GET'])
def get_logs():
    """Obtiene los últimos logs"""
    log_file = os.path.join(PROJECT_PATH, 'control-panel.log')
    try:
        with open(log_file, 'r') as f:
            lines = f.readlines()
            # Últimas 50 líneas
            recent_logs = ''.join(lines[-50:])
        return jsonify({'logs': recent_logs})
    except:
        return jsonify({'logs': 'No hay logs disponibles'})

@app.route('/')
def index():
    """Página principal del panel de control"""
    return render_template('control-panel.html')

if __name__ == '__main__':
    try:
        log_action("SYSTEM", "Panel de Control", "Iniciando...")
        print("\n" + "="*60)
        print("Panel de Control - Combat Arms Reforged")
        print("="*60)
        print("\n✅ Accede a: http://localhost:8000")
        print("✅ O desde otro PC: http://[IP_VPS]:8000")
        print("\n📝 Presiona CTRL+C para salir")
        print("="*60 + "\n")
        
        app.run(host='0.0.0.0', port=8000, debug=False, use_reloader=False)
    except Exception as e:
        print(f"\n❌ Error: {str(e)}")
        log_action("ERROR", "SYSTEM", str(e))
        input("Presiona Enter para salir...")

