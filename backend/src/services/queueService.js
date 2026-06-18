/**
 * Fila de sincronização (outbox) — persiste em disco as escritas feitas offline.
 *
 * Quando a internet cai, cada operação de escrita é guardada aqui (em ordem) e
 * reenviada ao Google Sheets quando a conexão volta. A reaplicação é POSICIONAL
 * (usa o número da linha capturado no momento da ação), conforme decidido com o
 * usuário — simples e rápido, ao custo de não tratar reordenações externas.
 *
 * Arquivo: backend/cache/_outbox.json  → array de operações:
 *   { id, queuedAt, kind, spreadsheetId, sheetName, ... }
 */
const fs = require('fs');
const path = require('path');
const { CACHE_DIR } = require('./cacheService');

const QUEUE_FILE = path.join(CACHE_DIR, '_outbox.json');

function ensureDir() {
  if (!fs.existsSync(CACHE_DIR)) fs.mkdirSync(CACHE_DIR, { recursive: true });
}

function readQueue() {
  try {
    return JSON.parse(fs.readFileSync(QUEUE_FILE, 'utf-8'));
  } catch {
    return [];
  }
}

function writeQueue(ops) {
  ensureDir();
  fs.writeFileSync(QUEUE_FILE, JSON.stringify(ops, null, 2));
}

/** Adiciona uma operação ao fim da fila e devolve a operação registrada */
function enqueue(op) {
  const ops = readQueue();
  const stored = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    queuedAt: new Date().toISOString(),
    ...op,
  };
  ops.push(stored);
  writeQueue(ops);
  return stored;
}

function size() {
  return readQueue().length;
}

module.exports = { readQueue, writeQueue, enqueue, size, QUEUE_FILE };
