/**
 * Prueba real HTTP del flujo completo sobre SQLite y documentos sintéticos.
 * Antes: npm run dev, SMS_MODE=simulated. Nunca envía SMS reales.
 */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { config } from 'dotenv';

config({ path: path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../apps/api/.env') });

const api = process.env.EIRA_API_URL || `http://127.0.0.1:${process.env.PORT || 4000}/api`;
const credentials = {
  coordinacion: process.env.STAFF_COORD_PASSWORD || 'EiraCoordDemo2026!',
  laboratorio: process.env.STAFF_LAB_PASSWORD || 'EiraLabDemo2026!',
  medico: process.env.STAFF_DOCTOR_PASSWORD || 'EiraMedicoDemo2026!',
};
const tokens = {};

async function call(endpoint, { method = 'GET', token = '', body, expect } = {}) {
  const isForm = body instanceof FormData;
  const response = await fetch(`${api}${endpoint}`, {
    method,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(!isForm && body !== undefined ? { 'Content-Type': 'application/json' } : {}),
    },
    ...(body !== undefined ? { body: isForm ? body : JSON.stringify(body) } : {}),
  });
  if (expect !== undefined) {
    assert.equal(response.status, expect, `${method} ${endpoint}: esperaba HTTP ${expect}, recibió ${response.status}`);
    return response;
  }
  if (!response.ok) throw Error(`${method} ${endpoint}: HTTP ${response.status} ${await response.text()}`);
  if (response.status === 204) return null;
  return response.headers.get('content-type')?.includes('application/pdf')
    ? response.arrayBuffer()
    : response.json();
}
const step = (message) => console.log(`✔ ${message}`);

try {
  const health = await call('/health');
  assert.equal(health.storage, 'sqlite');
  assert.equal(health.smsMode, 'simulated', 'Usar SMS_MODE=simulated antes de npm run smoke');
  await call('/dashboard', { expect: 401 });
  await call('/results', { expect: 401 });
  const spoof = await fetch(`${api}/dashboard`, { headers: { 'x-demo-user': 'coordinacion' } });
  assert.equal(spoof.status, 401, 'No debe poder accederse con un encabezado de rol falsificado.');
  step('Las rutas de personal requieren sesión; falsificar rol no funciona');

  for (const [name, password] of Object.entries(credentials)) {
    const response = await call('/staff-auth/login', {
      method: 'POST', body: { username: name, password },
    });
    tokens[name] = response.token;
    assert.ok(tokens[name]);
  }
  await call('/patients', { token: tokens.laboratorio });
  await call('/patients', { method: 'POST', token: tokens.laboratorio,
    body: { name: 'Error Permisos', birthDate: '1990-02-03' }, expect: 403 });
  step('Sesiones por rol y denegación de acciones no autorizadas');

  const created = await call('/patients', { method: 'POST', token: tokens.coordinacion, body: {
    name: 'Paciente Sintética de Prueba', birthDate: '1993-02-11', phone: '+525500000007',
    location: 'Comunidad ficticia', campaign: 'Nerdearla 2026',
    accessMode: 'SMS y portal', consentSms: true,
  }});
  assert.ok(created.patient.id && created.accessCode);
  step('Alta de paciente y consentimiento guardado');

  const patientLogin = await call('/patient-access/login', { method: 'POST', body: {
    folio: created.patient.id, accessCode: created.accessCode,
  }});
  assert.equal((await call('/patient-access/me', { token: patientLogin.token })).documents.length, 0);

  const src = path.resolve(path.dirname(fileURLToPath(import.meta.url)),
    '../apps/api/storage/synthetic/archivo_ejemplo_para_subir.pdf');
  const pdf = await readFile(src);
  const data = new FormData();
  data.append('patientId', created.patient.id);
  data.append('type', 'Citología cervical');
  data.append('document', new Blob([pdf], { type: 'application/pdf' }), 'resultado_sintetico.pdf');
  const result = await call('/results', { method: 'POST', token: tokens.laboratorio, body: data });
  assert.equal(result.stage, 'identity');
  await call(`/patient-access/documents/${result.id}`, { token: patientLogin.token, expect: 404 });
  step('PDF pendiente no es visible ni descargable por la paciente');

  const advance = (role, confirmed = true, twoIdentifiersVerified = false) =>
    call(`/results/${result.id}/advance`, { method: 'POST', token: tokens[role],
      body: { confirmed, twoIdentifiersVerified } });
  await call(`/results/${result.id}/advance`, { method: 'POST', token: tokens.medico,
    body: { confirmed: true, twoIdentifiersVerified: true }, expect: 403 });
  assert.equal((await advance('coordinacion', true, true)).stage, 'admin');
  assert.equal((await advance('coordinacion')).stage, 'clinical');
  await call(`/results/${result.id}/advance`, { method: 'POST', token: tokens.coordinacion,
    body: { confirmed: true }, expect: 403 });
  assert.equal((await advance('medico')).stage, 'notification');
  step('Doble comprobación administrativa y autorización clínica por rol');

  const notified = await call(`/results/${result.id}/notify`, { method: 'POST', token: tokens.coordinacion,
    body: { confirmed: true, channel: 'SMS' } });
  assert.equal(notified.stage, 'available');
  assert.equal(notified.notification.status, 'SIMULATED');
  step('SMS simulado sin diagnósticos y resultado liberado');

  const me = await call('/patient-access/me', { token: patientLogin.token });
  assert.ok(me.documents.some((item) => item.id === result.id));
  const document = await call(`/patient-access/documents/${result.id}`, { token: patientLogin.token });
  assert.equal(Buffer.from(document).subarray(0, 5).toString(), '%PDF-');
  step('Paciente descarga PDF autorizado y se registra actividad');

  const createdNoSms = await call('/patients', { method: 'POST', token: tokens.coordinacion, body: {
    name: 'Paciente Entrega Asistida', birthDate: '1993-01-08',
    location: 'Comunidad ficticia', campaign: 'Nerdearla 2026',
    accessMode: 'Entrega asistida', consentSms: false, phone: '',
  }});
  const otherLogin = await call('/patient-access/login', { method: 'POST', body: {
    folio: createdNoSms.patient.id, accessCode: createdNoSms.accessCode,
  }});
  await call(`/patient-access/documents/${result.id}`, { token: otherLogin.token, expect: 404 });
  step('Otra paciente no puede leer un PDF ajeno');

  const assistedForm = new FormData();
  assistedForm.append('patientId', createdNoSms.patient.id);
  assistedForm.append('type', 'Citología cervical');
  assistedForm.append('document', new Blob([pdf], { type: 'application/pdf' }), 'resultado_asistido.pdf');
  const assistedResult = await call('/results', { method: 'POST', token: tokens.laboratorio, body: assistedForm });
  for (const [role, twoIdentifiersVerified] of [['coordinacion', true], ['coordinacion', false], ['medico', false]]) {
    await call(`/results/${assistedResult.id}/advance`, { method: 'POST', token: tokens[role],
      body: { confirmed: true, twoIdentifiersVerified } });
  }
  await call(`/results/${assistedResult.id}/notify`, { method: 'POST', token: tokens.coordinacion,
    body: { confirmed: true, channel: 'SMS' }, expect: 409 });
  const assisted = await call(`/results/${assistedResult.id}/assisted`, { method: 'POST', token: tokens.coordinacion,
    body: { verified: true, method: 'Entrega en punto autorizado' } });
  assert.equal(assisted.stage, 'delivered');
  assert.equal(assisted.assisted, true);
  step('Sin consentimiento SMS se exige alternativa asistida con identidad verificada');

  const testSms = await call('/sms/test', { method: 'POST', token: tokens.coordinacion,
    body: { confirmed: true, phone: '+525500000007' } });
  assert.equal(testSms.status, 'SIMULATED');
  const report = await call('/impact', { token: tokens.coordinacion });
  assert.ok(report.byCampaign.some((item) => item.name === 'Nerdearla 2026'));
  assert.ok(report.assisted >= 1);
  await call('/impact', { token: tokens.laboratorio, expect: 403 });
  await call('/patient-access/logout', { method: 'POST', token: otherLogin.token });
  await call('/staff-auth/logout', { method: 'POST', token: tokens.medico });
  await call('/dashboard', { token: tokens.medico, expect: 401 });
  step('Indicadores por campaña, bitácora y cierre de sesión comprobados');
  console.log('\n✓ SMOKE COMPLETO: flujo de extremo a extremo con datos ficticios.');
  console.log('Los registros de prueba quedan en SQLite. Para restaurar: npm run demo:reset (servidor detenido).');
} catch (error) {
  console.error(`\n✘ SMOKE FALLÓ: ${error.message}`);
  process.exitCode = 1;
}
