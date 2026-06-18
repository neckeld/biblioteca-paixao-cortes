import { WifiOff, RefreshCw, AlertTriangle } from 'lucide-react';
import { useOnlineStatus } from '../../context/OnlineStatusContext';

/** Faixa no topo indicando modo offline / sincronização pendente. */
export default function OfflineBanner() {
  const { online, pending, syncErrors } = useOnlineStatus();

  // Tudo normal: online, sem pendências e sem erros → não mostra nada.
  if (online && pending === 0 && syncErrors.length === 0) return null;

  if (!online) {
    return (
      <div className="flex items-center gap-2 px-4 py-2 text-sm bg-amber-500 text-white">
        <WifiOff size={16} className="flex-shrink-0" />
        <span className="font-medium">Modo offline.</span>
        <span className="opacity-90">
          As ações continuam funcionando e serão sincronizadas quando a internet voltar
          {pending > 0 ? ` (${pending} pendente${pending !== 1 ? 's' : ''})` : ''}.
        </span>
      </div>
    );
  }

  if (pending > 0) {
    return (
      <div className="flex items-center gap-2 px-4 py-2 text-sm bg-blue-600 text-white">
        <RefreshCw size={16} className="flex-shrink-0 animate-spin" />
        <span className="font-medium">
          Sincronizando {pending} ação{pending !== 1 ? 'ões' : ''} pendente{pending !== 1 ? 's' : ''}...
        </span>
      </div>
    );
  }

  // online, sem pendências, mas houve falhas ao sincronizar
  return (
    <div className="flex items-center gap-2 px-4 py-2 text-sm bg-red-600 text-white">
      <AlertTriangle size={16} className="flex-shrink-0" />
      <span className="font-medium">
        {syncErrors.length} ação(ões) não puderam ser sincronizadas.
      </span>
      <span className="opacity-90">Verifique a planilha e refaça-as manualmente.</span>
    </div>
  );
}
