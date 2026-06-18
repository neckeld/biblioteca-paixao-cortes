/**
 * Serviço de Alunos
 *
 * Cada aba de turma (JA, JB, 11, 12, 21, 31, 41, 51, Teachers and staff)
 * tem o seguinte layout:
 *
 *   Linhas 1-3: títulos ("EMEF JOÃO CARLOS...", "Biblioteca...", "EMPRÉSTIMOS 2026")
 *   Linha de cabeçalho: Col A = "Aluno", depois "Ano", "Ativo", "Livro", ...
 *   Linhas seguintes: Col A = nome do aluno; demais colunas = histórico horizontal
 *
 * Para cadastro de alunos só importa a Coluna A (nome). O número de linhas de
 * título pode variar, então localizamos a linha de cabeçalho "Aluno" dinamicamente.
 *
 * Planilha: SPREADSHEET_LOANS_ID  (mesma planilha dos empréstimos)
 */

const {
  LOANS_SPREADSHEET_ID,
  LOAN_TABS,
  readRawRows,
  updateRowRange,
  appendRow,
  updateCell,
} = require('./sheetsService');

// ── Helpers ────────────────────────────────────────────────────────────────
function tabInfo(tabId) {
  return LOAN_TABS.find(t => t.id === tabId) || { id: tabId, nome: tabId };
}

function rowToStudent(rawName, rowIndex, tabId) {
  const info = tabInfo(tabId);
  return {
    nome: rawName.trim(),
    turmaId: tabId,
    turmaNome: info.nome,
    _rowIndex: rowIndex,
  };
}

/**
 * Encontra o índice 0-based da linha de cabeçalho (col A === "Aluno").
 * Retorna -1 se não encontrar.
 */
function findHeaderRowIndex(rows) {
  for (let i = 0; i < rows.length; i++) {
    const a = String(rows[i]?.[0] || '').trim().toLowerCase();
    if (a === 'aluno' || a === 'nome' || a === 'nome do aluno') return i;
  }
  return -1;
}

// ── Funções públicas ───────────────────────────────────────────────────────

/** Lista alunos de uma turma, ordenados por nome */
async function getStudents(tabId) {
  const rows = await readRawRows(LOANS_SPREADSHEET_ID, tabId);
  const headerIdx = findHeaderRowIndex(rows);

  // Alunos começam na linha logo após o cabeçalho.
  // Se não houver cabeçalho, assume que começam na primeira linha (fallback).
  const startIdx = headerIdx >= 0 ? headerIdx + 1 : 0;

  const students = [];
  for (let i = startIdx; i < rows.length; i++) {
    const name = String(rows[i]?.[0] || '').trim();
    if (!name) continue;          // ignora linhas sem nome na coluna A
    students.push(rowToStudent(name, i + 1, tabId)); // i+1 = linha 1-based
  }
  return students.sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
}

/** Lista todos os alunos de todas as turmas */
async function getAllStudents() {
  const result = [];
  for (const tab of LOAN_TABS) {
    try {
      const students = await getStudents(tab.id);
      result.push(...students);
    } catch (err) {
      console.warn(`Aviso: falha ao ler alunos da turma "${tab.id}":`, err.message);
    }
  }
  return result;
}

/** Cadastra novo aluno em uma turma */
async function createStudent(tabId, nome) {
  const nomeFmt = nome.toUpperCase().trim();
  // Verifica duplicata
  const existing = await getStudents(tabId);
  if (existing.some(s => s.nome.toLowerCase() === nomeFmt.toLowerCase())) {
    throw new Error(`Aluno "${nomeFmt}" já está cadastrado nesta turma.`);
  }
  await appendRow(LOANS_SPREADSHEET_ID, tabId, [nomeFmt]);
}

/** Atualiza nome de um aluno */
async function updateStudent(tabId, rowIndex, nome) {
  const nomeFmt = nome.toUpperCase().trim();
  await updateRowRange(LOANS_SPREADSHEET_ID, tabId, parseInt(rowIndex), 0, [nomeFmt]);
}

/** Remove aluno (limpa a célula — linha fica vazia e é ignorada na leitura) */
async function deleteStudent(tabId, rowIndex) {
  await updateCell(LOANS_SPREADSHEET_ID, tabId, parseInt(rowIndex), 0, '');
}

module.exports = {
  LOAN_TABS,
  getStudents,
  getAllStudents,
  createStudent,
  updateStudent,
  deleteStudent,
};
