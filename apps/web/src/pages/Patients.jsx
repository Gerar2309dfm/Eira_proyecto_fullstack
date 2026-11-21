import { ArrowRight, FileClock, KeyRound, Plus, Search, ShieldCheck, UsersRound } from 'lucide-react';
import { useState } from 'react';
import { useEira } from '../context/EiraContext';
import { Modal, PageTitle, Panel } from '../components/Ui';
import { initials } from '../utils/format';

const empty = { name: '', birthDate: '', phone: '', location: 'Comunidad de prueba', campaign: 'Campaña Nerdearla', accessMode: 'SMS y portal', consentSms: false };

export default function Patients() {
  const { patients, results, actor, perform, setSelectedPatientId, navigate } = useEira();
  const [query, setQuery] = useState('');
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState(empty);
  const [credentials, setCredentials] = useState(null);
  const [resetPatient, setResetPatient] = useState(null);
  const [busy, setBusy] = useState(false);
  const filtered = patients.filter((item) => `${item.name} ${item.id} ${item.location} ${item.campaign || ''}`.toLowerCase().includes(query.toLowerCase()));

  const showHistory = (id) => {
    setSelectedPatientId(id);
    navigate('history');
  };

  const change = (name, value) => setForm((previous) => ({ ...previous, [name]: value }));

  async function create(event) {
    event.preventDefault();
    setBusy(true);
    try {
      const response = await perform('/patients', form, 'Paciente ficticia creada en la base SQLite.');
      setCredentials({ patientId: response.patient.id, name: response.patient.name, accessCode: response.accessCode });
      setCreating(false);
      setForm(empty);
    } catch { /* El contexto muestra los errores de la API. */ }
    finally { setBusy(false); }
  }

  async function resetAccess() {
    setBusy(true);
    try {
      const response = await perform(`/patients/${resetPatient.id}/reset-access`, { confirmed: true }, 'Clave regenerada.');
      setCredentials({ patientId: resetPatient.id, name: resetPatient.name, accessCode: response.accessCode });
      setResetPatient(null);
    } catch { /* El contexto presenta el error. */ }
    finally { setBusy(false); }
  }

  return <>
    <PageTitle
      eyebrow="EXPEDIENTES · BASE DE DATOS SQLITE"
      title="Pacientes"
      subtitle="Crea expedientes ficticios y entrega una clave individual de acceso al portal."
      action={actor.role === 'coordinator' && <button className="btn btn-primary" onClick={() => setCreating(true)}><Plus size={17} /> Nueva paciente</button>}
    />
    <Panel className="wide-panel" title="Directorio de pacientes" extra={<span className="data-count">{patients.length} registros persistentes</span>}>
      <div className="table-controls">
        <label className="search-input">
          <Search size={17} />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar nombre, folio, campaña o comunidad" />
        </label>
      </div>
      <div className="patient-directory">{filtered.map((patient) => <div key={patient.id} className="directory-item patient-directory-entry">
        <button className="directory-open" onClick={() => showHistory(patient.id)}>
          <div className="patient-cell">
            <div className="avatar-soft large">{initials(patient.name)}</div>
            <div><strong>{patient.name}</strong><small>{patient.id} · {patient.location} · {patient.campaign || 'Campaña general'}</small></div>
          </div>
          <div className="directory-side">
            <span className="access-pill">{patient.accessMode}</span>
            <span className="directory-results">{results.filter((item) => item.patientId === patient.id).length} resultados</span>
            <ArrowRight size={17} />
          </div>
        </button>
        {actor.role === 'coordinator' && <button className="btn btn-outline btn-small reset-access-btn" onClick={() => setResetPatient(patient)} title="Generar otra clave para esta paciente">
          <KeyRound size={14} /> Nueva clave
        </button>}
      </div>)}</div>
      {filtered.length === 0 && <div className="empty-state"><UsersRound size={22} />No se encontraron pacientes.</div>}
    </Panel>
    <div className="information-row"><FileClock size={18} /><p>Esta versión solo debe utilizarse con datos ficticios. La clave se entrega de manera separada al SMS y solo se muestra una vez después de crearla.</p></div>

    {creating && <Modal title="Crear paciente ficticia" subtitle="El expediente se guardará en SQLite y tendrá acceso a su propio portal." onClose={() => setCreating(false)} footer={<>
      <button className="btn btn-outline" onClick={() => setCreating(false)} type="button">Cancelar</button>
      <button className="btn btn-primary" form="new-patient-form" type="submit" disabled={busy}>{busy ? 'Guardando…' : 'Crear expediente y acceso'}</button>
    </>}>
      <form id="new-patient-form" className="form-stack" onSubmit={create}>
        <label htmlFor="new-name" className="field-label">Nombre ficticio</label>
        <input required minLength="4" maxLength="100" id="new-name" className="field" value={form.name} onChange={(e) => change('name', e.target.value)} placeholder="Ej. María Ejemplo García" />
        <label htmlFor="new-birth" className="field-label">Fecha de nacimiento ficticia</label>
        <input required type="date" id="new-birth" className="field" value={form.birthDate} onChange={(e) => change('birthDate', e.target.value)} />
        <label htmlFor="new-location" className="field-label">Comunidad</label>
        <input id="new-location" maxLength="100" className="field" value={form.location} onChange={(e) => change('location', e.target.value)} />
        <label htmlFor="new-campaign" className="field-label">Campaña o brigada</label>
        <input id="new-campaign" className="field" maxLength="80" value={form.campaign} onChange={(e) => change('campaign', e.target.value)} />
        <label htmlFor="new-mode" className="field-label">Forma de entrega</label>
        <select id="new-mode" className="field" value={form.accessMode} onChange={(e) => change('accessMode', e.target.value)}>
          <option>SMS y portal</option><option>Solo portal</option><option>Entrega asistida</option>
        </select>
        <label htmlFor="new-phone" className="field-label">Celular de prueba (no utilizar números de pacientes reales)</label>
        <input id="new-phone" className="field" type="tel" placeholder="+52XXXXXXXXXX" value={form.phone} onChange={(e) => change('phone', e.target.value)} required={form.accessMode === 'SMS y portal'} />
        {form.accessMode === 'SMS y portal' && <label className="check-field">
          <input type="checkbox" checked={form.consentSms} onChange={(e) => change('consentSms', e.target.checked)} required />
          <span>Confirmo permiso para enviar notificaciones de prueba a este teléfono.</span>
        </label>}
      </form>
    </Modal>}

    {resetPatient && <Modal title="Regenerar clave" subtitle={resetPatient.name} onClose={() => setResetPatient(null)} footer={<>
      <button className="btn btn-outline" onClick={() => setResetPatient(null)}>Cancelar</button>
      <button className="btn btn-primary" onClick={resetAccess} disabled={busy}>Confirmar verificación y crear clave</button>
    </>}>
      <div className="modal-information"><ShieldCheck size={20} /><p>Usa esta acción solo después de comprobar la identidad presencial de la paciente ficticia. La clave anterior dejará de funcionar para nuevos accesos.</p></div>
    </Modal>}

    {credentials && <Modal title="Acceso creado" subtitle="Entrega estos datos por un canal separado del SMS. No volverán a mostrarse." onClose={() => setCredentials(null)} footer={<button className="btn btn-primary" onClick={() => setCredentials(null)}>He guardado los datos</button>}>
      <div className="credentials-card">
        <p><strong>Paciente:</strong> {credentials.name}</p>
        <p><strong>Folio de acceso:</strong> <code>{credentials.patientId}</code></p>
        <p><strong>Clave personal:</strong> <code>{credentials.accessCode}</code></p>
        <button className="btn btn-soft btn-full" onClick={() => navigator.clipboard?.writeText(`Folio: ${credentials.patientId}\nClave: ${credentials.accessCode}`)}>Copiar credenciales de demostración</button>
        <small>Portal: <strong>/mi-resultado</strong>. La paciente puede ingresar aun si todavía no tiene resultados autorizados.</small>
      </div>
    </Modal>}
  </>;
}
