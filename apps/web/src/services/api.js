const API_URL = import.meta.env.VITE_API_URL || '';

/** Nunca se envía un rol desde el navegador; sólo un token de sesión de servidor. */
export async function apiRequest(path, token, options = {}) {
  const { body, ...requestOptions } = options;
  const isForm = body instanceof FormData;
  const response = await fetch(`${API_URL}/api${path}`, {
    ...requestOptions,
    cache: 'no-store',
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(isForm ? {} : { 'Content-Type': 'application/json' }),
      ...requestOptions.headers,
    },
    ...(body !== undefined ? { body: isForm ? body : JSON.stringify(body) } : {}),
  });

  if (!response.ok) {
    const responseBody = await response.json().catch(() => ({}));
    const error = new Error(responseBody.error || `Error HTTP ${response.status}`);
    error.status = response.status;
    throw error;
  }

  if (response.status === 204) return null;
  return response.headers.get('content-type')?.includes('application/pdf')
    ? response.blob()
    : response.json();
}

export async function openProtectedPdf(path, token) {
  const tab = window.open('', '_blank');
  try {
    const blob = await apiRequest(path, token);
    const objectUrl = URL.createObjectURL(blob);
    if (tab) {
      tab.opener = null;
      tab.location.href = objectUrl;
    } else {
      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = 'documento-eira.pdf';
      link.click();
    }
    setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
  } catch (error) {
    tab?.close();
    throw error;
  }
}

export async function downloadProtectedPdf(path, token, name) {
  const blob = await apiRequest(path, token);
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = objectUrl;
  link.download = name;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(objectUrl), 10_000);
}
