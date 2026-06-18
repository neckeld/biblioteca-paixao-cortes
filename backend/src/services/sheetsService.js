/**
 * Serviço de baixo nível para a API do Google Sheets.
 * Usa OAuth com token salvo localmente (token.json).
 * O token é gerado uma única vez com: node setup.js
 */
const { google } = require('googleapis');
const path = require('path');
const fs = require('fs');
const { writeCache, readCache } = require('./cacheService');
const queue = require('./queueService');

// ── Status de conexão (online/offline) ──────────────────────────────────────
let _online = true;
let _lastSyncAt = null;
let _flushing = false;
const _syncErrors = []; // operações que falharam ao reaplicar (erro real, não rede)

/** Erro lançado quando não há conexão nem cache para uma leitura */
class OfflineError extends Error {
  constructor(message = 'Sem conexão com a internet.') {
    super(message);
    this.name = 'OfflineError';
    this.offline = true;
  }
}

/**
 * Distingue erro de REDE (offline) de erro de API (auth, cota, planilha
 * inexistente...). Erros de API têm `err.response`; erros de rede não chegam
 * ao servidor do Google e trazem um código de sistema.
 */
function isNetworkError(err) {
  if (!err) return false;
  if (err.response) return false; // o Google respondeu → não é falta de internet
  const NET_CODES = [
    'ENOTFOUND', 'EAI_AGAIN', 'ECONNREFUSED', 'ECONNRESET',
    'ETIMEDOUT', 'ENETUNREACH', 'EHOSTUNREACH', 'EPIPE',
  ];
  if (NET_CODES.includes(err.code)) return true;
  return /getaddrinfo|network|socket hang up|timeout|ENOTFOUND|EAI_AGAIN|ETIMEDOUT/i
    .test(err.message || '');
}

function getStatus() {
  return {
    online: _online,
    lastSyncAt: _lastSyncAt,
    pending: queue.size(),
    syncErrors: _syncErrors.slice(-5),
  };
}

const BOOKS_SPREADSHEET_ID = process.env.SPREADSHEET_BOOKS_ID;
const LOANS_SPREADSHEET_ID = process.env.SPREADSHEET_LOANS_ID;

const BOOKS_TABS = ['EMEF PAIXÃO CÔRTES'];

// id        = nome da ABA da planilha (onde ficam os alunos cadastrados)
// nome      = rótulo exibido na interface
// turmaValue= valor gravado na coluna "Turma" da aba Emprestimos
//             (geralmente igual ao id, exceto para staff onde a aba se chama
//              "Teachers and staff" mas os empréstimos usam "Staff")
const LOAN_TABS = [
  { id: 'JA',                 nome: 'Jardim A',                   turmaValue: 'JA' },
  { id: 'JB',                 nome: 'Jardim B',                   turmaValue: 'JB' },
  { id: '11',                 nome: '1º Ano Turma 1',             turmaValue: '11' },
  { id: '12',                 nome: '1º Ano Turma 2',             turmaValue: '12' },
  { id: '21',                 nome: '2º Ano',                     turmaValue: '21' },
  { id: '31',                 nome: '3º Ano',                     turmaValue: '31' },
  { id: '41',                 nome: '4º Ano',                     turmaValue: '41' },
  { id: '51',                 nome: '5º Ano',                     turmaValue: '51' },
  { id: 'Teachers and staff', nome: 'Professores e Funcionários', turmaValue: 'Staff' },
];

/** Converte o id de uma turma no valor usado na coluna "Turma" dos empréstimos */
function turmaValueOf(tabId) {
  const tab = LOAN_TABS.find(t => t.id === tabId);
  return tab ? tab.turmaValue : tabId;
}

/** Converte o valor da coluna "Turma" dos empréstimos no id da aba correspondente */
function tabIdOfTurmaValue(turmaValue) {
  const tab = LOAN_TABS.find(t => t.turmaValue === turmaValue);
  return tab ? tab.id : turmaValue;
}

const TOKEN_FILE = path.resolve('./token.json');

let _sheetsClient = null;

function getSheetsClient() {
  if (_sheetsClient) return _sheetsClient;

  if (!fs.existsSync(TOKEN_FILE)) {
    throw new Error(
      'Arquivo token.json não encontrado.\n' +
      'Execute "node setup.js" para configurar o acesso ao Google Sheets.'
    );
  }

  const tokens = JSON.parse(fs.readFileSync(TOKEN_FILE, 'utf-8'));

  const auth = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    'http://localhost:3099/callback'
  );
  auth.setCredentials(tokens);

  // Salva automaticamente o token quando for renovado
  auth.on('tokens', (newTokens) => {
    const current = JSON.parse(fs.readFileSync(TOKEN_FILE, 'utf-8'));
    const updated = { ...current, ...newTokens };
    fs.writeFileSync(TOKEN_FILE, JSON.stringify(updated, null, 2));
  });

  _sheetsClient = google.sheets({ version: 'v4', auth });
  return _sheetsClient;
}

/** Converte índice de coluna (0-based) para letra A1 */
function colToLetter(index) {
  let letter = '';
  let col = index + 1;
  while (col > 0) {
    const rem = (col - 1) % 26;
    letter = String.fromCharCode(65 + rem) + letter;
    col = Math.floor((col - 1) / 26);
  }
  return letter;
}

async function readRawRows(spreadsheetId, sheetName) {
  const cacheKey = `${spreadsheetId}__${sheetName}`;

  // Se há ações offline pendentes e (aparentemente) há conexão, sincroniza
  // ANTES de ler — senão uma leitura nova sobrescreveria o cache e "apagaria"
  // visualmente as pendências até serem enviadas.
  if (_online && queue.size() > 0) {
    try { await flushQueue(); } catch { /* segue para leitura/cache */ }
  }

  try {
    const sheets = getSheetsClient();
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: sheetName,
    });
    const values = res.data.values || [];
    _online = true;
    _lastSyncAt = new Date().toISOString();
    writeCache(cacheKey, values); // mantém o espelho local atualizado
    return values;
  } catch (err) {
    if (isNetworkError(err)) {
      _online = false;
      const cached = readCache(cacheKey);
      if (cached) return cached.data; // serve o último snapshot (com ações offline já aplicadas)
      // Sem internet e sem cache (planilha nunca foi lida online)
      throw new OfflineError(
        'Sem conexão e ainda não há dados salvos localmente para esta planilha. ' +
        'Conecte à internet ao menos uma vez para habilitar o modo offline.'
      );
    }
    throw err; // erro real de API (auth, cota, etc.) → propaga normalmente
  }
}

// ── Camada de escrita com fila offline ──────────────────────────────────────

/** Reaplica os efeitos de uma operação no cache local (para a leitura refletir) */
function applyToCache(op) {
  const cacheKey = `${op.spreadsheetId}__${op.sheetName}`;
  const cached = readCache(cacheKey);
  const data = cached ? cached.data : [];

  if (op.kind === 'append') {
    data.push(op.values.slice());
  } else if (op.kind === 'updateRange') {
    const r = op.rowIndex - 1;
    while (data.length <= r) data.push([]);
    if (!Array.isArray(data[r])) data[r] = [];
    op.values.forEach((v, i) => { data[r][op.startCol + i] = v; });
  } else if (op.kind === 'updateCell') {
    const r = op.rowIndex - 1;
    while (data.length <= r) data.push([]);
    if (!Array.isArray(data[r])) data[r] = [];
    data[r][op.colIndex] = op.value;
  }
  writeCache(cacheKey, data);
}

/** Envia de fato uma operação ao Google Sheets (usado no online direto e no replay) */
async function applyToSheets(op) {
  const sheets = getSheetsClient();

  if (op.kind === 'append') {
    // Recalcula a próxima linha vazia ao vivo (mais confiável que o append da API).
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: op.spreadsheetId,
      range: op.sheetName,
    });
    const nextRow = (res.data.values || []).length + 1;
    await sheets.spreadsheets.values.update({
      spreadsheetId: op.spreadsheetId,
      range: `${op.sheetName}!A${nextRow}`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [op.values] },
    });
  } else if (op.kind === 'updateRange') {
    const endCol = op.startCol + op.values.length - 1;
    await sheets.spreadsheets.values.update({
      spreadsheetId: op.spreadsheetId,
      range: `${op.sheetName}!${colToLetter(op.startCol)}${op.rowIndex}:${colToLetter(endCol)}${op.rowIndex}`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [op.values] },
    });
  } else if (op.kind === 'updateCell') {
    await sheets.spreadsheets.values.update({
      spreadsheetId: op.spreadsheetId,
      range: `${op.sheetName}!${colToLetter(op.colIndex)}${op.rowIndex}`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [[op.value]] },
    });
  } else {
    throw new Error(`Operação desconhecida na fila: ${op.kind}`);
  }
}

/**
 * Aplica uma escrita: direto no Sheets quando online (e fila vazia), ou
 * enfileira + aplica no cache local quando offline. Devolve { queued }.
 */
async function performWrite(op) {
  // Mantém a ordem: se já há pendências, tenta drená-las antes.
  if (_online && queue.size() > 0) {
    await flushQueue();
  }

  if (_online && queue.size() === 0) {
    try {
      await applyToSheets(op);
      _online = true;
      applyToCache(op); // mantém o cache coerente com o servidor
      return { queued: false };
    } catch (err) {
      if (!isNetworkError(err)) throw err; // erro real → propaga
      _online = false; // caiu a conexão: cai para o modo fila
    }
  }

  // Offline (ou ainda há fila pendente): enfileira e aplica localmente.
  queue.enqueue(op);
  applyToCache(op);
  return { queued: true };
}

/**
 * Reenvia a fila ao Google Sheets, em ordem. Para se a conexão cair (mantém o
 * resto da fila). Operações que falham por erro REAL (não de rede) são
 * descartadas e registradas para revisão manual, para não travar a fila.
 */
async function flushQueue() {
  if (_flushing) return;
  _flushing = true;
  try {
    let ops = queue.readQueue();
    while (ops.length > 0) {
      const op = ops[0];
      try {
        await applyToSheets(op);
        _online = true;
        _lastSyncAt = new Date().toISOString();
      } catch (err) {
        if (isNetworkError(err)) { _online = false; break; } // ainda offline: mantém a fila
        _syncErrors.push({ op, error: err.message, at: new Date().toISOString() });
        console.error('⚠️  Operação descartada ao sincronizar:', err.message);
      }
      ops.shift();
      queue.writeQueue(ops);
    }
  } finally {
    _flushing = false;
  }
}

/** Tenta sincronizar se houver pendências (chamado pelo /api/status e por timer) */
async function syncIfNeeded() {
  if (queue.size() === 0) return;
  const ok = await testConnection();
  if (ok) await flushQueue();
}

async function updateCell(spreadsheetId, sheetName, rowIndex, colIndex, value) {
  return performWrite({ kind: 'updateCell', spreadsheetId, sheetName, rowIndex, colIndex, value });
}

async function updateRowRange(spreadsheetId, sheetName, rowIndex, startCol, values) {
  return performWrite({ kind: 'updateRange', spreadsheetId, sheetName, rowIndex, startCol, values });
}

async function appendRow(spreadsheetId, sheetName, values) {
  return performWrite({ kind: 'append', spreadsheetId, sheetName, values });
}

async function testConnection() {
  try {
    const sheets = getSheetsClient();
    await sheets.spreadsheets.values.get({
      spreadsheetId: BOOKS_SPREADSHEET_ID,
      range: 'EMEF PAIXÃO CÔRTES!A1:A1',
    });
    _online = true;
    return true;
  } catch (err) {
    if (isNetworkError(err)) {
      _online = false;
      return false;
    }
    throw err; // erro de configuração/auth deve continuar aparecendo
  }
}

module.exports = {
  BOOKS_SPREADSHEET_ID,
  LOANS_SPREADSHEET_ID,
  BOOKS_TABS,
  LOAN_TABS,
  turmaValueOf,
  tabIdOfTurmaValue,
  readRawRows,
  updateCell,
  updateRowRange,
  appendRow,
  testConnection,
  colToLetter,
  getStatus,
  isNetworkError,
  OfflineError,
  syncIfNeeded,
  flushQueue,
};
