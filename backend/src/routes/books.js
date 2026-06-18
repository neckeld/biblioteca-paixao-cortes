const express = require('express');
const { getAllBooks, findBookByTombo, createBook, updateBook, BOOKS_TABS } = require('../services/booksService');

const router = express.Router();

// GET /api/books
router.get('/', async (req, res) => {
  try {
    let books = await getAllBooks();
    const { q, classe } = req.query;
    if (q) {
      const term = q.toLowerCase();
      books = books.filter(b =>
        b.titulo.toLowerCase().includes(term) ||
        b.autor.toLowerCase().includes(term) ||
        b.assunto.toLowerCase().includes(term) ||
        b.tombo.includes(term) ||
        b.colecao.toLowerCase().includes(term)
      );
    }
    if (classe) books = books.filter(b => b.classe.toLowerCase().includes(classe.toLowerCase()));
    res.json({ books, total: books.length });
  } catch (err) {
    console.error('Erro ao listar livros:', err);
    res.status(500).json({ error: 'Não foi possível carregar o acervo.', detail: err.message });
  }
});

// GET /api/books/next-tombo — retorna o próximo Nº Tombo disponível
router.get('/next-tombo', async (req, res) => {
  try {
    const books = await getAllBooks();
    const maxTombo = books.reduce((max, b) => {
      const n = parseInt(b.tombo);
      return !isNaN(n) && n > max ? n : max;
    }, 0);
    res.json({ nextTombo: maxTombo + 1 });
  } catch (err) {
    res.status(500).json({ error: 'Falha ao calcular próximo tombo.', detail: err.message });
  }
});

// GET /api/books/classes
router.get('/classes', async (req, res) => {
  try {
    const books = await getAllBooks();
    const classes = [...new Set(books.map(b => b.classe).filter(Boolean))].sort();
    res.json({ classes });
  } catch (err) {
    res.status(500).json({ error: 'Falha ao buscar classes.', detail: err.message });
  }
});

// GET /api/books/colecoes
router.get('/colecoes', async (req, res) => {
  try {
    const books = await getAllBooks();
    const colecoes = [...new Set(books.map(b => b.colecao).filter(Boolean))].sort();
    res.json({ colecoes });
  } catch (err) {
    res.status(500).json({ error: 'Falha ao buscar coleções.', detail: err.message });
  }
});

// GET /api/books/tombo/:tombo
router.get('/tombo/:tombo', async (req, res) => {
  try {
    const book = await findBookByTombo(req.params.tombo);
    if (!book) return res.status(404).json({ error: 'Livro não encontrado.' });
    res.json({ book });
  } catch (err) {
    res.status(500).json({ error: 'Falha ao buscar livro.', detail: err.message });
  }
});

// POST /api/books — cria novo livro
router.post('/', async (req, res) => {
  try {
    const tombo = await createBook(req.body);
    res.status(201).json({ success: true, message: `Livro Nº ${tombo} cadastrado com sucesso!`, tombo });
  } catch (err) {
    console.error('Erro ao criar livro:', err);
    res.status(500).json({ error: 'Não foi possível cadastrar o livro.', detail: err.message });
  }
});

// PUT /api/books — atualiza livro (recebe o objeto completo com _rowIndex e _sheet)
router.put('/', async (req, res) => {
  try {
    const book = req.body;
    if (!book._rowIndex || !book._sheet) {
      return res.status(400).json({ error: 'Campos _rowIndex e _sheet são obrigatórios.' });
    }
    await updateBook(book);
    res.json({ success: true, message: 'Livro atualizado com sucesso!' });
  } catch (err) {
    console.error('Erro ao atualizar livro:', err);
    res.status(500).json({ error: 'Não foi possível atualizar o livro.', detail: err.message });
  }
});

module.exports = router;
