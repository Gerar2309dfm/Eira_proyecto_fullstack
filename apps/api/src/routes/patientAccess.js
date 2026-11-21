/**
 * API de consulta para pacientes. Demo con datos ficticios y claves individuales.
 * Autenticación local de demostración; no usar con expedientes reales.
 */
import { Router } from 'express';
import { readData, mutateData, addEvent } from '../repositories/sqliteRepository.js';
import { openPdf } from '../services/documentService.js';
import { checkPatientCode } from '../services/credentials.js';
import {
  clearFailures,
  createPatientSession,
  destroyPatientSession,
  hasAttemptsRemaining,
  registerFailure,
  requirePatientSession,
} from '../services/patientSession.js';

const router = Router();
const wrap = (handler) => (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
const PUBLISHED = ['available', 'delivered'];

function httpError(status, message) {
  return Object.assign(new Error(message), { status });
}

router.post('/login', wrap(async (req, res) => {
  const folio = String(req.body?.folio || '').trim().toUpperCase();
  const source = `ip:${req.ip}`;
  const target = `folio:${folio}`;
  if (!hasAttemptsRemaining(source) || !hasAttemptsRemaining(target)) {
    throw httpError(429, 'Demasiados intentos. Intenta de nuevo en unos minutos.');
  }

  const code = String(req.body?.accessCode || '').trim();
  const data = await readData();
  const result = data.results.find((item) => item.id === folio);
  const patientId = folio.startsWith('PAC-') ? folio : result?.patientId;
  const patient = data.patients.find((item) => item.id === patientId);

  // Mismo mensaje ante un folio inexistente, pendiente o clave incorrecta.
  if (!/^(EIR|PAC)-[A-Z0-9-]{2,24}$/.test(folio) || !patient || !checkPatientCode(patient.id, code)) {
    registerFailure(source);
    registerFailure(target);
    throw httpError(401, 'No se pudo acceder. Revisa tu folio y clave o contacta a EIRA.');
  }

  clearFailures(source);
  clearFailures(target);
  const session = createPatientSession(patient.id);
  res.set('Cache-Control', 'no-store');
  res.json(session);
}));

router.get('/me', requirePatientSession, wrap(async (req, res) => {
  const data = await readData();
  const patient = data.patients.find((item) => item.id === req.patientSession.patientId);
  if (!patient) throw httpError(404, 'Expediente no encontrado');
  const documents = data.results
    .filter((item) => item.patientId === patient.id && PUBLISHED.includes(item.stage))
    .map((item) => ({
      id: item.id,
      type: item.type,
      createdAt: item.createdAt,
      stage: item.stage,
    }))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  res.set('Cache-Control', 'no-store');
  res.json({ patient: { firstName: patient.name.split(' ')[0] }, documents });
}));

router.get('/documents/:id', requirePatientSession, wrap(async (req, res) => {
  const data = await readData();
  const result = data.results.find((item) => item.id === req.params.id);
  if (!result || result.patientId !== req.patientSession.patientId || !PUBLISHED.includes(result.stage)) {
    throw httpError(404, 'Documento no disponible en tu expediente');
  }

  const buffer = await openPdf(result);
  await mutateData((state) => {
    const current = state.results.find((item) => item.id === result.id);
    if (current.stage === 'available') current.stage = 'delivered';
    addEvent(state, {
      resultId: result.id,
      action: 'Consulta de documento sintético en portal paciente',
      actor: `paciente:${req.patientSession.patientId}`,
    });
  });

  res.set({
    'Content-Type': 'application/pdf',
    'Content-Disposition': `inline; filename="${result.id}.pdf"`,
    'Cache-Control': 'private, no-store',
    'X-Content-Type-Options': 'nosniff',
  });
  res.send(buffer);
}));

router.post('/logout', requirePatientSession, (req, res) => {
  destroyPatientSession(req.patientToken);
  res.status(204).send();
});

export default router;
