# API EIRA — contrato del MVP reforzado

URL local: `http://127.0.0.1:4000/api` (Vite usa proxy `/api`). Las rutas de personal requieren `Authorization: Bearer <token>`, obtenido de `/staff-auth/login`. **No se admite** `x-demo-user` ni otro encabezado para suplantar roles.

| Método | Ruta | Rol y operación |
|---|---|---|
| GET | `/health` | Público, estado de API y modo SMS |
| POST | `/staff-auth/login` | Público, usuario y contraseña; crea sesión de personal |
| GET | `/staff-auth/me` | Personal con sesión válida |
| POST | `/staff-auth/logout` | Personal, revoca token |
| GET | `/dashboard` | Personal, KPIs y resultados |
| GET | `/patients` | Personal, datos minimizados fuera de coordinación |
| POST | `/patients` | Coordinación, nuevo expediente y clave de una sola presentación |
| POST | `/patients/:id/reset-access` | Coordinación, confirmar cotejo presencial y regenerar clave |
| GET | `/patients/:id/history` | Personal autenticado, historial del expediente |
| GET | `/results` | Personal, lista de resultados |
| POST | `/results` | Laboratorio/coordinación, `multipart/form-data` con `document`, `patientId`, `type` |
| POST | `/results/:id/advance` | Coordinación (identidad y administrativo) / médico (clínico) |
| POST | `/results/:id/notify` | Coordinación, SMS a teléfono del expediente con consentimiento registrado |
| POST | `/results/:id/assisted` | Coordinación, verificación y entrega asistida |
| GET | `/results/:id/document` | Personal autenticado, PDF privado |
| GET | `/documents/:id/file` | Personal autenticado, formatos internos de referencia |
| GET | `/audit` | Personal, bitácora |
| GET | `/impact` | Coordinación/médico, contadores por campaña y comunidad |
| GET | `/sms` | Coordinación, outbox con teléfonos enmascarados |
| POST | `/sms/test` | Coordinación, SMS neutro a teléfono de prueba autorizado |
| POST | `/integrations/sms-delivery` | Relay de confianza, requiere `x-eira-relay-secret` (mín. 32 caracteres) |
| POST | `/patient-access/login` | Paciente, `folio` y `accessCode`, token separado del personal |
| GET | `/patient-access/me` | Paciente con token, sólo sus documentos publicados |
| GET | `/patient-access/documents/:id` | Paciente con token, PDF suyo y autorizado |
| POST | `/patient-access/logout` | Paciente, revoca token |

**Transiciones**: `identity → admin → clinical → notification → available → delivered`. Una entrega asistida puede pasar de `notification` a `delivered`. Un PDF no autorizado no se publica en el portal.

**Estados de SMS**: `SIMULATED` (no llegó al teléfono), `SUBMITTED` (solicitud aceptada por AWS), `DELIVERED` / `FAILED` (sólo desde relay configurado). El backend no considera `SUBMITTED` como prueba de entrega.

**Datos**: SQLite local con pacientes, resultados, formatos, cuentas y sesiones de personal hasheadas, claves de paciente hasheadas, eventos y outbox. Archivos privados locales o en S3 según `STORAGE_MODE`. El prototipo usa documentos ficticios.
