/**
 * Cache local em disco — espelho de leitura das planilhas Google Sheets.
 *
 * Permite que o app funcione em modo CONSULTA quando a internet cai:
 * cada leitura bem-sucedida do Sheets é salva em backend/cache/ e, quando
 * a conexão falha, o último snapshot salvo é servido no lugar.
 *
 * Um arquivo JSON por planilha+aba, no formato:
 *   { "syncedAt": "2026-06-17T12:00:00.000Z", "data": [[...linhas...]] }
 */
const fs = require('fs');
const path = require('path');

const CACHE_DIR = path.resolve('./cache');

function ensureDir() {
  if (!fs.existsSync(CACHE_DIR)) fs.mkdirSync(CACHE_DIR, { recursive: true });
}

/** Converte a chave (spreadsheetId + aba) em um nome de arquivo seguro */
function keyToFile(key) {
  const safe = key.replace(/[^a-zA-Z0-9]+/g, '_').slice(0, 180);
  return path.join(CACHE_DIR, `${safe}.json`);
}

/** Salva um snapshot de dados no cache local */
function writeCache(key, data) {
  try {
    ensureDir();
    const payload = { syncedAt: new Date().toISOString(), data };
    fs.writeFileSync(keyToFile(key), JSON.stringify(payload));
  } catch (err) {
    // Cache é best-effort: nunca deve derrubar uma leitura que funcionou.
    console.error('⚠️  Falha ao gravar cache:', err.message);
  }
}

/** Lê um snapshot do cache local. Retorna { syncedAt, data } ou null */
function readCache(key) {
  try {
    const raw = fs.readFileSync(keyToFile(key), 'utf-8');
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

module.exports = { writeCache, readCache, CACHE_DIR };
