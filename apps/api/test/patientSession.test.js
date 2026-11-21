import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createPatientSession,
  destroyPatientSession,
  isDemoAccessCode,
  readPatientSession,
  hasAttemptsRemaining,
  registerFailure,
  clearFailures,
} from '../src/services/patientSession.js';

const patientId = 'PAC-0183';

test('código de demostración: acepta únicamente la clave exacta', () => {
  assert.equal(isDemoAccessCode('EIRA2026'), true);
  assert.equal(isDemoAccessCode('EIRA2025'), false);
  assert.equal(isDemoAccessCode(''), false);
});

test('sesión: crea token, limita duración y puede cerrarse', () => {
  const { token, expiresInSeconds } = createPatientSession(patientId);
  assert.equal(typeof token, 'string');
  assert.ok(token.length > 30);
  assert.equal(expiresInSeconds, 1200);
  assert.equal(readPatientSession(token)?.patientId, patientId);
  destroyPatientSession(token);
  assert.equal(readPatientSession(token), null);
});

test('bloqueo temporal tras cinco errores del mismo origen', () => {
  const ip = '192.0.2.101';
  clearFailures(ip);
  assert.equal(hasAttemptsRemaining(ip), true);
  for (let i = 0; i < 5; i++) registerFailure(ip);
  assert.equal(hasAttemptsRemaining(ip), false);
  clearFailures(ip);
  assert.equal(hasAttemptsRemaining(ip), true);
});
