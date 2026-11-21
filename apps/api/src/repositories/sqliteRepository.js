/**
 * Persistencia real SQLite (Node.js >= 22.13, preferible 24 LTS).
 * Base de datos LOCAL para demo: no usar con datos reales ni desplegar como backend clínico.
 * Mantiene una API readData/mutateData para no acoplar las pantallas a la implementación.
 */
import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { initialData } from './seed.js';

const storageDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../storage');
mkdirSync(storageDir, { recursive: true });
const dbPath = process.env.EIRA_DB_PATH || path.join(storageDir, 'eira.sqlite');
export const db = new DatabaseSync(dbPath);
db.exec(`PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=3000;`);
db.exec(`
CREATE TABLE IF NOT EXISTS patients (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  data TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS results (
  id TEXT PRIMARY KEY,
  patient_id TEXT NOT NULL REFERENCES patients(id),
  stage TEXT NOT NULL,
  data TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS documents (
  id TEXT PRIMARY KEY,
  patient_id TEXT NOT NULL REFERENCES patients(id),
  data TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS events (
  id TEXT PRIMARY KEY,
  result_id TEXT,
  occurred_at TEXT NOT NULL,
  data TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS patient_credentials (
  patient_id TEXT PRIMARY KEY REFERENCES patients(id),
  salt TEXT NOT NULL,
  hash TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS sms_outbox (
  id TEXT PRIMARY KEY,
  result_id TEXT,
  destination_masked TEXT NOT NULL,
  status TEXT NOT NULL,
  provider_id TEXT,
  message_body TEXT NOT NULL,
  requested_by TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS staff_users (
  id TEXT PRIMARY KEY,
  role TEXT NOT NULL,
  label TEXT NOT NULL,
  salt TEXT NOT NULL,
  hash TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS staff_sessions (
  token_hash TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES staff_users(id),
  expires_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_results_patient ON results(patient_id);
CREATE INDEX IF NOT EXISTS idx_outbox_created ON sms_outbox(created_at);
`);

const columns = db.prepare('PRAGMA table_info(sms_outbox)').all().map((row) => row.name);
if (!columns.includes('updated_at')) db.exec('ALTER TABLE sms_outbox ADD COLUMN updated_at TEXT');

const statement = {
  patient: db.prepare('INSERT INTO patients(id,name,data) VALUES (?,?,?) ON CONFLICT(id) DO UPDATE SET name=excluded.name, data=excluded.data'),
  result: db.prepare('INSERT INTO results(id,patient_id,stage,data) VALUES (?,?,?,?)'),
  document: db.prepare('INSERT INTO documents(id,patient_id,data) VALUES (?,?,?)'),
  event: db.prepare('INSERT INTO events(id,result_id,occurred_at,data) VALUES (?,?,?,?)'),
};

function writeState(state) {
  db.exec('BEGIN IMMEDIATE');
  try {
    // Los registros de credenciales y el historial SMS son independientes de estas tablas.
    db.exec('DELETE FROM events; DELETE FROM documents; DELETE FROM results;');
    for (const p of state.patients) statement.patient.run(p.id, p.name, JSON.stringify(p));
    for (const r of state.results) statement.result.run(r.id, r.patientId, r.stage, JSON.stringify(r));
    for (const d of state.documents) statement.document.run(d.id, d.patientId, JSON.stringify(d));
    for (const e of state.events) statement.event.run(e.id, e.resultId || null, e.createdAt, JSON.stringify(e));
    db.exec('COMMIT');
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}

const count = db.prepare('SELECT COUNT(*) AS total FROM patients').get().total;
if (!count) writeState(structuredClone(initialData));

function getRows(table, order = '') {
  return db.prepare(`SELECT data FROM ${table} ${order}`).all().map((row) => JSON.parse(row.data));
}

export async function readData() {
  return {
    patients: getRows('patients', 'ORDER BY id'),
    results: getRows('results', "ORDER BY json_extract(data, '$.createdAt') DESC"),
    documents: getRows('documents', 'ORDER BY id'),
    events: getRows('events', 'ORDER BY occurred_at DESC'),
  };
}
let tail = Promise.resolve();
export function mutateData(mutator) {
  const task = tail.then(async () => {
    const state = await readData();
    const value = await mutator(state);
    writeState(state);
    return value;
  });
  tail = task.catch(() => {});
  return task;
}
export function addEvent(data, { resultId = null, action, actor }) {
  data.events.unshift({
    id: `EVT-${crypto.randomUUID()}`,
    resultId,
    action,
    actor,
    createdAt: new Date().toISOString(),
  });
}

export function getCredential(patientId) {
  return db.prepare('SELECT salt, hash FROM patient_credentials WHERE patient_id=?').get(patientId);
}
export function saveCredential(patientId, salt, hash) {
  db.prepare(`INSERT INTO patient_credentials(patient_id,salt,hash,updated_at) VALUES(?,?,?,?)
    ON CONFLICT(patient_id) DO UPDATE SET salt=excluded.salt, hash=excluded.hash, updated_at=excluded.updated_at`)
    .run(patientId, salt, hash, new Date().toISOString());
}
export function recordSms({ resultId = null, destination, status, providerId = null, message, actor }) {
  const row = {
    id: `SMS-${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
    resultId,
    destinationMasked: `•••${destination.slice(-4)}`,
    status,
    providerId,
    message,
    actor,
    createdAt: new Date().toISOString(),
  };
  db.prepare(`INSERT INTO sms_outbox(id,result_id,destination_masked,status,provider_id,message_body,requested_by,created_at)
    VALUES(?,?,?,?,?,?,?,?)`)
    .run(row.id, row.resultId, row.destinationMasked, row.status, row.providerId, row.message, row.actor, row.createdAt);
  return row;
}
export function listSms() {
  return db.prepare('SELECT id, result_id AS resultId, destination_masked AS destinationMasked, status, provider_id AS providerId, message_body AS message, requested_by AS actor, created_at AS createdAt FROM sms_outbox ORDER BY created_at DESC LIMIT 100').all();
}
export function recentAwsSmsCount() {
  return db.prepare("SELECT COUNT(*) AS total FROM sms_outbox WHERE status = 'SUBMITTED' AND created_at > ?")
    .get(new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()).total;
}
export function latestTestSms(destination) {
  return db.prepare('SELECT created_at AS createdAt FROM sms_outbox WHERE destination_masked=? ORDER BY created_at DESC LIMIT 1')
    .get(`•••${destination.slice(-4)}`);
}

/** A trusted delivery relay updates SMS status by AWS provider message id. */
export function updateSmsDelivery({ providerId, status }) {
  const row = db.prepare('SELECT id,result_id AS resultId,status,provider_id AS providerId FROM sms_outbox WHERE provider_id=?').get(providerId);
  if (!row) return null;
  if (!['SUBMITTED', 'UNKNOWN'].includes(row.status)) return row;
  db.prepare('UPDATE sms_outbox SET status=?,updated_at=? WHERE id=?').run(status, new Date().toISOString(), row.id);
  return { ...row, status };
}

/** Auditoría de eventos de acceso, sin conservar contraseñas, tokens ni IPs. */
export function appendSecurityEvent({ action, actor }) {
  const createdAt = new Date().toISOString();
  const id = `EVT-${crypto.randomUUID()}`;
  const event = { id, resultId: null, action, actor, createdAt };
  db.prepare('INSERT INTO events(id,result_id,occurred_at,data) VALUES(?,?,?,?)')
    .run(id, null, createdAt, JSON.stringify(event));
  return event;
}
