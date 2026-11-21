# Etapa posterior: despliegue de EIRA sobre AWS

El repositorio está preparado para **pruebas locales con SQLite**, envío de SMS opcional mediante AWS End User Messaging SMS y almacenamiento opcional de nuevos PDFs en S3. **No existe despliegue AWS, pasarela de SMS ni infraestructura de identidad de producción ya creados.**

- **SMS:** consulta `docs/SMS_AWS.md`, habilita identidad de origen y número mexicano de prueba, presupuesto, permisos IAM y eventos de confirmación. Utiliza siempre `SMS_MODE=simulated` hasta verificar configuración y autorización.
- **Almacenamiento de PDFs:** `STORAGE_MODE=s3` y `S3_BUCKET` permiten subir nuevos PDFs sintéticos mediante AWS SDK. Los formatos y PDFs semilla son locales y no se migran automáticamente. El bucket debe permanecer privado, cifrado y con acceso mínimo.
- **Frontend:** React + Vite admite publicación HTTPS en Amplify Hosting o infraestructura equivalente. El enlace SMS debe apuntar al **portal**, no al PDF.
- **Backend:** actualmente Express + SQLite, no es una Lambda funcional. Para backend serverless haría falta adaptar el servidor y migrar la persistencia a DynamoDB/RDS o infraestructura compatible, con transacciones e idempotencia.
- **Identidad:** las sesiones de personal reforzadas son de un **MVP local** con contraseñas conocidas por el equipo. Para un piloto sustituirlas por un proveedor de identidad de producción (p. ej., Cognito) con MFA, contraseñas robustas y permisos por expediente.
- **Privacidad:** realizar revisión legal para datos sensibles, retención, cifrado, consentimiento, monitoreo, auditoría inmutable, respaldo y seguridad de operación antes de usar información médica real.

No publicar el backend demo con contraseñas de ejemplo en internet ni cargar información real.
