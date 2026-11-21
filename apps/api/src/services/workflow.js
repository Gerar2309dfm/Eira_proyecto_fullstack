/** Reglas de autorización separadas para probar el flujo sin conectar una BD. */
export const workflowTransitions = {
  identity: {
    role: 'coordinator',
    next: 'admin',
    action: 'Identidad cotejada con dos identificadores',
  },
  admin: {
    role: 'coordinator',
    next: 'clinical',
    action: 'Revisión administrativa aprobada',
  },
  clinical: {
    role: 'doctor',
    next: 'notification',
    action: 'Autorización clínica registrada',
  },
};

export function validateAdvance({ stage, role, confirmed, twoIdentifiersVerified }) {
  const transition = workflowTransitions[stage];

  if (!transition) {
    return { error: 'No se puede avanzar desde este estado', status: 409 };
  }

  if (role !== transition.role) {
    return { error: 'Este paso requiere otro rol', status: 403 };
  }

  if (!confirmed) {
    return { error: 'Debes confirmar la revisión', status: 400 };
  }

  if (stage === 'identity' && !twoIdentifiersVerified) {
    return { error: 'Se requiere comprobación de dos identificadores', status: 400 };
  }

  return { transition };
}
