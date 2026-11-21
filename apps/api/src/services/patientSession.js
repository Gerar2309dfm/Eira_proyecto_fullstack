/**
 * Sesiones de demostración EN MEMORIA, sin autenticación real.
 * Sustituir por Cognito u otro proveedor con controles de identidad y MFA.
 * Las sesiones desaparecen cuando se reinicia el servidor.
 */
import { randomBytes, timingSafeEqual } from 'node:crypto';

const SESSION_DURATION_MS = 20 * 60 * 1000;
const sessions = new Map();
const failedLogins = new Map();
const WINDOW_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 5;

export function isDemoAccessCode(value) {
  const expected = Buffer.from(process.env.DEMO_PATIENT_CODE || 'EIRA2026');
  const received = Buffer.from(String(value || ''));
  return received.length === expected.length && timingSafeEqual(received, expected);
}

export function hasAttemptsRemaining(ip) {
  const now = Date.now();
  const attempts = (failedLogins.get(ip) || []).filter((time) => now - time < WINDOW_MS);
  failedLogins.set(ip, attempts);
  return attempts.length < MAX_ATTEMPTS;
}

export function registerFailure(ip) {
  const attempts = failedLogins.get(ip) || [];
  attempts.push(Date.now());
  failedLogins.set(ip, attempts);
}

export function clearFailures(ip) {
  failedLogins.delete(ip);
}

export function createPatientSession(patientId) {
  const token = randomBytes(32).toString('base64url');
  sessions.set(token, { patientId, expiresAt: Date.now() + SESSION_DURATION_MS });
  return { token, expiresInSeconds: SESSION_DURATION_MS / 1000 };
}

export function readPatientSession(token) {
  if (!token) return null;
  const session = sessions.get(token);
  if (!session) return null;
  if (Date.now() > session.expiresAt) {
    sessions.delete(token);
    return null;
  }
  return session;
}

export function destroyPatientSession(token) {
  sessions.delete(token);
}

export function requirePatientSession(req, _res, next) {
  const match = /^Bearer\s+(.+)$/i.exec(req.get('authorization') || '');
  const session = readPatientSession(match?.[1]);
  if (!session) {
    const error = new Error('Tu sesión terminó. Ingresa nuevamente con tu folio y clave.');
    error.status = 401;
    return next(error);
  }
  req.patientSession = session;
  req.patientToken = match[1];
  next();
}

/** Revoca tokens de una cuenta cuando coordinación cambia su clave. */
export function revokePatientSessions(patientId) {
  for (const [token, session] of sessions) {
    if (session.patientId === patientId) sessions.delete(token);
  }
}
