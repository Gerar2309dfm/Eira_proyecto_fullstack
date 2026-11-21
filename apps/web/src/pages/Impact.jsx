import { useEffect, useState } from 'react';
import { BarChart3, ClipboardCheck, HandHeart, MessageSquareText, RefreshCw, ShieldCheck } from 'lucide-react';
import { PageTitle, Panel } from '../components/Ui';
import { useEira } from '../context/EiraContext';

/** Todos los números proceden de SQLite: no hay cifras inventadas de impacto. */
export default function Impact() {
  const { request, setError, actor } = useEira();
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try { setReport(await request('/impact')); }
    catch (error) { setError(error.message); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, [request]);

  if (actor.role === 'lab') {
    return <div className="empty-state">Este informe requiere permisos de coordinación o personal médico.</div>;
  }

  const kpis = report ? [
    { label: 'Pacientes de prueba', value: report.patients, icon: BarChart3 },
    { label: 'Pendientes de revisión', value: report.pendingReview, icon: ClipboardCheck },
    { label: 'Entregas asistidas', value: report.assisted, icon: HandHeart },
    { label: 'SMS simulados registrados', value: report.smsSimulated, icon: MessageSquareText },
  ] : [];

  return <>
    <PageTitle eyebrow="INDICADORES DEL PROTOTIPO" title="Impacto y campañas"
      subtitle="Seguimiento real de los datos de prueba: nuevas brigadas y comunidades sin alterar la aplicación."
      action={<button className="btn btn-outline" onClick={load} disabled={loading}><RefreshCw size={17} /> Actualizar</button>} />
    <div className="demo-banner"><ShieldCheck size={17}/><span>Los indicadores son de expedientes <strong>ficticios</strong>. No equivalen a resultados clínicos, ahorro medido ni impacto de campo.</span></div>
    {loading && !report && <div className="loading-placeholder">Calculando los indicadores…</div>}
    {report && <>
      <div className="impact-kpis">{kpis.map(({ label, value, icon: Icon }) =>
        <div className="impact-kpi" key={label}><Icon size={20}/><strong>{value}</strong><span>{label}</span></div>)}</div>
      <div className="impact-columns">
        <Panel className="wide-panel" title="Pacientes por campaña" extra={<span className="data-count">{report.byCampaign.length} campañas</span>}>
          <div className="impact-list">{report.byCampaign.map((row) => <div className="impact-row" key={row.name}><span>{row.name}</span><strong>{row.total}</strong></div>)}</div>
        </Panel>
        <Panel className="wide-panel" title="Pacientes por comunidad" extra={<span className="data-count">{report.byCommunity.length} zonas</span>}>
          <div className="impact-list">{report.byCommunity.map((row) => <div className="impact-row" key={row.name}><span>{row.name}</span><strong>{row.total}</strong></div>)}</div>
        </Panel>
      </div>
      <Panel className="wide-panel" title="Seguimiento verificable">
        <div className="impact-list">
          <div className="impact-row"><span>Documentos disponibles o consultados</span><strong>{report.readyOrConsulted}</strong></div>
          <div className="impact-row"><span>Documentos pendientes de aviso</span><strong>{report.awaitingNotice}</strong></div>
          <div className="impact-row"><span>Consultas autenticadas registradas</span><strong>{report.authenticatedConsultations}</strong></div>
          <div className="impact-row"><span>SMS aceptados por AWS (sin confirmar entrega)</span><strong>{report.smsSubmitted}</strong></div>
          <div className="impact-row"><span>SMS confirmados por relay (si se configuró)</span><strong>{report.smsDelivered}</strong></div>
        </div>
      </Panel>
      <div className="information-row"><ClipboardCheck size={18}/><p>Para medir impacto real en un piloto, cronometrar carga y entrega, registrar intentos fallidos, y comparar con la operación previa de EIRA. El prototipo no inventa estos valores.</p></div>
    </>}
  </>;
}
