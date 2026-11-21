import { ArrowDownToLine, FileCheck2, FileText, ShieldAlert, SquareArrowOutUpRight } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useEira } from '../context/EiraContext';
import { PageTitle, Panel, StatusBadge } from '../components/Ui';
import { formatDate, initials } from '../utils/format';

export default function History() {
  const { patients, selectedPatientId, setSelectedPatientId, request, previewPdf, downloadPdf, setError, actor } = useEira();
  const [history, setHistory] = useState(null);
  const [loading, setLoading] = useState(true);
  const patientId = actor.role === 'patient' ? 'PAC-0183' : selectedPatientId;

  useEffect(() => {
    let active = true;
    setLoading(true);
    request(`/patients/${patientId}/history`).then((response) => { if (active) setHistory(response); }).catch((error) => { if (active) setError(error.message); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [patientId, request, setError]);

  const patient = history?.patient;
  return <>
    <PageTitle
      eyebrow="HISTORIA DOCUMENTAL"
      title="Historial de la paciente"
      subtitle="Archivos organizados por expediente, sin perder sus antecedentes documentales." />
    {actor.role !== 'patient' && <div className="history-selector">
      <label htmlFor="history-patient">Expediente</label>
      <select
        className="field"
        id="history-patient"
        value={selectedPatientId}
        onChange={(event) => setSelectedPatientId(event.target.value)}>{patients.map((p) => <option key={p.id} value={p.id}>{p.name} · {p.id}</option>)}</select>
    </div>}
    {loading ? <div className="loading-placeholder">Cargando historial…</div> : patient && <>
      <div className="patient-profile">
        <div className="avatar-profile">{initials(patient.name)}</div>
        <div>
          <small>EXPEDIENTE DIGITAL</small>
          <h2>{patient.name}</h2>
          <p>{patient.id} · {patient.location}</p>
        </div>
        <span className="profile-badge">Paciente ficticia</span>
      </div>
      <div className="history-grid">
        <Panel
          className="wide-panel"
          title="Estudios registrados"
          extra={<span className="data-count">{history.results.length} registros</span>}>
          <div className="history-list">{history.results.length ? history.results.map((result) => <div className="document-row" key={result.id}>
            <span className="document-symbol">
              <FileCheck2 size={21} />
            </span>
            <div className="document-meta">
              <strong>{result.type}</strong>
              <small>{result.id} · {formatDate(result.createdAt)}</small>
              <span>
                <StatusBadge stage={result.stage} />
              </span>
            </div>
            <div className="document-actions">
              <button
                className="btn btn-outline btn-small"
                onClick={() => previewPdf(`/results/${result.id}/document`).catch((e) => setError(e.message))}>
                <SquareArrowOutUpRight size={15} /> Ver</button>
              <button
                className="btn btn-soft btn-small"
                onClick={() => downloadPdf(`/results/${result.id}/document`, `${result.id}.pdf`).catch((e) => setError(e.message))}>
                <ArrowDownToLine size={15} /> PDF</button>
            </div>
          </div>) : <div className="empty-state">Todavía no hay resultados autorizados.</div>}</div>
        </Panel>
        <Panel
          className="wide-panel"
          title="Formatos y anexos"
          extra={<span className="data-count">{history.documents.length} documentos</span>}>
          <p className="supporting-text">Documentos de referencia sin llenar. No se consideran resultados clínicos ni se publican en el portal de pacientes.</p>
          <div className="history-list">{history.documents.map((doc) => <div className="document-row" key={doc.id}>
            <span className="document-symbol pink">
              <FileText size={21} />
            </span>
            <div className="document-meta">
              <strong>{doc.title}</strong>
              <small>{doc.pages} {doc.pages === 1 ? 'página' : 'páginas'} · {doc.kind}</small>
              <span className="reference-tag">Solo personal autorizado</span>
            </div>
            <div className="document-actions">
              <button
                className="btn btn-outline btn-small"
                onClick={() => previewPdf(`/documents/${doc.id}/file`).catch((e) => setError(e.message))}>
                <SquareArrowOutUpRight size={15} /> Ver</button>
              <button
                className="btn btn-soft btn-small"
                onClick={() => downloadPdf(`/documents/${doc.id}/file`, doc.filename).catch((e) => setError(e.message))}>
                <ArrowDownToLine size={15} /> PDF</button>
            </div>
          </div>)}{!history.documents.length && <div className="empty-state">Sin documentos adicionales en el expediente.</div>}</div>
        </Panel>
      </div>
      <div className="information-row">
        <ShieldAlert size={18} />
        <p>Los PDF se solicitan al backend y no están en el directorio público de React. La autenticación de esta demo es ficticia; la versión clínica requiere Cognito y autorizaciones reales.</p>
      </div>
    </>}
  </>;
}
