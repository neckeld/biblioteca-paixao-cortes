@echo off
echo.
echo ============================================================
echo  Biblioteca Paixao Cortes -- Iniciando sistema
echo ============================================================
echo.

if not exist "backend\.env" (
  echo AVISO: Arquivo backend\.env nao encontrado!
  echo Copie backend\.env.example para backend\.env e configure.
  pause
  exit /b 1
)

if not exist "backend\token.json" (
  echo Primeira execucao: autorizando acesso ao Google Sheets...
  cd backend
  call npm run setup
  cd ..
  echo.
)

echo Iniciando backend em http://localhost:3001 ...
start "Biblioteca - Backend" cmd /k "cd backend && npm start"

timeout /t 2 /nobreak >nul

echo Iniciando frontend em http://localhost:5173 ...
start "Biblioteca - Frontend" cmd /k "cd frontend && npm run dev"

timeout /t 3 /nobreak >nul

echo Abrindo no Chrome...
start chrome http://localhost:5173

echo.
echo ============================================================
echo  Sistema iniciado! Acesse: http://localhost:5173
echo  Para encerrar, feche as janelas do terminal.
echo ============================================================
