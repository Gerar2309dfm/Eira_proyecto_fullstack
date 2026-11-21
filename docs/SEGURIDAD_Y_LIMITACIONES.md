# Seguridad y privacidad — estado del MVP

Este prototipo es para **datos totalmente ficticios**. Un resultado clínico real implica datos personales sensibles y requeriría evaluación legal/técnica y medidas de protección específicas.

## Controles que sí están en el código

- Personal: cuentas separadas coordinación/laboratorio/médico, contraseña `scrypt` + sal aleatoria, bloqueo temporal de intentos, tokens opacos de sesión almacenados como hashes SHA-256 en SQLite, expiración y revocación al cerrar sesión. Se exige `Authorization: Bearer ...` para todas las rutas internas.
- Pacientes: folio + clave individual, expiración y rate limiting por origen y por folio, token de sesión temporal. La descarga valida la asociación del resultado con paciente y la autorización clínica previa. La clave no se manda por SMS.
- Documentos: el backend sirve PDFs privados con `Cache-Control: no-store`; formato de referencia en blanco separado del resultado. No se pone ningún PDF en el directorio público del frontend.
- Notificaciones: texto neutral, consentimiento SMS guardado en expediente, número de destino inmutable desde el formulario de envío, límite de pruebas AWS y un único número autorizado real.
- Bitácora: acciones de expediente y accesos relevantes se registran en SQLite; esto **no equivale a auditoría inmutable**.
- Entrega asistida: requiere confirmación de identidad y queda registrada como ruta alternativa.

## Límites del prototipo que impiden uso clínico real

- `.env.example` contiene contraseñas **conocidas de demostración**, no seguras para despliegue. Sólo se habilita `EIRA_DEMO_MODE=true` en entorno local.
- SQLite es una base de una sola instalación, sin una estrategia de alta disponibilidad, redundancia, respaldo y recuperación.
- Autenticación local sin MFA, no hay IdP, controles de identidad clínica ni gestión de credenciales para operación real.
- Acceso de desarrollo por HTTP. En un despliegue clínico se necesita TLS/HTTPS, minimización de permisos por documento y defensa ante CSRF/XSS/abusos, controles de red y seguridad.
- El bloqueo de notificaciones duplicadas es por proceso; un sistema distribuido requiere idempotencia transaccional persistente.
- El flujo de autenticación del paciente no sustituye una verificación de identidad formal ni maneja por sí mismo escenarios complejos de teléfono compartido o representantes autorizados.
- Auditoría e historial SQLite pueden modificarse por un administrador de la máquina; se necesitan registros inmutables y control de acceso operacional.
- El servicio AWS SMS sólo confirma entrega si se configura un relay confiable con eventos reales de AWS.
- El PDF puede cargarse por personal autenticado pero no incorpora todavía análisis antivirus ni validación profunda de contenido.
- Política de retención, consentimiento y privacidad, acuerdos de tratamiento y obligaciones sanitarias requieren asesoría aplicable a EIRA antes de piloto.
