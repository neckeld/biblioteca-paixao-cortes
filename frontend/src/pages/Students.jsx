import { useEffect, useState, useCallback } from 'react';
import {
  Users, Plus, Pencil, Trash2, X, Save, Search,
  RefreshCw, BookOpen, ChevronDown, ChevronUp,
} from 'lucide-react';
import api from '../services/api';
import Spinner from '../components/Common/Spinner';
import Modal from '../components/Common/Modal';
import StatusBadge from '../components/Common/StatusBadge';
import toast from 'react-hot-toast';

// ─── Modal de cadastro / edição de aluno ─────────────────────────────────
function StudentFormModal({ isOpen, onClose, onSuccess, tabId, initial }) {
  const isEdit = !!initial;
  const [nome, setNome] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) setNome(initial?.nome || '');
  }, [isOpen, initial]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!nome.trim()) { toast.error('Informe o nome do aluno.'); return; }
    setSaving(true);
    try {
      if (isEdit) {
        await api.put(`/api/students/${tabId}/${initial._rowIndex}`, { nome });
        toast.success('Aluno atualizado!');
      } else {
        await api.post(`/api/students/${tabId}`, { nome });
        toast.success('Aluno cadastrado!');
      }
      onSuccess();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Falha ao salvar aluno.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={isEdit ? 'Editar Aluno' : 'Novo Aluno'} size="sm">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Nome completo *
          </label>
          <input
            type="text"
            value={nome}
            onChange={e => setNome(e.target.value)}
            placeholder="Nome do aluno..."
            className="input"
            autoFocus
            required
          />
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">O nome será salvo em letras maiúsculas.</p>
        </div>
        <div className="flex gap-3 pt-1">
          <button type="button" onClick={onClose} className="btn-secondary flex-1">
            <X size={15} /> Cancelar
          </button>
          <button type="submit" disabled={saving} className="btn-primary flex-1">
            <Save size={15} /> {saving ? 'Salvando...' : isEdit ? 'Salvar' : 'Cadastrar'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ─── Modal de confirmação de exclusão ────────────────────────────────────
function DeleteModal({ isOpen, onClose, student, onConfirm }) {
  const [deleting, setDeleting] = useState(false);
  const handle = async () => {
    setDeleting(true);
    await onConfirm();
    setDeleting(false);
  };
  if (!student) return null;
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Remover Aluno" size="sm">
      <div className="space-y-4">
        <p className="text-sm text-gray-700 dark:text-gray-300">
          Tem certeza que deseja remover <strong>{student.nome}</strong> da turma?
        </p>
        <p className="text-xs text-gray-400 dark:text-gray-500">
          O histórico de empréstimos na aba <em>Emprestimos</em> permanece intacto.
        </p>
        <div className="flex gap-3">
          <button onClick={onClose} className="btn-secondary flex-1">Cancelar</button>
          <button onClick={handle} disabled={deleting}
            className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-medium transition-colors disabled:opacity-50">
            <Trash2 size={14} /> {deleting ? 'Removendo...' : 'Remover'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ─── Linha de aluno com histórico expansível ─────────────────────────────
function StudentRow({ student, onEdit, onDelete }) {
  const [expanded,   setExpanded]   = useState(false);
  const [history,    setHistory]    = useState(null);
  const [loadingHist, setLoadingHist] = useState(false);

  const toggleHistory = async () => {
    if (expanded) { setExpanded(false); return; }
    if (history)  { setExpanded(true);  return; }
    setLoadingHist(true);
    try {
      const r = await api.get(
        `/api/students/${student.turmaId}/history/${encodeURIComponent(student.nome)}`
      );
      setHistory(r.data.loans || []);
      setExpanded(true);
    } catch { toast.error('Falha ao carregar histórico.'); }
    finally { setLoadingHist(false); }
  };

  return (
    <>
      <tr className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
        {/* Avatar + Nome */}
        <td className="px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center text-blue-700 dark:text-blue-400 text-xs font-bold flex-shrink-0">
              {student.nome[0]}
            </div>
            <p className="text-sm font-medium text-gray-900 dark:text-white">{student.nome}</p>
          </div>
        </td>

        {/* Estatísticas */}
        <td className="px-4 py-3 text-center">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{student.total || 0}</span>
        </td>
        <td className="px-4 py-3 text-center">
          {(student.ativos || 0) > 0
            ? <span className="badge-active">{student.ativos} ativo{student.ativos > 1 ? 's' : ''}</span>
            : <span className="text-xs text-gray-400">—</span>}
        </td>
        <td className="px-4 py-3 text-center">
          {(student.atrasados || 0) > 0
            ? <span className="badge-overdue">{student.atrasados} atrasado{student.atrasados > 1 ? 's' : ''}</span>
            : <span className="text-xs text-gray-400">—</span>}
        </td>

        {/* Ações */}
        <td className="px-4 py-3">
          <div className="flex items-center gap-1 justify-end">
            <button
              onClick={toggleHistory}
              className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
              title="Ver histórico"
            >
              {loadingHist
                ? <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                : expanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
            </button>
            <button
              onClick={() => onEdit(student)}
              className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
              title="Editar"
            >
              <Pencil size={14} />
            </button>
            <button
              onClick={() => onDelete(student)}
              className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
              title="Remover"
            >
              <Trash2 size={14} />
            </button>
          </div>
        </td>
      </tr>

      {/* Histórico expandido */}
      {expanded && history !== null && (
        <tr className="bg-blue-50/40 dark:bg-blue-900/10">
          <td colSpan={5} className="px-4 py-3">
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wide flex items-center gap-1">
              <BookOpen size={12} /> Histórico — {student.nome}
            </p>
            {history.length === 0 ? (
              <p className="text-sm text-gray-400">Nenhum empréstimo registrado.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="text-xs w-full">
                  <thead>
                    <tr className="text-gray-500 dark:text-gray-400">
                      <th className="text-left pr-4 py-1 font-medium">#</th>
                      <th className="text-left pr-4 py-1 font-medium">Nº Tombo</th>
                      <th className="text-left pr-4 py-1 font-medium">Retirada</th>
                      <th className="text-left pr-4 py-1 font-medium">Devolver em</th>
                      <th className="text-left pr-4 py-1 font-medium">Devolvido em</th>
                      <th className="text-left py-1 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.map((loan, i) => (
                      <tr key={i} className="border-t border-blue-100 dark:border-blue-800/30">
                        <td className="pr-4 py-1.5 text-gray-400 dark:text-gray-500">{loan.indice}</td>
                        <td className="pr-4 py-1.5 font-mono text-gray-700 dark:text-gray-300">{loan.livro}</td>
                        <td className="pr-4 py-1.5 text-gray-600 dark:text-gray-400">{loan.dataRetiradaFmt || '—'}</td>
                        <td className="pr-4 py-1.5 text-gray-600 dark:text-gray-400">{loan.devolverEmFmt || '—'}</td>
                        <td className="pr-4 py-1.5 text-gray-600 dark:text-gray-400">{loan.dataDevolucaoFmt || '—'}</td>
                        <td className="py-1.5">
                          <StatusBadge status={loan.status} daysOverdue={loan._daysOverdue} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </td>
        </tr>
      )}
    </>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────
export default function Students() {
  const [tabs,          setTabs]          = useState([]);
  const [activeTurma,   setActiveTurma]   = useState('');
  const [students,      setStudents]      = useState([]);
  const [loading,       setLoading]       = useState(false);
  const [search,        setSearch]        = useState('');
  const [formOpen,      setFormOpen]      = useState(false);
  const [editTarget,    setEditTarget]    = useState(null);
  const [deleteTarget,  setDeleteTarget]  = useState(null);

  // Carrega tabs na inicialização
  useEffect(() => {
    api.get('/api/loans/tabs')
      .then(r => {
        const t = r.data.tabs || [];
        setTabs(t);
        if (t.length > 0) setActiveTurma(t[0].id);
      })
      .catch(() => toast.error('Falha ao carregar turmas.'));
  }, []);

  // Carrega alunos quando muda a turma
  const loadStudents = useCallback(() => {
    if (!activeTurma) return;
    setLoading(true);
    api.get(`/api/students?turmaId=${encodeURIComponent(activeTurma)}`)
      .then(r => setStudents(r.data.students || []))
      .catch(() => toast.error('Falha ao carregar alunos.'))
      .finally(() => setLoading(false));
  }, [activeTurma]);

  useEffect(() => { loadStudents(); }, [loadStudents]);

  const handleDelete = async (student) => {
    try {
      await api.delete(`/api/students/${student.turmaId}/${student._rowIndex}`);
      toast.success('Aluno removido.');
      setDeleteTarget(null);
      loadStudents();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Falha ao remover aluno.');
    }
  };

  const activeTurmaInfo = tabs.find(t => t.id === activeTurma);
  const filtered = students.filter(s =>
    !search || s.nome.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-5 max-w-7xl mx-auto">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Users size={22} className="text-blue-600" /> Alunos
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            {activeTurmaInfo ? `${activeTurmaInfo.nome} · ` : ''}
            {loading ? 'Carregando...' : `${students.length} aluno${students.length !== 1 ? 's' : ''} cadastrado${students.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={loadStudents} className="btn-secondary" title="Atualizar"><RefreshCw size={15} /></button>
          <button onClick={() => { setEditTarget(null); setFormOpen(true); }} className="btn-primary">
            <Plus size={16} /> Novo Aluno
          </button>
        </div>
      </div>

      {/* Abas de turma */}
      <div className="flex gap-1 flex-wrap">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTurma(t.id)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              activeTurma === t.id
                ? 'bg-blue-600 text-white'
                : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 hover:border-blue-400 hover:text-blue-600 dark:hover:text-blue-400'
            }`}
          >
            {t.nome}
          </button>
        ))}
      </div>

      {/* Busca */}
      <div className="relative">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Buscar por nome..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="input pl-9"
        />
      </div>

      {/* Tabela */}
      <div className="card overflow-hidden">
        {loading ? <Spinner text="Carregando alunos..." /> : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Nome</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Total</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Ativos</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Atrasados</th>
                  <th className="px-4 py-3 w-28" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-12 text-center text-sm text-gray-400 dark:text-gray-500">
                      {students.length === 0
                        ? 'Nenhum aluno cadastrado nesta turma. Clique em "Novo Aluno" ou use "Importar dos Empréstimos".'
                        : 'Nenhum aluno encontrado para a busca.'}
                    </td>
                  </tr>
                ) : (
                  filtered.map((s, i) => (
                    <StudentRow
                      key={`${s.turmaId}-${s._rowIndex}-${i}`}
                      student={s}
                      onEdit={st => { setEditTarget(st); setFormOpen(true); }}
                      onDelete={st => setDeleteTarget(st)}
                    />
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <p className="text-xs text-gray-400 dark:text-gray-500 text-center">
        Clique em ▼ para ver o histórico de empréstimos · Lápis para editar · Lixeira para remover
      </p>

      {/* Modais */}
      <StudentFormModal
        isOpen={formOpen}
        onClose={() => setFormOpen(false)}
        onSuccess={loadStudents}
        tabId={activeTurma}
        initial={editTarget}
      />
      <DeleteModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        student={deleteTarget}
        onConfirm={() => handleDelete(deleteTarget)}
      />
    </div>
  );
}
