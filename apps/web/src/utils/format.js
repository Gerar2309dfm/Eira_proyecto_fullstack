export const STAGES = {
  identity: { text: 'Validar identidad', tone: 'amber', order: 1 },
  admin: { text: 'Revisión EIRA', tone: 'blue', order: 2 },
  clinical: { text: 'Autorización clínica', tone: 'purple', order: 3 },
  notification: { text: 'Pendiente de aviso', tone: 'teal', order: 4 },
  available: { text: 'Disponible', tone: 'cyan', order: 5 },
  delivered: { text: 'Consultado / entregado', tone: 'green', order: 6 },
};

export const formatDate = (date) => date
  ? new Intl.DateTimeFormat('es-MX', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(date))
  : '—';

export const formatDateTime = (date) => date
  ? new Intl.DateTimeFormat('es-MX', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(date))
  : '—';

export const initials = (name = '') => name.split(' ').slice(0, 2).map((part) => part[0]).join('').toUpperCase();
