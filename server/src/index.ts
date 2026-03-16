import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import path from 'path';
import { initDatabase } from './db/schema';
import { workflowRoutes } from './routes/workflows';
import { executionRoutes } from './routes/executions';
import { credentialRoutes } from './routes/credentials';
import { webhookRoutes } from './routes/webhooks';
import { errorHandler } from './middleware/error-handler';

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors());
app.use(morgan('dev'));
app.use(express.json({ limit: '10mb' }));

// API routes
app.use('/api/workflows', workflowRoutes);
app.use('/api/executions', executionRoutes);
app.use('/api/credentials', credentialRoutes);
app.use('/webhook', webhookRoutes);

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Serve static files in production
const publicPath = path.join(__dirname, 'public');
app.use(express.static(publicPath));
app.get('*', (_req, res) => {
  res.sendFile(path.join(publicPath, 'index.html'));
});

app.use(errorHandler);

async function start() {
  await initDatabase();
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

start().catch(console.error);

export default app;
