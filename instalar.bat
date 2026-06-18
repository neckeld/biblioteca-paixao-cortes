@echo off
echo.
echo ============================================================
echo  Biblioteca Paixao Cortes -- Instalando dependencias
echo ============================================================
echo.

echo [1/2] Instalando backend...
cd backend
call npm install
if errorlevel 1 (
  echo ERRO ao instalar backend!
  pause
  exit /b 1
)

echo.
echo [2/2] Instalando frontend...
cd ..\frontend
call npm install
if errorlevel 1 (
  echo ERRO ao instalar frontend!
  pause
  exit /b 1
)

cd ..
echo.
echo ============================================================
echo  Instalacao concluida!
echo.
echo  Proximo passo: configure o arquivo backend\.env
echo  (copie o backend\.env.example e preencha as credenciais)
echo.
echo  Para iniciar o sistema, execute: iniciar.bat
echo ============================================================
pause
