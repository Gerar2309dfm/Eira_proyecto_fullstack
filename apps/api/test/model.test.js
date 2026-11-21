import assert from 'node:assert/strict';
import { test } from 'node:test';
import { promises as fs } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { initialData } from '../src/repositories/seed.js';
import { canAccessPatient } from '../src/middleware/rolePolicy.js';
import { validateAdvance } from '../src/services/workflow.js';

const docsPath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../storage/documents');

test('pacientes ficticias cuentan con un identificador único', () => {
  const ids = initialData.patients.map((patient) => patient.id);
  assert.equal(new Set(ids).size, ids.length);
});

test('todos los resultados se asocian a una paciente conocida', () => {
  const ids = new Set(initialData.patients.map((patient) => patient.id));
  assert.ok(initialData.results.every((result) => ids.has(result.patientId)));
});

test('los formatos originales son solo documentos internos, no resultados', () => {
  assert.equal(initialData.documents.length, 2);
  assert.ok(initialData.documents.every((document) => document.staffOnly));
  assert.ok(initialData.documents.every((document) => document.kind === 'Formato de referencia'));
});

test('los tres PDFs de prueba tienen cabecera PDF', async () => {
  const docs = [
    'formato_citologia_eira.pdf',
    'formato_revision_mamaria.pdf',
    'resultado_eir_0245.pdf',
  ];

  for (const file of docs) {
    const buffer = await fs.readFile(path.join(docsPath, file));
    assert.equal(buffer.subarray(0, 5).toString('utf8'), '%PDF-');
  }
});

test('el personal requiere un rol autorizado para consultar expedientes', () => {
  assert.equal(canAccessPatient({role: 'coordinator'}), true);
  assert.equal(canAccessPatient({role: 'patient'}), false);
});

test('el flujo exige cotejo de identidad y separa autorización médica', () => {
  const missingId = validateAdvance({
    stage: 'identity', role: 'coordinator', confirmed: true, twoIdentifiersVerified: false,
  });
  assert.equal(missingId.status, 400);

  const correctId = validateAdvance({
    stage: 'identity', role: 'coordinator', confirmed: true, twoIdentifiersVerified: true,
  });
  assert.equal(correctId.transition.next, 'admin');

  const unauthorizedDoctor = validateAdvance({
    stage: 'clinical', role: 'coordinator', confirmed: true,
  });
  assert.equal(unauthorizedDoctor.status, 403);

  const authorized = validateAdvance({
    stage: 'clinical', role: 'doctor', confirmed: true,
  });
  assert.equal(authorized.transition.next, 'notification');
});
