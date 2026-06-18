const express = require('express');
const { getAllLoans, LOAN_TABS } = require('../services/loansService');
const { getAllBooks } = require('../services/booksService');

const router = express.Router();

// GET /api/reports/dashboard
router.get('/dashboard', async (req, res) => {
  try {
    const [allLoans, books] = await Promise.all([getAllLoans(), getAllBooks()]);

    let ativos = 0, atrasados = 0, devolvidos = 0;
    allLoans.forEach(l => {
      if      (l.status === 'devolvido') devolvidos++;
      else if (l.status === 'atrasado')  atrasados++;
      else                               ativos++;
    });

    // Mapa tombo → título
    const bookMap = {};
    books.forEach(b => { bookMap[b.tombo] = b.titulo || `Nº ${b.tombo}`; });

    // Top livros mais emprestados
    const bookCount = {};
    allLoans.forEach(l => {
      const tombo = l.livro;
      if (!bookCount[tombo]) bookCount[tombo] = { tombo, titulo: bookMap[tombo] || `Nº ${tombo}`, count: 0 };
      bookCount[tombo].count++;
    });
    const topBooks = Object.values(bookCount).sort((a, b) => b.count - a.count).slice(0, 10);

    // Empréstimos por turma
    const turmaCount = {};
    LOAN_TABS.forEach(t => { turmaCount[t.id] = { id: t.id, nome: t.nome, count: 0 }; });
    allLoans.forEach(l => { if (turmaCount[l.turmaId]) turmaCount[l.turmaId].count++; });
    const loansByTurma = Object.values(turmaCount).sort((a, b) => b.count - a.count);

    // Empréstimos por classe do livro
    const classeCount = {};
    allLoans.forEach(l => {
      const book = books.find(b => b.tombo === l.livro);
      const classe = book?.classe || 'Sem classe';
      classeCount[classe] = (classeCount[classe] || 0) + 1;
    });
    const loansByClasse = Object.entries(classeCount)
      .map(([classe, count]) => ({ classe, count }))
      .sort((a, b) => b.count - a.count);

    // Livros por modo de aquisição
    const aquisicaoCount = {};
    books.forEach(b => {
      const key = b.aquisicao || 'Não informado';
      aquisicaoCount[key] = (aquisicaoCount[key] || 0) + 1;
    });
    const booksByAquisicao = Object.entries(aquisicaoCount)
      .map(([tipo, count]) => ({ tipo, count }))
      .sort((a, b) => b.count - a.count);

    res.json({
      summary: {
        totalLivros: books.length,
        totalEmprestimos: allLoans.length,
        emprestimosAtivos: ativos,
        emprestimosAtrasados: atrasados,
        emprestimosDevolvidos: devolvidos,
      },
      topBooks,
      loansByTurma,
      loansByClasse,
      booksByAquisicao,
    });
  } catch (err) {
    res.status(500).json({ error: 'Não foi possível carregar o painel.', detail: err.message });
  }
});

// GET /api/reports/overdue — livros atrasados
router.get('/overdue', async (req, res) => {
  try {
    const loans = await getAllLoans();
    const overdue = loans
      .filter(l => l.status === 'atrasado')
      .sort((a, b) => b._daysOverdue - a._daysOverdue);
    res.json({ loans: overdue, total: overdue.length });
  } catch (err) {
    res.status(500).json({ error: 'Não foi possível carregar atrasados.', detail: err.message });
  }
});

// GET /api/reports/history — histórico com filtros
router.get('/history', async (req, res) => {
  try {
    const { turmaId, studentName, tombo, status } = req.query;
    let loans = await getAllLoans();
    if (turmaId)     loans = loans.filter(l => l.turmaId === turmaId);
    if (studentName) loans = loans.filter(l => l.nome.toLowerCase().includes(studentName.toLowerCase()));
    if (tombo)       loans = loans.filter(l => l.livro === tombo);
    if (status)      loans = loans.filter(l => l.status === status);
    res.json({ loans, total: loans.length });
  } catch (err) {
    res.status(500).json({ error: 'Não foi possível carregar histórico.', detail: err.message });
  }
});

module.exports = router;
