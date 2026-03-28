@echo off
echo Stopping any existing servers...
taskkill /F /IM node.exe >nul 2>&1

echo Starting Hazardscape Script Writer...
start "Hazardscape Backend" cmd /k "cd /d "%~dp0backend" && "C:\Program Files\nodejs\node.exe" server.js"
timeout /t 2 /nobreak >nul
start "Hazardscape Frontend" cmd /k "cd /d "%~dp0frontend" && "C:\Program Files\nodejs\npm.cmd" run dev"
timeout /t 3 /nobreak >nul

start http://localhost:5173
