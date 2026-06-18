import { useEffect, useState } from 'react';
import { BarChart2, AlertTriangle, Download, RefreshCw, Filter } from 'lucide-react';
import api from '../services/api';
import Spinner from '../components/Common/Spinner';
import StatusBadge from '../components/Common/StatusBadge';
import toast from 'react-hot-toast';

// Exportação CSV simples
function exportCSV(data, filename) {
  if (!data.length) { toast.error('Nenhum dado para exportar.'); return; }
  const headers = Object.keys(data[0]).filter(k => !k.startsWith('_'));
  const rows = data.map(r => headers.map(h => `"${String(r[h] ?? '').replace(/"/g, '""')}"`).join(','));
  const csv = [headers.join(','), ...rows].join('\n');
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
  toast.success('CSV exportado!');
}

// Exportação PDF usando jsPDF
async function exportPDF(data, title) {
  if (!data.length) { toast.error('Nenhum dado para exportar.'); return; }
  try {
    const { default: jsPDF } = await import('jspdf');
    const { default: autoTable } = await import('jspdf-autotable');
    const doc = new jsPDF({ orientation: 'landscape' });
    doc.setFontSize(14);
    doc.text(title, 14, 15);
    doc.setFontSize(9);
    doc.text(`Gerado em ${new Date().toLocaleString('pt-BR')}`, 14, 22);
    const cols = Object.keys(data[0]).filter(k => !k.startsWith('_'));
    autoTable(doc, {
      head: [cols],
      body: data.map(r => cols.map(c => r[c] ?? '')),
      startY: 28,
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [37, 99, 235] },
      alternateRowStyles: { fillColor: [245, 247, 250] },
    });
    doc.save(`${title.replace(/\s+/g, '_')}.pdf`);
    toast.success('PDF exportado!');
  } catch (e) {
    toast.error('Erro ao gerar PDF. Tente exportar CSV.');
  }
}

// Seção de empréstimos atrasados
function OverdueSection() {
  const [loans, setLoans] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/api/reports/overdue')
      .then(r => setLoans(r.data.loans || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const exportData = loans.map(l => ({
    Aluno: l.nome,
    Turma: l.turmaNome,
    'Nº Tombo': l.livro,
    Empréstimo: l.dataRetiradaFmt,
    'Devolução Prevista': l.devolverEmFmt,
    'Dias em Atraso': l._daysOverdue,
  }));

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-200 flex items-center gap-2">
          <AlertTriangle size={16} className="text-red-500" /> Empréstimos Atrasados ({loans.length})
        </h2>
        <div className="flex gap-2">
          <button onClick={() => exportCSV(exportData, 'atrasados.csv')} className="btn-secondary text-xs px-2 py-1.5 gap-1">
            <Download size={13} /> CSV
          </button>
          <button onClick={() => exportPDF(exportData, 'Empréstimos Atrasados')} className="btn-secondary text-xs px-2 py-1.5 gap-1">
            <Download size={13} /> PDF
          </button>
        </div>
      </div>
      {loading ? <Spinner text="Carregando..." /> : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700 text-xs text-gray-500 dark:text-gray-400 uppercase">
                <th className="text-left py-2 pr-4">Aluno</th>
                <th className="text-left py-2 pr-4">Turma</th>
                <th className="text-left py-2 pr-4">Nº Tombo</th>
                <th className="text-left py-2 pr-4 hidden md:table-cell">Empréstimo</th>
                <th className="text-left py-2 pr-4 hidden md:table-cell">Previsto para</th>
                <th className="text-left py-2">Atraso</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {loans.length === 0 ? (
                <tr><td colSpan={6} className="py-8 text-center text-gray-400">✅ Nenhum empréstimo atrasado!</td></tr>
              ) : loans.map((l, i) => (
                <tr key={i} className="bg-red-50/30 dark:bg-red-900/10">
                  <td className="py-2 pr-4 font-medium text-gray-900 dark:text-white">{l.nome}</td>
                  <td className="py-2 pr-4 text-gray-600 dark:text-gray-400">{l.turmaNome}</td>
                  <td className="py-2 pr-4 font-mono text-gray-700 dark:text-gray-300">{l.livro}</td>
                  <td className="py-2 pr-4 text-gray-600 dark:text-gray-400 hidden md:table-cell">{l.dataRetiradaFmt}</td>
                  <td className="py-2 pr-4 text-gray-600 dark:text-gray-400 hidden md:table-cell">{l.devolverEmFmt}</td>
                  <td className="py-2">
                    <span className="badge-overdue">{l._daysOverdue}d</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// Seção de histórico com filtros
function HistorySection({ tabs }) {
  const [loans, setLoans] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [filters, setFilters] = useState({ turmaId: '', studentName: '', tombo: '', status: '' });

  const search = () => {
    setLoading(true);
    const params = new URLSearchParams(Object.entries(filters).filter(([, v]) => v));
    api.get(`/api/reports/history?${params}`)
      .then(r => { setLoans(r.data.loans || []); setLoaded(true); })
      .catch(() => toast.error('Falha ao buscar histórico.'))
      .finally(() => setLoading(false));
  };

  const exportData = loans.map(l => ({
    Aluno: l.nome,
    Turma: l.turmaNome,
    'Nº Tombo': l.livro,
    Empréstimo: l.dataRetiradaFmt,
    'Devolução Prevista': l.devolverEmFmt,
    'Devolução Real': l.dataDevolucaoFmt,
    Status: l.status,
  }));

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-200 flex items-center gap-2">
          <Filter size={16} className="text-blue-500" /> Histórico de Empréstimos
        </h2>
        {loaded && (
          <div className="flex gap-2">
            <button onClick={() => exportCSV(exportData, 'historico.csv')} className="btn-secondary text-xs px-2 py-1.5 gap-1">
              <Download size={13} /> CSV
            </button>
            <button onClick={() => exportPDF(exportData, 'Histórico de Empréstimos')} className="btn-secondary text-xs px-2 py-1.5 gap-1">
              <Download size={13} /> PDF
            </button>
          </div>
        )}
      </div>

      {/* Filtros */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <select
          value={filters.turmaId}
          onChange={e => setFilters(f => ({ ...f, turmaId: e.target.value }))}
          className="input"
        >
          <option value="">Todas as turmas</option>
          {tabs.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
        </select>
        <input
          type="text"
          placeholder="Nome do aluno"
          value={filters.studentName}
          onChange={e => setFilters(f => ({ ...f, studentName: e.target.value }))}
          className="input"
        />
        <input
          type="text"
          placeholder="Nº Tombo"
          value={filters.tombo}
          onChange={e => setFilters(f => ({ ...f, tombo: e.target.value }))}
          className="input"
        />
        <select
          value={filters.status}
          onChange={e => setFilters(f => ({ ...f, status: e.target.value }))}
          className="input"
        >
          <option value="">Todos os status</option>
          <option value="ativo">Ativo</option>
          <option value="atrasado">Atrasado</option>
          <option value="devolvido">Devolvido</option>
        </select>
      </div>
      <button onClick={search} disabled={loading} className="btn-primary mb-4">
        <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
        {loading ? 'Buscando...' : 'Buscar'}
      </button>

      {loaded && (
        <>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">{loans.length} registro{loans.length !== 1 ? 's' : ''} encontrado{loans.length !== 1 ? 's' : ''}</p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700 text-xs text-gray-500 dark:text-gray-400 uppercase">
                  <th className="text-left py-2 pr-3">Aluno</th>
                  <th className="text-left py-2 pr-3">Turma</th>
                  <th className="text-left py-2 pr-3">Tombo</th>
                  <th className="text-left py-2 pr-3 hidden md:table-cell">Empréstimo</th>
                  <th className="text-left py-2 pr-3 hidden md:table-cell">Dev. Prevista</th>
                  <th className="text-left py-2 pr-3 hidden md:table-cell">Dev. Real</th>
                  <th className="text-left py-2">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {loans.length === 0 ? (
                  <tr><td colSpan={7} className="py-8 text-center text-gray-400">Nenhum resultado.</td></tr>
                ) : loans.map((l, i) => (
                  <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="py-2 pr-3 font-medium text-gray-900 dark:text-white">{l.nome}</td>
                    <td className="py-2 pr-3 text-gray-600 dark:text-gray-400">{l.turmaNome}</td>
                    <td className="py-2 pr-3 font-mono text-gray-700 dark:text-gray-300">{l.livro}</td>
                    <td className="py-2 pr-3 text-gray-600 dark:text-gray-400 hidden md:table-cell">{l.dataRetiradaFmt || '—'}</td>
                    <td className="py-2 pr-3 text-gray-600 dark:text-gray-400 hidden md:table-cell">{l.devolverEmFmt || '—'}</td>
                    <td className="py-2 pr-3 text-gray-600 dark:text-gray-400 hidden md:table-cell">{l.dataDevolucaoFmt || '—'}</td>
                    <td className="py-2"><StatusBadge status={l.status} daysOverdue={l._daysOverdue} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

export default function Reports() {
  const [tabs, setTabs] = useState([]);

  useEffect(() => {
    api.get('/api/loans/tabs').then(r => setTabs(r.data.tabs || [])).catch(() => {});
  }, []);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <BarChart2 size={22} className="text-blue-600" /> Relatórios
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
          Consultas, filtros e exportação de dados
        </p>
      </div>

      <OverdueSection />
      <HistorySection tabs={tabs} />
    </div>
  );
}
