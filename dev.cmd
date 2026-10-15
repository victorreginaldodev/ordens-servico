@echo off
rem Sobe os servidores de desenvolvimento do backend e do frontend, cada um na sua janela.
rem Uso: dev.cmd (ou duplo clique). Para parar, feche a janela ou use Ctrl+C nela.
rem   Backend:  http://localhost:8000  (Django)
rem   Frontend: http://localhost:8080  (Vite)

setlocal
set "RAIZ=%~dp0"
set "BACKEND=%RAIZ%ergogroup-ordens-servico-backend"
set "FRONTEND=%RAIZ%ergogroup-ordens-servico-frontend"

if not exist "%BACKEND%\.venv\Scripts\python.exe" (
  echo [backend] Ambiente virtual nao encontrado em "%BACKEND%\.venv".
  echo           Crie com: python -m venv .venv  e  .venv\Scripts\pip install -r requirements.txt
  goto :fim
)
if not exist "%BACKEND%\.env.dev" (
  echo [backend] Aviso: "%BACKEND%\.env.dev" nao encontrado; o Django pode nao conectar ao banco.
)
if not exist "%FRONTEND%\node_modules" (
  echo [frontend] Dependencias nao instaladas. Rode: npm install  na pasta do frontend.
  goto :fim
)

start "backend - Django :8000" /D "%BACKEND%" cmd /k ".venv\Scripts\python.exe manage.py runserver 8000"
start "frontend - Vite :8080" /D "%FRONTEND%" cmd /k "npm run dev"

echo Servidores iniciados em janelas separadas:
echo   Backend:  http://localhost:8000
echo   Frontend: http://localhost:8080

:fim
endlocal
