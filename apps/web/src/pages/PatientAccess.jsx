import { useEffect, useState } from 'react';
import {
  ArrowDownToLine,
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  CheckCircle2,
  Eye,
  FileCheck2,
  FileText,
  HeartHandshake,
  HelpCircle,
  KeyRound,
  LockKeyhole,
  LogOut,
  MessageSquare,
  ShieldCheck,
  Smartphone,
  WifiOff,
} from 'lucide-react';
import BrandLogo from '../components/BrandLogo';
import {
  downloadPatientPdf,
  patientApi,
  previewPatientPdf,
} from '../services/patientApi';
import '../styles/patient.css';

const SESSION_KEY = 'eira-paciente-demo-token';

function formatPatientDate(date) {
  if (!date) return 'Fecha no disponible';
  return new Intl.DateTimeFormat('es-MX', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'America/Mexico_City',
  }).format(new Date(date));
}

function PatientHeader({ signedIn, onLogout }) {
  return (
    <header className="patient-header">
      <a className="patient-logo-link" href="/mi-resultado" aria-label="EIRA, portal de resultados">
        <BrandLogo className="patient-brand-logo" />
      </a>
      <span className="patient-header-label">
        <ShieldCheck size={17} aria-hidden="true" />
        Portal de resultados
      </span>
      {signedIn && (
        <button type="button" className="patient-exit" onClick={onLogout}>
          <LogOut size={17} aria-hidden="true" /> Salir
        </button>
      )}
    </header>
  );
}

function Assistance({ onBack }) {
  return (
    <section className="patient-assistance-page" aria-labelledby="assistance-title">
      <span className="patient-illustration patient-illustration-small">
        <HeartHandshake size={35} aria-hidden="true" />
      </span>
      <p className="patient-eyebrow">ESTAMOS PARA AYUDARTE</p>
      <h1 id="assistance-title">¿No tienes internet o celular inteligente?</h1>
      <p className="patient-lead">
        No necesitas instalar una aplicación. Puedes recibir un aviso por SMS en un
        celular básico y pedir la entrega de tu resultado en un punto de atención autorizado.
      </p>

      <div className="patient-assistance-steps">
        <div className="patient-assistance-step">
          <span className="patient-step-number">1</span>
          <div>
            <strong>Conserva tu folio EIRA</strong>
            <p>Lo encontrarás en el comprobante que recibiste cuando te atendieron.</p>
          </div>
        </div>
        <div className="patient-assistance-step">
          <span className="patient-step-number">2</span>
          <div>
            <strong>Solicita atención en tu centro autorizado</strong>
            <p>Pregunta dónde puedes recoger tu resultado sin necesidad de usar internet.</p>
          </div>
        </div>
        <div className="patient-assistance-step">
          <span className="patient-step-number">3</span>
          <div>
            <strong>Verifica tu identidad al recogerlo</strong>
            <p>Presenta tu folio y la identificación que te soliciten. El personal registrará la entrega.</p>
          </div>
        </div>
      </div>

      <div className="patient-assistance-note">
        <MessageSquare size={23} aria-hidden="true" />
        <div>
          <strong>El SMS es solo un aviso</strong>
          <p>No incluye el diagnóstico ni el archivo. Si no tienes internet, no necesitas abrir ningún enlace.</p>
        </div>
      </div>
      <button type="button" className="patient-back-link" onClick={onBack}>
        <ArrowLeft size={18} aria-hidden="true" /> Volver a consulta en línea
      </button>
    </section>
  );
}

function Login({ onLogin, busy, error, onAssistance }) {
  const [folio, setFolio] = useState('');
  const [accessCode, setAccessCode] = useState('');
  const [showHelp, setShowHelp] = useState(false);

  const submit = (event) => {
    event.preventDefault();
    if (!folio.trim() || !accessCode.trim()) return;
    onLogin(folio, accessCode);
  };

  return (
    <div className="patient-login-layout">
      <section className="patient-welcome" aria-labelledby="welcome-title">
        <div className="patient-welcome-content">
          <div className="patient-welcome-icon">
            <FileCheck2 size={27} aria-hidden="true" />
          </div>
          <p className="patient-eyebrow">CUIDADO QUE TE ACOMPAÑA</p>
          <h1 id="welcome-title">Tus resultados, cerca de ti.</h1>
          <p>
            Consulta tus documentos autorizados de forma sencilla, desde tu celular
            o computadora, sin instalar ninguna aplicación.
          </p>
          <div className="patient-welcome-benefits">
            <span><CheckCircle2 size={18} aria-hidden="true" /> Sin instalar apps</span>
            <span><CheckCircle2 size={18} aria-hidden="true" /> Descarga en PDF</span>
            <span><CheckCircle2 size={18} aria-hidden="true" /> Acceso personal</span>
          </div>
        </div>
        <div className="patient-welcome-decoration" aria-hidden="true" />
      </section>

      <div className="patient-login-content">
        <div className="patient-login-card">
          <div className="patient-login-badge">
            <LockKeyhole size={16} aria-hidden="true" /> CONSULTA DE RESULTADOS
          </div>
          <h2>Bienvenida a EIRA</h2>
          <p className="patient-form-description">
            Escribe tu folio y la clave personal que recibiste en tu atención.
          </p>

          <form onSubmit={submit} className="patient-login-form">
            <label htmlFor="patient-folio">Folio de paciente o resultado</label>
            <div className="patient-input-wrap">
              <FileText size={20} aria-hidden="true" />
              <input
                id="patient-folio"
                name="folio"
                autoComplete="off"
                maxLength={30}
                placeholder="Ej. PAC-0183 o EIR-0245"
                value={folio}
                onChange={(event) => setFolio(event.target.value)}
                required
              />
            </div>
            <label htmlFor="patient-code">Clave personal</label>
            <div className="patient-input-wrap">
              <KeyRound size={20} aria-hidden="true" />
              <input
                id="patient-code"
                name="access-code"
                type="password"
                autoComplete="off"
                placeholder="Ingresa tu clave"
                value={accessCode}
                onChange={(event) => setAccessCode(event.target.value)}
                required
              />
            </div>
            <button
              type="button"
              className="patient-where-folio"
              onClick={() => setShowHelp((current) => !current)}
              aria-expanded={showHelp}
            >
              <HelpCircle size={16} aria-hidden="true" /> ¿Dónde encuentro mi folio?
            </button>
            {showHelp && (
              <p className="patient-help-detail">
                Está en tu comprobante de atención EIRA. Si no lo tienes, comunícate
                con el personal del centro donde te realizaron el estudio.
              </p>
            )}
            {error && <div className="patient-error" role="alert">{error}</div>}
            <button type="submit" className="patient-primary-action" disabled={busy}>
              {busy ? 'Verificando...' : 'Consultar mis resultados'}
              {!busy && <ArrowRight size={19} aria-hidden="true" />}
            </button>
          </form>

          <div className="patient-secure-caption">
            <LockKeyhole size={15} aria-hidden="true" />
            Solo puedes consultar documentos ya autorizados para tu expediente.
          </div>
        </div>

        <button type="button" className="patient-no-internet" onClick={onAssistance}>
          <span className="patient-no-internet-icon"><WifiOff size={23} aria-hidden="true" /></span>
          <span><strong>¿No tienes internet o smartphone?</strong><small>Conoce cómo recibir tu resultado de forma asistida.</small></span>
          <ArrowRight size={18} aria-hidden="true" />
        </button>

        <div className="patient-demo-note">
          <strong>Modo demostración — pacientes ficticias</strong>
          <span>Cuentas iniciales: <code>PAC-0183</code> o <code>EIR-0245</code> · Clave: <code>EIRA2026</code></span>
          <small>Estas credenciales solo sirven para el prototipo del hackatón.</small>
        </div>
      </div>
    </div>
  );
}

function Documents({ data, onView, onDownload, busyDocumentId, onAssistance }) {
  return (
    <section className="patient-documents" aria-labelledby="documents-title">
      <div className="patient-documents-hero">
        <div>
          <p className="patient-eyebrow">MI ESPACIO EIRA</p>
          <h1 id="documents-title">Hola, {data.patient.firstName}</h1>
          <p>Desde aquí puedes consultar y guardar tus resultados disponibles.</p>
        </div>
        <div className="patient-documents-hero-icon" aria-hidden="true">
          <FileCheck2 size={35} />
        </div>
      </div>

      <div className="patient-documents-body">
        <div className="patient-section-title">
          <div>
            <h2>Mis resultados</h2>
            <p>Documentos autorizados para tu consulta</p>
          </div>
          <span className="patient-document-count">{data.documents.length} {data.documents.length === 1 ? 'documento' : 'documentos'}</span>
        </div>

        {data.documents.length === 0 ? (
          <div className="patient-empty-documents">
            <FileText size={36} aria-hidden="true" />
            <strong>Aún no hay resultados disponibles</strong>
            <p>Cuando el personal médico los autorice, podrás encontrarlos aquí.</p>
          </div>
        ) : (
          <div className="patient-document-list">
            {data.documents.map((document) => (
              <article className="patient-document-card" key={document.id}>
                <div className="patient-document-main">
                  <span className="patient-document-icon"><FileText size={25} aria-hidden="true" /></span>
                  <div>
                    <span className="patient-result-status"><BadgeCheck size={14} aria-hidden="true" /> Disponible para consulta</span>
                    <h3>{document.type}</h3>
                    <p>Folio {document.id} · {formatPatientDate(document.createdAt)}</p>
                  </div>
                </div>
                <div className="patient-document-actions">
                  <button
                    type="button"
                    className="patient-view-action"
                    onClick={() => onView(document.id)}
                    disabled={busyDocumentId !== ''}
                  >
                    <Eye size={18} aria-hidden="true" /> Ver documento
                  </button>
                  <button
                    type="button"
                    className="patient-download-action"
                    onClick={() => onDownload(document.id)}
                    disabled={busyDocumentId !== ''}
                  >
                    <ArrowDownToLine size={18} aria-hidden="true" />
                    {busyDocumentId === document.id ? 'Preparando...' : 'Descargar PDF'}
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}

        <p className="patient-download-hint">
          <Smartphone size={16} aria-hidden="true" /> Puedes guardar el PDF en tu teléfono para revisarlo después, incluso sin conexión.
        </p>

        <button type="button" className="patient-help-card" onClick={onAssistance}>
          <span className="patient-help-icon"><HeartHandshake size={26} aria-hidden="true" /></span>
          <span><strong>¿Necesitas recibirlo impreso?</strong><small>Conoce las opciones de atención presencial o asistida.</small></span>
          <ArrowRight size={18} aria-hidden="true" />
        </button>
      </div>
    </section>
  );
}

/**
 * Portal público independiente del dashboard de EIRA.
 * El mecanismo de acceso actual es solo una simulación segura a nivel de flujo,
 * NO constituye autenticación médica válida para operar con personas reales.
 */
export default function PatientAccess() {
  const [token, setToken] = useState(() => sessionStorage.getItem(SESSION_KEY) || '');
  const [data, setData] = useState(null);
  const [assistance, setAssistance] = useState(false);
  const [busy, setBusy] = useState(Boolean(token));
  const [busyDocumentId, setBusyDocumentId] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) return undefined;
    let mounted = true;
    patientApi.session(token)
      .then((response) => {
        if (mounted) {
          setData(response);
          setError('');
        }
      })
      .catch((cause) => {
        if (mounted) {
          sessionStorage.removeItem(SESSION_KEY);
          setToken('');
          setData(null);
          setError(cause.message);
        }
      })
      .finally(() => {
        if (mounted) setBusy(false);
      });
    return () => { mounted = false; };
  }, [token]);

  const login = async (folio, accessCode) => {
    setBusy(true);
    setError('');
    try {
      const session = await patientApi.login(folio, accessCode);
      sessionStorage.setItem(SESSION_KEY, session.token);
      setToken(session.token);
    } catch (cause) {
      setError(cause.message);
      setBusy(false);
    }
  };

  const logout = async () => {
    const priorToken = token;
    sessionStorage.removeItem(SESSION_KEY);
    setToken('');
    setData(null);
    setAssistance(false);
    setError('');
    if (priorToken) patientApi.logout(priorToken).catch(() => {});
  };

  const accessDocument = async (id, preview = false) => {
    const tab = preview ? window.open('about:blank', '_blank') : null;
    setBusyDocumentId(id);
    setError('');
    try {
      if (preview) await previewPatientPdf(token, id, tab);
      else await downloadPatientPdf(token, id);
      const updated = await patientApi.session(token);
      setData(updated);
    } catch (cause) {
      if (tab && !tab.closed) tab.close();
      setError(cause.message);
    } finally {
      setBusyDocumentId('');
    }
  };

  return (
    <div className="patient-site">
      <PatientHeader signedIn={Boolean(token && data)} onLogout={logout} />
      <main className="patient-main">
        {assistance ? (
          <Assistance onBack={() => setAssistance(false)} />
        ) : token && busy && !data ? (
          <div className="patient-loading" role="status">Preparando tus documentos...</div>
        ) : token && data ? (
          <>
            {error && <div className="patient-top-error" role="alert">{error}</div>}
            <Documents
              data={data}
              onView={(id) => accessDocument(id, true)}
              onDownload={(id) => accessDocument(id)}
              busyDocumentId={busyDocumentId}
              onAssistance={() => setAssistance(true)}
            />
          </>
        ) : (
          <Login onLogin={login} busy={busy} error={error} onAssistance={() => setAssistance(true)} />
        )}
      </main>
      <footer className="patient-footer">
        <span>© EIRA · Centro de resultados</span>
        <span><ShieldCheck size={14} aria-hidden="true" /> Prototipo de demostración — sin expedientes reales</span>
      </footer>
    </div>
  );
}
