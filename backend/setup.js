/**
 * Script de configuração — rode UMA VEZ para autorizar o acesso ao Google Sheets.
 * Depois disso o sistema funciona sozinho, sem login.
 *
 * Como usar:
 *   node setup.js
 */

require('dotenv').config();
const { google } = require('googleapis');
const http = require('http');
const url = require('url');
const fs = require('fs');
const path = require('path');

const TOKEN_FILE = path.resolve('./token.json');
const PORT = 3099;

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  `http://localhost:${PORT}/callback`
);

const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];

async function main() {
  console.log('\n📚 Biblioteca Paixão Côrtes — Configuração inicial\n');

  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    console.error('❌ GOOGLE_CLIENT_ID e GOOGLE_CLIENT_SECRET não encontrados no .env');
    console.error('   Siga o README.md para criar as credenciais OAuth no Google Cloud.\n');
    process.exit(1);
  }

  if (fs.existsSync(TOKEN_FILE)) {
    console.log('✅ Token já existe em token.json — sistema já está configurado!');
    console.log('   Se quiser reconfigurar, delete o arquivo token.json e rode novamente.\n');
    return;
  }

  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: SCOPES,
    login_hint: 'bibliotecapaixaocortes@gmail.com',
  });

  console.log('🌐 Abrindo o Chrome para autorização...');
  console.log('   Se não abrir automaticamente, acesse esta URL:\n');
  console.log('   ' + authUrl + '\n');

  // Tenta abrir o Chrome automaticamente
  const { exec } = require('child_process');
  const cmd = process.platform === 'win32'
    ? `start chrome "${authUrl}"`
    : `xdg-open "${authUrl}" || google-chrome "${authUrl}" || chromium-browser "${authUrl}"`;
  exec(cmd);

  // Servidor temporário para capturar o código de autorização
  await new Promise((resolve, reject) => {
    const server = http.createServer(async (req, res) => {
      const parsed = url.parse(req.url, true);
      if (parsed.pathname !== '/callback') return;

      const code = parsed.query.code;
      const error = parsed.query.error;

      if (error) {
        res.end('<h2>❌ Acesso negado.</h2><p>Feche esta aba e tente novamente.</p>');
        server.close();
        reject(new Error('Acesso negado pelo usuário.'));
        return;
      }

      try {
        const { tokens } = await oauth2Client.getToken(code);
        fs.writeFileSync(TOKEN_FILE, JSON.stringify(tokens, null, 2));

        res.end(`
          <html><body style="font-family:sans-serif;text-align:center;padding:60px">
            <h2>✅ Autorização concluída!</h2>
            <p>Pode fechar esta aba.</p>
            <p>O sistema da biblioteca está pronto para uso.</p>
          </body></html>
        `);

        console.log('\n✅ Token salvo em token.json');
        console.log('   Configuração concluída! Agora rode: npm run dev\n');

        server.close();
        resolve();
      } catch (err) {
        res.end('<h2>❌ Erro ao obter token.</h2><p>' + err.message + '</p>');
        server.close();
        reject(err);
      }
    });

    server.listen(PORT, () => {
      console.log(`⏳ Aguardando autorização no navegador...`);
    });
  });
}

main().catch(err => {
  console.error('\n❌ Erro:', err.message);
  process.exit(1);
});
