# Evidencias de los criterios de Nerdearla — Reto 4 EIRA

Evaluación interna de ingeniería; no representa calificación oficial del jurado. Las funciones del código están implementadas para **demo local con datos sintéticos**. Distinguir "pasó unit tests" de "demostrado funcionando en AWS".

| Criterio | Qué se reforzó | Evidencia para mostrar | Qué falta validar |
|---|---|---|---|
| **Usabilidad** | Acceso independiente de personal y pacientes, botones grandes, CSS adaptable, entrega asistida sin smartphone | Vistas `/` y `/mi-resultado`; prueba móvil usando Wi-Fi local | Pruebas reales con pacientes/brigadas, condiciones de conectividad lenta y accesibilidad |
| **Escalabilidad** | Arquitectura API/React/SQLite separada; campos de campaña y comunidad; reportes agrupados | `apps/web/src/pages/Impact.jsx`, `GET /api/impact` y alta de pacientes | Multi-organización, migración a DB administrada, monitoreo de costos y carga, backups |
| **Innovación** | Entrega dual digital/assistida, rastreo de eventos y reporte de estado SMS sin diagnóstico | Resultado de paciente sin teléfono que se entrega en punto autorizado | Validar efectividad en campo y consentimiento de canales compartidos |
| **Impacto** | Contadores calculados de registros, entregas, consultas y campañas sin inventar ahorro | Panel «Impacto y campañas» con datos de demo; bitácora | Medir tiempos/costos reales en comparación con WhatsApp |
| **Privacidad y confianza** | Se eliminó `x-demo-user`; inicio de sesión por rol, contraseñas hasheadas y sesiones opacas; consentimiento de SMS guardado; acceso a PDF por sesión | Negar petición sin token, impedir laboratorio→autorización médica, paciente A→PDF paciente B; `npm run smoke` | IdP/MFA/HTTPS, auditoría inmutable, política clínica de privacidad, infraestructura segura |
| **Funcionamiento real** | API Express + SQLite + PDF sintético + flujo clínico + SMS simulado / adaptador AWS | `npm run smoke` con dos pacientes, autorización, denegaciones, descarga y entrega asistida | Correr smoke en Mac después de npm install; compilar React; confirmar SMS real y eventos de entrega AWS |

## Demostración recomendada (5–7 minutos)

1. **Problema**: imprimir, escanear, envío manual por WhatsApp y interrupciones. No mostrar diagnósticos reales.
2. **EIRA registra a una paciente** con campaña, comunidad y folio privado. Muestra una segunda sin teléfono.
3. **Laboratorio sube PDF sintético**. Se identifica el expediente por dos datos.
4. **Coordinación aprueba → médico autoriza** usando diferentes inicios de sesión (sin selector que falsifique rol).
5. **Coordinación notifica**: mostrar `SIMULATED` o, si AWS está habilitado y se comprobó, el SMS físico; nunca llamar "entregado" a `SUBMITTED`.
6. **Paciente abre su portal** y descarga un archivo autorizado. Intentar descargar otro da 404.
7. **Alternativa sin internet**: registrar entrega asistida tras comprobar identidad. Cerrar con bitácora, campañas y estado real.

## Medición de impacto para piloto

Crear una hoja de observación con fechas, número de documentos, minutos por carga/identificación/entrega, SMS reintentados, solicitudes presenciales, entregas confirmadas y problemas de conectividad. Comparar con línea base aprobada por EIRA. No presentar cifras no recolectadas como hechos.
