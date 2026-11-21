/** Comprobación de consentimiento persistido. El checkbox de envío NO lo sustituye. */
export function validatePatientSms(patient) {
  if (!patient || patient.accessMode !== 'SMS y portal' || patient.consentSms !== true) {
    return { allowed: false, message: 'No hay consentimiento SMS registrado en el expediente.' };
  }
  if (!/^\+[1-9]\d{9,14}$/.test(patient.phone || '')) {
    return { allowed: false, message: 'El expediente no cuenta con un teléfono válido.' };
  }
  return { allowed: true, destination: patient.phone };
}
