import { useState } from 'react';
import { KeyRound, LockKeyhole, ShieldCheck, Smartphone, WifiOff } from 'lucide-react';
import BrandLogo from '../components/BrandLogo';
import { useEira } from '../context/EiraContext';

export default function StaffLogin() {
  const { login, error, setError } = useEira();
  const [username, setUsername] = useState('coordinacion');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      await login(username, password);
      setPassword('');
    } catch (cause) {
      setError(cause.message);
    } finally {
      setBusy(false);
    }
  }

  return <main className="staff-login-shell">
    <section className="staff-login-card" aria-label="Ingreso del personal EIRA">
      <BrandLogo className="staff-login-logo" />
      <div className="staff-login-caption"><ShieldCheck size={16} /> Centro de resultados · Demo local</div>
      <h1>Acceso del personal</h1>
      <p>Entra con la cuenta asignada para revisar, autorizar o entregar resultados ficticios.</p>
      <form className="form-stack" onSubmit={submit}>
        <label className="field-label" htmlFor="staff-user">Cuenta del personal</label>
        <select id="staff-user" className="field" value={username} onChange={(event) => setUsername(event.target.value)}>
          <option value="coordinacion">Coordinación EIRA</option>
          <option value="laboratorio">Laboratorio</option>
          <option value="medico">Personal médico</option>
        </select>
        <label className="field-label" htmlFor="staff-password">Contraseña</label>
        <input id="staff-password" className="field" type="password" autoComplete="current-password"
          value={password} onChange={(event) => setPassword(event.target.value)} required placeholder="Contraseña de demostración" />
        {error && <div className="staff-login-error" role="alert">{error}</div>}
        <button className="btn btn-primary btn-full" type="submit" disabled={busy || !password}>
          <LockKeyhole size={17} /> {busy ? 'Validando…' : 'Entrar al panel'}
        </button>
      </form>
      <p className="staff-login-hint"><KeyRound size={15} /> Las contraseñas de demo están documentadas en README.md. Los roles se verifican en la API.</p>
    </section>
    <section className="staff-login-side">
      <h2>Atención segura y accesible</h2>
      <p>Una plataforma para coordinar resultados sin depender de WhatsApp.</p>
      <div><Smartphone size={22} /> Portal separado para pacientes con internet</div>
      <div><WifiOff size={22} /> Folio y entrega asistida cuando no hay conectividad</div>
      <a className="btn btn-outline" href="/mi-resultado">Ir al portal de pacientes</a>
      <small>Prototipo con datos sintéticos. No utilizar expedientes reales.</small>
    </section>
  </main>;
}
