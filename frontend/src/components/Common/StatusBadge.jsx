import { Clock, CheckCircle, AlertTriangle } from 'lucide-react';

export default function StatusBadge({ status, daysOverdue }) {
  if (status === 'devolvido') return (
    <span className="badge-returned">
      <CheckCircle size={11} /> Devolvido
    </span>
  );
  if (status === 'atrasado') return (
    <span className="badge-overdue">
      <AlertTriangle size={11} />
      {daysOverdue > 0 ? `${daysOverdue}d atrasado` : 'Atrasado'}
    </span>
  );
  return (
    <span className="badge-active">
      <Clock size={11} /> Ativo
    </span>
  );
}
