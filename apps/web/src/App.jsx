import { AlertCircle, CheckCircle2, RefreshCw, X } from 'lucide-react';
import Sidebar from './components/Sidebar';
import Topbar from './components/Topbar';
import { EiraProvider, useEira } from './context/EiraContext';
import Dashboard from './pages/Dashboard';
import Patients from './pages/Patients';
import Results from './pages/Results';
import History from './pages/History';
import Notifications from './pages/Notifications';
import Activity from './pages/Activity';
import Portal from './pages/Portal';
import PatientAccess from './pages/PatientAccess';
import StaffLogin from './pages/StaffLogin';
import Impact from './pages/Impact';

const pages = {
  dashboard: Dashboard,
  patients: Patients,
  results: Results,
  history: History,
  notifications: Notifications,
  activity: Activity,
  portal: Portal,
  impact: Impact,
};

function AppLayout() {
  const { screen, actor, error, setError, notice, setNotice, loading, refresh } = useEira();
  if (!actor) return <StaffLogin />;
  const Screen = pages[screen] || Dashboard;
  return <div className="app-shell">
    <Sidebar />
    <div className="main-area">
      <Topbar />
      <main className="main-content">{error && <div className="app-alert app-alert-error">
        <AlertCircle size={19} />
        <span>{error}</span>
        <button aria-label="Cerrar error" onClick={() => setError('')}>
          <X size={17} />
        </button>
      </div>}{notice && <div className="app-alert app-alert-success">
        <CheckCircle2 size={19} />
        <span>{notice}</span>
        <button aria-label="Cerrar aviso" onClick={() => setNotice('')}>
          <X size={17} />
        </button>
      </div>}{loading && <div className="fetch-indicator">
        <RefreshCw size={14} className="spin" /> Sincronizando datos de demostración…</div>}<Screen />
      </main>
    </div>
  </div>;
}

export default function App() {
  if (window.location.pathname.startsWith('/mi-resultado')) {
    return <PatientAccess />;
  }

  return <EiraProvider>
    <AppLayout />
  </EiraProvider>;
}
