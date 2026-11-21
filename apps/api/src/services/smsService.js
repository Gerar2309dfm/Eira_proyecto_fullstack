import {
  PinpointSMSVoiceV2Client,
  SendTextMessageCommand,
} from '@aws-sdk/client-pinpoint-sms-voice-v2';

export const NEUTRAL_SMS =
  'EIRA: Tienes un documento disponible. Consulta el portal oficial o acude al punto de atencion autorizado.';

/**
 * Link opcional al PORTAL (nunca al PDF), accesible tras verificar la identidad.
 * En local no se envía localhost: los celulares externos no pueden abrirlo.
 */
export function smsBody() {
  const url = String(process.env.PATIENT_PORTAL_URL || '').trim();
  if (!url) return NEUTRAL_SMS;
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error('PATIENT_PORTAL_URL debe ser una URL HTTPS válida');
  }
  if (parsed.protocol !== 'https:') {
    throw new Error('PATIENT_PORTAL_URL debe utilizar HTTPS');
  }
  return `EIRA: Tienes un documento disponible. Consulta: ${parsed.toString()} o solicita entrega asistida en tu centro EIRA.`;
}

/** Nunca enviar hallazgos, diagnósticos ni datos personales en un SMS. */
export async function sendSms(destination, overrideBody = null) {
  if (process.env.SMS_MODE !== 'aws') {
    return { status: 'SIMULATED', messageId: `demo-${crypto.randomUUID()}` };
  }

  if (!process.env.SMS_ORIGINATOR) {
    throw Object.assign(new Error('Falta SMS_ORIGINATOR en la configuración de AWS'), { status: 503 });
  }

  const client = new PinpointSMSVoiceV2Client({ region: process.env.AWS_REGION || 'us-east-1' });
  const response = await client.send(
    new SendTextMessageCommand({
      DestinationPhoneNumber: destination,
      OriginationIdentity: process.env.SMS_ORIGINATOR,
      ...(process.env.SMS_CONFIG_SET
        ? { ConfigurationSetName: process.env.SMS_CONFIG_SET }
        : {}),
      MessageType: 'TRANSACTIONAL',
      MessageBody: overrideBody || smsBody(),
    }),
  );

  // SUBMITTED != DELIVERED; para estado real configurar eventos de entrega en AWS.
  return { status: 'SUBMITTED', messageId: response.MessageId };
}
