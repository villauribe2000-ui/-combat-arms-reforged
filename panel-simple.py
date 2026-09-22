#!/usr/bin/env python3
import tkinter as tk
from tkinter import ttk
import subprocess
import threading
import os
from datetime import datetime
import time
import webbrowser

class SimplePanel:
    def __init__(self, root):
        self.root = root
        self.root.title("🖥️ Panel de Control - Combat Arms")
        self.root.geometry("1200x700")
        self.root.configure(bg="#0a0e1a")
        
        self.PROJECT = r'C:\Users\USUARIO\Downloads\src_18ed106d\project'
        self.BACKEND = os.path.join(self.PROJECT, 'server')
        
        self.procs = {'frontend': None, 'backend': None}
        self.status = {'frontend': 'stopped', 'backend': 'stopped'}
        
        self.setup_ui()
        self.check_status()
    
    def setup_ui(self):
        # Header
        header = tk.Frame(self.root, bg="#1a2537")
        header.pack(fill=tk.X)
        tk.Label(header, text="⚙️ PANEL DE CONTROL", font=("Arial", 20, "bold"), 
                fg="#00d9ff", bg="#1a2537").pack(pady=15)
        
        # Botones de control
        ctrl = tk.Frame(self.root, bg="#0a0e1a")
        ctrl.pack(fill=tk.X, padx=20, pady=10)
        
        tk.Button(ctrl, text="▶️ INICIAR TODO", font=("Arial", 11, "bold"),
                 bg="#00ff00", fg="black", relief=tk.FLAT, padx=20, pady=8,
                 command=self.init_all).pack(side=tk.LEFT, padx=5)
        
        tk.Button(ctrl, text="⏹️ DETENER TODO", font=("Arial", 11, "bold"),
                 bg="#ff0000", fg="white", relief=tk.FLAT, padx=20, pady=8,
                 command=self.stop_all).pack(side=tk.LEFT, padx=5)
        
        tk.Button(ctrl, text="🔄 REINICIAR TODO", font=("Arial", 11, "bold"),
                 bg="#ffaa00", fg="black", relief=tk.FLAT, padx=20, pady=8,
                 command=self.restart_all).pack(side=tk.LEFT, padx=5)
        
        # Contenedor principal
        main = tk.Frame(self.root, bg="#0a0e1a")
        main.pack(fill=tk.BOTH, expand=True, padx=20, pady=10)
        
        # FRONTEND
        self.make_service_box(main, 0, 'frontend', '🌐 FRONTEND - React/Vite',
                            'npm run dev',
                            'http://localhost:5173')
        
        # BACKEND
        self.make_service_box(main, 1, 'backend', '⚡ BACKEND - Node.js',
                            'node server.js',
                            'http://localhost:5173/api')
        
        # Logs
        log_lbl = tk.Label(self.root, text="📋 CONSOLA DE COMANDOS", 
                          font=("Arial", 11, "bold"), fg="#00d9ff", bg="#0a0e1a")
        log_lbl.pack(anchor="w", padx=20, pady=(10, 5))
        
        log_fr = tk.Frame(self.root, bg="#1a2537", height=200)
        log_fr.pack(fill=tk.BOTH, expand=True, padx=20, pady=(0, 20))
        
        sb = tk.Scrollbar(log_fr)
        sb.pack(side=tk.RIGHT, fill=tk.Y)
        
        self.console = tk.Text(log_fr, height=10, bg="#0d1117", fg="#00ff00",
                              font=("Courier New", 9), yscrollcommand=sb.set)
        self.console.pack(fill=tk.BOTH, expand=True)
        sb.config(command=self.console.yview)
        
        self.log("=== PANEL INICIADO ===")
    
    def make_service_box(self, parent, col, sid, title, cmd, url):
        box = tk.Frame(parent, bg="#1a2537", relief=tk.RAISED, bd=1, padx=15, pady=15)
        box.grid(row=0, column=col, sticky="nsew", padx=10)
        parent.grid_columnconfigure(col, weight=1)
        
        # Título
        tk.Label(box, text=title, font=("Arial", 13, "bold"), 
                fg="#00d9ff", bg="#1a2537").pack(anchor="w", pady=(0, 10))
        
        # Estado
        state_fr = tk.Frame(box, bg="#1a2537")
        state_fr.pack(anchor="w", pady=5)
        tk.Label(state_fr, text="Estado: ", font=("Arial", 9), 
                fg="#888", bg="#1a2537").pack(side=tk.LEFT)
        
        if not hasattr(self, 'state_lbl'):
            self.state_lbl = {}
        st = tk.Label(state_fr, text="🔴 DETENIDO", font=("Arial", 9, "bold"),
                     fg="#ff0000", bg="#1a2537")
        st.pack(side=tk.LEFT, padx=5)
        self.state_lbl[sid] = st
        
        # Comando
        cmd_fr = tk.Frame(box, bg="#0d1117", padx=10, pady=8)
        cmd_fr.pack(fill=tk.X, pady=10)
        tk.Label(cmd_fr, text="Comando:", font=("Arial", 8), 
                fg="#666", bg="#0d1117").pack(anchor="w")
        tk.Label(cmd_fr, text=cmd, font=("Courier New", 8), 
                fg="#00ff00", bg="#0d1117").pack(anchor="w")
        
        # Info
        info_fr = tk.Frame(box, bg="#0d1117", padx=10, pady=8)
        info_fr.pack(fill=tk.X, pady=10)
        
        if not hasattr(self, 'pid_lbl'):
            self.pid_lbl = {}
        if not hasattr(self, 'time_lbl'):
            self.time_lbl = {}
        
        pid_l = tk.Label(info_fr, text="PID: -", font=("Arial", 8), 
                       fg="#666", bg="#0d1117")
        pid_l.pack(anchor="w", pady=2)
        self.pid_lbl[sid] = pid_l
        
        time_l = tk.Label(info_fr, text="Iniciado: -", font=("Arial", 8), 
                        fg="#666", bg="#0d1117")
        time_l.pack(anchor="w", pady=2)
        self.time_lbl[sid] = time_l
        
        tk.Label(info_fr, text=f"URL: {url}", font=("Arial", 8), 
                fg="#666", bg="#0d1117").pack(anchor="w", pady=2)
        
        # Botones
        btn_fr = tk.Frame(box, bg="#1a2537")
        btn_fr.pack(fill=tk.X, pady=10)
        
        tk.Button(btn_fr, text="▶️ Iniciar", font=("Arial", 8, "bold"), 
                 bg="#00ff00", fg="black", relief=tk.FLAT, cursor="hand2",
                 command=lambda: self.start(sid, cmd)).pack(side=tk.LEFT, padx=2, fill=tk.X, expand=True)
        
        tk.Button(btn_fr, text="🔄 Reiniciar", font=("Arial", 8, "bold"), 
                 bg="#ffaa00", fg="black", relief=tk.FLAT, cursor="hand2",
                 command=lambda: self.restart(sid, cmd)).pack(side=tk.LEFT, padx=2, fill=tk.X, expand=True)
        
        tk.Button(btn_fr, text="⏹️ Detener", font=("Arial", 8, "bold"), 
                 bg="#ff0000", fg="white", relief=tk.FLAT, cursor="hand2",
                 command=lambda: self.stop(sid)).pack(side=tk.LEFT, padx=2, fill=tk.X, expand=True)
        
        tk.Button(btn_fr, text="🌐 Abrir", font=("Arial", 8, "bold"), 
                 bg="#0066ff", fg="white", relief=tk.FLAT, cursor="hand2",
                 command=lambda: webbrowser.open(url)).pack(side=tk.LEFT, padx=2, fill=tk.X, expand=True)
    
    def start(self, sid, cmd):
        threading.Thread(target=self._start_bg, args=(sid, cmd), daemon=True).start()
    
    def _start_bg(self, sid, cmd):
        if self.status[sid] == 'running':
            self.log(f"⚠️  {sid.upper()} ya está ejecutando")
            return
        
        try:
            path = self.BACKEND if sid == 'backend' else self.PROJECT
            
            if sid == 'frontend':
                path = self.PROJECT
                cmd_full = f'cd {path} && npm run build && cd {self.BACKEND} && node server.js'
            else:
                cmd_full = f'cd {path} && {cmd}'
            
            self.log(f"▶️  INICIANDO {sid.upper()}")
            self.log(f"📍 Ruta: {path}")
            self.log(f"⌨️  Comando: {cmd}")
            
            proc = subprocess.Popen(
                cmd_full,
                shell=True,
                cwd=path,
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL
            )
            
            time.sleep(2)
            
            if proc.poll() is not None:
                self.log(f"❌ ERROR: {sid.upper()} no se pudo iniciar")
                self.status[sid] = 'error'
                return
            
            self.procs[sid] = proc
            self.status[sid] = 'running'
            self.log(f"✅ {sid.upper()} iniciado (PID: {proc.pid})")
            self.state_lbl[sid].config(text="🟢 EJECUTANDO", fg="#00ff00")
            self.pid_lbl[sid].config(text=f"PID: {proc.pid}")
            self.time_lbl[sid].config(text=f"Iniciado: {datetime.now().strftime('%H:%M:%S')}")
            
            if sid == 'frontend':
                time.sleep(1)
                webbrowser.open('http://localhost:5173')
                self.log("🌐 Navegador abierto")
        
        except Exception as e:
            self.log(f"❌ ERROR: {str(e)}")
    
    def stop(self, sid):
        threading.Thread(target=self._stop_bg, args=(sid,), daemon=True).start()
    
    def _stop_bg(self, sid):
        if self.status[sid] == 'stopped':
            self.log(f"⚠️  {sid.upper()} no está ejecutando")
            return
        
        try:
            self.log(f"⏹️  Deteniendo {sid.upper()}...")
            if self.procs[sid]:
                self.procs[sid].terminate()
                try:
                    self.procs[sid].wait(timeout=5)
                except:
                    self.procs[sid].kill()
            
            self.procs[sid] = None
            self.status[sid] = 'stopped'
            self.log(f"✅ {sid.upper()} detenido")
            self.state_lbl[sid].config(text="🔴 DETENIDO", fg="#ff0000")
            self.pid_lbl[sid].config(text="PID: -")
            self.time_lbl[sid].config(text="Iniciado: -")
        
        except Exception as e:
            self.log(f"❌ ERROR: {str(e)}")
    
    def restart(self, sid, cmd):
        self.stop(sid)
        time.sleep(2)
        self.start(sid, cmd)
    
    def init_all(self):
        self.start('frontend', 'npm run dev')
        time.sleep(1)
        self.start('backend', 'node server.js')
    
    def stop_all(self):
        self.stop('frontend')
        self.stop('backend')
    
    def restart_all(self):
        self.stop_all()
        time.sleep(2)
        self.init_all()
    
    def check_status(self):
        for sid in ['frontend', 'backend']:
            if self.status[sid] == 'running' and self.procs[sid]:
                if self.procs[sid].poll() is not None:
                    self.status[sid] = 'stopped'
                    self.state_lbl[sid].config(text="🔴 DETENIDO", fg="#ff0000")
        
        self.root.after(1000, self.check_status)
    
    def log(self, msg):
        ts = datetime.now().strftime("%H:%M:%S")
        self.console.config(state=tk.NORMAL)
        self.console.insert(tk.END, f"[{ts}] {msg}\n")
        self.console.see(tk.END)
        self.console.config(state=tk.DISABLED)

if __name__ == '__main__':
    root = tk.Tk()
    app = SimplePanel(root)
    root.mainloop()
