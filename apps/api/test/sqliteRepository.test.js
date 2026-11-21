import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const directory = mkdtempSync(path.join(os.tmpdir(), 'eira-sqlite-test-'));
process.env.EIRA_DB_PATH = path.join(directory, 'test.sqlite');
const {
  db,
  readData,
  mutateData,
  addEvent,
  recordSms,
  listSms,
  recentAwsSmsCount,
} = await import('../src/repositories/sqliteRepository.js');
const { setPatientCode, checkPatientCode, newAccessCode } = await import('../src/services/credentials.js');

test('SQLite crea expedientes y resultados ficticios desde seed', async () => {
  const data = await readData();
  assert.equal(data.patients.length, 4);
  assert.equal(data.results.length, 5);
  assert.equal(data.documents.length, 2);
});

test('creación de paciente, cuenta individual y persistencia de expediente', async () => {
  const newPatient = {
    id: 'PAC-PRUEBA01',
    name: 'Paciente Ficticia QA',
    phone: '',
    birthDate: '1990-01-01',
    location: 'Lugar ficticio',
    accessMode: 'Entrega asistida',
    consentSms: false,
  };
  await mutateData((data) => {
    data.patients.push(newPatient);
    addEvent(data, { action: 'Alta de paciente ficticia', actor: 'qa' });
  });
  const code = newAccessCode();
  setPatientCode(newPatient.id, code);
  assert.equal(checkPatientCode(newPatient.id, code), true);
  assert.equal(checkPatientCode(newPatient.id, 'clave-incorrecta'), false);
  assert.ok((await readData()).patients.find((p) => p.id === newPatient.id));
  const stored = db.prepare('SELECT hash FROM patient_credentials WHERE patient_id=?').get(newPatient.id);
  assert.notEqual(stored.hash, code);
});

test('resultados se relacionan con paciente y hay auditoría persistente', async () => {
  await mutateData((data) => {
    data.results.unshift({ id: 'EIR-PRUEBA', patientId: 'PAC-PRUEBA01', stage: 'identity', type: 'Citología cervical', createdAt: new Date().toISOString() });
    addEvent(data, { resultId: 'EIR-PRUEBA', action: 'PDF asociado', actor: 'laboratorio' });
  });
  assert.ok((await readData()).results.find((r) => r.id === 'EIR-PRUEBA'));
  assert.ok((await readData()).events.find((e) => e.resultId === 'EIR-PRUEBA'));
  assert.throws(() => db.prepare("INSERT INTO results (id,patient_id,stage,data) VALUES ('INVALID','PAC-NOEXISTE','identity','{}')").run(), /FOREIGN KEY/);
});

test('mensajes simulados se registran con teléfono enmascarado', () => {
  const sms = recordSms({ destination: '+525511112222', status: 'SIMULATED', message: 'Mensaje de prueba', actor: 'qa' });
  assert.equal(sms.destinationMasked, '•••2222');
  assert.ok(!JSON.stringify(listSms()).includes('+525511112222'));
  assert.equal(recentAwsSmsCount(), 0);
});

test('finalización de prueba SQLite', () => {
  db.close();
  rmSync(directory, { recursive: true, force: true });
});
