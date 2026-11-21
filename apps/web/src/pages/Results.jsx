import { FilePlus2, Search, UploadCloud } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useEira } from '../context/EiraContext';
import ResultTable from '../components/ResultTable';
import ResultDetail from '../components/ResultDetail';
import { Modal, PageTitle, Panel } from '../components/Ui';

export default function Results() {
  const { results, patients, actor, selectedResultId, setSelectedResultId, perform } = useEira();
  const [showUpload, setShowUpload] = useState(false);
  const [patientId, setPatientId] = useState('PAC-0183');
  const [type, setType] = useState('Citología cervical');
  const [file, setFile] = useState(null);
  const [query, setQuery] = useState('');
  const [busy, setBusy] = useState(false);

  const selected = results.find((result) => result.id === selectedResultId) || results[0];
  const filtered = useMemo(() => results.filter((result) => `${result.id} ${result.patientName}`.toLowerCase().includes(query.toLowerCase())), [results, query]);
  const mayUpload = ['coordinator', 'lab'].includes(actor.role);

  async function uploadDocument(event) {
    event.preventDefault();
    if (!file || !file.name.toLowerCase().endsWith('.pdf')) return;
    setBusy(true);
    const body = new FormData();
    body.append('patientId', patientId);
    body.append('type', type);
    body.append('document', file);
    try {
      const created = await perform('/results', body, 'PDF registrado. Sigue la verificación de identidad.', true);
      setSelectedResultId(created.id);
      setShowUpload(false);
      setFile(null);
    } catch {
      // Error visible desde el contexto.
    } finally { setBusy(false); }
  }

  return <>
    <PageTitle
      eyebrow="GESTIÓN DOCUMENTAL"
      title="Resultados"
      subtitle="Carga, asociación, revisión y autorización de documentos de prueba."
      action={mayUpload && <button className="btn btn-primary" onClick={() => setShowUpload(true)}>
        <FilePlus2 size={17} /> Nuevo resultado</button>} />
    <div className="dashboard-columns">
      <Panel
        className="results-panel"
        title="Bandeja de resultados"
        extra={<span className="data-count">{results.length} registros</span>}>
        <div className="table-controls">
          <label className="search-input">
            <Search size={17} />
            <input placeholder="Buscar por paciente o folio" value={query} onChange={(event) => setQuery(event.target.value)} />
          </label>
        </div>
        <ResultTable results={filtered} selected={selected?.id} onSelect={setSelectedResultId} />
      </Panel>
      <ResultDetail result={selected} />
    </div>
    {showUpload && <Modal
      title="Registrar nuevo resultado"
      subtitle="Utiliza exclusivamente un archivo PDF de prueba."
      onClose={() => setShowUpload(false)}
      footer={<>
        <button className="btn btn-outline" onClick={() => setShowUpload(false)}>Cancelar</button>
        <button className="btn btn-primary" type="submit" form="upload-form" disabled={!file || busy}>{busy ? 'Guardando…' : 'Registrar PDF'}</button>
      </>}>
      <form id="upload-form" onSubmit={uploadDocument} className="form-stack">
        <label className="field-label" htmlFor="upload-patient">Paciente ficticia</label>
        <select className="field" id="upload-patient" value={patientId} onChange={(event) => setPatientId(event.target.value)}>{patients.map((patient) => <option key={patient.id} value={patient.id}>{patient.name} · {patient.id}</option>)}</select>
        <label className="field-label" htmlFor="upload-type">Tipo de estudio</label>
        <select className="field" id="upload-type" value={type} onChange={(event) => setType(event.target.value)}>
          <option>Citología cervical</option>
          <option>Revisión mamaria</option>
        </select>
        <label className="upload-area">
          <UploadCloud size={24} />
          <strong>{file ? file.name : 'Selecciona el PDF sintético'}</strong>
          <span>Solo archivos PDF · Máximo 8 MB</span>
          <input
            aria-label="Seleccionar documento PDF"
            type="file"
            accept="application/pdf,.pdf"
            onChange={(event) => setFile(event.target.files?.[0] || null)} />
        </label>
        <p className="field-help">El PDF se guarda localmente y sus metadatos quedan en SQLite. Para una versión real se requerirá S3 privado y controles de seguridad clínica.</p>
      </form>
    </Modal>}
  </>;
}
