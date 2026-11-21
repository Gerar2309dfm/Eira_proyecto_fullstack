/** Regla pura de lectura de expedientes para personal; pacientes usan API aislada. */
export function canAccessPatient(actor) {
  return ['coordinator', 'doctor', 'lab'].includes(actor?.role);
}
