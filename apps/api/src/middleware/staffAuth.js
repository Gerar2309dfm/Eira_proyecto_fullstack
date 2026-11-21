/**
 * Acceso individual del personal para el MVP local. Tokens opacos con hash SHA-256
 * persistidos en SQLite. No acepta cabeceras de rol enviadas por el navegador.
 * IMPORTANTE: todavía requiere HTTPS, despliegue, IAM y revisión de seguridad
 * antes de trabajar con expedientes médicos reales.
 */
import { randomBytes, scryptSync, timingSafeEqual, createHash } from 'node:crypto';
import { db, appendSecurityEvent } from '../repositories/sqliteRepository.js';

const DEMO_USERS = [
  { id: 'coordinacion', role: 'coordinator', label: 'Coordinación EIRA', env: 'STAFF_COORD_PASSWORD' },
  { id: 'laboratorio', role: 'lab', label: 'Laboratorio', env: 'STAFF_LAB_PASSWORD' },
  { id: 'medico', role: 'doctor', label: 'Personal médico', env: 'STAFF_DOCTOR_PASSWORD' },
];
const SESSION_MS = 4 * 60 * 60 * 1000;
const failed = new Map();
const WINDOW_MS = 15 * 60 * 1000;
const ATTEMPT_LIMIT = 5;

export const STAFF_USERS = DEMO_USERS.map(({ id, role, label }) => ({ id, role, label }));

function error(status, message) {
  return Object.assign(new Error(message), { status });
}
function tokenHash(token) {
  return createHash('sha256').update(token).digest('hex');
}
function passwordHash(password, salt) {
  return scryptSync(password, Buffer.from(salt, 'hex'), 64).toString('hex');
}

/** Seed explícito; requiere .env local, nunca inicializa usuarios anónimos. */
export function initializeStaff() {
  if (process.env.EIRA_DEMO_MODE !== 'true') {
    throw error(503, 'Activa EIRA_DEMO_MODE=true solamente en un entorno local de prueba.');
  }
  for (const user of DEMO_USERS) {
    const password = process.env[user.env];
    if (!password || password.length < 12) {
      throw error(503, `Falta ${user.env} (mínimo 12 caracteres) en apps/api/.env.`);
    }
    const exists = db.prepare('SELECT id FROM staff_users WHERE id=?').get(user.id);
    if (exists) continue;
    const salt = randomBytes(16).toString('hex');
    db.prepare('INSERT INTO staff_users(id,role,label,salt,hash) VALUES(?,?,?,?,?)')
      .run(user.id, user.role, user.label, salt, passwordHash(password, salt));
  }
}

export function staffLogin({ username, password, ip = 'local' }) {
  const key = `${ip}:${username}`;
  const now = Date.now();
  const attempts = (failed.get(key) || []).filter((time) => now - time < WINDOW_MS);
  if (attempts.length >= ATTEMPT_LIMIT) throw error(429, 'Demasiados intentos. Espera 15 minutos.');
  const row = db.prepare('SELECT * FROM staff_users WHERE id=?').get(username);
  let matches = false;
  if (row && typeof password === 'string') {
    const actual = Buffer.from(passwordHash(password, row.salt), 'hex');
    const expected = Buffer.from(row.hash, 'hex');
    matches = actual.length === expected.length && timingSafeEqual(actual, expected);
  }
  if (!matches) {
    failed.set(key, [...attempts, now]);
    appendSecurityEvent({ action: 'Intento de inicio de sesión de personal rechazado', actor: 'autenticación' });
    throw error(401, 'Usuario o contraseña incorrectos.');
  }
  failed.delete(key);
  appendSecurityEvent({ action: 'Inicio de sesión autorizado', actor: row.id });
  const token = randomBytes(32).toString('base64url');
  db.prepare('INSERT INTO staff_sessions(token_hash,user_id,expires_at) VALUES(?,?,?)')
    .run(tokenHash(token), row.id, now + SESSION_MS);
  return { token, expiresInSeconds: SESSION_MS / 1000, user: { id: row.id, role: row.role, label: row.label } };
}

export function resolveStaff(token) {
  if (!token) return null;
  const row = db.prepare(`SELECT u.id,u.role,u.label,s.expires_at AS expiresAt
    FROM staff_sessions s JOIN staff_users u ON u.id=s.user_id WHERE s.token_hash=?`)
    .get(tokenHash(token));
  if (!row) return null;
  if (row.expiresAt <= Date.now()) {
    db.prepare('DELETE FROM staff_sessions WHERE token_hash=?').run(tokenHash(token));
    return null;
  }
  return { id: row.id, role: row.role, label: row.label };
}

export function revokeStaff(token) {
  if (!token) return;
  const actor = resolveStaff(token);
  db.prepare('DELETE FROM staff_sessions WHERE token_hash=?').run(tokenHash(token));
  if (actor) appendSecurityEvent({ action: 'Cierre de sesión del personal', actor: actor.id });
}

export function requireStaff(req, _res, next) {
  const token = /^Bearer\s+(.+)$/i.exec(req.get('authorization') || '')?.[1];
  const actor = resolveStaff(token);
  if (!actor) return next(error(401, 'Inicia sesión con una cuenta de personal de EIRA.'));
  req.actor = actor;
  req.staffToken = token;
  next();
}

export function allow(...roles) {
  return (req, _res, next) => roles.includes(req.actor?.role)
    ? next()
    : next(error(403, 'Tu cuenta no tiene permisos para esta operación.'));
}

export { canAccessPatient } from './rolePolicy.js';
