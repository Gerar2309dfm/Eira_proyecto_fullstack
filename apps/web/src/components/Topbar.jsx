import { LogOut, ShieldCheck, Smartphone } from 'lucide-react';
import { useEira } from '../context/EiraContext';

const BREADCRUMBS = {
  dashboard: 'Panel general', patients: 'Pacientes', results: 'Resultados',
  history: 'Historial paciente', notifications: 'Notificaciones',
  activity: 'Bitácora', impact: 'Impacto y campañas',
};

export default function Topbar() {
  const { screen, actor, logout } = useEira();
  return <header className="topbar">
    <div className="breadcrumb">EIRA <span>/</span> <strong>{BREADCRUMBS[screen]}</strong></div>
    <div className="topbar-right">
      <a className="patient-preview-link" href="/mi-resultado" target="_blank" rel="noopener noreferrer">
        <Smartphone size={16} /> <span>Vista paciente</span>
      </a>
      <span className="demo-pill"><ShieldCheck size={13} /> DEMO</span>
      <span className="staff-identity">{actor?.label}</span>
      <button className="staff-logout" onClick={logout} title="Cerrar sesión"><LogOut size={16} /> <span>Salir</span></button>
    </div>
  </header>;
}
