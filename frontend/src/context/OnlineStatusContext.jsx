import { createContext, useContext, useEffect, useRef, useState } from 'react';
import api from '../services/api';

const OnlineStatusContext = createContext({
  online: true,
  pending: 0,
  lastSyncAt: null,
  syncErrors: [],
  refresh: () => {},
});

const POLL_MS = 12_000;

export function OnlineStatusProvider({ children }) {
  const [status, setStatus] = useState({
    online: true, pending: 0, lastSyncAt: null, syncErrors: [],
  });
  const timer = useRef(null);

  const refresh = async () => {
    try {
      const { data } = await api.get('/api/status');
      setStatus({
        online: !!data.online,
        pending: data.pending || 0,
        lastSyncAt: data.lastSyncAt || null,
        syncErrors: data.syncErrors || [],
      });
    } catch {
      // Se nem o backend local responde, tratamos como offline.
      setStatus(s => ({ ...s, online: false }));
    }
  };

  useEffect(() => {
    refresh();
    timer.current = setInterval(refresh, POLL_MS);
    return () => clearInterval(timer.current);
  }, []);

  return (
    <OnlineStatusContext.Provider value={{ ...status, refresh }}>
      {children}
    </OnlineStatusContext.Provider>
  );
}

export const useOnlineStatus = () => useContext(OnlineStatusContext);
