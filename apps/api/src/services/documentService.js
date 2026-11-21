import path from 'node:path';
import { promises as fs } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';

const storage = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../storage');
const seedFolder = path.join(storage, 'documents');
const uploadFolder = path.join(storage, 'uploads');
const s3Client = new S3Client({ region: process.env.AWS_REGION || 'us-east-1' });

export function validatePdf(file) {
  const pdfHeader = file?.buffer?.subarray(0, 5).toString('utf8');
  if (!file || pdfHeader !== '%PDF-') {
    throw Object.assign(new Error('Selecciona un archivo PDF válido'), { status: 400 });
  }
}

export async function savePdf(file) {
  validatePdf(file);
  const filename = `${crypto.randomUUID()}.pdf`;

  if (process.env.STORAGE_MODE === 's3') {
    if (!process.env.S3_BUCKET) {
      throw Object.assign(new Error('Falta configurar S3_BUCKET'), { status: 503 });
    }
    await s3Client.send(new PutObjectCommand({
      Bucket: process.env.S3_BUCKET,
      Key: `results/${filename}`,
      Body: file.buffer,
      ContentType: 'application/pdf',
      ServerSideEncryption: 'AES256',
    }));
    return { filename, storage: 's3' };
  }

  await fs.mkdir(uploadFolder, { recursive: true });
  await fs.writeFile(path.join(uploadFolder, filename), file.buffer);
  return { filename, storage: 'upload' };
}

export async function openPdf(record) {
  // Nunca aceptar rutas libres proporcionadas por clientes externos.
  const safeName = path.basename(record.filename);

  if (record.storage === 's3') {
    if (!process.env.S3_BUCKET) throw new Error('Falta configurar S3_BUCKET');
    const response = await s3Client.send(new GetObjectCommand({
      Bucket: process.env.S3_BUCKET,
      Key: `results/${safeName}`,
    }));
    return Buffer.from(await response.Body.transformToByteArray());
  }

  const folder = record.storage === 'seed' ? seedFolder : uploadFolder;
  return fs.readFile(path.join(folder, safeName));
}
