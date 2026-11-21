import { Activity as ActivityIcon, History } from 'lucide-react';
import { useEira } from '../context/EiraContext';
import { PageTitle, Panel } from '../components/Ui';
import { formatDateTime } from '../utils/format';

export default function Activity() {
  const { events } = useEira();
  return <>
    <PageTitle
      eyebrow="SEGUIMIENTO"
      title="Bitácora de acciones"
      subtitle="Registro de decisiones, autorizaciones, notificaciones y entregas." />
    <Panel
      className="wide-panel"
      title="Movimientos recientes"
      extra={<span className="data-count">{events.length} movimientos</span>}>
      <div className="audit-list">{events.map((event) => <div className="audit-row" key={event.id}>
        <span className="audit-icon">
          <ActivityIcon size={16} />
        </span>
        <div>
          <strong>{event.action}</strong>
          <small>{event.resultId} · {event.actor}</small>
        </div>
        <time>{formatDateTime(event.createdAt)}</time>
      </div>)}</div>
    </Panel>
    <div className="information-row">
      <History size={18} />
      <p>Esta bitácora de demo se guarda en un archivo JSON local. En producción deberá almacenarse de forma persistente, protegida frente a modificaciones y con retención definida.</p>
    </div>
  </>;
}
