#!/bin/bash
# Chrome OS (Linux) — Instala dependências. Rode uma vez.
set -e

echo ""
echo "============================================================"
echo " Biblioteca Paixão Côrtes — Instalando dependências"
echo "============================================================"
echo ""

# Instala Node.js via nvm se não existir
if ! command -v node &>/dev/null; then
  echo "⚠️  Node.js não encontrado. Instalando via nvm..."
  curl -fsSL https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
  export NVM_DIR="$HOME/.nvm"
  source "$NVM_DIR/nvm.sh"
  nvm install --lts
  nvm use --lts
fi

echo "✅ Node.js: $(node -v) | npm: $(npm -v)"
echo ""

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "[1/2] Instalando backend..."
cd "$SCRIPT_DIR/backend" && npm install

echo ""
echo "[2/2] Instalando frontend..."
cd "$SCRIPT_DIR/frontend" && npm install

echo ""
echo "============================================================"
echo " ✅ Instalação concluída!"
echo ""
echo " Próximo passo:"
echo "   cp backend/.env.example backend/.env"
echo "   (edite .env com as credenciais do Google)"
echo ""
echo " Para iniciar: bash iniciar.sh"
echo "============================================================"
