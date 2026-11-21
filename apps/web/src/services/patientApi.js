/**
 * Solicitudes del portal independiente para pacientes.
 * No se utiliza el encabezado x-demo-user del panel administrativo.
 * El servidor crea una sesión temporal después de verificar folio y clave.
 */
const API_URL = import.meta.env.VITE_API_URL || '';

async function request(path, { method = 'GET', body, token } = {}) {
  const response = await fetch(`${API_URL}/api/patient-access${path}`, {
    method,
    headers: {
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
    cache: 'no-store',
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error || 'No se pudo completar la solicitud. Intenta nuevamente.');
  }

  if (response.status === 204) return null;

  if (response.headers.get('content-type')?.includes('application/pdf')) {
    return response.blob();
  }

  return response.json();
}

export const patientApi = {
  login: (folio, accessCode) => request('/login', {
    method: 'POST',
    body: { folio: folio.trim().toUpperCase(), accessCode: accessCode.trim() },
  }),
  session: (token) => request('/me', { token }),
  document: (token, id) => request(`/documents/${encodeURIComponent(id)}`, { token }),
  logout: (token) => request('/logout', { method: 'POST', token }),
};

export async function downloadPatientPdf(token, id) {
  const blob = await patientApi.document(token, id);
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `EIRA_Resultado_${id}.pdf`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 15_000);
}

export async function previewPatientPdf(token, id, tab) {
  try {
    const blob = await patientApi.document(token, id);
    const url = URL.createObjectURL(blob);
    if (tab) {
      tab.opener = null;
      tab.location.replace(url);
    } else {
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `EIRA_Resultado_${id}.pdf`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
    }
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
  } catch (error) {
    if (tab) tab.close();
    throw error;
  }
}
