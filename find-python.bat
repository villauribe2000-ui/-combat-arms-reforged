@echo off
echo Buscando Python en tu PC...
echo.

REM Buscar en Program Files
echo Buscando en C:\Program Files...
dir /s "C:\Program Files\Python*\python.exe" 2>nul

echo.
echo Buscando en C:\Program Files (x86)...
dir /s "C:\Program Files (x86)\Python*\python.exe" 2>nul

echo.
echo Buscando en AppData...
dir /s "%APPDATA%\Python*\python.exe" 2>nul

echo.
echo Buscando en LocalAppData...
dir /s "%LOCALAPPDATA%\Programs\Python*\python.exe" 2>nul

echo.
echo Buscando en raiz C:\
dir /s "C:\Python*\python.exe" 2>nul

echo.
echo Listo. Cierra esta ventana.
pause
