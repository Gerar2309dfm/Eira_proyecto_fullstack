import 'dotenv/config';
import app from './app.js';

const port = Number(process.env.PORT || 4000);
app.listen(port, process.env.API_HOST || '127.0.0.1', () => {
  console.log(`EIRA API de demostración: http://localhost:${port}/api/health`);
});
