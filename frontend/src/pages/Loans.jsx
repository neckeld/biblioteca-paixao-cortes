import { useEffect, useState } from 'react';
import { BookMarked, Plus, RotateCcw, AlertTriangle, RefreshCw, Search, CalendarPlus } from 'lucide-react';
import api from '../services/api';
import Spinner from '../components/Common/Spinner';
import StatusBadge from '../components/Common/StatusBadge';
import Modal from '../components/Common/Modal';
import toast from 'react-hot-toast';

// Turmas com empréstimos ilimitados (professores e funcionários)
const UNLIMITED_TABS = ['Teachers and staff'];
const isUnlimitedTab = (turma) => UNLIMITED_TABS.includes(turma);

// ─── Modal de novo empréstimo ─────────────────────────────────────────────
function NewLoanModal({ isOpen, onClose, onSuccess, tabs, activeLoans }) {
  const [turma,   setTurma]   = useState('');
  const [nome,    setNome]    = useState('');
  const [tombo,   setTombo]   = useState('');
  const [bookInfo, setBookInfo] = useState(null);
  const [students, setStudents] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  // Reseta ao fechar
  useEffect(() => {
    if (!isOpen) { setTurma(''); setNome(''); setTombo(''); setBookInfo(null); setStudents([]); }
  }, [isOpen]);

  // Carrega alunos da turma selecionada
  useEffect(() => {
    if (!turma) { setStudents([]); setNome(''); return; }
    api.get(`/api/students?turmaId=${turma}`)
      .then(r => setStudents(r.data.students || []))
      .catch(() => setStudents([]));
    setNome('');
  }, [turma]);

  // Busca livro pelo Nº Tombo (debounced)
  useEffect(() => {
    if (!tombo) { setBookInfo(null); return; }
    const t = setTimeout(() => {
      api.get(`/api/books/tombo/${tombo}`)
        .then(r => setBookInfo(r.data.book))
        .catch(() => setBookInfo(null));
    }, 400);
    return () => clearTimeout(t);
  }, [tombo]);

  const alunoComAtivo = !isUnlimitedTab(turma) && nome && activeLoans.some(
    l => l.nome.toLowerCase() === nome.toLowerCase() && l.turmaId === turma
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!turma || !nome || !tombo) { toast.error('Preencha todos os campos.'); return; }
    setSubmitting(true);
    try {
      const r = await api.post('/api/loans', { turma, nome, tombo });
      toast.success(r.data.message);
      onSuccess();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || err.response?.data?.error || 'Falha ao registrar empréstimo.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Novo Empréstimo" size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Turma */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Turma *</label>
          <select value={turma} onChange={e => setTurma(e.target.value)} className="input" required>
            <option value="">Selecione a turma...</option>
            {tabs.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
          </select>
        </div>

        {/* Aluno */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Aluno *</label>
          {students.length > 0 ? (
            <select value={nome} onChange={e => setNome(e.target.value)} className="input" required>
              <option value="">Selecione o aluno...</option>
              {students.map(s => {
                const temAtivo = !isUnlimitedTab(turma) && activeLoans.some(
                  l => l.nome.toLowerCase() === s.nome.toLowerCase() && l.turmaId === turma
                );
                return (
                  <option key={s._rowIndex} value={s.nome}>
                    {s.nome}{temAtivo ? ' ⚠️ (tem empréstimo ativo)' : ''}
                  </option>
                );
              })}
            </select>
          ) : (
            <input
              type="text"
              placeholder={turma ? 'Nome do aluno (turma sem alunos cadastrados)...' : 'Selecione a turma primeiro'}
              value={nome}
              onChange={e => setNome(e.target.value)}
              className="input"
              disabled={!turma}
              required
            />
          )}
          {alunoComAtivo && (
            <p className="mt-1 text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1">
              <AlertTriangle size={12} /> Este aluno já possui um empréstimo ativo.
            </p>
          )}
        </div>

        {/* Nº Tombo */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nº Tombo do Livro *</label>
          <input
            type="text"
            placeholder="Ex: 632"
            value={tombo}
            onChange={e => setTombo(e.target.value)}
            className="input"
            required
          />
          {bookInfo && (
            <div className="mt-2 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
              <p className="text-xs font-medium text-green-800 dark:text-green-300">✅ Livro encontrado:</p>
              <p className="text-sm text-green-700 dark:text-green-400 mt-0.5 font-medium">{bookInfo.titulo}</p>
              <p className="text-xs text-green-600 dark:text-green-500">{bookInfo.autor}</p>
            </div>
          )}
          {tombo && !bookInfo && (
            <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">Buscando livro...</p>
          )}
        </div>

        <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-xs text-blue-700 dark:text-blue-400">
          📅 Prazo de devolução: <strong>7 dias</strong> a partir de hoje.
        </div>

        <div className="flex gap-3 pt-2">
          <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancelar</button>
          <button type="submit" disabled={submitting || !!alunoComAtivo} className="btn-primary flex-1">
            {submitting ? 'Registrando...' : 'Registrar Empréstimo'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ─── Modal de devolução ───────────────────────────────────────────────────
function ReturnModal({ isOpen, onClose, loan, onSuccess }) {
  const [submitting, setSubmitting] = useState(false);

  const handleReturn = async () => {
    setSubmitting(true);
    try {
      await api.patch('/api/loans/return', { rowIndex: loan._rowIndex });
      toast.success('Devolução registrada com sucesso! 📚');
      onSuccess();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Falha ao registrar devolução.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!loan) return null;
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Registrar Devolução" size="sm">
      <div className="space-y-4">
        <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl space-y-1">
          <p className="text-sm text-gray-500 dark:text-gray-400">Livro Nº Tombo</p>
          <p className="text-lg font-bold text-gray-900 dark:text-white">{loan.livro}</p>
          <p className="text-sm text-gray-600 dark:text-gray-400">Aluno: <strong>{loan.nome}</strong></p>
          <p className="text-sm text-gray-600 dark:text-gray-400">Turma: {loan.turmaNome}</p>
          <p className="text-sm text-gray-600 dark:text-gray-400">Empréstimo: {loan.dataRetiradaFmt}</p>
          <p className="text-sm text-gray-600 dark:text-gray-400">Devolução prevista: {loan.devolverEmFmt}</p>
          {loan._isOverdue && (
            <p className="mt-2 text-sm font-medium text-red-600 dark:text-red-400">
              ⚠️ {loan._daysOverdue} dia{loan._daysOverdue !== 1 ? 's' : ''} em atraso!
            </p>
          )}
        </div>
        <div className="flex gap-3">
          <button onClick={onClose} className="btn-secondary flex-1">Cancelar</button>
          <button onClick={handleReturn} disabled={submitting} className="btn-success flex-1">
            <RotateCcw size={15} /> {submitting ? 'Registrando...' : 'Confirmar Devolução'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────
export default function Loans() {
  const [loans,        setLoans]        = useState([]);
  const [tabs,         setTabs]         = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState(null);
  const [showNew,      setShowNew]      = useState(false);
  const [returnTarget, setReturnTarget] = useState(null);
  const [filterStatus, setFilterStatus] = useState('ativos');
  const [filterTurma,  setFilterTurma]  = useState('');
  const [search,       setSearch]       = useState('');
  const [renewingId,   setRenewingId]   = useState(null);

  const handleRenew = async (loan) => {
    setRenewingId(loan._rowIndex);
    try {
      const r = await api.patch('/api/loans/renew', { rowIndex: loan._rowIndex });
      toast.success(r.data.message);
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Falha ao renovar empréstimo.');
    } finally {
      setRenewingId(null);
    }
  };

  const load = () => {
    setLoading(true);
    setError(null);
    Promise.all([
      api.get('/api/loans'),
      api.get('/api/loans/tabs'),
    ])
      .then(([loansRes, tabsRes]) => {
        setLoans(loansRes.data.loans || []);
        setTabs(tabsRes.data.tabs   || []);
      })
      .catch(e => setError(e.response?.data?.error || 'Falha ao carregar empréstimos.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const activeLoans = loans.filter(l => l.status !== 'devolvido');

  const filtered = loans.filter(l => {
    if (filterStatus === 'ativos'    && l.status === 'devolvido')  return false;
    if (filterStatus === 'atrasados' && l.status !== 'atrasado')   return false;
    if (filterStatus === 'devolvidos'&& l.status !== 'devolvido')  return false;
    if (filterTurma && l.turmaId !== filterTurma)                  return false;
    if (search) {
      const s = search.toLowerCase();
      if (!l.nome.toLowerCase().includes(s) && !String(l.livro).includes(s)) return false;
    }
    return true;
  });

  const overdueCt = loans.filter(l => l.status === 'atrasado').length;
  const activeCt  = loans.filter(l => l.status === 'ativo').length;

  return (
    <div className="space-y-5 max-w-7xl mx-auto">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <BookMarked size={22} className="text-blue-600" /> Empréstimos
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            {activeCt} ativo{activeCt !== 1 ? 's' : ''} ·{' '}
            <span className={overdueCt > 0 ? 'text-red-500 font-medium' : ''}>
              {overdueCt} atrasado{overdueCt !== 1 ? 's' : ''}
            </span>
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={load} className="btn-secondary"><RefreshCw size={15} /></button>
          <button onClick={() => setShowNew(true)} className="btn-primary">
            <Plus size={16} /> Novo Empréstimo
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div className="card p-4 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por aluno ou Nº Tombo..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="input pl-9"
          />
        </div>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="input w-48">
          <option value="">Todos os status</option>
          <option value="ativos">Ativos (não devolvidos)</option>
          <option value="atrasados">⚠️ Atrasados</option>
          <option value="devolvidos">Devolvidos</option>
        </select>
        <select value={filterTurma} onChange={e => setFilterTurma(e.target.value)} className="input w-52">
          <option value="">Todas as turmas</option>
          {tabs.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
        </select>
      </div>

      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-700 dark:text-red-400 text-sm">
          ⚠️ {error}
        </div>
      )}

      {/* Tabela */}
      <div className="card overflow-hidden">
        {loading ? <Spinner text="Carregando empréstimos..." /> : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">#</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Aluno</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Turma</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Nº Tombo</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase hidden md:table-cell">Retirada</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase hidden md:table-cell">Devolver em</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Status</th>
                  <th className="px-4 py-3 w-10" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-12 text-center text-sm text-gray-400 dark:text-gray-500">
                      Nenhum empréstimo encontrado.
                    </td>
                  </tr>
                ) : (
                  filtered.map((loan, i) => (
                    <tr
                      key={loan._rowIndex || i}
                      className={`hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors ${
                        loan.status === 'atrasado' ? 'bg-red-50/30 dark:bg-red-900/10' : ''
                      }`}
                    >
                      <td className="px-4 py-3 text-xs text-gray-400 dark:text-gray-500 font-mono">{loan.indice}</td>
                      <td className="px-4 py-3">
                        <p className="text-sm font-medium text-gray-900 dark:text-white">{loan.nome}</p>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{loan.turmaNome}</td>
                      <td className="px-4 py-3 text-sm font-mono text-gray-700 dark:text-gray-300">{loan.livro}</td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400 hidden md:table-cell">{loan.dataRetiradaFmt || '—'}</td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400 hidden md:table-cell">{loan.devolverEmFmt || '—'}</td>
                      <td className="px-4 py-3">
                        <StatusBadge status={loan.status} daysOverdue={loan._daysOverdue} />
                      </td>
                      <td className="px-4 py-3">
                        {loan.status !== 'devolvido' && (
                          <div className="flex items-center gap-3">
                            <button
                              onClick={() => setReturnTarget(loan)}
                              className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-medium flex items-center gap-1 whitespace-nowrap"
                            >
                              <RotateCcw size={13} /> Devolver
                            </button>
                            <button
                              onClick={() => handleRenew(loan)}
                              disabled={renewingId === loan._rowIndex}
                              className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline font-medium flex items-center gap-1 whitespace-nowrap disabled:opacity-50"
                            >
                              <CalendarPlus size={13} /> {renewingId === loan._rowIndex ? 'Renovando...' : 'Renovar'}
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <NewLoanModal
        isOpen={showNew}
        onClose={() => setShowNew(false)}
        onSuccess={load}
        tabs={tabs}
        activeLoans={activeLoans}
      />
      <ReturnModal
        isOpen={!!returnTarget}
        onClose={() => setReturnTarget(null)}
        loan={returnTarget}
        onSuccess={load}
      />
    </div>
  );
}
