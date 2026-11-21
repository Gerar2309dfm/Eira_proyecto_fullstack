import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import multer from 'multer';
import { readData, mutateData, addEvent, recordSms, listSms, recentAwsSmsCount, latestTestSms, updateSmsDelivery } from './repositories/sqliteRepository.js';
import { newAccessCode, setPatientCode, provisionInitialCodes } from './services/credentials.js';
import { smsBody, sendSms } from './services/smsService.js';
import { validatePatientSms } from './services/smsPolicy.js';
import { allow, canAccessPatient, initializeStaff, staffLogin, requireStaff, revokeStaff } from './middleware/staffAuth.js';
import { savePdf, openPdf, validatePdf } from './services/documentService.js';
import { validateAdvance } from './services/workflow.js';
import patientAccess from './routes/patientAccess.js';
import { revokePatientSessions } from './services/patientSession.js';
import { timingSafeEqual } from 'node:crypto';

const app = express();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 8 * 1024 * 1024 } });
// Sólo se activa una vez el conjunto de cuentas ficticias del seed.
provisionInitialCodes((await readData()).patients);
initializeStaff();

app.use(helmet());
app.use(cors({ origin: [/^http:\/\/localhost:\d+$/, /^http:\/\/127\.0\.0\.1:\d+$/] }));
app.use(express.json({ limit: '100kb' }));
app.get('/api/health', (_req, res) => res.json({ ok: true, storage: 'sqlite', smsMode: process.env.SMS_MODE || 'simulated' }));
// Portal de pacientes independiente del acceso administrativo ficticio.
app.use('/api/patient-access', patientAccess);
// Autenticación separada: jamás confiar en un encabezado de rol suministrado por el cliente.
const wrapAuth = (handler) => (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);

app.post('/api/staff-auth/login', wrapAuth(async (req, res) => {
  const { username, password } = req.body || {};
  const payload = staffLogin({ username: String(username || ''), password, ip: req.ip });
  res.set('Cache-Control', 'no-store').json(payload);
}));

app.post('/api/integrations/sms-delivery', wrapAuth(async (req, res) => {
  const expected = process.env.SMS_DELIVERY_WEBHOOK_SECRET || '';
  const received = req.get('x-eira-relay-secret') || '';
  const a = Buffer.from(expected);
  const b = Buffer.from(received);
  if (expected.length < 32 || a.length !== b.length || !timingSafeEqual(a, b)) {
    throw httpError(403, 'Relay no autorizado.');
  }
  const providerId = String(req.body.providerMessageId || '');
  const status = String(req.body.status || '').toUpperCase();
  if (!providerId || !['DELIVERED', 'FAILED', 'UNKNOWN'].includes(status)) {
    throw httpError(400, 'Se requieren providerMessageId y estado de entrega reconocido.');
  }
  const sms = updateSmsDelivery({ providerId, status });
  if (!sms) throw httpError(404, 'Mensaje de AWS no encontrado.');
  if (sms.resultId) await mutateData((state) => {
    const result = state.results.find((item) => item.id === sms.resultId);
    if (result?.notification?.messageId === providerId) result.notification.status = sms.status;
    addEvent(state, { resultId: sms.resultId, action: `Estado SMS verificado por relay: ${sms.status}`, actor: 'relay-sms' });
  });
  res.json({ ok: true, status: sms.status });
}));

app.use('/api', requireStaff);
app.get('/api/staff-auth/me', (req, res) => res.set('Cache-Control', 'no-store').json({ user: req.actor }));
app.post('/api/staff-auth/logout', (req, res) => { revokeStaff(req.staffToken); res.status(204).send(); });

function httpError(status, message) {
  return Object.assign(new Error(message), { status });
}

function getResultOrThrow(data, id) {
  const result = data.results.find((item) => item.id === id);
  if (!result) throw httpError(404, 'Resultado no encontrado');
  return result;
}

function presentPatient(patient, role) {
  if (role === 'coordinator') return patient;
  // Los demás roles no reciben teléfono completo ni consentimiento de contacto.
  return { id: patient.id, name: patient.name, birthDate: patient.birthDate,
    location: patient.location, campaign: patient.campaign || 'Campaña general',
    accessMode: patient.accessMode };
}

function presentResult(data, result) {
  const patient = data.patients.find((item) => item.id === result.patientId);
  return { ...result, patientName: patient?.name, patientPhoneMasked: patient ? `••• ${patient.phone.slice(-4)}` : '' };
}

function visibleResults(data) {
  const filtered = data.results;
  return filtered.map((item) => presentResult(data, item));
}

const wrap = (handler) => (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);

app.get('/api/dashboard', wrap(async (req, res) => {
  const data = await readData();
  const results = visibleResults(data);
  const count = (stage) => results.filter((item) => item.stage === stage).length;
  res.json({
    metrics: {
      total: results.length,
      pending: count('identity') + count('admin') + count('clinical'),
      notifications: count('notification'),
      available: count('available') + count('delivered'),
    },
    results,
    events: data.events.slice(0, 12),
  });
}));

app.get('/api/patients', allow('lab', 'coordinator', 'doctor'), wrap(async (req, res) => {
  const data = await readData();
  res.json(data.patients.map((patient) => presentPatient(patient, req.actor.role)));
}));


/** Alta desde personal autorizado: no existe autorregistro público para expedientes médicos. */
app.post('/api/patients', allow('coordinator'), wrap(async (req, res) => {
  const name = String(req.body.name || '').trim().replace(/\s+/g, ' ');
  const birthDate = String(req.body.birthDate || '');
  const phone = String(req.body.phone || '').trim();
  const accessMode = String(req.body.accessMode || 'SMS y portal');
  const location = String(req.body.location || 'No especificado').trim();
  const campaign = String(req.body.campaign || 'Campaña general').trim();
  const consentSms = req.body.consentSms === true;
  if (name.length < 4 || name.length > 100) throw httpError(400, 'Ingresa un nombre ficticio válido (4 a 100 caracteres).');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(birthDate) || Number.isNaN(Date.parse(birthDate))) throw httpError(400, 'Fecha de nacimiento inválida.');
  if (phone && !/^\+[1-9]\d{9,14}$/.test(phone)) throw httpError(400, 'Usa el formato +52XXXXXXXXXX o deja el teléfono vacío.');
  if (!['SMS y portal', 'Solo portal', 'Entrega asistida'].includes(accessMode)) throw httpError(400, 'Modalidad no válida.');
  if (accessMode === 'SMS y portal' && (!phone || !consentSms)) throw httpError(400, 'Para SMS se requiere teléfono de prueba y consentimiento de contacto.');
  if (location.length > 100) throw httpError(400, 'Ubicación demasiado larga.');
  if (!campaign || campaign.length > 80) throw httpError(400, 'Campaña inválida.');
  const code = newAccessCode();
  const patient = await mutateData((state) => {
    const person = {
      id: `PAC-${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
      name, birthDate, phone, location, campaign, accessMode, consentSms,
      initials: name.split(' ').slice(0, 2).map((v) => v[0]).join('').toUpperCase(),
      createdAt: new Date().toISOString(),
    };
    state.patients.unshift(person);
    addEvent(state, { action: `Alta de paciente ficticia ${person.id}`, actor: req.actor.id });
    return person;
  });
  setPatientCode(patient.id, code);
  res.status(201).json({ patient, accessCode: code, warning: 'Mostrar y entregar esta clave una sola vez; no se enviará por SMS.' });
}));

app.post('/api/patients/:id/reset-access', allow('coordinator'), wrap(async (req, res) => {
  if (req.body.confirmed !== true) throw httpError(400, 'Confirma la verificación presencial antes de cambiar la clave.');
  const data = await readData();
  if (!data.patients.find((p) => p.id === req.params.id)) throw httpError(404, 'Paciente no encontrada.');
  const code = newAccessCode();
  setPatientCode(req.params.id, code);
  revokePatientSessions(req.params.id);
  await mutateData((state) => addEvent(state, { action: `Clave de acceso regenerada para ${req.params.id}`, actor: req.actor.id }));
  res.json({ patientId: req.params.id, accessCode: code, warning: 'Clave de prueba regenerada. Las sesiones anteriores deben cerrarse en producción.' });
}));

app.get('/api/sms', allow('coordinator'), (_req, res) => res.json({
  mode: process.env.SMS_MODE || 'simulated',
  portalUrl: process.env.PATIENT_PORTAL_URL || null,
  messages: listSms(),
}));

/** Prueba independiente sin expediente: exclusivamente números y datos sintéticos. */
app.post('/api/sms/test', allow('coordinator'), wrap(async (req, res) => {
  if (req.body.confirmed !== true) throw httpError(400, 'Confirma que el número te pertenece o tienes autorización para la prueba.');
  const destination = String(req.body.phone || '').trim();
  if (!/^\+[1-9]\d{9,14}$/.test(destination)) throw httpError(400, 'El número debe estar en formato internacional (+52...).');
  const isAws = process.env.SMS_MODE === 'aws';
  if (isAws && (!process.env.SMS_TEST_PHONE || destination !== process.env.SMS_TEST_PHONE)) {
    throw httpError(403, 'AWS solo permite el teléfono definido en SMS_TEST_PHONE.');
  }
  if (isAws && recentAwsSmsCount() >= Number(process.env.SMS_DAILY_LIMIT || 10)) {
    throw httpError(429, 'Límite diario de pruebas AWS alcanzado.');
  }
  const recent = latestTestSms(destination);
  if (isAws && recent && Date.now() - Date.parse(recent.createdAt) < 60000) {
    throw httpError(429, 'Espera al menos 60 segundos para enviar otro SMS a ese teléfono.');
  }
  const message = 'EIRA DEMO: esta es una prueba de notificacion SMS. No contiene resultados ni datos clinicos.';
  const response = await sendSms(destination, message);
  const row = recordSms({ destination, status: response.status, providerId: response.messageId, message, actor: req.actor.id });
  await mutateData((state) => addEvent(state, { action: `Prueba SMS ${row.status} (${row.destinationMasked})`, actor: req.actor.id }));
  res.status(201).json(row);
}));

app.get('/api/patients/:id/history', allow('coordinator', 'doctor', 'lab'), wrap(async (req, res) => {
  if (!canAccessPatient(req.actor, req.params.id)) throw httpError(403, 'Expediente no autorizado');
  const data = await readData();
  const patient = data.patients.find((item) => item.id === req.params.id);
  if (!patient) throw httpError(404, 'Paciente no encontrada');
  res.json({
    patient: presentPatient(patient, req.actor.role),
    results: data.results
      .filter((item) => item.patientId === patient.id)
      .map((item) => presentResult(data, item)),
    documents: data.documents.filter((item) => item.patientId === patient.id),
  });
}));

app.get('/api/results', allow('coordinator', 'doctor', 'lab'), wrap(async (req, res) => {
  const data = await readData();
  res.json(visibleResults(data));
}));

app.get('/api/audit', allow('coordinator', 'doctor', 'lab'), wrap(async (_req, res) => {
  const data = await readData();
  res.json(data.events);
}));

app.post('/api/results', allow('lab', 'coordinator'), upload.single('document'), wrap(async (req, res) => {
  if (!req.body.patientId || !req.body.type) throw httpError(400, 'Paciente y tipo de estudio son obligatorios');
  validatePdf(req.file);
  const data = await readData();
  if (!data.patients.some((item) => item.id === req.body.patientId)) throw httpError(404, 'Paciente no encontrada');
  const saved = await savePdf(req.file);
  const result = await mutateData((state) => {
    const created = {
      id: `EIR-${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
      patientId: req.body.patientId,
      type: req.body.type,
      stage: 'identity',
      filename: saved.filename,
      storage: saved.storage,
      createdAt: new Date().toISOString(),
      notification: null,
      assisted: false,
    };
    state.results.unshift(created);
    addEvent(state, { resultId: created.id, action: 'PDF sintético cargado; identidad pendiente', actor: req.actor.id });
    return created;
  });
  res.status(201).json(result);
}));

/** Avances exigidos: identidad -> revisión administrativa -> autorización clínica. */
app.post('/api/results/:id/advance', allow('coordinator', 'doctor'), wrap(async (req, res) => {
  const result = await mutateData((data) => {
    const item = getResultOrThrow(data, req.params.id);
    const check = validateAdvance({
      stage: item.stage,
      role: req.actor.role,
      confirmed: req.body.confirmed === true,
      twoIdentifiersVerified: req.body.twoIdentifiersVerified === true,
    });

    if (check.error) throw httpError(check.status, check.error);
    const { transition } = check;
    item.stage = transition.next;
    addEvent(data, { resultId: item.id, action: transition.action, actor: req.actor.id });
    return item;
  });
  res.json(result);
}));

const notificationsInProgress = new Set(); // bloqueo por proceso, SOLO demo local.
app.post('/api/results/:id/notify', allow('coordinator'), wrap(async (req, res) => {
  if (notificationsInProgress.has(req.params.id)) throw httpError(409, 'Ya se está procesando una notificación para este resultado.');
  notificationsInProgress.add(req.params.id);
  try {
    const data = await readData();
    const item = getResultOrThrow(data, req.params.id);
    if (item.stage !== 'notification') throw httpError(409, 'El resultado todavía no está autorizado para notificar');
    if (req.body.confirmed !== true) throw httpError(400, 'Confirma el consentimiento para notificación');
    if (req.body.channel !== 'SMS') throw httpError(400, 'La demo utiliza exclusivamente SMS');
    const patient = data.patients.find((person) => person.id === item.patientId);
    const policy = validatePatientSms(patient);
    if (!policy.allowed) throw httpError(409, `${policy.message} Utiliza la entrega asistida.`);
    const destination = policy.destination;
    if (process.env.SMS_MODE === 'aws' && (!process.env.SMS_TEST_PHONE || destination !== process.env.SMS_TEST_PHONE)) {
      throw httpError(403, 'El SMS real solo puede enviarse al número de prueba autorizado en SMS_TEST_PHONE');
    }
    if (process.env.SMS_MODE === 'aws' && recentAwsSmsCount() >= Number(process.env.SMS_DAILY_LIMIT || 10)) throw httpError(429, 'Límite de SMS de prueba alcanzado.');
    if (process.env.SMS_MODE === 'aws') {
      const last = latestTestSms(destination);
      if (last && Date.now() - Date.parse(last.createdAt) < 60_000) throw httpError(429, 'Espera 60 segundos para otro envío al mismo teléfono.');
    }
    const message = smsBody();
    const sent = await sendSms(destination, message);
    const updated = await mutateData((state) => {
      const current = getResultOrThrow(state, req.params.id);
      if (current.stage !== 'notification') throw httpError(409, 'El estado cambió durante el envío');
      current.stage = 'available';
      current.notification = { ...sent, channel: 'SMS', createdAt: new Date().toISOString() };
      addEvent(state, {
        resultId: current.id,
        action: sent.status === 'SIMULATED' ? 'SMS de demostración simulado' : 'SMS enviado a AWS (entrega pendiente de verificar)',
        actor: req.actor.id,
      });
      return current;
    });
    recordSms({ resultId: item.id, destination, status: sent.status, providerId: sent.messageId, message, actor: req.actor.id });
    res.json(updated);
  } finally {
    notificationsInProgress.delete(req.params.id);
  }
}));

app.post('/api/results/:id/assisted', allow('coordinator'), wrap(async (req, res) => {
  const result = await mutateData((data) => {
    const item = getResultOrThrow(data, req.params.id);
    if (!['notification', 'available'].includes(item.stage)) throw httpError(409, 'Debe existir autorización clínica previa');
    if (req.body.verified !== true) throw httpError(400, 'Verifica la identidad presencial');
    const method = String(req.body.method || '').trim();
    if (!['Consulta presencial en EIRA', 'Entrega en punto autorizado'].includes(method)) throw httpError(400, 'Método de entrega inválido');
    item.stage = 'delivered';
    item.assisted = true;
    addEvent(data, { resultId: item.id, action: `Entrega asistida: ${method}`, actor: req.actor.id });
    return item;
  });
  res.json(result);
}));

app.get('/api/results/:id/document', allow('coordinator', 'doctor', 'lab'), wrap(async (req, res) => {
  const data = await readData();
  const result = getResultOrThrow(data, req.params.id);
  const buffer = await openPdf(result);
  await mutateData((state) => addEvent(state, {
    resultId: result.id,
    action: 'Consulta de PDF interno por personal autorizado',
    actor: req.actor.id,
  }));
  res.set({ 'Content-Type': 'application/pdf', 'Content-Disposition': `inline; filename="${result.id}.pdf"`, 'Cache-Control': 'private, no-store' });
  res.send(buffer);
}));

app.get('/api/documents/:id/file', allow('lab', 'coordinator', 'doctor'), wrap(async (req, res) => {
  const data = await readData();
  const document = data.documents.find((item) => item.id === req.params.id);
  if (!document) throw httpError(404, 'Documento no encontrado');
  const buffer = await openPdf(document);
  await mutateData((state) => addEvent(state, {
    resultId: null,
    action: `Consulta del formato interno ${document.id}`,
    actor: req.actor.id,
  }));
  res.set({ 'Content-Type': 'application/pdf', 'Content-Disposition': `inline; filename="${document.filename}"`, 'Cache-Control': 'private, no-store' });
  res.send(buffer);
}));


/** Indicadores observables: no se estiman ahorros ficticios de tiempo. */
app.get('/api/impact', allow('coordinator', 'doctor'), wrap(async (_req, res) => {
  const state = await readData();
  const byCampaign = new Map();
  const byCommunity = new Map();
  for (const patient of state.patients) {
    const campaign = patient.campaign || 'Campaña general';
    byCampaign.set(campaign, (byCampaign.get(campaign) || 0) + 1);
    const community = patient.location || 'No especificada';
    byCommunity.set(community, (byCommunity.get(community) || 0) + 1);
  }
  const count = (stages) => state.results.filter((result) => stages.includes(result.stage)).length;
  const sms = listSms();
  res.json({
    sampleData: true,
    patients: state.patients.length,
    results: state.results.length,
    pendingReview: count(['identity', 'admin', 'clinical']),
    awaitingNotice: count(['notification']),
    readyOrConsulted: count(['available', 'delivered']),
    assisted: state.results.filter((result) => result.assisted).length,
    authenticatedConsultations: state.events.filter((event) => /Consulta de documento sintético en portal paciente/.test(event.action)).length,
    smsSimulated: sms.filter((message) => message.status === 'SIMULATED').length,
    smsSubmitted: sms.filter((message) => message.status === 'SUBMITTED').length,
    smsDelivered: sms.filter((message) => message.status === 'DELIVERED').length,
    byCampaign: [...byCampaign].map(([name, total]) => ({ name, total })),
    byCommunity: [...byCommunity].map(([name, total]) => ({ name, total })),
  });
}));


app.use((error, _req, res, _next) => {
  const status = error instanceof multer.MulterError ? 400 : error.status || 500;
  if (status >= 500) console.error('API error:', error);
  res.status(status).json({ error: status >= 500 ? 'Error del servidor o servicio AWS. Revisa los logs.' : error.message });
});

export default app;
