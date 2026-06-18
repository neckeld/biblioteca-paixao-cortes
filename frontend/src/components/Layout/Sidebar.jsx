import { NavLink } from 'react-router-dom';
import {
  BookOpen, BookMarked, Users, BarChart2, LayoutDashboard, X, Library
} from 'lucide-react';

const navItems = [
  { to: '/dashboard',   icon: LayoutDashboard, label: 'Painel' },
  { to: '/livros',      icon: BookOpen,         label: 'Acervo' },
  { to: '/emprestimos', icon: BookMarked,        label: 'Empréstimos' },
  { to: '/alunos',      icon: Users,             label: 'Alunos' },
  { to: '/relatorios',  icon: BarChart2,         label: 'Relatórios' },
];

export default function Sidebar({ open, onClose }) {
  return (
    <aside className={`
      fixed lg:static inset-y-0 left-0 z-30
      w-60 bg-white dark:bg-gray-800
      border-r border-gray-200 dark:border-gray-700
      flex flex-col
      transition-transform duration-200
      ${open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
    `}>
      {/* Logo */}
      <div className="flex items-center justify-between px-4 py-5 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <Library size={18} className="text-white" />
          </div>
          <div>
            <p className="text-sm font-bold text-gray-900 dark:text-white leading-tight">Biblioteca</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 leading-tight">Paixão Côrtes</p>
          </div>
        </div>
        <button onClick={onClose} className="lg:hidden p-1 rounded text-gray-400 hover:text-gray-600">
          <X size={18} />
        </button>
      </div>

      {/* Navegação */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            onClick={onClose}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white'
              }`
            }
          >
            <Icon size={18} />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Rodapé */}
      <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700">
        <p className="text-xs text-gray-400 dark:text-gray-500 text-center">
          EMEF João Carlos D'Ávila<br />Paixão Côrtes
        </p>
      </div>
    </aside>
  );
}
