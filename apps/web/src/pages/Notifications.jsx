import { BellRing, CheckCircle2, MessageSquareText, Smartphone, RefreshCw, Send } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useEira } from '../context/EiraContext';
import ResultDetail from '../components/ResultDetail';
import { PageTitle, Panel, StatusBadge } from '../components/Ui';
import { formatDateTime } from '../utils/format';

export default function Notifications() {
  const { results, selectedResultId, setSelectedResultId, request, perform, actor } = useEira();
  const [sms, setSms] = useState({ mode: 'simulated', messages: [] });
  const [phone, setPhone] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const pending = results.filter((item) => item.stage === 'notification');
  const notified = results.filter((item) => item.notification);
  const selected = results.find((item) => item.id === selectedResultId && item.stage === 'notification') || pending[0] || results[0];

  async function loadSms() {
    if (actor.role !== 'coordinator') return;
    try { setSms(await request('/sms')); } catch { /* Errores en contexto al ejecutar acciones. */ }
  }
  useEffect(() => { loadSms(); }, [actor.role]);

  async function sendTest(event) {
    event.preventDefault();
    setBusy(true);
    setTestResult(null);
    try {
      const response = await perform('/sms/test', { phone, confirmed }, 'Solicitud de SMS de prueba registrada.');
      setTestResult(response);
      await loadSms();
      setConfirmed(false);
    } catch { /* El error se muestra arriba mediante contexto. */ }
    finally { setBusy(false); }
  }

  return <>
    <PageTitle eyebrow="COMUNICACIÓN" title="Notificaciones SMS" subtitle="Prueba el mensaje en un teléfono básico o smartphone, sin enviar información clínica." />
    <div className="demo-banner"><Smartphone size={17} /><span>Un SMS no requiere internet, pero la descarga de PDF sí. Si la paciente no tiene conectividad, EIRA registra una entrega asistida.</span></div>
    {actor.role === 'coordinator' && <Panel className="wide-panel" title="Laboratorio de SMS" extra={<span className="data-count">Modo: {sms.mode === 'aws' ? 'AWS real' : 'Simulación local'}</span>}>
      <div className="sms-lab">
        <form className="sms-test-form" onSubmit={sendTest}>
          <label className="field-label" htmlFor="sms-test-phone">Número de celular de prueba</label>
          <input className="field" type="tel" id="sms-test-phone" placeholder="+52XXXXXXXXXX" value={phone} onChange={(event) => setPhone(event.target.value)} required pattern="\\+[1-9][0-9]{9,14}" />
          <p className="field-help">En modo AWS, el número debe coincidir con <code>SMS_TEST_PHONE</code> y estar permitido en tu cuenta. El texto no contiene nombres ni resultados.</p>
          <label className="check-field"><input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} required /><span>Confirmo que es mi teléfono o tengo autorización explícita para esta prueba.</span></label>
          <button type="submit" className="btn btn-primary" disabled={busy || !confirmed}><Send size={16} />{busy ? 'Enviando…' : 'Probar notificación SMS'}</button>
          {testResult && <div className="sms-result-box"><CheckCircle2 size={18} /><span>{testResult.status === 'SIMULATED' ? 'Mensaje simulado (no llegó al teléfono).' : 'AWS aceptó la solicitud. La entrega aún no está confirmada.'} Identificador: {testResult.id}</span></div>}
        </form>
        <div className="sms-phone-preview">
          <div className="sms-phone-icon"><MessageSquareText size={24} /></div>
          <strong>Vista previa del SMS</strong>
          <div className="sms-bubble">EIRA DEMO: esta es una prueba de notificacion SMS. No contiene resultados ni datos clinicos.</div>
          <small>Mensaje de prueba neutro • No incluye enlaces a PDFs</small>
        </div>
      </div>
      <div className="sms-history-header"><strong>Historial de mensajes</strong><button className="btn btn-outline btn-small" onClick={loadSms}><RefreshCw size={15}/> Actualizar</button></div>
      <div className="sms-log-list">{sms.messages.length ? sms.messages.slice(0, 15).map((message) => <div className="sms-log-item" key={message.id}>
        <span>{message.destinationMasked}</span><span>{message.status === 'SIMULATED' ? 'Simulado' : message.status}</span><small>{formatDateTime(message.createdAt)}</small>
      </div>) : <p className="supporting-text">Aún no se han registrado nuevas pruebas SMS. Los avisos anteriores del seed permanecen en los expedientes.</p>}</div>
    </Panel>}
    <div className="dashboard-columns" style={{marginTop: 20}}>
      <div className="stack-panels">
        <Panel className="wide-panel" title="Resultados listos para notificar" extra={<span className="data-count">{pending.length} pendientes</span>}>
          <div className="notification-list">{pending.length ? pending.map((item) => <button key={item.id} className={`notification-item ${selected.id === item.id ? 'selected' : ''}`} onClick={() => setSelectedResultId(item.id)}>
            <span className="notification-icon"><BellRing size={17}/></span><div><strong>{item.patientName}</strong><small>{item.id} · {item.type}</small></div><StatusBadge stage={item.stage}/>
          </button>) : <div className="empty-state">No hay resultados pendientes de aviso.</div>}</div>
        </Panel>
        <Panel className="wide-panel" title="Resultados notificados">
          <div className="notification-list">{notified.map((item) => <div key={item.id} className="notification-item"><span className="notification-icon success"><CheckCircle2 size={17}/></span><div><strong>{item.patientName}</strong><small>{formatDateTime(item.notification.createdAt)} · {item.id}</small></div><span className="reference-tag">{({ SIMULATED: 'Simulado', SUBMITTED: 'Aceptado AWS', DELIVERED: 'Entregado', FAILED: 'Fallido', UNKNOWN: 'Desconocido' })[item.notification.status] || item.notification.status}</span></div>)}</div>
        </Panel>
      </div>
      <ResultDetail result={selected}/>
    </div>
    <div className="information-row"><MessageSquareText size={18}/><p>El estado SUBMITTED de AWS significa que la solicitud fue aceptada, no que el teléfono recibió el SMS. Para confirmar entrega hay que conectar eventos del proveedor.</p></div>
  </>;
}
