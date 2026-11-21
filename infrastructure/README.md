# Infraestructura — decisión actual

El sistema está listo para **pruebas locales** con SQLite en `apps/api/storage/eira.sqlite`. En AWS solo está preparado el adaptador de envío SMS (condicionado a configuración y permisos) y la subida S3 opcional. La migración de base de datos y de identidad para producción **no está incluida** y exige un diseño de seguridad específico.

Lee `docs/SMS_AWS.md` para habilitar un teléfono de prueba.
