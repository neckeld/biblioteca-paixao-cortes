import { useEffect, useState } from 'react';
import { BookOpen, BookMarked, AlertTriangle, CheckCircle, Users, TrendingUp } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import api from '../services/api';
import Spinner from '../components/Common/Spinner';

const COLORS = ['#3b82f6','#10b981','#f59e0b','#ef4444','#8b5cf6','#ec4899','#14b8a6','#f97316'];

function StatCard({ icon: Icon, label, value, color, sub }) {
  const colors = {
    blue:   'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400',
    green:  'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400',
    red:    'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400',
    yellow: 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-600 dark:text-yellow-400',
    purple: 'bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400',
  };
  return (
    <div className="card p-5 flex items-start gap-4">
      <div className={`p-2.5 rounded-xl ${colors[color] || colors.blue}`}>
        <Icon size={22} />
      </div>
      <div>
        <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
        <p className="text-2xl font-bold text-gray-900 dark:text-white mt-0.5">{value ?? '—'}</p>
        {sub && <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.get('/api/reports/dashboard')
      .then(r => setData(r.data))
      .catch(e => setError(e.response?.data?.error || 'Falha ao carregar painel.'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Spinner text="Carregando painel..." />;
  if (error) return (
    <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-700 dark:text-red-400 text-sm">
      ⚠️ {error}
    </div>
  );

  const { summary, topBooks, loansByTurma, loansByClasse, booksByAquisicao } = data;

  const statusData = [
    { name: 'Ativos', value: summary.emprestimosAtivos },
    { name: 'Atrasados', value: summary.emprestimosAtrasados },
    { name: 'Devolvidos', value: summary.emprestimosDevolvidos },
  ].filter(d => d.value > 0);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">Painel da Biblioteca</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Visão geral dos empréstimos e acervo</p>
      </div>

      {/* Cards de resumo */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <StatCard icon={BookOpen}      label="Livros no Acervo"    value={summary.totalLivros}            color="blue" />
        <StatCard icon={TrendingUp}    label="Total Empréstimos"   value={summary.totalEmprestimos}       color="purple" />
        <StatCard icon={BookMarked}    label="Empréstimos Ativos"  value={summary.emprestimosAtivos}      color="blue" />
        <StatCard icon={AlertTriangle} label="Em Atraso"           value={summary.emprestimosAtrasados}   color="red" />
        <StatCard icon={CheckCircle}   label="Devolvidos"          value={summary.emprestimosDevolvidos}  color="green" />
        <StatCard icon={Users}         label="Turmas"              value={loansByTurma?.length ?? 0}      color="yellow" />
      </div>

      {/* Gráficos linha 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top livros mais emprestados */}
        <div className="card p-5">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-4">📚 Livros Mais Emprestados</h2>
          {topBooks?.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={topBooks.slice(0, 8)} layout="vertical" margin={{ left: 0, right: 16 }}>
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="titulo" tick={{ fontSize: 10 }} width={130}
                  tickFormatter={t => t.length > 20 ? t.slice(0, 20) + '…' : t} />
                <Tooltip formatter={(v, n) => [v, 'Empréstimos']} labelFormatter={l => `📖 ${l}`} />
                <Bar dataKey="count" fill="#3b82f6" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : <p className="text-sm text-gray-400 text-center py-8">Nenhum dado ainda.</p>}
        </div>

        {/* Status dos empréstimos */}
        <div className="card p-5">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-4">📊 Status dos Empréstimos</h2>
          {statusData.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart margin={{ top: 24, bottom: 8, left: 8, right: 8 }}>
                <Pie data={statusData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={65} label={({ name, value }) => `${name}: ${value}`}>
                  {statusData.map((_, i) => (
                    <Cell key={i} fill={['#3b82f6','#ef4444','#10b981'][i]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : <p className="text-sm text-gray-400 text-center py-8">Nenhum empréstimo registrado.</p>}
        </div>
      </div>

      {/* Gráficos linha 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Empréstimos por turma */}
        <div className="card p-5">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-4">🏫 Empréstimos por Turma</h2>
          {loansByTurma?.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={loansByTurma} margin={{ left: 0, right: 16 }}>
                <XAxis dataKey="nome" tick={{ fontSize: 10 }} angle={-20} textAnchor="end" height={50}
                  tickFormatter={t => t.length > 12 ? t.slice(0, 12) + '…' : t} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip labelFormatter={l => `Turma: ${l}`} formatter={v => [v, 'Empréstimos']} />
                <Bar dataKey="count" radius={[4,4,0,0]}>
                  {loansByTurma.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : <p className="text-sm text-gray-400 text-center py-8">Nenhum dado.</p>}
        </div>

        {/* Acervo por modo de aquisição */}
        <div className="card p-5">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-4">🎁 Acervo por Modo de Aquisição</h2>
          {booksByAquisicao?.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={booksByAquisicao} dataKey="count" nameKey="tipo" cx="50%" cy="50%" outerRadius={80}>
                  {booksByAquisicao.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v, n) => [v, n]} />
                <Legend formatter={t => t.length > 18 ? t.slice(0, 18) + '…' : t} />
              </PieChart>
            </ResponsiveContainer>
          ) : <p className="text-sm text-gray-400 text-center py-8">Nenhum dado.</p>}
        </div>
      </div>
    </div>
  );
}
