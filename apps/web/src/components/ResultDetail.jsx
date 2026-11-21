import { CheckCircle2, Download, FileText, ShieldCheck, Smartphone, HandHeart, ArrowUpRight } from 'lucide-react';
import { useState } from 'react';
import { useEira } from '../context/EiraContext';
import { Modal, Panel, StatusBadge } from './Ui';
import { formatDate } from '../utils/format';

const ACTIONS = {
  identity: { title: 'Comprobar identidad', role: 'coordinator', help: 'Cotejar ID EIRA y fecha de nacimiento en el expediente.' },
  admin: { title: 'Aprobar revisión EIRA', role: 'coordinator', help: 'Confirma legibilidad y asociación correcta del documento.' },
  clinical: { title: 'Autorizar publicación', role: 'doctor', help: 'El médico debe validar que puede liberarse el PDF sintético.' },
  notification: { title: 'Notificar por SMS', role: 'coordinator', help: 'El SMS no incluye diagnósticos ni información clínica.' },
};

export default function ResultDetail({ result }) {
  const { actor, perform, previewPdf, downloadPdf, setError } = useEira();
  const [modal, setModal] = useState(null);
  const [confirmed, setConfirmed] = useState(false);
  const [identityChecked, setIdentityChecked] = useState(false);
  const [assistedMethod, setAssistedMethod] = useState('Consulta presencial en EIRA');
  const [busy, setBusy] = useState(false);

  if (!result) return <Panel className="result-detail">
    <div className="empty-state">Selecciona un expediente</div>
  </Panel>;
  const action = ACTIONS[result.stage];
  const permitted = action && action.role === actor.role;
  const pdfPath = `/results/${result.id}/document`;

  async function execute() {
    setBusy(true);
    try {
      if (modal === 'assisted') {
        await perform(`/results/${result.id}/assisted`, { verified: confirmed, method: assistedMethod }, 'Entrega asistida registrada en la bitácora.');
      } else if (result.stage === 'notification') {
        await perform(`/results/${result.id}/notify`, { confirmed, channel: 'SMS' }, 'Aviso registrado. Comprueba si el envío fue simulado o enviado a AWS.');
      } else {
        await perform(`/results/${result.id}/advance`, {
          confirmed,
          twoIdentifiersVerified: result.stage === 'identity' ? identityChecked : undefined,
        }, 'Estado del expediente actualizado.');
      }
      setModal(null);
    } catch {
      // El contexto muestra el error visible al usuario.
    } finally {
      setBusy(false);
    }
  }

  const open = (mode) => {
    setModal(mode);
    setConfirmed(false);
    setIdentityChecked(false);
  };

  return (
    <>
      <Panel className="result-detail">
        <div className="detail-top">
          <span>DETALLE DEL EXPEDIENTE</span>
          <span className="detail-icon">
            <FileText size={19} />
          </span>
        </div>
        <h2>{result.patientName}</h2>
        <p className="detail-id">{result.id} · {result.patientId}</p>
        <div className="detail-divider" />
        <div className="detail-row">
          <span>Tipo de estudio</span>
          <strong>{result.type}</strong>
        </div>
        <div className="detail-row">
          <span>Registro</span>
          <strong>{formatDate(result.createdAt)}</strong>
        </div>
        <div className="detail-row">
          <span>Estado actual</span>
          <StatusBadge stage={result.stage} />
        </div>
        <div className="detail-row">
          <span>Contacto</span>
          <strong>{result.patientPhoneMasked}</strong>
        </div>
        <div className="detail-divider" />
        <div className="detail-file">
          <span className="file-icon">
            <FileText size={19} />
          </span>
          <div>
            <strong>PDF sintético</strong>
            <small>Archivo de demostración · Sin información médica real</small>
          </div>
          <button
            className="icon-button"
            aria-label="Vista previa PDF"
            onClick={() => previewPdf(pdfPath).catch((e) => setError(e.message))}>
            <ArrowUpRight size={18} />
          </button>
        </div>
        {result.notification && <div className="notice-sm">
          <Smartphone size={16} />
          <span>SMS: {({ SIMULATED: 'simulado (sin envío real)', SUBMITTED: 'aceptado por AWS; entrega no confirmada', DELIVERED: 'entrega confirmada por relay', FAILED: 'entrega fallida', UNKNOWN: 'estado sin confirmar' })[result.notification.status] || result.notification.status}</span>
        </div>}
        {action && <div className="next-step">
          <div>
            <ShieldCheck size={17} />
            <strong>Siguiente paso</strong>
          </div>
          <p>{action.help}</p>
          <button className="btn btn-primary btn-full" disabled={!permitted} onClick={() => open('advance')}>{action.title}</button>{!permitted && <small>Disponible para el rol: {action.role === 'doctor' ? 'Personal médico' : 'Coordinación EIRA'}</small>}</div>}
        {['notification', 'available'].includes(result.stage) && actor.role === 'coordinator' && <button className="btn btn-outline btn-full assisted-button" onClick={() => open('assisted')}>
          <HandHeart size={17} /> Registrar entrega asistida</button>}
        {['available', 'delivered'].includes(result.stage) && <button
          className="btn btn-outline btn-full assisted-button"
          onClick={() => downloadPdf(pdfPath, `EIRA_${result.id}.pdf`).catch((e) => setError(e.message))}>
          <Download size={17} /> Descargar PDF de prueba</button>}
        {result.stage === 'delivered' && <div className="success-card">
          <CheckCircle2 size={17} /> Proceso concluido. Consulta la bitácora para verificar su trazabilidad.</div>}
      </Panel>
      {modal && <Modal
        title={modal === 'assisted' ? 'Entrega asistida' : action.title}
        subtitle={`${result.patientName} · ${result.id}`}
        onClose={() => setModal(null)}
        footer={<>
          <button className="btn btn-outline" onClick={() => setModal(null)}>Cancelar</button>
          <button
            className="btn btn-primary"
            onClick={execute}
            disabled={busy || !confirmed || (result.stage === 'identity' && modal === 'advance' && !identityChecked)}>{busy ? 'Procesando…' : 'Confirmar'}</button>
        </>}>
        <div className="modal-information">
          <ShieldCheck size={18} />
          <p>{modal === 'assisted' ? 'Registra el acceso presencial verificado. No se envía un documento por SMS.' : action.help}</p>
        </div>
        {modal === 'advance' && result.stage === 'identity' && <label className="check-field">
          <input type="checkbox" checked={identityChecked} onChange={(e) => setIdentityChecked(e.target.checked)} />
          <span>Verifiqué dos identificadores distintos: ID EIRA y fecha de nacimiento.</span>
        </label>}
        {modal === 'advance' && result.stage === 'notification' && <>
          <p className="field-help">El SMS se enviará exclusivamente al número registrado en el expediente, si la paciente autorizó SMS. Para AWS también debe coincidir con SMS_TEST_PHONE.</p>
          <div className="sms-preview">
            <Smartphone size={17} />
            <p>EIRA: Tienes un documento disponible. Consulta el portal oficial o acude al punto de atención autorizado.</p>
          </div>
        </>}
        {modal === 'assisted' && <>
          <label className="field-label" htmlFor="assist-method">Modalidad de entrega</label>
          <select id="assist-method" className="field" value={assistedMethod} onChange={(e) => setAssistedMethod(e.target.value)}>
            <option>Consulta presencial en EIRA</option>
            <option>Entrega en punto autorizado</option>
          </select>
        </>}
        <label className="check-field">
          <input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} />
          <span>{modal === 'assisted' ? 'Confirmo verificación de identidad y entrega documentada.' : result.stage === 'notification' ? 'Confirmo consentimiento de contacto y que este número es de prueba.' : 'Confirmo que completé la revisión correspondiente.'}</span>
        </label>
      </Modal>}
    </>
  );
}
