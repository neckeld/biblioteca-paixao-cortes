const express = require('express');
const {
  LOAN_TABS,
  getStudents,
  getAllStudents,
  createStudent,
  updateStudent,
  deleteStudent,
} = require('../services/studentsService');
const { getAllLoans } = require('../services/loansService');

const router = express.Router();

// GET /api/students — todos os alunos (opcional: ?turmaId=JA)
router.get('/', async (req, res) => {
  try {
    const { turmaId } = req.query;
    let students;
    if (turmaId) {
      students = await getStudents(turmaId);
    } else {
      students = await getAllStudents();
    }

    // Enriquece com contagem de empréstimos (join com loans)
    try {
      const loans = await getAllLoans();
      const loanMap = {};
      loans.forEach(l => {
        const key = `${l.turmaId}::${l.nome.toLowerCase()}`;
        if (!loanMap[key]) loanMap[key] = { total: 0, ativos: 0, atrasados: 0 };
        loanMap[key].total++;
        if (l.status === 'ativo' || l.status === 'atrasado') loanMap[key].ativos++;
        if (l.status === 'atrasado') loanMap[key].atrasados++;
      });

      students = students.map(s => {
        const key = `${s.turmaId}::${s.nome.toLowerCase()}`;
        const stats = loanMap[key] || { total: 0, ativos: 0, atrasados: 0 };
        return { ...s, ...stats, temAtivo: stats.ativos > 0 };
      });
    } catch { /* empréstimos não críticos */ }

    res.json({ students, total: students.length });
  } catch (err) {
    res.status(500).json({ error: 'Não foi possível carregar os alunos.', detail: err.message });
  }
});

// GET /api/students/tabs — lista turmas
router.get('/tabs', (req, res) => {
  res.json({ tabs: LOAN_TABS });
});

// GET /api/students/:turmaId/history/:nome — histórico de empréstimos de um aluno
router.get('/:turmaId/history/:nome', async (req, res) => {
  try {
    const { turmaId, nome } = req.params;
    const nomeDec = decodeURIComponent(nome);
    const loans = await getAllLoans();
    const history = loans
      .filter(l => l.turmaId === turmaId && l.nome.toLowerCase() === nomeDec.toLowerCase())
      .sort((a, b) => {
        // Mais recente primeiro
        if (a._rowIndex && b._rowIndex) return b._rowIndex - a._rowIndex;
        return 0;
      });
    res.json({ nome: nomeDec, turmaId, loans: history, total: history.length });
  } catch (err) {
    res.status(500).json({ error: 'Não foi possível carregar histórico.', detail: err.message });
  }
});

// POST /api/students/:tabId — cadastra novo aluno
router.post('/:tabId', async (req, res) => {
  try {
    const { tabId } = req.params;
    const { nome } = req.body;
    if (!nome || !nome.trim()) {
      return res.status(400).json({ error: 'Nome é obrigatório.' });
    }
    const tab = LOAN_TABS.find(t => t.id === tabId);
    if (!tab) {
      return res.status(404).json({ error: `Turma "${tabId}" não encontrada.` });
    }
    await createStudent(tabId, nome);
    res.status(201).json({ success: true, message: `Aluno "${nome.toUpperCase().trim()}" cadastrado em ${tab.nome}.` });
  } catch (err) {
    const status = err.message.includes('já está cadastrado') ? 409 : 500;
    res.status(status).json({ error: err.message });
  }
});

// PUT /api/students/:tabId/:rowIndex — atualiza nome do aluno
router.put('/:tabId/:rowIndex', async (req, res) => {
  try {
    const { tabId, rowIndex } = req.params;
    const { nome } = req.body;
    if (!nome || !nome.trim()) {
      return res.status(400).json({ error: 'Nome é obrigatório.' });
    }
    await updateStudent(tabId, parseInt(rowIndex), nome);
    res.json({ success: true, message: 'Aluno atualizado com sucesso.' });
  } catch (err) {
    res.status(500).json({ error: 'Não foi possível atualizar o aluno.', detail: err.message });
  }
});

// DELETE /api/students/:tabId/:rowIndex — remove aluno
router.delete('/:tabId/:rowIndex', async (req, res) => {
  try {
    const { tabId, rowIndex } = req.params;
    await deleteStudent(tabId, parseInt(rowIndex));
    res.json({ success: true, message: 'Aluno removido com sucesso.' });
  } catch (err) {
    res.status(500).json({ error: 'Não foi possível remover o aluno.', detail: err.message });
  }
});

module.exports = router;
