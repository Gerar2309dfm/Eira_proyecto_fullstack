import {
  ArrowDownToLine,
  CheckCircle2,
  FileText,
  HeartHandshake,
  LockKeyhole,
  Smartphone,
} from 'lucide-react';
import BrandLogo from '../components/BrandLogo';
import { useEira } from '../context/EiraContext';
import { PageTitle, StatusBadge } from '../components/Ui';
import { formatDate } from '../utils/format';

export default function Portal() {
  const { actor, switchUser, results, downloadPdf, setError, refresh } = useEira();
  const isPatient = actor.role === 'patient';

  const handleDownload = async (result) => {
    try {
      await downloadPdf(`/results/${result.id}/document`, `Resultado_${result.id}.pdf`);
      await refresh();
    } catch (error) {
      setError(error.message);
    }
  };

  return (
    <>
      <PageTitle
        eyebrow="ACCESO PARA PACIENTES"
        title="Mis documentos"
        subtitle="Una página ligera, con pasos sencillos y sin necesidad de instalar una app."
      />

      {!isPatient ? (
        <div className="portal-intro">
          <BrandLogo className="portal-intro-logo" />
          <span className="portal-big-icon">
            <Smartphone size={32} />
          </span>
          <h2>Una experiencia sencilla para cada paciente</h2>
          <p>
            En el sistema definitivo, el acceso será autenticado. En esta
            demostración puedes entrar como la paciente ficticia Daniela Ruiz.
          </p>
          <button className="btn btn-primary" onClick={() => switchUser('paciente')}>
            Ver el portal paciente
          </button>
        </div>
      ) : (
        <div className="patient-portal">
          <div className="portal-greeting">
            <BrandLogo className="portal-greeting-logo" />
            <span>
              <LockKeyhole size={16} /> SESIÓN FICTICIA · SOLO DEMO
            </span>
            <h2>Hola, Daniela</h2>
            <p>
              Aquí puedes encontrar tus documentos disponibles. Si no tienes
              internet, puedes solicitar atención presencial en EIRA.
            </p>
          </div>

          <div className="portal-content">
            <h3>Tus resultados disponibles</h3>
            {results.length ? (
              results.map((result) => (
                <div className="portal-document" key={result.id}>
                  <span className="portal-file-icon">
                    <FileText size={27} />
                  </span>
                  <div className="portal-document-info">
                    <strong>{result.type}</strong>
                    <small>
                      Folio {result.id} · {formatDate(result.createdAt)}
                    </small>
                    <StatusBadge stage={result.stage} />
                  </div>
                  <button
                    className="btn btn-primary"
                    onClick={() => handleDownload(result)}
                  >
                    <ArrowDownToLine size={18} /> Descargar PDF
                  </button>
                </div>
              ))
            ) : (
              <div className="portal-empty">
                <CheckCircle2 size={23} /> Por ahora no tienes documentos
                autorizados para descargar.
              </div>
            )}

            <div className="portal-assistance">
              <HeartHandshake size={24} />
              <div>
                <strong>¿No tienes internet o smartphone?</strong>
                <p>
                  El aviso SMS puede llegar a un celular básico. Si necesitas
                  el documento impreso, acude a un punto de atención autorizado
                  y verifica tu identidad.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="information-row">
        <LockKeyhole size={18} />
        <p>
          Este portal utiliza un cambio de rol solo para fines demostrativos.
          No debe utilizarse con pacientes reales hasta implementar
          autenticación e identidad seguras.
        </p>
      </div>
    </>
  );
}
