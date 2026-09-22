#!/usr/bin/env python3
import tkinter as tk
import subprocess
import threading
import os
from datetime import datetime
import time
import webbrowser

class ServerPanel:
    def __init__(self, root):
        self.root = root
        self.root.title("Panel de Control - Combat Arms Reforged")
        self.root.geometry("1300x900")
        self.root.configure(bg="#0d1525")
        
        self.PROJECT_PATH = r'C:\Users\USUARIO\Downloads\src_18ed106d\project'
        self.BACKEND_PATH = os.path.join(self.PROJECT_PATH, 'server')
        
        self.processes = {'frontend': None, 'backend': None}
        self.process_info = {
            'frontend': {'status': 'stopped', 'pid': None, 'started': None},
            'backend': {'status': 'stopped', 'pid': None, 'started': None}
        }
        
        self.create_ui()
        self.monitor()
    
    def create_ui(self):
        header = tk.Frame(self.root, bg="#1a2332")
        header.pack(fill=tk.X)
        
        tk.Label(header, text="🖥️ Panel de Control", font=("Arial", 26, "bold"), 
                fg="#00bfff", bg="#1a2332").pack(side=tk.LEFT, padx=20, pady=15)
        
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
        
        main = tk.Frame(self.root, bg="#0d1525")
        main.pack(fill=tk.BOTH, expand=True, padx=20, pady=10)
        
        self.create_card(main, 0, 'frontend', '🌐 FRONTEND')
        self.create_card(main, 1, 'backend', '⚡ BACKEND')
        
        log_frame = tk.LabelFrame(self.root, text="📋 Logs", 
                                 font=("Arial", 12, "bold"), bg="#1a2332", fg="#00bfff",
                                 padx=10, pady=10, relief=tk.FLAT)
        log_frame.pack(fill=tk.BOTH, expand=True, padx=20, pady=10)
        
        scrollbar = tk.Scrollbar(log_frame)
        scrollbar.pack(side=tk.RIGHT, fill=tk.Y)
        
        self.log_text = tk.Text(log_frame, height=12, bg="#0d1525", fg="#22c55e",
                               font=("Courier", 9), yscrollcommand=scrollbar.set)
        self.log_text.pack(fill=tk.BOTH, expand=True)
        scrollbar.config(command=self.log_text.yview)
        
        self.log("=== Panel iniciado ===")
    
    def create_card(self, parent, col, service_id, title):
        card = tk.Frame(parent, bg="#1a2332", relief=tk.RAISED, bd=1, padx=15, pady=15)
        card.grid(row=0, column=col, sticky="nsew", padx=10)
        parent.grid_columnconfigure(col, weight=1)
        
        tk.Label(card, text=title, font=("Arial", 16, "bold"), 
                fg="#00bfff", bg="#1a2332").pack(anchor="w")
        
        state_frame = tk.Frame(card, bg="#1a2332")
        state_frame.pack(anchor="w", pady=10)
        
        tk.Label(state_frame, text="Estado: ", font=("Arial", 10), 
                fg="#999", bg="#1a2332").pack(side=tk.LEFT)
        
        if not hasattr(self, 'state_labels'):
            self.state_labels = {}
        
        state_val = tk.Label(state_frame, text="🔴 DETENIDO", font=("Arial", 10, "bold"),
                           fg="#ef4444", bg="#1a2332")
        state_val.pack(side=tk.LEFT, padx=5)
        self.state_labels[service_id] = state_val
        
        info_frame = tk.Frame(card, bg="#0d1320", padx=10, pady=10)
        info_frame.pack(fill=tk.X, pady=10)
        
        if not hasattr(self, 'pid_labels'):
            self.pid_labels = {}
        if not hasattr(self, 'time_labels'):
            self.time_labels = {}
        
        pid_l = tk.Label(info_frame, text="PID: -", font=("Arial", 9), 
                       fg="#666", bg="#0d1320")
        pid_l.pack(anchor="w", pady=2)
        self.pid_labels[service_id] = pid_l
        
        time_l = tk.Label(info_frame, text="Iniciado: -", font=("Arial", 9), 
                        fg="#666", bg="#0d1320")
        time_l.pack(anchor="w", pady=2)
        self.time_labels[service_id] = time_l
        
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
                 command=lambda: webbrowser.open('http://localhost:5173')).pack(side=tk.LEFT, 
                 padx=2, fill=tk.X, expand=True)
    
    def start_service(self, service):
        threading.Thread(target=self._start_thread, args=(service,), daemon=True).start()
    
    def _start_thread(self, service):
        if self.process_info[service]['status'] == 'running':
            self.log(f"{service.upper()} ya está corriendo")
            return
        
        try:
            self.log(f"⏳ Iniciando {service.upper()}...")
            
            process = subprocess.Popen(
                ['node', 'server.js'],
                cwd=self.BACKEND_PATH,
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL
            )
            
            time.sleep(2)
            
            if process.poll() is not None:
                self.log(f"❌ {service.upper()} falló al iniciar")
                return
            
            self.processes[service] = process
            self.process_info[service]['pid'] = process.pid
            self.process_info[service]['started'] = datetime.now().strftime("%H:%M:%S")
            self.process_info[service]['status'] = 'running'
            
            self.log(f"✅ {service.upper()} iniciado (PID: {process.pid})")
            
            if service == 'frontend':
                time.sleep(1)
                webbrowser.open('http://localhost:5173')
            
        except Exception as e:
            self.log(f"❌ Error: {str(e)}")
    
    def stop_service(self, service):
        threading.Thread(target=self._stop_thread, args=(service,), daemon=True).start()
    
    def _stop_thread(self, service):
        if self.process_info[service]['status'] == 'stopped':
            self.log(f"{service.upper()} no está corriendo")
            return
        
        try:
            self.log(f"⏳ Deteniendo {service.upper()}...")
            
            if self.processes[service]:
                self.processes[service].terminate()
                try:
                    self.processes[service].wait(timeout=5)
                except:
                    self.processes[service].kill()
            
            self.processes[service] = None
            self.process_info[service]['status'] = 'stopped'
            self.process_info[service]['pid'] = None
            
            self.log(f"✅ {service.upper()} detenido")
            
        except Exception as e:
            self.log(f"❌ Error: {str(e)}")
    
    def restart_service(self, service):
        self.stop_service(service)
        time.sleep(2)
        self.start_service(service)
    
    def start_all(self):
        self.log("🚀 Iniciando servicios...")
        self.start_service('frontend')
        time.sleep(1)
        self.start_service('backend')
    
    def stop_all(self):
        self.log("⛔ Deteniendo servicios...")
        self.stop_service('frontend')
        self.stop_service('backend')
    
    def restart_all(self):
        self.stop_all()
        time.sleep(2)
        self.start_all()
    
    def monitor(self):
        for service in ['frontend', 'backend']:
            if self.process_info[service]['status'] == 'running' and self.processes[service]:
                if self.processes[service].poll() is not None:
                    self.process_info[service]['status'] = 'stopped'
                    self.log(f"⚠️  {service.upper()} se detuvo")
                else:
                    self.state_labels[service].config(text="🟢 EJECUTANDO", fg="#22c55e")
                    self.pid_labels[service].config(text=f"PID: {self.process_info[service]['pid']}")
                    self.time_labels[service].config(text=f"Iniciado: {self.process_info[service]['started']}")
            else:
                self.state_labels[service].config(text="🔴 DETENIDO", fg="#ef4444")
                self.pid_labels[service].config(text="PID: -")
                self.time_labels[service].config(text="Iniciado: -")
        
        self.root.after(1000, self.monitor)
    
    def log(self, message):
        timestamp = datetime.now().strftime("%H:%M:%S")
        self.log_text.config(state=tk.NORMAL)
        self.log_text.insert(tk.END, f"[{timestamp}] {message}\n")
        self.log_text.see(tk.END)
        self.log_text.config(state=tk.DISABLED)

if __name__ == '__main__':
    root = tk.Tk()
    app = ServerPanel(root)
    root.mainloop()
