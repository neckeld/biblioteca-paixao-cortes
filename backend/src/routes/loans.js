const express = require('express');
const {
  LOAN_TABS,
  getAllLoans,
  getActiveLoans,
  studentHasActiveLoan,
  isUnlimitedTab,
  createLoan,
  renewLoan,
  returnLoan,
  LOAN_DAYS,
} = require('../services/loansService');
const { findBookByTombo, incrementLoanCount } = require('../services/booksService');
const { getStatus } = require('../services/sheetsService');

const router = express.Router();

// Sufixo de mensagem quando a ação foi salva offline (entrou na fila)
function offlineNote() {
  return getStatus().online
    ? ''
    : ' (salvo offline — será sincronizado quando a internet voltar)';
}

// GET /api/loans/tabs — lista as turmas disponíveis
router.get('/tabs', (req, res) => {
  res.json({ tabs: LOAN_TABS });
});

// GET /api/loans — lista todos os empréstimos (com filtros opcionais)
router.get('/', async (req, res) => {
  try {
    let loans = await getAllLoans();
    const { turma, nome, tombo, status } = req.query;
    if (turma)  loans = loans.filter(l => l.turmaId === turma);
    if (nome)   loans = loans.filter(l => l.nome.toLowerCase().includes(nome.toLowerCase()));
    if (tombo)  loans = loans.filter(l => l.livro === tombo);
    if (status) loans = loans.filter(l => l.status === status);
    res.json({ loans, total: loans.length });
  } catch (err) {
    res.status(500).json({ error: 'Não foi possível carregar os empréstimos.', detail: err.message });
  }
});

// GET /api/loans/active — apenas empréstimos não devolvidos
router.get('/active', async (req, res) => {
  try {
    const loans = await getActiveLoans();
    res.json({ loans, total: loans.length });
  } catch (err) {
    res.status(500).json({ error: 'Não foi possível carregar empréstimos ativos.', detail: err.message });
  }
});

// POST /api/loans — registra novo empréstimo
router.post('/', async (req, res) => {
  try {
    const { turma, nome, tombo } = req.body;
    if (!turma || !nome || !tombo) {
      return res.status(400).json({ error: 'Campos obrigatórios: turma, nome, tombo.' });
    }

    // Valida livro
    const book = await findBookByTombo(tombo);
    if (!book) {
      return res.status(404).json({ error: `Livro Nº ${tombo} não encontrado no acervo.` });
    }

    // Professores e funcionários podem ter empréstimos ilimitados.
    // Para os demais, valida se já existe um empréstimo ativo.
    if (!isUnlimitedTab(turma)) {
      const hasActive = await studentHasActiveLoan(nome, turma);
      if (hasActive) {
        return res.status(409).json({
          error: 'Empréstimo não permitido',
          message: `"${nome}" já possui um livro emprestado. Registre a devolução antes.`,
        });
      }
    }

    const { dueDate } = await createLoan(turma, nome, tombo);

    try { await incrementLoanCount(tombo); } catch { /* não bloqueia */ }

    res.status(201).json({
      success: true,
      message: `Empréstimo registrado! "${book.titulo}" para ${nome}. Devolução: ${dueDate}.${offlineNote()}`,
      dueDate,
      book: { tombo: book.tombo, titulo: book.titulo, autor: book.autor },
    });
  } catch (err) {
    res.status(500).json({ error: 'Não foi possível registrar o empréstimo.', detail: err.message });
  }
});

// PATCH /api/loans/renew — renova empréstimo por mais 1 semana
router.patch('/renew', async (req, res) => {
  try {
    const { rowIndex } = req.body;
    if (!rowIndex) {
      return res.status(400).json({ error: 'Campo obrigatório: rowIndex.' });
    }
    const result = await renewLoan(parseInt(rowIndex));
    res.json({
      success: true,
      message: `Empréstimo renovado! Nova devolução: ${result.devolverEm}.${offlineNote()}`,
      ...result,
    });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Não foi possível renovar o empréstimo.' });
  }
});

// PATCH /api/loans/return — registra devolução
router.patch('/return', async (req, res) => {
  try {
    const { rowIndex } = req.body;
    if (!rowIndex) {
      return res.status(400).json({ error: 'Campo obrigatório: rowIndex.' });
    }
    const result = await returnLoan(parseInt(rowIndex));
    res.json({
      success: true,
      message: `Devolução registrada em ${result.dataDevolucao}!${offlineNote()}`,
      ...result,
    });
  } catch (err) {
    res.status(500).json({ error: 'Não foi possível registrar a devolução.', detail: err.message });
  }
});

module.exports = router;
