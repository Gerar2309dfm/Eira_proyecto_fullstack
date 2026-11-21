import { rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const storage = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../storage');
for (const name of ['eira.sqlite','eira.sqlite-shm','eira.sqlite-wal']) await rm(path.join(storage,name),{force:true});
await rm(path.join(storage,'uploads'),{recursive:true,force:true});
console.log('SQLite de demo reiniciada. Los PDFs sintéticos siguen disponibles.');
