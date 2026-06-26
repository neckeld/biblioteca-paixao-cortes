import { useEffect, useState } from 'react';
import { Search, BookOpen, RefreshCw, Plus, Pencil, X, Save } from 'lucide-react';
import api from '../services/api';
import Spinner from '../components/Common/Spinner';
import Modal from '../components/Common/Modal';
import toast from 'react-hot-toast';

// ─── Campos do formulário ─────────────────────────────────────────────────────
// dataRegistro é preenchido automaticamente no momento do cadastro — não aparece no formulário.
const FORM_FIELDS = [
  { key: 'tombo',        label: 'Nº Tombo',             required: true,  half: true },
  { key: 'tipo',         label: 'Tipo de Documento',    required: false, half: true,
    options: ['Livro', 'Revista', 'HQ', 'Outro'] },
  { key: 'autor',        label: 'Autor',                required: true,  half: false },
  { key: 'titulo',       label: 'Título',               required: true,  half: false },
  { key: 'editora',      label: 'Cidade: Editora, Ano', required: false, half: false },
  { key: 'edicao',       label: 'Edição',               required: false, half: true },
  { key: 'colecao',      label: 'Coleção do Acervo',    required: false, half: true },
  { key: 'cor',          label: 'Cor da Etiqueta',      required: false, half: true,
    options: ['Amarelo', 'Azul', 'Azul escuro', 'Verde', 'Vermelho', 'Laranja', 'Rosa', 'Roxo', 'Branco'] },
  { key: 'classe',       label: 'Classe / Gênero',      required: false, half: true },
  { key: 'assunto',      label: 'Assunto / Temas',      required: false, half: false },
  { key: 'cdd',          label: 'Código CDD',           required: false, half: true },
  { key: 'cdu',          label: 'CDU',                  required: false, half: true },
  { key: 'etiqueta',     label: 'Localização (Estante)', required: false, half: true },
  { key: 'aquisicao',    label: 'Modo de Aquisição',    required: false, half: true,
    options: ['Doação', 'Compra', 'Permuta', 'Outro'] },
  { key: 'origem',       label: 'Origem',               required: false, half: false },
  { key: 'obs',          label: 'Observações',          required: false, half: false },
  { key: 'baixa',        label: 'Baixa do Acervo',      required: false, half: true,
    options: ['Não', 'Sim'] },
];

// "baixa" padrão sempre "Não" (livro ativo); "dataRegistro" não entra no formulário
const EMPTY_BOOK = {
  ...Object.fromEntries(FORM_FIELDS.map(f => [f.key, ''])),
  baixa: 'Não',
};

/** Retorna a data de hoje no formato DD/MM/AAAA */
function todayBR() {
  const d = new Date();
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `${dd}/${mm}/${d.getFullYear()}`;
}

// ─── Modal de formulário (criar / editar) ─────────────────────────────────────
function BookFormModal({ isOpen, onClose, onSuccess, initial }) {
  const isEdit = !!initial?._rowIndex;
  const [form, setForm] = useState(EMPTY_BOOK);
  const [saving, setSaving] = useState(false);
  const [loadingTombo, setLoadingTombo] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    if (initial) {
      // Modo edição: preenche com dados existentes;
      // normaliza "baixa" para "Não" se a planilha tiver célula vazia
      setForm({
        ...EMPTY_BOOK,
        ...initial,
        baixa: initial.baixa && initial.baixa.trim() ? initial.baixa : 'Não',
      });
    } else {
      // Modo criação: limpa o formulário e busca próximo tombo disponível
      setForm(EMPTY_BOOK);
      setLoadingTombo(true);
      api.get('/api/books/next-tombo')
        .then(r => setForm(f => ({ ...f, tombo: String(r.data.nextTombo) })))
        .catch(() => {})
        .finally(() => setLoadingTombo(false));
    }
  }, [initial, isOpen]);

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (isEdit) {
        // Preserva dataRegistro original — não sobrescreve a data da planilha
        await api.put('/api/books', { ...initial, ...form, dataRegistro: initial.dataRegistro });
        toast.success('Livro atualizado!');
      } else {
        // Preenche dataRegistro com a data de hoje automaticamente
        await api.post('/api/books', { ...form, dataRegistro: todayBR() });
        toast.success('Livro cadastrado!');
      }
      onSuccess();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Falha ao salvar livro.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={isEdit ? 'Editar Livro' : 'Novo Livro'} size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          {FORM_FIELDS.map(({ key, label, required, half, options }) => (
            <div key={key} className={half ? '' : 'col-span-2'}>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                {label}{required && <span className="text-red-500 ml-0.5">*</span>}
              </label>
              {options ? (
                <select
                  value={form[key]}
                  onChange={e => set(key, e.target.value)}
                  className="input"
                  required={required}
                >
                  <option value="">Selecione...</option>
                  {options.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              ) : (
                <input
                  type="text"
                  value={form[key]}
                  onChange={e => set(key, e.target.value)}
                  className="input disabled:bg-gray-100 dark:disabled:bg-gray-700"
                  required={required}
                  disabled={key === 'tombo' && loadingTombo}
                  placeholder={key === 'tombo' && loadingTombo ? 'Calculando...' : ''}
                />
              )}
            </div>
          ))}
        </div>

        <div className="flex gap-3 pt-2 border-t border-gray-200 dark:border-gray-700">
          <button type="button" onClick={onClose} className="btn-secondary flex-1">
            <X size={15} /> Cancelar
          </button>
          <button type="submit" disabled={saving} className="btn-primary flex-1">
            <Save size={15} /> {saving ? 'Salvando...' : isEdit ? 'Salvar alterações' : 'Cadastrar livro'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ─── Cor da etiqueta visual ───────────────────────────────────────────────────
const COR_MAP = {
  amarelo: '#fbbf24', azul: '#3b82f6', 'azul escuro': '#1e3a8a', verde: '#22c55e',
  vermelho: '#ef4444', laranja: '#f97316', rosa: '#ec4899',
  roxo: '#8b5cf6', branco: '#e5e7eb',
};

function CorDot({ cor }) {
  if (!cor) return null;
  const bg = COR_MAP[cor.toLowerCase()] || '#9ca3af';
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-400">
      <span className="w-3 h-3 rounded-full border border-gray-300 flex-shrink-0" style={{ backgroundColor: bg }} />
      {cor}
    </span>
  );
}

// ─── Linha da tabela ──────────────────────────────────────────────────────────
function BookRow({ book, onEdit }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <>
      <tr
        className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors cursor-pointer"
        onClick={() => setExpanded(e => !e)}
      >
        <td className="px-4 py-3 text-sm font-mono text-gray-500 dark:text-gray-400 whitespace-nowrap">
          {book.tombo}
        </td>
        <td className="px-4 py-3">
          <p className="text-sm font-medium text-gray-900 dark:text-white line-clamp-1">{book.titulo || '—'}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-1">{book.autor || '—'}</p>
        </td>
        <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400 hidden md:table-cell">
          {book.colecao || '—'}
        </td>
        <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400 hidden lg:table-cell">
          {book.classe || '—'}
        </td>
        <td className="px-4 py-3 hidden lg:table-cell">
          <CorDot cor={book.cor} />
        </td>
        <td className="px-4 py-3 text-center">
          {book.baixa?.toLowerCase() === 'sim'
            ? <span className="text-xs bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 font-medium px-2 py-0.5 rounded-full">Baixado</span>
            : book.emprestado
              ? <span className="text-xs bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 font-medium px-2 py-0.5 rounded-full">Emprestado</span>
              : <span className="text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 font-medium px-2 py-0.5 rounded-full">Disponível</span>}
        </td>
        <td className="px-4 py-3">
          <button
            onClick={e => { e.stopPropagation(); onEdit(book); }}
            className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
            title="Editar livro"
          >
            <Pencil size={14} />
          </button>
        </td>
      </tr>

      {expanded && (
        <tr className="bg-blue-50/40 dark:bg-blue-900/10">
          <td colSpan={7} className="px-4 py-3">
            {book.emprestado && book.emprestimoAtual && (
              <div className={`mb-3 px-3 py-2 rounded-lg text-xs font-medium ${
                book.emprestimoAtual.status === 'atrasado'
                  ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                  : 'bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300'
              }`}>
                📕 Emprestado para <strong>{book.emprestimoAtual.nome}</strong> ({book.emprestimoAtual.turmaNome})
                {' · '}Devolver em {book.emprestimoAtual.devolverEmFmt || '—'}
                {book.emprestimoAtual.status === 'atrasado' && ' · ⚠️ em atraso'}
              </div>
            )}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
              <div><span className="text-gray-400">Editora/Ano</span><p className="text-gray-700 dark:text-gray-300 mt-0.5">{book.editora || '—'}</p></div>
              <div><span className="text-gray-400">Edição</span><p className="text-gray-700 dark:text-gray-300 mt-0.5">{book.edicao || '—'}</p></div>
              <div><span className="text-gray-400">Assunto</span><p className="text-gray-700 dark:text-gray-300 mt-0.5">{book.assunto || '—'}</p></div>
              <div><span className="text-gray-400">CDD / CDU</span><p className="text-gray-700 dark:text-gray-300 mt-0.5">{[book.cdd, book.cdu].filter(Boolean).join(' / ') || '—'}</p></div>
              <div><span className="text-gray-400">Localização</span><p className="text-gray-700 dark:text-gray-300 mt-0.5">{book.etiqueta || '—'}</p></div>
              <div><span className="text-gray-400">Aquisição</span><p className="text-gray-700 dark:text-gray-300 mt-0.5">{book.aquisicao || '—'}</p></div>
              <div><span className="text-gray-400">Origem</span><p className="text-gray-700 dark:text-gray-300 mt-0.5">{book.origem || '—'}</p></div>
              <div><span className="text-gray-400">Empréstimos realizados</span><p className="text-gray-700 dark:text-gray-300 mt-0.5 font-medium">{book.emprestimos || '0'}</p></div>
              {book.obs && <div className="col-span-2 md:col-span-4"><span className="text-gray-400">Obs.</span><p className="text-gray-700 dark:text-gray-300 mt-0.5">{book.obs}</p></div>}
              <div><span className="text-gray-400">Acervo</span><p className="text-gray-700 dark:text-gray-300 mt-0.5">{book._sheet}</p></div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────
export default function Books() {
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [classeFilter, setClasseFilter] = useState('');
  const [dispFilter, setDispFilter] = useState('');
  const [classes, setClasses] = useState([]);
  const [error, setError] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);  // null = novo, obj = editar

  const load = () => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    if (classeFilter) params.set('classe', classeFilter);
    if (dispFilter) params.set('disponibilidade', dispFilter);
    api.get(`/api/books?${params}`)
      .then(r => setBooks(r.data.books))
      .catch(e => setError(e.response?.data?.error || 'Falha ao carregar acervo.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    api.get('/api/books/classes').then(r => setClasses(r.data.classes)).catch(() => {});
  }, []);

  useEffect(() => { load(); }, [q, classeFilter, dispFilter]);

  const openNew  = () => { setEditTarget(null);  setModalOpen(true); };
  const openEdit = (book) => { setEditTarget(book); setModalOpen(true); };

  return (
    <div className="space-y-5 max-w-7xl mx-auto">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <BookOpen size={22} className="text-blue-600" /> Acervo
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            {loading ? 'Carregando...' : `${books.length} livro${books.length !== 1 ? 's' : ''} encontrado${books.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={load} className="btn-secondary"><RefreshCw size={15} /></button>
          <button onClick={openNew} className="btn-primary">
            <Plus size={16} /> Novo Livro
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div className="card p-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por título, autor, assunto, coleção ou Nº Tombo..."
            value={q}
            onChange={e => setQ(e.target.value)}
            className="input pl-9"
          />
        </div>
        <select value={classeFilter} onChange={e => setClasseFilter(e.target.value)} className="input sm:w-56">
          <option value="">Todas as classes</option>
          {classes.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={dispFilter} onChange={e => setDispFilter(e.target.value)} className="input sm:w-48">
          <option value="">Todos os status</option>
          <option value="disponivel">Disponíveis</option>
          <option value="emprestado">Emprestados</option>
        </select>
      </div>

      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-700 dark:text-red-400 text-sm">
          ⚠️ {error}
        </div>
      )}

      {/* Tabela */}
      <div className="card overflow-hidden">
        {loading ? <Spinner text="Carregando acervo..." /> : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Tombo</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Título / Autor</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide hidden md:table-cell">Coleção</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide hidden lg:table-cell">Classe</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide hidden lg:table-cell">Cor</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Status</th>
                  <th className="px-4 py-3 w-10" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {books.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-sm text-gray-400 dark:text-gray-500">
                      Nenhum livro encontrado.
                    </td>
                  </tr>
                ) : (
                  books.map((book, i) => (
                    <BookRow key={`${book.tombo}-${book._sheet}-${i}`} book={book} onEdit={openEdit} />
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <p className="text-xs text-gray-400 dark:text-gray-500 text-center">
        Clique em uma linha para ver mais detalhes · Clique no lápis para editar
      </p>

      <BookFormModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSuccess={load}
        initial={editTarget}
      />
    </div>
  );
}
