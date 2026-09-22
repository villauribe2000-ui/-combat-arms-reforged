#!/usr/bin/env python3
import tkinter as tk
from tkinter import ttk
import subprocess
import threading
import os
from datetime import datetime

class Console:
    def __init__(self, root):
        self.root = root
        self.root.title("🖥️ Consola - Combat Arms")
        self.root.geometry("1400x800")
        self.root.configure(bg="#0a0e1a")
        
        self.PROJECT = r'C:\Users\USUARIO\Downloads\src_18ed106d\project'
        self.BACKEND = os.path.join(self.PROJECT, 'server')
        
        self.procs = {'frontend': None, 'backend': None}
        
        self.create_ui()
    
    def create_ui(self):
        # Header
        hdr = tk.Frame(self.root, bg="#1a2537")
        hdr.pack(fill=tk.X)
        tk.Label(hdr, text="⚙️ CONSOLA DE COMANDOS", font=("Arial", 18, "bold"), 
                fg="#00ff00", bg="#1a2537").pack(pady=10)
        
        # Estado
        state_fr = tk.Frame(self.root, bg="#0a0e1a")
        state_fr.pack(fill=tk.X, padx=10, pady=5)
        
        tk.Label(state_fr, text="Estado: ", font=("Arial", 10, "bold"), 
                fg="#fff", bg="#0a0e1a").pack(side=tk.LEFT, padx=5)
        
        self.frontend_state = tk.Label(state_fr, text="🔴 FRONTEND OFF", font=("Arial", 10, "bold"), 
                                      fg="#ff0000", bg="#0a0e1a")
        self.frontend_state.pack(side=tk.LEFT, padx=10)
        
        self.backend_state = tk.Label(state_fr, text="🔴 BACKEND OFF", font=("Arial", 10, "bold"), 
                                     fg="#ff0000", bg="#0a0e1a")
        self.backend_state.pack(side=tk.LEFT, padx=10)
        
        # Botones
        btn_fr = tk.Frame(self.root, bg="#0a0e1a")
        btn_fr.pack(fill=tk.X, padx=10, pady=10)
        
        # Instalación
        tk.Button(btn_fr, text="📦 INSTALAR FRONTEND", font=("Arial", 9, "bold"),
                 bg="#0066ff", fg="white", relief=tk.FLAT, padx=12, pady=6,
                 command=self.install_frontend).pack(side=tk.LEFT, padx=3)
        
        tk.Button(btn_fr, text="📦 INSTALAR BACKEND", font=("Arial", 9, "bold"),
                 bg="#0066ff", fg="white", relief=tk.FLAT, padx=12, pady=6,
                 command=self.install_backend).pack(side=tk.LEFT, padx=3)
        
        tk.Label(btn_fr, text="│", fg="#666", bg="#0a0e1a").pack(side=tk.LEFT, padx=5)
        
        # Ejecución
        tk.Button(btn_fr, text="▶️ FRONTEND: npm run dev", font=("Arial", 9, "bold"),
                 bg="#00ff00", fg="black", relief=tk.FLAT, padx=12, pady=6,
                 command=self.start_frontend).pack(side=tk.LEFT, padx=3)
        
        tk.Button(btn_fr, text="▶️ BACKEND: node server.js", font=("Arial", 9, "bold"),
                 bg="#ffaa00", fg="black", relief=tk.FLAT, padx=12, pady=6,
                 command=self.start_backend).pack(side=tk.LEFT, padx=3)
        
        tk.Button(btn_fr, text="⏹️ DETENER TODO", font=("Arial", 9, "bold"),
                 bg="#ff0000", fg="white", relief=tk.FLAT, padx=12, pady=6,
                 command=self.stop_all).pack(side=tk.LEFT, padx=3)
        
        # Consola
        cons_fr = tk.Frame(self.root, bg="#0d1117")
        cons_fr.pack(fill=tk.BOTH, expand=True, padx=10, pady=10)
        
        sb = tk.Scrollbar(cons_fr)
        sb.pack(side=tk.RIGHT, fill=tk.Y)
        
        self.output = tk.Text(cons_fr, bg="#0d1117", fg="#00ff00", 
                             font=("Courier New", 10), yscrollcommand=sb.set)
        self.output.pack(fill=tk.BOTH, expand=True)
        sb.config(command=self.output.yview)
        
        self.print_out("=== CONSOLA INICIADA ===\n")
        self.update_status()
    
    def start_frontend(self):
        if self.procs['frontend']:
            self.print_out("⚠️  Frontend ya está corriendo\n")
            return
        threading.Thread(target=self._run_frontend, daemon=True).start()
    
    def install_frontend(self):
        if self.procs['frontend']:
            self.print_out("⚠️  Frontend está ejecutando\n")
            return
        threading.Thread(target=self._install_frontend, daemon=True).start()
    
    def _install_frontend(self):
        try:
            self.print_out("📦 INSTALANDO DEPENDENCIAS FRONTEND...\n")
            self.print_out(f"📍 Carpeta: {self.PROJECT}\n")
            self.print_out(f"⌨️  Comando: npm install\n")
            self.print_out("─" * 80 + "\n")
            
            proc = subprocess.Popen(
                ['npm', 'install'],
                cwd=self.PROJECT,
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                text=True,
                bufsize=1
            )
            
            for line in proc.stdout:
                self.print_out(line)
            
            proc.wait()
            self.print_out("\n✅ Dependencias frontend instaladas\n")
        
        except Exception as e:
            self.print_out(f"❌ ERROR: {str(e)}\n")
    
    def _run_frontend(self):
        try:
            self.print_out("▶️  INICIANDO FRONTEND...\n")
            self.print_out(f"📍 Carpeta: {self.PROJECT}\n")
            self.print_out(f"⌨️  Comando: npm run dev\n")
            self.print_out("─" * 80 + "\n")
            
            proc = subprocess.Popen(
                ['npm', 'run', 'dev'],
                cwd=self.PROJECT,
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                text=True,
                bufsize=1
            )
            
            self.procs['frontend'] = proc
            self.frontend_state.config(text="🟢 FRONTEND ON", fg="#00ff00")
            
            for line in proc.stdout:
                self.print_out(line)
            
            proc.wait()
            self.procs['frontend'] = None
            self.frontend_state.config(text="🔴 FRONTEND OFF", fg="#ff0000")
            self.print_out("\n⏹️  Frontend detenido\n")
        
        except Exception as e:
            self.print_out(f"❌ ERROR: {str(e)}\n")
            self.procs['frontend'] = None
            self.frontend_state.config(text="🔴 FRONTEND OFF", fg="#ff0000")
    
    def start_backend(self):
        if self.procs['backend']:
            self.print_out("⚠️  Backend ya está corriendo\n")
            return
        threading.Thread(target=self._run_backend, daemon=True).start()
    
    def install_backend(self):
        if self.procs['backend']:
            self.print_out("⚠️  Backend está ejecutando\n")
            return
        threading.Thread(target=self._install_backend, daemon=True).start()
    
    def _install_backend(self):
        try:
            self.print_out("📦 INSTALANDO DEPENDENCIAS BACKEND...\n")
            self.print_out(f"📍 Carpeta: {self.BACKEND}\n")
            self.print_out(f"⌨️  Comando: npm install\n")
            self.print_out("─" * 80 + "\n")
            
            proc = subprocess.Popen(
                ['npm', 'install'],
                cwd=self.BACKEND,
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                text=True,
                bufsize=1
            )
            
            for line in proc.stdout:
                self.print_out(line)
            
            proc.wait()
            self.print_out("\n✅ Dependencias backend instaladas\n")
        
        except Exception as e:
            self.print_out(f"❌ ERROR: {str(e)}\n")
    
    def _run_backend(self):
        try:
            self.print_out("▶️  INICIANDO BACKEND...\n")
            self.print_out(f"📍 Carpeta: {self.BACKEND}\n")
            self.print_out(f"⌨️  Comando: node server.js\n")
            self.print_out("─" * 80 + "\n")
            
            proc = subprocess.Popen(
                ['node', 'server.js'],
                cwd=self.BACKEND,
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                text=True,
                bufsize=1
            )
            
            self.procs['backend'] = proc
            self.backend_state.config(text="🟢 BACKEND ON", fg="#00ff00")
            
            for line in proc.stdout:
                self.print_out(line)
            
            proc.wait()
            self.procs['backend'] = None
            self.backend_state.config(text="🔴 BACKEND OFF", fg="#ff0000")
            self.print_out("\n⏹️  Backend detenido\n")
        
        except Exception as e:
            self.print_out(f"❌ ERROR: {str(e)}\n")
            self.procs['backend'] = None
            self.backend_state.config(text="🔴 BACKEND OFF", fg="#ff0000")
    
    def stop_all(self):
        for sid in ['frontend', 'backend']:
            if self.procs[sid]:
                self.print_out(f"⏹️  Deteniendo {sid}...\n")
                try:
                    self.procs[sid].terminate()
                    self.procs[sid].wait(timeout=3)
                except:
                    self.procs[sid].kill()
                self.procs[sid] = None
                self.print_out(f"✅ {sid} detenido\n")
                
                if sid == 'frontend':
                    self.frontend_state.config(text="🔴 FRONTEND OFF", fg="#ff0000")
                else:
                    self.backend_state.config(text="🔴 BACKEND OFF", fg="#ff0000")
    
    def update_status(self):
        """Verifica el estado periodicamente"""
        for sid in ['frontend', 'backend']:
            if self.procs[sid]:
                if self.procs[sid].poll() is not None:
                    # Proceso terminó
                    self.procs[sid] = None
                    if sid == 'frontend':
                        self.frontend_state.config(text="🔴 FRONTEND OFF", fg="#ff0000")
                    else:
                        self.backend_state.config(text="🔴 BACKEND OFF", fg="#ff0000")
        
        self.root.after(1000, self.update_status)
    
    def print_out(self, text):
        self.output.config(state=tk.NORMAL)
        self.output.insert(tk.END, text)
        self.output.see(tk.END)
        self.output.config(state=tk.DISABLED)
        self.root.update()

if __name__ == '__main__':
    root = tk.Tk()
    app = Console(root)
    root.mainloop()
