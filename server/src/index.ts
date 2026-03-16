import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import path from 'path';
import { workflowRoutes } from './routes/workflows';
import { executionRoutes } from './routes/executions';
import { credentialRoutes } from './routes/credentials';
import { webhookRoutes } from './routes/webhooks';
import { errorHandler } from './middleware/error-handler';
import { requireAuth } from './middleware/auth';

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({
  origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
  credentials: true,
}));
app.use(morgan('dev'));
app.use(express.json({ limit: '10mb' }));

// Protected API routes — all require authentication
app.use('/api/workflows', requireAuth, workflowRoutes);
app.use('/api/executions', requireAuth, executionRoutes);
app.use('/api/credentials', requireAuth, credentialRoutes);

// Webhook routes are public (triggered by external services)
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

function start() {
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

start();

export default app;
