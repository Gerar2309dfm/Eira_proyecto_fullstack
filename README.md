# EIRA · Centro de Resultados — Proyecto reforzado para Nerdearla

**MVP Full Stack: React + Vite · Node.js/Express · SQLite · PDF · AWS SMS opcional.**

La aplicación demuestra con datos sintéticos el recorrido completo: **registro de paciente → carga PDF → comprobación de identidad → revisión administrativa → autorización clínica → aviso SMS o entrega asistida → acceso autenticado → auditoría**.

> ⚠️ **Exclusivamente prototipo de hackatón. No introducir expedientes, resultados ni datos de pacientes reales.** Aunque ahora hay sesiones de personal y controles por rol, aún no está preparada para operación médica real ni desplegada en AWS. El envío SMS a un teléfono real requiere habilitar AWS y autorización del propietario del número.

## 1. Arranque en Mac y Windows

Requisitos: Node.js **22.13+** (recomendado 24 LTS), npm y conexión a internet para instalar dependencias.

```bash
cd EIRA_Proyecto_Reforzado
npm install
cp apps/api/.env.example apps/api/.env
npm run dev
```

En Windows PowerShell, para copiar `.env`:

```powershell
Copy-Item apps/api/.env.example apps/api/.env
```

Abre la URL **Local** que imprima Vite (habitualmente `http://localhost:5173`). Si el puerto 5173 está ocupado, Vite intentará 5174. El backend se mantiene en `http://127.0.0.1:4000/api/health`.

**Primera ejecución:** la API crea automáticamente la base SQLite con pacientes y resultados ficticios; no se incluye una base con contraseñas antiguas para evitar heredar accesos compartidos.

### Tres cuentas del personal (DEMO local)

| Cuenta | Usuario | Contraseña de ejemplo |
|---|---|---|
| Coordinación | `coordinacion` | `EiraCoordDemo2026!` |
| Laboratorio | `laboratorio` | `EiraLabDemo2026!` |
| Médico | `medico` | `EiraMedicoDemo2026!` |

Las contraseñas se toman de `apps/api/.env` y **se almacenan con hash scrypt** cuando se crea la base de datos. Para cambiar contraseñas de demo de una instalación existente, detén el servidor, modifica `.env` y ejecuta `npm run demo:reset` (elimina los datos de prueba); las cuentas se volverán a crear al arrancar. No uses estas credenciales predecibles ni este sistema de sesiones en un despliegue con personas reales.

**Portal de pacientes:** `<URL de Vite>/mi-resultado`. Cuenta semilla conocida: folio `PAC-0183` y clave `EIRA2026`. Las demás cuentas iniciales tienen claves aleatorias; coordinación puede regenerarlas tras verificar identidad. Las pacientes nuevas reciben una clave aleatoria individual visible una sola vez.

## 2. Recorrido ante el jurado

1. Entra como **coordinación**. En **Pacientes → Nueva paciente** registra un nombre ficticio, fecha ficticia, comunidad, campaña y modalidad de acceso. Elige "SMS y portal" **solo** cuando registres un teléfono de prueba autorizado y consentimiento; para una paciente sin teléfono elige "Entrega asistida".
2. Guarda el folio y la clave individual; entrégalos **por separado del SMS**.
3. Sal de coordinación e ingresa como **laboratorio**. En **Resultados** carga el PDF `apps/api/storage/synthetic/archivo_ejemplo_para_subir.pdf` y relaciónalo con la nueva paciente.
4. Sal de laboratorio y entra como **coordinación**. Coteja los dos identificadores y aprueba la revisión administrativa.
5. Sal e ingresa como **médico**. Revisa el documento ficticio y autoriza su liberación.
6. Vuelve a **coordinación**. Envía un SMS neutro, o registra una **entrega asistida**, según la modalidad. En `SMS_MODE=simulated` se crea un registro **sin que llegue ningún mensaje físico**.
7. Abre **/mi-resultado**, ingresa con folio y clave y descarga el PDF autorizado. Otros expedientes y archivos pendientes no deben ser visibles.
8. Presenta la **Bitácora** y el módulo **Impacto y campañas**: muestran acciones, estado de entrega y recuentos por comunidad o campaña. Son datos de prueba, **no** resultados de impacto de campo.

## 3. Pruebas

Con las dependencias instaladas:

```bash
npm run test        # Pruebas unitarias de roles, hash, SQLite, SMS y flujo
npm run build       # Compila React para producción (debe verificarse en tu equipo)
npm run dev         # Deja la aplicación abierta
```

En otra terminal (requiere `npm run dev` y **SMS_MODE=simulated**):

```bash
npm run smoke       # Prueba HTTP del flujo, incluyendo consentimiento y entrega asistida
```

`npm run smoke` crea expedientes ficticios persistentes; para restaurar los datos de demostración detén el servidor y ejecuta `npm run demo:reset`. Consulta `docs/CRITERIOS_JURADO.md` para las evidencias de los seis criterios.

## 4. SMS real a tu número (opcional)

El proyecto integra el SDK de **AWS End User Messaging SMS**. Antes de activar `SMS_MODE=aws` necesitas:

- Haber autorizado el número de celular de prueba y disponer de identidad de origen admitida para México, con las restricciones de sandbox o registro resueltas.
- AWS CLI/perfil o rol IAM con permisos mínimos, sin colocar secretos AWS en el frontend.
- Configurar `SMS_TEST_PHONE=+52XXXXXXXXXX`, `SMS_ORIGINATOR=...`, `AWS_REGION=...` y `SMS_MODE=aws` en `.env`.
- Para SMS automático de expedientes, crear un paciente ficticio con **ese mismo número** y consentimiento SMS registrado. No se acepta sobreescribir el número al pulsar «Notificar».

La API impone límite diario y mínimo de 60 segundos por número en AWS; la vista **Notificaciones → Laboratorio SMS** permite una prueba neutral que no incluye nombres, estudios ni diagnósticos.

`SUBMITTED` significa **aceptado por AWS**, no entregado al teléfono. Hay un endpoint para recibir estados mediante un relay de confianza (`docs/SMS_AWS.md`), pero **el relay AWS SNS/Lambda no está desplegado**; `DELIVERED` no aparecerá automáticamente sin conectarlo. Ver `docs/SMS_AWS.md`.

Para que un SMS tenga una URL usable en celular fuera de la Mac debes desplegar el portal bajo **HTTPS**, configurar `PATIENT_PORTAL_URL` y mantener el inicio de sesión. Un teléfono básico puede recibir el aviso, pero no descargar un PDF sin internet.

## 5. Probar desde un celular en la misma red Wi-Fi

Vite escucha en `0.0.0.0`, y la API permanece local detrás del proxy de Vite. En tu Mac obtén la IP LAN y abre en el celular `http://IP-DE-TU-MAC:PUERTO/mi-resultado`, usando el puerto que muestre Vite. Esto **solo se recomienda para el laboratorio local con información sintética**; el acceso no es HTTPS y no debe exponerse a internet.

## 6. Arquitectura

```text
apps/
  web/src/
    components/      # navegación, estados, logo oficial, archivos
    context/         # sesión y estado React sin roles inventados por cliente
    pages/           # dashboard, pacientes, resultados, historial,
                     # notificaciones, impacto, login y portal pacientes
    services/        # llamadas con token Bearer
    styles/          # CSS responsive y paleta rosa EIRA
  api/src/
    middleware/      # sesiones del personal y permisos por rol
    repositories/    # SQLite, semillas ficticias, auditoría
    routes/          # API aislada para pacientes
    services/        # SMS, documentos, credenciales, workflow
  api/storage/
    synthetic/       # informe PDF totalmente ficticio
    documents/       # PDF sintéticos y formatos de referencia EIRA
scripts/smoke.mjs   # prueba HTTP de extremo a extremo
infrastructure/     # guía de despliegue posterior
```

El storage puede configurarse como S3 privado (`STORAGE_MODE=s3`, `S3_BUCKET=...`) pero **SQLite sigue siendo local**. Para piloto: migrar datos, diseñar acceso de producción con IAM/Cognito, almacenamiento privado cifrado, retención/consentimiento, gestión de incidentes, backups, monitoreo y controles legales aplicables.

## 7. Lo que sigue pendiente

- **Ejecución real de build en tu equipo:** la compilación de React no pudo verificarse en el entorno de generación por falta de acceso al registro npm. El código JS/JSX sí fue analizado sintácticamente y las pruebas Node/SQLite pasaron.
- **SMS físico:** depende de la cuenta, origen, destino verificado y configuración de AWS; no se ha enviado un SMS desde este entorno.
- **Verificación automática de entrega:** requiere instalar y autenticar el relay de eventos del proveedor.
- **Piloto con datos reales:** requiere auditoría y seguridad reforzada por profesionales, autenticación de producción, cifrado y controles de privacidad apropiados. **No utilizar este prototipo para datos médicos reales.**
