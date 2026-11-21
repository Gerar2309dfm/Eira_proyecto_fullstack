# Pruebas SMS con AWS — laboratorio Nerdearla

## Modo local sin costo por SMS

En `.env` dejar `SMS_MODE=simulated`. Pulsar «Laboratorio SMS» o «Notificar» registra `SIMULATED`, que significa que **no se envió un mensaje al teléfono**.

## Un SMS real al celular de prueba

1. Crear/usar cuenta AWS y configurar credenciales locales mediante perfil o rol IAM (no poner claves en archivos React ni comitearlas).
2. Comprobar con AWS End User Messaging SMS que se puede enviar a México; configurar identidad de origen admitida y la ruta de destino. Si la cuenta está en sandbox, verificar el teléfono de destino. Revisar costos/límites antes de activar.
3. En `apps/api/.env` activar:

```dotenv
SMS_MODE=aws
AWS_REGION=us-east-1
SMS_ORIGINATOR=ORIGEN_VALIDADO_EN_AWS
SMS_TEST_PHONE=+52XXXXXXXXXX
SMS_DAILY_LIMIT=10
# opcional: configuración AWS de eventos
SMS_CONFIG_SET=
# opcional: portal público HTTPS, NO enlace directo a PDF
PATIENT_PORTAL_URL=https://tu-dominio-eira.example/mi-resultado
```

4. Iniciar EIRA; entrar como coordinación y abrir **Notificaciones → Laboratorio SMS**. Introducir *tu propio número* (igual que `SMS_TEST_PHONE`) y confirmar permiso. La respuesta `SUBMITTED` indica que AWS aceptó el envío; no significa que se recibió.
5. Para el **flujo de expediente** crea paciente de prueba con ese mismo número y `consentSms=true`; el backend enviará sólo al teléfono registrado en el expediente. No permite `demoPhone` alternativo.

## Confirmar entrega real (integración opcional pendiente)

Para actualizar `DELIVERED` y `FAILED` desde AWS, configura un **destino de eventos** de AWS End User Messaging SMS, por ejemplo SNS/CloudWatch, y un relay Lambda o un servicio equivalente que **valide la autenticidad del evento de AWS**. Ese relay traduce el evento de entrega a:

```json
{
  "providerMessageId": "ID_DEVUELTO_POR_AWS",
  "status": "DELIVERED"
}
```

y lo envía al backend `POST /api/integrations/sms-delivery` junto con el encabezado `x-eira-relay-secret`, que debe coincidir con `SMS_DELIVERY_WEBHOOK_SECRET` (secreto aleatorio de al menos 32 caracteres) configurado únicamente en backend/relay. **No enviar ese secreto desde React.** Este endpoint NO valida directamente firmas SNS; solo confía en el relay que ya debió verificarlas. No exponerlo públicamente sin canal HTTPS y verificación de origen.

No existe aquí un relay desplegado. Mientras no se configure, se mostrará `SUBMITTED` y la entrega al teléfono debe comprobarse físicamente en la demo.

## Privacidad y conectividad

- No incluir en SMS nombres, diagnóstico, tipo de estudio ni links directos al PDF.
- Para una paciente sin internet, el SMS puede informar disponibilidad y ruta de atención asistida, pero **no enviar el PDF como archivo descargable por SMS**.
- Comprobar consentimiento y que el teléfono no se comparte sin autorización.
