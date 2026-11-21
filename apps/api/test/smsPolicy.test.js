import assert from 'node:assert/strict';
import test from 'node:test';
import { validatePatientSms } from '../src/services/smsPolicy.js';

const demo = { accessMode: 'SMS y portal', consentSms: true, phone: '+525500000007' };

test('la paciente puede recibir SMS sólo con consentimiento y celular registrado', () => {
  assert.deepEqual(validatePatientSms(demo), { allowed: true, destination: demo.phone });
});

test('el backend rechaza SMS si el consentimiento no existe', () => {
  assert.equal(validatePatientSms({ ...demo, consentSms: false }).allowed, false);
});

test('la entrega asistida no autoriza SMS, aunque tenga teléfono', () => {
  assert.equal(validatePatientSms({ ...demo, accessMode: 'Entrega asistida' }).allowed, false);
});

test('números inválidos no se notifican', () => {
  assert.equal(validatePatientSms({ ...demo, phone: '1234' }).allowed, false);
});
