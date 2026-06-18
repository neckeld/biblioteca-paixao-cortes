import { Menu, Moon, Sun } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

export default function Header({ onMenuClick }) {
  const { dark, toggleTheme } = useTheme();

  return (
    <header className="h-14 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center px-4 gap-3 flex-shrink-0">
      <button
        onClick={onMenuClick}
        className="lg:hidden p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700"
      >
        <Menu size={20} />
      </button>

      <div className="flex-1" />

      <button
        onClick={toggleTheme}
        title={dark ? 'Modo claro' : 'Modo escuro'}
        className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
      >
        {dark ? <Sun size={18} /> : <Moon size={18} />}
      </button>

      <div className="pl-2 border-l border-gray-200 dark:border-gray-700">
        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Biblioteca</p>
        <p className="text-xs text-gray-400 dark:text-gray-500">Paixão Côrtes</p>
      </div>
    </header>
  );
}
