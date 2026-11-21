/** Contraseñas individuales de demo, guardadas con scrypt+salt en SQLite. */
import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { getCredential, saveCredential } from '../repositories/sqliteRepository.js';

const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export function newAccessCode() {
  const bytes = randomBytes(12);
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join('');
}
function derived(code, salt) {
  return scryptSync(String(code), Buffer.from(salt, 'hex'), 64);
}
export function setPatientCode(patientId, accessCode) {
  const salt = randomBytes(16).toString('hex');
  saveCredential(patientId, salt, derived(accessCode, salt).toString('hex'));
}
export function checkPatientCode(patientId, code) {
  const row = getCredential(patientId);
  if (!row) return false;
  const received = derived(code, row.salt);
  return timingSafeEqual(received, Buffer.from(row.hash, 'hex'));
}
export function provisionInitialCodes(patients) {
  for (const p of patients) {
    if (!getCredential(p.id)) {
      const code = p.id === 'PAC-0183' ? (process.env.DEMO_PATIENT_CODE || 'EIRA2026') : newAccessCode();
      setPatientCode(p.id, code);
    }
  }
}
