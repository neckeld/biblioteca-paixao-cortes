#!/bin/bash
# Chrome OS (Linux) — Inicia o sistema

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && source "$NVM_DIR/nvm.sh"

echo ""
echo "============================================================"
echo " Biblioteca Paixão Côrtes — Iniciando sistema"
echo "============================================================"
echo ""

if [ ! -f "$SCRIPT_DIR/backend/.env" ]; then
  echo "❌ Arquivo backend/.env não encontrado!"
  echo "   Execute: cp backend/.env.example backend/.env"
  exit 1
fi

# Autorização inicial (só na primeira vez)
if [ ! -f "$SCRIPT_DIR/backend/token.json" ]; then
  echo "🔑 Primeira execução: autorizando acesso ao Google Sheets..."
  cd "$SCRIPT_DIR/backend" && npm run setup
  echo ""
fi

echo "🚀 Iniciando backend..."
cd "$SCRIPT_DIR/backend" && npm start &
BACKEND_PID=$!

sleep 2

echo "🌐 Iniciando frontend..."
cd "$SCRIPT_DIR/frontend" && npm run dev &
FRONTEND_PID=$!

sleep 3

xdg-open http://localhost:5173 2>/dev/null || \
  google-chrome http://localhost:5173 2>/dev/null || \
  echo "   Acesse: http://localhost:5173"

echo ""
echo "============================================================"
echo " ✅ Sistema rodando! Pressione Ctrl+C para encerrar."
echo "============================================================"

trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit 0" INT TERM
wait
