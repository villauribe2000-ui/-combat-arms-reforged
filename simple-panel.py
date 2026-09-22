#!/usr/bin/env python3
"""
Panel de Control Simplificado - Sin dependencias externas
Solo usa la librería estándar de Python
"""

import os
import subprocess
import time
from datetime import datetime
import socket
import sys

# Colores para la consola
class Colors:
    GREEN = '\033[92m'
    RED = '\033[91m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    END = '\033[0m'

# Rutas
PROJECT_PATH = r'C:\Users\USUARIO\Downloads\src_18ed106d\project'
BACKEND_PATH = os.path.join(PROJECT_PATH, 'server')

# Procesos globales
processes = {'backend': None}

def log(message, color=Colors.BLUE):
    """Imprime mensaje con timestamp"""
    timestamp = datetime.now().strftime("%H:%M:%S")
    print(f"{color}[{timestamp}] {message}{Colors.END}")

def clear():
    """Limpia la pantalla"""
    os.system('cls' if os.name == 'nt' else 'clear')

def start_backend():
    """Inicia el servidor backend"""
    global processes
    
    if processes['backend'] and processes['backend'].poll() is None:
        log("❌ Backend ya está corriendo", Colors.RED)
        return False
    
    try:
        log("⏳ Iniciando Backend...", Colors.YELLOW)
        
        if not os.path.exists(BACKEND_PATH):
            log(f"❌ Ruta no existe: {BACKEND_PATH}", Colors.RED)
            return False
        
        # Iniciar proceso
        process = subprocess.Popen(
            ['node', 'server.js'],
            cwd=BACKEND_PATH,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE
        )
        
        processes['backend'] = process
        time.sleep(2)
        
        if process.poll() is None:
            log(f"✅ Backend iniciado (PID: {process.pid})", Colors.GREEN)
            return True
        else:
            log("❌ Error al iniciar Backend", Colors.RED)
            return False
            
    except Exception as e:
        log(f"❌ Error: {str(e)}", Colors.RED)
        return False

def stop_backend():
    """Detiene el servidor backend"""
    global processes
    
    if not processes['backend']:
        log("❌ Backend no está corriendo", Colors.RED)
        return False
    
    try:
        log("⏳ Deteniendo Backend...", Colors.YELLOW)
        processes['backend'].terminate()
        processes['backend'].wait(timeout=5)
        processes['backend'] = None
        log("✅ Backend detenido", Colors.GREEN)
        return True
    except Exception as e:
        try:
            processes['backend'].kill()
            log("✅ Backend eliminado", Colors.GREEN)
        except:
            pass
        processes['backend'] = None
        return True

def restart_backend():
    """Reinicia el backend"""
    stop_backend()
    time.sleep(1)
    start_backend()

def get_status():
    """Obtiene el estado actual"""
    if processes['backend'] and processes['backend'].poll() is None:
        return "🟢 CORRIENDO"
    else:
        return "🔴 DETENIDO"

def show_menu():
    """Muestra el menú principal"""
    clear()
    print(f"\n{Colors.BLUE}{'='*60}")
    print("  Panel de Control - Combat Arms Reforged")
    print(f"{'='*60}{Colors.END}\n")
    
    print(f"  Backend: {get_status()}")
    print(f"  Ruta: {BACKEND_PATH}\n")
    
    print(f"{Colors.GREEN}Opciones:{Colors.END}")
    print("  1) Iniciar Backend")
    print("  2) Detener Backend")
    print("  3) Reiniciar Backend")
    print("  4) Ver status")
    print("  5) Salir")
    print(f"\n{Colors.BLUE}{'='*60}{Colors.END}\n")

def main():
    """Menú principal"""
    try:
        while True:
            show_menu()
            option = input(f"{Colors.YELLOW}Selecciona una opción (1-5): {Colors.END}")
            
            if option == '1':
                start_backend()
            elif option == '2':
                stop_backend()
            elif option == '3':
                restart_backend()
            elif option == '4':
                log(f"Estado: {get_status()}", Colors.BLUE)
            elif option == '5':
                log("Saliendo...", Colors.YELLOW)
                stop_backend()
                break
            else:
                log("Opción inválida", Colors.RED)
            
            input(f"\n{Colors.YELLOW}Presiona Enter para continuar...{Colors.END}")
    
    except KeyboardInterrupt:
        print(f"\n{Colors.YELLOW}Interrupción del usuario...{Colors.END}")
        stop_backend()
        sys.exit(0)
    except Exception as e:
        log(f"Error fatal: {str(e)}", Colors.RED)
        sys.exit(1)

if __name__ == '__main__':
    main()
