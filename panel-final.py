#!/usr/bin/env python3
"""
Panel de Control - Combat Arms Reforged
Todo manejado desde Python, sin necesidad de terminal
"""

import tkinter as tk
from tkinter import ttk, messagebox
import subprocess
import threading
import os
from datetime import datetime
import time
import webbrowser
import sys

class ServerPanel:
    def __init__(self, root):
        self.root = root
        self.root.title("Panel de Control - Combat Arms Reforged")
        self.root.geometry("1300x900")
        self.root.configure(bg="#0d1525")
        
        # Rutas
        self.PROJECT_PATH = r'C:\Users\USUARIO\Downloads\src_18ed106d\project'
        self.BACKEND_PATH = os.path.join(self.PROJECT_PATH, 'server')
        
        # Procesos independientes
        self.processes = {'frontend': None, 'backend': None}
        self.process_info = {
            'frontend': {'status': 'stopped', 'pid': None, 'started': None},
            'backend': {'status': 'stopped', 'pid': None, 'started': None}
        }
        
        self.create_ui()
        self.monitor_processes()
    
    def create_ui(self):
        """Crea la interfaz"""
        
        # Header
        header = tk.Frame(self.root, bg="#1a2332")
        header.pack(fill=tk.X)
        
        tk.Label(header, text="🖥️ Panel de Control", font=("Arial", 26, "bold"), 
                fg="#00bfff", bg="#1a2332").pack(side=tk.LEFT, padx=20, pady=15)
        tk.Label(header, text="Combat Arms Reforged", font=("Arial", 12), 
                fg="#888", bg="#1a2332").pack(side=tk.LEFT, padx=10)
        
        # Botones principales
        btn_frame = tk.Frame(self.root, bg="#0d1525")
        btn_frame.pack(fill=tk.X, padx=20, pady=15)
        
        tk.Button(btn_frame, text="▶️  INICIAR TODO", font=("Arial", 12, "bold"),
                 bg="#22c55e", fg="white", command=self.start_all, 
                 padx=20, pady=10, relief=tk.FLAT, cursor="hand2").pack(side=tk.LEFT, padx=5)
        
        tk.Button(btn_frame, text="⏹️  DETENER TODO", font=("Arial", 12, "bold"),
                 bg="#ef4444", fg="white", command=self.stop_all, 
                 padx=20, pady=10, relief=tk.FLAT, cursor="hand2").pack(side=tk.LEFT, padx=5)
        
        tk.Button(btn_frame, text="🔄 REINICIAR TODO", font=("Arial", 12, "bold"),
                 bg="#f59e0b", fg="white", command=self.restart_all, 
                 padx=20, pady=10, relief=tk.FLAT, cursor="hand2").pack(side=tk.LEFT, padx=5)
        
        # Contenedor principal
        main = tk.Frame(self.root, bg="#0d1525")
        main.pack(fill=tk.BOTH, expand=True, padx=20, pady=10)
        
        # FRONTEND
        self.create_card(main, 0, 'frontend', '🌐 FRONTEND', 'http://localhost:5173')
        
        # BACKEND
        self.create_card(main, 1, 'backend', '⚡ BACKEND', 'http://localhost:5173/api')
        
        # LOGS
        log_frame = tk.LabelFrame(self.root, text="📋 Logs en vivo", 
                                 font=("Arial", 12, "bold"), bg="#1a2332", fg="#00bfff",
                                 padx=10, pady=10, relief=tk.FLAT)
        log_frame.pack(fill=tk.BOTH, expand=True, padx=20, pady=10)
        
        scrollbar = tk.Scrollbar(log_frame)
        scrollbar.pack(side=tk.RIGHT, fill=tk.Y)
        
        self.log_text = tk.Text(log_frame, height=15, bg="#0d1525", fg="#22c55e",
                               font=("Courier", 9), yscrollcommand=scrollbar.set)
        self.log_text.pack(fill=tk.BOTH, expand=True)
        scrollbar.config(command=self.log_text.yview)
        
        self.log_text.tag_config('frontend', foreground='#00bfff')
        self.log_text.tag_config('backend', foreground='#f59e0b')
        self.log_text.tag_config('success', foreground='#22c55e')
        self.log_text.tag_config('error', foreground='#ef4444')
        
        self.log("=== Panel iniciado ===", "success")
        self.log("Haz click en INICIAR TODO para comenzar", "info")
    
    def create_card(self, parent, col, service_id, title, url):
        """Crea una tarjeta de servicio"""
        
        card = tk.Frame(parent, bg="#1a2332", relief=tk.RAISED, bd=1, padx=15, pady=15)
        card.grid(row=0, column=col, sticky="nsew", padx=10)
        parent.grid_columnconfigure(col, weight=1)
        
        # Título
        tk.Label(card, text=title, font=("Arial", 16, "bold"), 
                fg="#00bfff", bg="#1a2332").pack(anchor="w")
        
        # Estado
        state_frame = tk.Frame(card, bg="#1a2332")
        state_frame.pack(anchor="w", pady=10)
        
        tk.Label(state_frame, text="Estado: ", font=("Arial", 10), 
                fg="#999", bg="#1a2332").pack(side=tk.LEFT)
        
        self.state_labels = {} if not hasattr(self, 'state_labels') else self.state_labels
        state_val = tk.Label(state_frame, text="🔴 DETENIDO", font=("Arial", 10, "bold"),
                           fg="#ef4444", bg="#1a2332")
        state_val.pack(side=tk.LEFT, padx=5)
        self.state_labels[service_id] = state_val
        
        # Info
        info_frame = tk.Frame(card, bg="#0d1320", padx=10, pady=10)
        info_frame.pack(fill=tk.X, pady=10)
        
        self.pid_labels = {} if not hasattr(self, 'pid_labels') else self.pid_labels
        pid_l = tk.Label(info_frame, text="PID: -", font=("Arial", 9), 
                       fg="#666", bg="#0d1320")
        pid_l.pack(anchor="w", pady=2)
        self.pid_labels[service_id] = pid_l
        
        self.time_labels = {} if not hasattr(self, 'time_labels') else self.time_labels
        time_l = tk.Label(info_frame, text="Iniciado: -", font=("Arial", 9), 
                        fg="#666", bg="#0d1320")
        time_l.pack(anchor="w", pady=2)
        self.time_labels[service_id] = time_l
        
        url_l = tk.Label(info_frame, text=f"URL: {url}", font=("Arial", 9), 
                       fg="#666", bg="#0d1320")
        url_l.pack(anchor="w", pady=2)
        
        # Botones
        btn_frame = tk.Frame(card, bg="#1a2332")
        btn_frame.pack(fill=tk.X, pady=10)
        
        tk.Button(btn_frame, text="▶️ Iniciar", font=("Arial", 9, "bold"), 
                 bg="#22c55e", fg="white", relief=tk.FLAT, cursor="hand2",
                 command=lambda: self.start_service(service_id)).pack(side=tk.LEFT, 
                 padx=2, fill=tk.X, expand=True)
        
        tk.Button(btn_frame, text="🔄 Reiniciar", font=("Arial", 9, "bold"), 
                 bg="#f59e0b", fg="white", relief=tk.FLAT, cursor="hand2",
                 command=lambda: self.restart_service(service_id)).pack(side=tk.LEFT, 
                 padx=2, fill=tk.X, expand=True)
        
        tk.Button(btn_frame, text="⏹️ Detener", font=("Arial", 9, "bold"), 
                 bg="#ef4444", fg="white", relief=tk.FLAT, cursor="hand2",
                 command=lambda: self.stop_service(service_id)).pack(side=tk.LEFT, 
                 padx=2, fill=tk.X, expand=True)
        
        tk.Button(btn_frame, text="🌐 Abrir", font=("Arial", 9, "bold"), 
                 bg="#8a2be2", fg="white", relief=tk.FLAT, cursor="hand2",
                 command=lambda: webbrowser.open(url)).pack(side=tk.LEFT, 
                 padx=2, fill=tk.X, expand=True)
    
    def start_service(self, service):
        """Inicia un servicio"""
        threading.Thread(target=self._start_thread, args=(service,), daemon=True).start()
    
    def _start_thread(self, service):
        """Thread para iniciar"""
        if self.process_info[service]['status'] == 'running':
            self.log(f"{service.upper()} ya está corriendo", service)
            return
        
        try:
            self.log(f"⏳ Iniciando {service.upper()}...", service)
            
            # Ambos usan el mismo servidor Node.js
            process = subprocess.Popen(
                ['node', 'server.js'],
                cwd=self.BACKEND_PATH,
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL
            )
            
            time.sleep(2)
            
            # Verificar si el proceso sigue vivo
            if process.poll() is not None:
                self.log(f"❌ Falló al iniciar. Verifica la BD.", service, 'error')
                self.process_info[service]['status'] = 'error'
                return
            
            self.processes[service] = process
            self.process_info[service]['pid'] = process.pid
            self.process_info[service]['started'] = datetime.now().strftime("%H:%M:%S")
            self.process_info[service]['status'] = 'running'
            
            self.log(f"✅ {service.upper()} iniciado (PID: {process.pid})", service, 'success')
            
            # Si es frontend, abrir navegador
            if service == 'frontend':
                time.sleep(1)
                webbrowser.open('http://localhost:5173')
                self.log("🌐 Navegador abierto", service)
            
        except Exception as e:
            self.log(f"❌ Error: {str(e)}", service, 'error')
            self.process_info[service]['status'] = 'error'
    
    def stop_service(self, service):
        """Detiene un servicio"""
        threading.Thread(target=self._stop_thread, args=(service,), daemon=True).start()
    
    def _stop_thread(self, service):
        """Thread para detener"""
        if self.process_info[service]['status'] == 'stopped':
            self.log(f"{service.upper()} no está corriendo", service)
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
            self.log(f"❌ Error: {str(e)}", service, 'error')
    
    def restart_service(self, service):
        """Reinicia"""
        self.stop_service(service)
        time.sleep(2)
        self.start_service(service)
    
    def start_all(self):
        """Inicia ambos"""
        self.log("🚀 Iniciando todos los servicios...", "info")
        self.start_service('frontend')
        time.sleep(1)
        self.start_service('backend')
    
    def stop_all(self):
        """Detiene ambos"""
        self.log("⛔ Deteniendo todos los servicios...", "info")
        self.stop_service('frontend')
        self.stop_service('backend')
    
    def restart_all(self):
        """Reinicia ambos"""
        self.stop_all()
        time.sleep(2)
        self.start_all()
    
    def monitor_processes(self):
        """Monitorea procesos cada segundo"""
        for service in ['frontend', 'backend']:
            status = self.process_info[service]['status']
            
            if status == 'running' and self.processes[service]:
                if self.processes[service].poll() is not None:
                    self.process_info[service]['status'] = 'stopped'
                    self.log(f"⚠️  {service.upper()} se detuvo inesperadamente", service)
                else:
                    self.state_labels[service].config(text="🟢 EJECUTANDO", fg="#22c55e")
                    self.pid_labels[service].config(text=f"PID: {self.process_info[service]['pid']}")
                    self.time_labels[service].config(text=f"Iniciado: {self.process_info[service]['started']}")
                    self.root.after(1000, self.monitor_processes)
                    return
            else:
                self.state_labels[service].config(text="🔴 DETENIDO", fg="#ef4444")
                self.pid_labels[service].config(text="PID: -")
                self.time_labels[service].config(text="Iniciado: -")
        
        self.root.after(1000, self.monitor_processes)
    
    def log(self, message, tag="info"):
        """Agrega mensaje al log"""
        timestamp = datetime.now().strftime("%H:%M:%S")
        self.log_text.config(state=tk.NORMAL)
        self.log_text.insert(tk.END, f"[{timestamp}] {message}\n", tag)
        self.log_text.see(tk.END)
        self.log_text.config(state=tk.DISABLED)

if __name__ == '__main__':
    root = tk.Tk()
    app = ServerPanel(root)
    root.mainloop()
