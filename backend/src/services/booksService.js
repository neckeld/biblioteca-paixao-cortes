/**
 * Serviço de Acervo (Livros).
 *
 * Colunas (índices 0-based):
 * 0 tombo | 1 dataRegistro | 2 tipo | 3 autor | 4 titulo
 * 5 editora | 6 edicao | 7 colecao | 8 cor | 9 classe
 * 10 assunto | 11 cdd | 12 cdu | 13 etiqueta | 14 emprestimos
 * 15 obs | 16 aquisicao | 17 origem | 18 baixa
 */
const {
  BOOKS_SPREADSHEET_ID,
  BOOKS_TABS,
  readRawRows,
  updateRowRange,
  appendRow,
} = require('./sheetsService');

const BOOK_COLS = [
  'tombo', 'dataRegistro', 'tipo', 'autor', 'titulo',
  'editora', 'edicao', 'colecao', 'cor', 'classe',
  'assunto', 'cdd', 'cdu', 'etiqueta', 'emprestimos',
  'obs', 'aquisicao', 'origem', 'baixa',
];

// Aba padrão para novos livros
const DEFAULT_TAB = 'EMEF PAIXÃO CÔRTES';

function rowToBook(row, rowIndex, sheetName) {
  const book = { _rowIndex: rowIndex, _sheet: sheetName };
  BOOK_COLS.forEach((col, i) => {
    book[col] = row[i] !== undefined ? String(row[i]).trim() : '';
  });
  return book;
}

function bookToRow(book) {
  return BOOK_COLS.map(col => book[col] !== undefined ? book[col] : '');
}

async function getAllBooks() {
  const books = [];
  for (const tabName of BOOKS_TABS) {
    try {
      const rows = await readRawRows(BOOKS_SPREADSHEET_ID, tabName);
      rows.slice(1).forEach((row, idx) => {
        if (!row[0]) return;
        books.push(rowToBook(row, idx + 2, tabName));
      });
    } catch (err) {
      console.warn(`Aviso: não foi possível ler aba "${tabName}":`, err.message);
    }
  }
  return books;
}

async function findBookByTombo(tombo) {
  const books = await getAllBooks();
  return books.find(b => String(b.tombo).trim() === String(tombo).trim()) || null;
}

async function updateBook(book) {
  await updateRowRange(
    BOOKS_SPREADSHEET_ID,
    book._sheet,
    book._rowIndex,
    0,
    bookToRow(book)
  );
}

async function createBook(bookData) {
  const tab = bookData._sheet || DEFAULT_TAB;

  // Gera próximo Nº Tombo se não informado
  if (!bookData.tombo) {
    const books = await getAllBooks();
    const maxTombo = books.reduce((max, b) => {
      const n = parseInt(b.tombo);
      return !isNaN(n) && n > max ? n : max;
    }, 0);
    bookData.tombo = maxTombo + 1;
  }

  const row = BOOK_COLS.map(col => bookData[col] !== undefined ? bookData[col] : '');
  await appendRow(BOOKS_SPREADSHEET_ID, tab, row);
  return bookData.tombo;
}

async function incrementLoanCount(tombo) {
  const book = await findBookByTombo(tombo);
  if (!book) return;
  book.emprestimos = (parseInt(book.emprestimos) || 0) + 1;
  await updateBook(book);
}

module.exports = {
  BOOK_COLS,
  DEFAULT_TAB,
  BOOKS_TABS,
  getAllBooks,
  findBookByTombo,
  updateBook,
  createBook,
  incrementLoanCount,
};
