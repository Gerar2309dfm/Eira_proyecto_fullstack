import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const directory = mkdtempSync(path.join(os.tmpdir(), 'eira-staff-test-'));
process.env.EIRA_DB_PATH = path.join(directory, 'auth.sqlite');
process.env.EIRA_DEMO_MODE = 'true';
process.env.STAFF_COORD_PASSWORD = 'test-Coordinacion-2026!';
process.env.STAFF_LAB_PASSWORD = 'test-Laboratorio-2026!';
process.env.STAFF_DOCTOR_PASSWORD = 'test-Medico-2026!';
const { db, recordSms, updateSmsDelivery, listSms } = await import('../src/repositories/sqliteRepository.js');
const { initializeStaff, staffLogin, resolveStaff, revokeStaff, canAccessPatient } =
  await import('../src/middleware/staffAuth.js');

initializeStaff();

test('los usuarios almacenan contraseñas con hash y tienen roles individuales', () => {
  const row = db.prepare('SELECT salt,hash,role FROM staff_users WHERE id=?').get('laboratorio');
  assert.notEqual(row.hash, process.env.STAFF_LAB_PASSWORD);
  assert.equal(row.role, 'lab');
});

test('no se puede falsificar el rol: un token resuelve su cuenta real', () => {
  const session = staffLogin({ username: 'laboratorio', password: process.env.STAFF_LAB_PASSWORD });
  assert.equal(resolveStaff(session.token).role, 'lab');
  assert.notEqual(resolveStaff(session.token).role, 'doctor');
  assert.equal(resolveStaff('token-falso'), null);
  revokeStaff(session.token);
  assert.equal(resolveStaff(session.token), null);
});

test('una clave de personal incorrecta no inicia sesión', () => {
  assert.throws(() => staffLogin({ username: 'medico', password: 'incorrecta' }), /incorrectos/);
});

test('los roles desconocidos no reciben acceso', () => {
  assert.equal(canAccessPatient({ role: 'coordinator' }), true);
  assert.equal(canAccessPatient({ role: 'visitante' }), false);
});

test('estados de entrega sólo actualizan mensajes de proveedor reconocido', () => {
  const row = recordSms({ destination: '+525500000007', status: 'SUBMITTED',
    providerId: 'aws-proveedor-123', message: 'Documento disponible', actor: 'qa' });
  assert.equal(updateSmsDelivery({ providerId: 'incorrecto', status: 'DELIVERED' }), null);
  assert.equal(updateSmsDelivery({ providerId: 'aws-proveedor-123', status: 'DELIVERED' }).status, 'DELIVERED');
  assert.equal(listSms().find((item) => item.id === row.id).status, 'DELIVERED');
});

test('limpieza de la base de pruebas', () => {
  db.close();
  rmSync(directory, { recursive: true, force: true });
});
