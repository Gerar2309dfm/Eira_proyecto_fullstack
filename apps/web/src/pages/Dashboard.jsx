import { Activity, ArrowRight, BellRing, CheckCircle2, ClipboardList, FileUp, Search, Users } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useEira } from '../context/EiraContext';
import ResultDetail from '../components/ResultDetail';
import ResultTable from '../components/ResultTable';
import { PageTitle, Panel } from '../components/Ui';
import { formatDateTime } from '../utils/format';

const flow = [
  ['01', 'Carga PDF', 'Laboratorio'],
  ['02', 'Identidad', 'Coordinación'],
  ['03', 'Revisión', 'Administrativa'],
  ['04', 'Autorización', 'Personal médico'],
  ['05', 'Aviso / entrega', 'Paciente'],
];

export default function Dashboard() {
  const { metrics, results, events, selectedResultId, setSelectedResultId, navigate } = useEira();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('Todos');

  const list = useMemo(() => results.filter((item) => {
    const matchesText = `${item.patientName} ${item.id} ${item.type}`.toLowerCase().includes(query.toLowerCase());
    const matchesStage = filter === 'Todos' || (filter === 'Pendientes' && ['identity', 'admin', 'clinical'].includes(item.stage)) || (filter === 'Disponibles' && ['available', 'delivered'].includes(item.stage));
    return matchesText && matchesStage;
  }), [results, query, filter]);

  const selected = results.find((result) => result.id === selectedResultId) || results[0];
  const statistics = [
    { title: 'Expedientes registrados', value: metrics.total, detail: 'Documentos de demostración', icon: Users, tone: 'teal' },
    { title: 'Pendientes de revisión', value: metrics.pending, detail: 'Requieren seguimiento', icon: ClipboardList, tone: 'blue' },
    { title: 'Avisos por enviar', value: metrics.notifications, detail: 'Autorizados clínicamente', icon: BellRing, tone: 'orange' },
    { title: 'Disponibles / entregados', value: metrics.available, detail: 'Acceso autorizado', icon: CheckCircle2, tone: 'purple' },
  ];

  return <>
    <PageTitle
      eyebrow="CENTRO DE OPERACIONES"
      title="Panel general"
      subtitle="Una vista clara del proceso de entrega de resultados de EIRA."
      action={<button className="btn btn-primary" onClick={() => navigate('results')}>
        <FileUp size={17} /> Registrar resultado</button>} />
    <div className="demo-banner">
      <CheckCircle2 size={16} />
      <span>
        <strong>Entorno de demostración.</strong> Expedientes ficticios, documentos sintéticos y SMS simulado por defecto. No subir datos médicos reales.</span>
    </div>
    <div className="metrics-grid">{statistics.map(({ title, value, detail, icon: Icon, tone }) => <div className="metric-card" key={title}>
      <div className="metric-head">
        <span>{title}</span>
        <span className={`metric-symbol ${tone}`}>
          <Icon size={18} />
        </span>
      </div>
      <strong className="metric-value">{value}</strong>
      <span className="metric-detail">{detail}</span>
    </div>)}</div>
    <Panel className="flow-panel" title="Flujo de entrega" extra={<small>Proceso simplificado y documentado</small>}>
      <div className="flow-steps">{flow.map(([n, name, role]) => <div className="flow-step" key={n}>
        <span className="flow-index">{n}</span>
        <div>
          <strong>{name}</strong>
          <small>{role}</small>
        </div>
      </div>)}</div>
    </Panel>
    <div className="dashboard-columns">
      <Panel
        className="results-panel"
        title="Resultados recientes"
        extra={<button className="text-link" onClick={() => navigate('results')}>Ver todos <ArrowRight size={15} />
        </button>}>
        <div className="table-controls">
          <label className="search-input">
            <Search size={16} />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar paciente o folio" />
          </label>
          <div className="filter-list">{['Todos', 'Pendientes', 'Disponibles'].map((item) => <button key={item} className={filter === item ? 'selected' : ''} onClick={() => setFilter(item)}>{item}</button>)}</div>
        </div>
        <ResultTable results={list} selected={selected?.id} onSelect={setSelectedResultId} />
        <div className="panel-footer">
          <span>{list.length} expedientes visibles</span>
          <button className="text-link" onClick={() => navigate('results')}>Gestión de resultados <ArrowRight size={14} />
          </button>
        </div>
      </Panel>
      <ResultDetail result={selected} />
    </div>
    <Panel
      className="activity-panel"
      title="Actividad reciente"
      extra={<button className="text-link" onClick={() => navigate('activity')}>Ver bitácora <ArrowRight size={15} />
      </button>}>
      <div className="activity-list">{events.slice(0, 4).map((event) => <div className="activity-item" key={event.id}>
        <span className="timeline-bullet">
          <Activity size={14} />
        </span>
        <div>
          <strong>{event.action}</strong>
          <small>{event.resultId} · {event.actor}</small>
        </div>
        <time>{formatDateTime(event.createdAt)}</time>
      </div>)}</div>
    </Panel>
  </>;
}
