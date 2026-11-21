import {
  Activity,
  ClipboardCheck,
  FileClock,
  FileText,
  House,
  LayoutDashboard,
  BarChart3,
  LogOut,
  Menu,
  MessageSquareText,
  Users,
  X,
} from 'lucide-react';
import { useState } from 'react';
import BrandLogo from './BrandLogo';
import { useEira } from '../context/EiraContext';

const mainLinks = [
  { id: 'dashboard', label: 'Panel general', icon: LayoutDashboard },
  { id: 'patients', label: 'Pacientes', icon: Users },
  { id: 'results', label: 'Resultados', icon: FileText },
  { id: 'history', label: 'Historial paciente', icon: FileClock },
  { id: 'notifications', label: 'Notificaciones', icon: MessageSquareText },
  { id: 'activity', label: 'Bitácora', icon: Activity },
  { id: 'impact', label: 'Impacto y campañas', icon: BarChart3 },
];

export default function Sidebar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { screen, navigate, actor, metrics } = useEira();
  const links = mainLinks.filter((link) => {
    if (actor.role === 'coordinator') return true;
    if (actor.role === 'doctor') return !['notifications'].includes(link.id);
    return !['notifications', 'impact'].includes(link.id);
  });

  const handleClick = (id) => {
    navigate(id);
    setMobileOpen(false);
  };

  return (
    <>
      <button
        className="mobile-nav-button"
        onClick={() => setMobileOpen(true)}
        aria-label="Abrir menú"
      >
        <Menu size={21} />
      </button>

      {mobileOpen && (
        <button
          className="mobile-backdrop"
          onClick={() => setMobileOpen(false)}
          aria-label="Cerrar menú"
        />
      )}

      <aside className={`sidebar ${mobileOpen ? 'sidebar-open' : ''}`}>
        <div className="brand">
          <BrandLogo className="sidebar-logo" />
          <div className="brand-caption">CENTRO DE RESULTADOS</div>
          <button
            className="sidebar-close"
            onClick={() => setMobileOpen(false)}
            aria-label="Cerrar menú"
          >
            <X size={18} />
          </button>
        </div>

        <p className="sidebar-label">ESPACIO DE TRABAJO</p>
        <nav aria-label="Navegación principal" className="nav-list">
          {links.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              className={`nav-item ${screen === id ? 'active' : ''}`}
              onClick={() => handleClick(id)}
              aria-current={screen === id ? 'page' : undefined}
            >
              <Icon size={18} strokeWidth={1.9} />
              <span>{label}</span>
              {id === 'notifications' && metrics.notifications > 0 && (
                <span className="nav-counter">{metrics.notifications}</span>
              )}
            </button>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <div className="help-card">
            <ClipboardCheck size={20} />
            <strong>Documentos protegidos</strong>
            <span>Expedientes ficticios, revisión controlada y trazabilidad.</span>
          </div>
          <div className="sidebar-version">
            <LogOut size={14} /> Prototipo Nerdearla · v3
          </div>
        </div>
      </aside>
    </>
  );
}
