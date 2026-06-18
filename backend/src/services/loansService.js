/**
 * Serviço de Empréstimos — estrutura VERTICAL
 *
 * Planilha: SPREADSHEET_LOANS_ID  (1FQfgnCazgMNiAfcwh6uf9HLA8IDIHox1)
 * Aba principal: "Emprestimos"
 *
 * Colunas (0-based):
 * 0 indice | 1 turma | 2 nome | 3 livro | 4 dataRetirada
 * 5 devolverEm | 6 dataDevolucao | 7 atrasou
 *
 * Datas na planilha: formato M/D/YYYY  (ex: 4/8/2026)
 */

const dayjs = require('dayjs');
const customParseFormat = require('dayjs/plugin/customParseFormat');
dayjs.extend(customParseFormat);

const {
  LOANS_SPREADSHEET_ID,
  LOAN_TABS,
  turmaValueOf,
  tabIdOfTurmaValue,
  readRawRows,
  updateRowRange,
  appendRow,
} = require('./sheetsService');

const LOANS_TAB = 'Emprestimos';
const LOAN_DAYS = 7;

// Turmas sem limite de empréstimos simultâneos (professores e funcionários).
// Aceita tanto o id da aba quanto o valor cru gravado na coluna "Turma".
const UNLIMITED_TABS = ['Teachers and staff', 'Staff'];

/** Indica se a turma (id da aba ou valor cru) tem empréstimos ilimitados */
function isUnlimitedTab(turma) {
  return UNLIMITED_TABS.includes(turma);
}

const LOAN_COLS = [
  'indice', 'turma', 'nome', 'livro',
  'dataRetirada', 'devolverEm', 'dataDevolucao', 'atrasou',
];

// ── Utilitários de data ────────────────────────────────────────────────────
/** Parseia data da planilha (M/D/YYYY ou D/M/YYYY ou DD/MM/YYYY) */
function parseSheetDate(str) {
  if (!str || !str.trim()) return null;
  return dayjs(str.trim(), ['M/D/YYYY', 'D/M/YYYY', 'MM/DD/YYYY', 'DD/MM/YYYY'], true);
}

/** Formata data para gravar na planilha (M/D/YYYY) */
function toSheetDate(d) {
  return d.format('M/D/YYYY');
}

/** Formata data para exibição no frontend (DD/MM/YYYY) */
function toDisplayDate(str) {
  const d = parseSheetDate(str);
  return d && d.isValid() ? d.format('DD/MM/YYYY') : (str || '');
}

// ── Converte linha da planilha em objeto empréstimo ───────────────────────
function rowToLoan(row, rowIndex) {
  const loan = { _rowIndex: rowIndex };
  LOAN_COLS.forEach((col, i) => {
    loan[col] = row[i] !== undefined ? String(row[i]).trim() : '';
  });

  // Datas formatadas para exibição
  loan.dataRetiradaFmt  = toDisplayDate(loan.dataRetirada);
  loan.devolverEmFmt    = toDisplayDate(loan.devolverEm);
  loan.dataDevolucaoFmt = toDisplayDate(loan.dataDevolucao);

  // Status calculado
  if (loan.dataDevolucao) {
    loan.status = 'devolvido';
    loan._isOverdue = false;
    loan._daysOverdue = 0;
  } else {
    const due = parseSheetDate(loan.devolverEm);
    if (due && due.isValid() && dayjs().isAfter(due, 'day')) {
      loan.status = 'atrasado';
      loan._isOverdue = true;
      loan._daysOverdue = dayjs().diff(due, 'day');
    } else {
      loan.status = 'ativo';
      loan._isOverdue = false;
      loan._daysOverdue = 0;
    }
  }

  // Normaliza a turma: 'turma' é o valor cru da planilha (ex: "Staff"),
  // 'turmaId' é o id da aba correspondente (ex: "Teachers and staff").
  loan.turmaId = tabIdOfTurmaValue(loan.turma);
  const tabInfo = LOAN_TABS.find(t => t.id === loan.turmaId);
  loan.turmaNome = tabInfo ? tabInfo.nome : loan.turma;

  return loan;
}

// ── Funções públicas ───────────────────────────────────────────────────────
async function getAllLoans() {
  const rows = await readRawRows(LOANS_SPREADSHEET_ID, LOANS_TAB);
  return rows.slice(1)
    .map((row, idx) => {
      if (!row[0] && !row[2]) return null; // linha vazia
      return rowToLoan(row, idx + 2);      // rowIndex 1-based (linha 1 = header)
    })
    .filter(Boolean);
}

async function getActiveLoans() {
  const all = await getAllLoans();
  return all.filter(l => l.status !== 'devolvido');
}

async function studentHasActiveLoan(nome, tabId) {
  // tabId é o id da aba (ex: "Teachers and staff"); comparamos por turmaId normalizado
  const all = await getAllLoans();
  return all.some(l =>
    l.nome.toLowerCase() === nome.toLowerCase() &&
    l.turmaId === tabId &&
    l.status !== 'devolvido'
  );
}

async function createLoan(tabId, nome, tombo) {
  const all = await getAllLoans();
  const maxIndice = all.reduce((max, l) => {
    const n = parseInt(l.indice);
    return !isNaN(n) && n > max ? n : max;
  }, 0);

  const today  = toSheetDate(dayjs());
  const dueDay = toSheetDate(dayjs().add(LOAN_DAYS, 'day'));

  // Grava na planilha o valor de turma correto (ex: "Staff" para a aba de staff)
  const turmaValue = turmaValueOf(tabId);

  const row = [
    maxIndice + 1, // indice
    turmaValue,    // turma (valor cru gravado na planilha)
    nome,          // nome
    tombo,         // livro (nº tombo)
    today,         // dataRetirada
    dueDay,        // devolverEm
    '',            // dataDevolucao (vazio = não devolvido)
    '',            // atrasou (preenchido na devolução)
  ];

  await appendRow(LOANS_SPREADSHEET_ID, LOANS_TAB, row);
  return { dueDate: toDisplayDate(dueDay) };
}

async function renewLoan(rowIndex) {
  // Lê a linha para validar e calcular a nova data de devolução
  const rows = await readRawRows(LOANS_SPREADSHEET_ID, LOANS_TAB);
  const row = rows[rowIndex - 1]; // rowIndex é 1-based
  if (!row) throw new Error('Empréstimo não encontrado.');

  // Não renova empréstimo já devolvido
  if (String(row[6] || '').trim()) {
    throw new Error('Este empréstimo já foi devolvido.');
  }

  // Renova por mais 1 semana. Se já passou da data prevista, conta a partir de hoje;
  // caso contrário, estende a partir da data de devolução atual.
  const currentDue = parseSheetDate(String(row[5] || '').trim());
  const base = currentDue && currentDue.isValid() && currentDue.isAfter(dayjs(), 'day')
    ? currentDue
    : dayjs();
  const newDue = toSheetDate(base.add(LOAN_DAYS, 'day'));

  // Atualiza coluna 5 (devolverEm)
  await updateRowRange(LOANS_SPREADSHEET_ID, LOANS_TAB, rowIndex, 5, [newDue]);

  return { devolverEm: toDisplayDate(newDue) };
}

async function returnLoan(rowIndex) {
  // Lê a linha para saber se atrasou
  const rows = await readRawRows(LOANS_SPREADSHEET_ID, LOANS_TAB);
  const row = rows[rowIndex - 1]; // rowIndex é 1-based
  const dueStr = row ? String(row[5] || '').trim() : '';
  const due = parseSheetDate(dueStr);
  const atrasou = due && due.isValid() && dayjs().isAfter(due, 'day') ? 'SIM' : 'NAO';

  const today = toSheetDate(dayjs());
  // Atualiza colunas 6 (dataDevolucao) e 7 (atrasou)
  await updateRowRange(LOANS_SPREADSHEET_ID, LOANS_TAB, rowIndex, 6, [today, atrasou]);

  return { dataDevolucao: toDisplayDate(today), atrasou };
}

module.exports = {
  LOAN_TABS,
  LOANS_TAB,
  LOAN_DAYS,
  getAllLoans,
  getActiveLoans,
  studentHasActiveLoan,
  isUnlimitedTab,
  createLoan,
  renewLoan,
  returnLoan,
  toDisplayDate,
};
