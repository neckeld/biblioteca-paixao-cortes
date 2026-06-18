import { Navigate, Route, Routes } from 'react-router-dom';
import AppShell from './components/Layout/AppShell';
import Dashboard from './pages/Dashboard';
import Books from './pages/Books';
import Loans from './pages/Loans';
import Students from './pages/Students';
import Reports from './pages/Reports';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<AppShell />}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard"   element={<Dashboard />} />
        <Route path="livros"      element={<Books />} />
        <Route path="emprestimos" element={<Loans />} />
        <Route path="alunos"      element={<Students />} />
        <Route path="relatorios"  element={<Reports />} />
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
