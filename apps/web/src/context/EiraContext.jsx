import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { apiRequest, downloadProtectedPdf, openProtectedPdf } from '../services/api';

const EiraContext = createContext(null);

export function EiraProvider({ children }) {
  // Token sólo en memoria: al recargar hay que entrar otra vez. No se utiliza localStorage.
  const [session, setSession] = useState(null);
  const [screen, setScreen] = useState('dashboard');
  const [selectedResultId, setSelectedResultId] = useState('EIR-0241');
  const [selectedPatientId, setSelectedPatientId] = useState('PAC-0183');
  const [patients, setPatients] = useState([]);
  const [results, setResults] = useState([]);
  const [events, setEvents] = useState([]);
  const [metrics, setMetrics] = useState({ total: 0, pending: 0, notifications: 0, available: 0 });
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  const actor = session?.user || null;
  const token = session?.token || '';

  const logout = useCallback(() => {
    if (token) apiRequest('/staff-auth/logout', token, { method: 'POST', body: {} }).catch(() => {});
    setSession(null);
    setPatients([]);
    setResults([]);
    setEvents([]);
    setScreen('dashboard');
    setNotice('');
    setError('');
  }, [token]);

  const refresh = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const [dashboard, patientData] = await Promise.all([
        apiRequest('/dashboard', token),
        apiRequest('/patients', token),
      ]);
      setResults(dashboard.results);
      setEvents(dashboard.events);
      setMetrics(dashboard.metrics);
      setPatients(patientData);
      setError('');
    } catch (cause) {
      if (cause.status === 401) {
        setSession(null);
        setError('La sesión terminó. Vuelve a iniciar sesión.');
      } else {
        setError(`${cause.message}. Comprueba que la API esté activa.`);
      }
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { refresh(); }, [refresh]);

  async function login(username, password) {
    const result = await apiRequest('/staff-auth/login', '', {
      method: 'POST',
      body: { username, password },
    });
    setSession(result);
    setError('');
    setNotice(`Sesión iniciada: ${result.user.label}`);
    setScreen('dashboard');
    return result.user;
  }

  async function perform(path, body, successMessage, isMultipart = false) {
    try {
      const output = await apiRequest(path, token, {
        method: 'POST',
        body: isMultipart ? body : body || {},
      });
      await refresh();
      setNotice(successMessage);
      setError('');
      return output;
    } catch (cause) {
      setError(cause.message);
      throw cause;
    }
  }

  function navigate(nextScreen) {
    setScreen(nextScreen);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  const request = useCallback((path) => apiRequest(path, token), [token]);
  const previewPdf = useCallback((path) => openProtectedPdf(path, token), [token]);
  const downloadPdf = useCallback((path, filename) => downloadProtectedPdf(path, token, filename), [token]);

  const value = useMemo(() => ({
    actor, token, login, logout, screen, navigate,
    selectedResultId, setSelectedResultId,
    selectedPatientId, setSelectedPatientId,
    patients, results, events, metrics,
    loading, error, notice, setError, setNotice,
    refresh, perform, request, previewPdf, downloadPdf,
  }), [actor, token, logout, screen, selectedResultId, selectedPatientId,
    patients, results, events, metrics, loading, error, notice,
    refresh, request, previewPdf, downloadPdf]);

  return <EiraContext.Provider value={value}>{children}</EiraContext.Provider>;
}

export function useEira() {
  const context = useContext(EiraContext);
  if (!context) throw new Error('useEira requiere EiraProvider');
  return context;
}
