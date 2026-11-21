/** Datos 100 % ficticios. Los formatos de EIRA se guardan solo como referencias documentales. */
export const initialData = {
  patients: [
    { id: 'PAC-0183', name: 'Daniela Ruiz', birthDate: '1992-08-12', phone: '+525500000001', location: 'Ciudad Guzmán, Jalisco', accessMode: 'SMS y portal', consentSms: true, initials: 'DR' },
    { id: 'PAC-0190', name: 'Paola Flores', birthDate: '1990-06-13', phone: '+525500000002', location: 'Zapotlán el Grande', accessMode: 'SMS y portal', consentSms: true, initials: 'PF' },
    { id: 'PAC-0191', name: 'Natalia Cruz', birthDate: '1993-04-12', phone: '+525500000003', location: 'Comunidad rural', accessMode: 'Entrega asistida', initials: 'NC' },
    { id: 'PAC-0192', name: 'Elena Rojas', birthDate: '1987-07-25', phone: '+525500000004', location: 'Región sur de Jalisco', accessMode: 'SMS y portal', consentSms: true, initials: 'ER' },
  ],
  documents: [
    { id: 'DOC-CIT-001', patientId: 'PAC-0183', title: 'Formato de citología cervical', kind: 'Formato de referencia', filename: 'formato_citologia_eira.pdf', storage: 'seed', createdAt: '2026-11-21T10:00:00.000Z', pages: 1, staffOnly: true },
    { id: 'DOC-MAM-001', patientId: 'PAC-0183', title: 'Formato de revisión mamaria', kind: 'Formato de referencia', filename: 'formato_revision_mamaria.pdf', storage: 'seed', createdAt: '2026-11-21T10:05:00.000Z', pages: 2, staffOnly: true },
  ],
  results: [
    { id: 'EIR-0241', patientId: 'PAC-0183', type: 'Citología cervical', stage: 'identity', filename: 'resultado_eir_0241.pdf', storage: 'seed', createdAt: '2026-11-21T11:00:00.000Z', notification: null, assisted: false },
    { id: 'EIR-0242', patientId: 'PAC-0190', type: 'Citología cervical', stage: 'clinical', filename: 'resultado_eir_0242.pdf', storage: 'seed', createdAt: '2026-11-21T10:30:00.000Z', notification: null, assisted: false },
    { id: 'EIR-0243', patientId: 'PAC-0191', type: 'Citología cervical', stage: 'notification', filename: 'resultado_eir_0243.pdf', storage: 'seed', createdAt: '2026-11-21T10:15:00.000Z', notification: null, assisted: false },
    { id: 'EIR-0244', patientId: 'PAC-0192', type: 'Citología cervical', stage: 'available', filename: 'resultado_eir_0244.pdf', storage: 'seed', createdAt: '2026-11-21T09:45:00.000Z', notification: { status: 'SIMULATED', channel: 'SMS', createdAt: '2026-11-21T09:55:00.000Z' }, assisted: false },
    { id: 'EIR-0245', patientId: 'PAC-0183', type: 'Citología cervical', stage: 'delivered', filename: 'resultado_eir_0245.pdf', storage: 'seed', createdAt: '2026-11-20T09:45:00.000Z', notification: { status: 'SIMULATED', channel: 'SMS', createdAt: '2026-11-20T10:15:00.000Z' }, assisted: false },
  ],
  events: [
    { id: 'EVT-1', resultId: 'EIR-0245', action: 'Consulta de documento sintético', actor: 'PAC-0183', createdAt: '2026-11-20T10:20:00.000Z' },
    { id: 'EVT-2', resultId: 'EIR-0244', action: 'Aviso SMS simulado', actor: 'coordinacion', createdAt: '2026-11-21T09:55:00.000Z' },
    { id: 'EVT-3', resultId: 'EIR-0242', action: 'Revisión administrativa', actor: 'coordinacion', createdAt: '2026-11-21T10:30:00.000Z' },
  ],
};
