#!/usr/bin/env python3
"""
Panel de Control Profesional - Combat Arms Reforged
Gestión independiente de Frontend y Backend
"""

import tkinter as tk
from tkinter import ttk
import subprocess
import threading
import os
from datetime import datetime
import time
import webbrowser

class ServerPanel:
    def __init__(self, root):
        self.root = root
        self.root.title("Server Manager - Combat Arms Reforged")
        self.root.geometry("1200x800")
        self.root.configure(bg="#0d1525")
        
        # Rutas
        self.PROJECT_PATH = r'C:\Users\USUARIO\Downloads\src_18ed106d\project'
        self.FRONTEND_PATH = self.PROJECT_PATH
        self.BACKEND_PATH = os.path.join(self.PROJECT_PATH, 'server')
        
        # Procesos INDEPENDIENTES
        self.processes = {'frontend': None, 'backend': None}
        self.process_info = {
            'frontend': {'status': 'stopped', 'pid': None, 'started': None, 'port': 5173},
            'backend': {'status': 'stopped', 'pid': None, 'started': None, 'port': 5173}
        }
        
        self.create_ui()
        self.update_status()
    
    def create_ui(self):
        """Crea la interfaz gráfica"""
        
        # Header
        header = tk.Frame(self.root, bg="#1a2332", height=70)
        header.pack(fill=tk.X, padx=0, pady=0)
        
        title = tk.Label(header, text="🖥️ Server Manager", font=("Arial", 28, "bold"), 
                        fg="#00bfff", bg="#1a2332")
        title.pack(side=tk.LEFT, padx=20, pady=15)
        
        subtitle = tk.Label(header, text="Combat Arms Reforged - Gestión de Servicios", 
                           font=("Arial", 11), fg="#888", bg="#1a2332")
        subtitle.pack(side=tk.LEFT, padx=5)
        
        # Botones globales
        button_frame = tk.Frame(self.root, bg="#0d1525", height=60)
        button_frame.pack(fill=tk.X, padx=20, pady=15)
        
        tk.Button(button_frame, text="▶️  INICIAR TODO", font=("Arial", 11, "bold"),
                 bg="#22c55e", fg="white", command=self.start_all, 
                 padx=20, pady=10, relief=tk.FLAT, cursor="hand2").pack(side=tk.LEFT, padx=5)
        
        tk.Button(button_frame, text="⏹️  DETENER TODO", font=("Arial", 11, "bold"),
                 bg="#ef4444", fg="white", command=self.stop_all, 
                 padx=20, pady=10, relief=tk.FLAT, cursor="hand2").pack(side=tk.LEFT, padx=5)
        
        tk.Button(button_frame, text="🔄 REINICIAR TODO", font=("Arial", 11, "bold"),
                 bg="#f59e0b", fg="white", command=self.restart_all, 
                 padx=20, pady=10, relief=tk.FLAT, cursor="hand2").pack(side=tk.LEFT, padx=5)
        
        # Contenedor principal con 2 columnas
        main_container = tk.Frame(self.root, bg="#0d1525")
        main_container.pack(fill=tk.BOTH, expand=True, padx=20, pady=10)
        
        # FRONTEND
        self.create_service_panel(main_container, 0, 'frontend', '🌐 FRONTEND', 
                                 'Interfaz React/Vite', 5173)
        
        # BACKEND
        self.create_service_panel(main_container, 1, 'backend', '⚡ BACKEND', 
                                 'API Node.js Express', 5173)
        
        # LOGS COMBINADOS
        log_frame = tk.LabelFrame(self.root, text="📋 Logs - Actividad en tiempo real", 
                                 font=("Arial", 12, "bold"), bg="#1a2332", fg="#00bfff", 
                                 padx=10, pady=10, relief=tk.FLAT)
        log_frame.pack(fill=tk.BOTH, expand=True, padx=20, pady=10)
        
        scrollbar = tk.Scrollbar(log_frame)
        scrollbar.pack(side=tk.RIGHT, fill=tk.Y)
        
        self.log_text = tk.Text(log_frame, height=12, bg="#0d1525", fg="#22c55e",
                               font=("Courier", 9), yscrollcommand=scrollbar.set)
        self.log_text.pack(fill=tk.BOTH, expand=True)
        scrollbar.config(command=self.log_text.yview)
        
        self.log_text.tag_config('frontend', foreground='#00bfff')
        self.log_text.tag_config('backend', foreground='#f59e0b')
        self.log_text.tag_config('success', foreground='#22c55e')
        self.log_text.tag_config('error', foreground='#ef4444')
        
        self.log("=== Panel iniciado ===", "success")
    
    def create_service_panel(self, parent, col, service_id, title, desc, port):
        """Crea un panel para cada servicio"""
        
        panel = tk.Frame(parent, bg="#1a2332", relief=tk.RAISED, bd=1, padx=20, pady=20)
        panel.grid(row=0, column=col, sticky="nsew", padx=10)
        parent.grid_columnconfigure(col, weight=1)
        
        # Título
        tk.Label(panel, text=title, font=("Arial", 18, "bold"), fg="#00bfff", 
                bg="#1a2332").pack(anchor="w", pady=(0, 5))
        
        # Descripción
        tk.Label(panel, text=desc, font=("Arial", 10), fg="#888", 
                bg="#1a2332").pack(anchor="w", pady=(0, 15))
        
        # Estado
        state_frame = tk.Frame(panel, bg="#1a2332")
        state_frame.pack(anchor="w", pady=10)
        
        tk.Label(state_frame, text="Estado: ", font=("Arial", 10), fg="#999", 
                bg="#1a2332").pack(side=tk.LEFT)
        
        self.state_labels = {} if not hasattr(self, 'state_labels') else self.state_labels
        state_val = tk.Label(state_frame, text="🔴 DETENIDO", font=("Arial", 10, "bold"),
                           fg="#ef4444", bg="#1a2332")
        state_val.pack(side=tk.LEFT, padx=5)
        self.state_labels[service_id] = state_val
        
        # Información
        info_frame = tk.Frame(panel, bg="#0d1320", padx=10, pady=10)
        info_frame.pack(fill=tk.X, pady=10)
        
        self.pid_labels = {} if not hasattr(self, 'pid_labels') else self.pid_labels
        pid_label = tk.Label(info_frame, text="PID: -", font=("Arial", 9), 
                           fg="#666", bg="#0d1320")
        pid_label.pack(anchor="w", pady=3)
        self.pid_labels[service_id] = pid_label
        
        self.time_labels = {} if not hasattr(self, 'time_labels') else self.time_labels
        time_label = tk.Label(info_frame, text="Iniciado: -", font=("Arial", 9), 
                            fg="#666", bg="#0d1320")
        time_label.pack(anchor="w", pady=3)
        self.time_labels[service_id] = time_label
        
        port_label = tk.Label(info_frame, text=f"Puerto: {port}", font=("Arial", 9), 
                            fg="#666", bg="#0d1320")
        port_label.pack(anchor="w", pady=3)
        
        # Botones
        btn_frame = tk.Frame(panel, bg="#1a2332")
        btn_frame.pack(fill=tk.X, pady=15)
        
        tk.Button(btn_frame, text="▶️ Iniciar", font=("Arial", 10, "bold"), bg="#22c55e", 
                 fg="white", relief=tk.FLAT, cursor="hand2", 
                 command=lambda: self.start_service(service_id)).pack(side=tk.LEFT, 
                 padx=3, fill=tk.X, expand=True)
        
        tk.Button(btn_frame, text="🔄 Reiniciar", font=("Arial", 10, "bold"), bg="#f59e0b", 
                 fg="white", relief=tk.FLAT, cursor="hand2", 
                 command=lambda: self.restart_service(service_id)).pack(side=tk.LEFT, 
                 padx=3, fill=tk.X, expand=True)
        
        tk.Button(btn_frame, text="⏹️ Detener", font=("Arial", 10, "bold"), bg="#ef4444", 
                 fg="white", relief=tk.FLAT, cursor="hand2", 
                 command=lambda: self.stop_service(service_id)).pack(side=tk.LEFT, 
                 padx=3, fill=tk.X, expand=True)
        
        tk.Button(btn_frame, text="🌐 Abrir", font=("Arial", 10, "bold"), bg="#8a2be2", 
                 fg="white", relief=tk.FLAT, cursor="hand2", 
                 command=lambda: self.open_browser(service_id)).pack(side=tk.LEFT, 
                 padx=3, fill=tk.X, expand=True)
    
    def start_service(self, service):
        """Inicia UN servicio (independiente)"""
        threading.Thread(target=self._start_thread, args=(service,), daemon=True).start()
    
    def _start_thread(self, service):
        """Thread para iniciar UN servicio"""
        if self.process_info[service]['status'] == 'running':
            self.log(f"⚠️  {service.upper()} ya está corriendo", service)
            return
        
        try:
            self.log(f"⏳ Iniciando {service.upper()}...", service)
            
            if service == 'frontend':
                # Compilar frontend primero
                self.log(f"📦 Compilando {service.upper()}...", service)
                compile_proc = subprocess.run(
                    ['npm', 'run', 'build'],
                    cwd=self.FRONTEND_PATH,
                    capture_output=True,
                    shell=True,
                    timeout=60
                )
                if compile_proc.returncode != 0:
                    self.log(f"⚠️  Error compilando, pero continuando...", service)
                
                # Servir con node desde el servidor
                self.log(f"✅ Compilado, iniciando servidor...", service)
                process = subprocess.Popen(
                    ['node', 'server.js'],
                    cwd=self.BACKEND_PATH,
                    stdout=subprocess.PIPE,
                    stderr=subprocess.PIPE,
                    shell=True
                )
            else:  # backend
                # node server.js
                process = subprocess.Popen(
                    ['node', 'server.js'],
                    cwd=self.BACKEND_PATH,
                    stdout=subprocess.PIPE,
                    stderr=subprocess.PIPE,
                    shell=True
                )
            
            time.sleep(1)
            
            if process.poll() is not None:
                # Proceso ya terminó, hay error
                self.log(f"❌ Proceso terminó inmediatamente. Verifica la configuración.", service, 'error')
                self.process_info[service]['status'] = 'error'
                return
            
            self.processes[service] = process
            self.process_info[service]['pid'] = process.pid
            self.process_info[service]['started'] = datetime.now().strftime("%H:%M:%S")
            self.process_info[service]['status'] = 'running'
            
            self.log(f"✅ {service.upper()} iniciado (PID: {process.pid})", service, 'success')
            
        except Exception as e:
            self.log(f"❌ Error: {str(e)}", service, 'error')
            self.process_info[service]['status'] = 'error'
        
        self.update_status()
    
    def stop_service(self, service):
        """Detiene UN servicio (independiente)"""
        threading.Thread(target=self._stop_thread, args=(service,), daemon=True).start()
    
    def _stop_thread(self, service):
        """Thread para detener UN servicio"""
        if self.process_info[service]['status'] == 'stopped':
            self.log(f"⚠️  {service.upper()} no está corriendo", service)
            return
        
        try:
            self.log(f"⏳ Deteniendo {service.upper()}...", service)
            
            if self.processes[service]:
                self.processes[service].terminate()
                try:
                    self.processes[service].wait(timeout=5)
                except:
                    self.processes[service].kill()
            
            self.processes[service] = None
            self.process_info[service]['status'] = 'stopped'
            self.process_info[service]['pid'] = None
            
            self.log(f"✅ {service.upper()} detenido", service, 'success')
            
        except Exception as e:
            self.log(f"❌ Error al detener: {str(e)}", service, 'error')
            self.processes[service] = None
        
        self.update_status()
    
    def restart_service(self, service):
        """Reinicia UN servicio"""
        self.stop_service(service)
        time.sleep(2)
        self.start_service(service)
    
    def start_all(self):
        """Inicia AMBOS servicios por separado"""
        self.start_service('frontend')
        time.sleep(1)
        self.start_service('backend')
    
    def stop_all(self):
        """Detiene AMBOS servicios"""
        self.stop_service('frontend')
        self.stop_service('backend')
    
    def restart_all(self):
        """Reinicia AMBOS servicios"""
        self.stop_all()
        time.sleep(2)
        self.start_all()
    
    def open_browser(self, service):
        """Abre el navegador en el servicio"""
        if self.process_info[service]['status'] != 'running':
            self.log(f"⚠️  {service.upper()} no está ejecutando", service)
            return
        
        port = self.process_info[service]['port']
        url = f'http://localhost:{port}'
        webbrowser.open(url)
        self.log(f"🌐 Abriendo {url}", service)
    
    def update_status(self):
        """Actualiza el estado cada segundo"""
        for service in ['frontend', 'backend']:
            status = self.process_info[service]['status']
            
            if status == 'running':
                if self.processes[service] and self.processes[service].poll() is None:
                    self.state_labels[service].config(text="🟢 EJECUTANDO", fg="#22c55e")
                else:
                    # Proceso murió
                    self.process_info[service]['status'] = 'stopped'
                    self.processes[service] = None
                    self.state_labels[service].config(text="🔴 DETENIDO", fg="#ef4444")
            else:
                self.state_labels[service].config(text="🔴 DETENIDO", fg="#ef4444")
            
            self.pid_labels[service].config(
                text=f"PID: {self.process_info[service]['pid'] or '-'}"
            )
            self.time_labels[service].config(
                text=f"Iniciado: {self.process_info[service]['started'] or '-'}"
            )
        
        self.root.after(1000, self.update_status)
    
    def log(self, message, service="system", level="info"):
        """Agrega mensaje al log con etiqueta de servicio"""
        timestamp = datetime.now().strftime("%H:%M:%S")
        
        tag = service if service in ['frontend', 'backend'] else level
        
        self.log_text.config(state=tk.NORMAL)
        self.log_text.insert(tk.END, f"[{timestamp}] ", "")
        self.log_text.insert(tk.END, f"{message}\n", tag)
        self.log_text.see(tk.END)
        self.log_text.config(state=tk.DISABLED)

if __name__ == '__main__':
    root = tk.Tk()
    app = ServerPanel(root)
    root.mainloop()
