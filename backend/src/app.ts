import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import morgan from 'morgan';
import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { ExpressAdapter } from '@bull-board/express';
import jwt from 'jsonwebtoken';

import { env } from './config/env';
import { emailQueue } from './queue/emailQueue';
import { startEmailWorker } from './queue/emailWorker';
import { initElasticsearch } from './services/elasticsearch';
import authRoutes from './routes/authRoutes';
import emailRoutes from './routes/emailRoutes';
import slackRoutes from './routes/slackRoutes';
import { logger, runWithLogContext, generateTraceId } from './services/logger';
import { register, httpRequestDurationHistogram, httpRequestsTotal } from './services/metrics';

const app = express();

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(morgan('dev'));

// Tracing and Tenant Context Middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  const traceId = (req.headers['x-trace-id'] as string) || (req.headers['x-request-id'] as string) || generateTraceId();
  let tenantId = (req.headers['x-tenant-id'] as string) || req.body?.userId || req.query?.userId as string;

  const authHeader = req.headers.authorization;
  if (!tenantId && authHeader && authHeader.startsWith('Bearer ')) {
    try {
      const token = authHeader.split(' ')[1];
      const decoded = jwt.decode(token) as { userId?: string };
      if (decoded?.userId) {
        tenantId = decoded.userId;
      }
    } catch {
      // Ignore token parse failure in context middleware
    }
  }

  res.setHeader('x-trace-id', traceId);

  runWithLogContext({ trace_id: traceId, tenant_id: tenantId || 'anonymous' }, () => {
    const endTimer = httpRequestDurationHistogram.startTimer();

    res.on('finish', () => {
      const route = req.route ? req.route.path : req.path;
      const statusCode = res.statusCode.toString();
      endTimer({ method: req.method, route, status_code: statusCode });
      httpRequestsTotal.inc({ method: req.method, route, status_code: statusCode });

      logger.info(`HTTP ${req.method} ${req.originalUrl} ${res.statusCode}`, {
        method: req.method,
        url: req.originalUrl,
        statusCode: res.statusCode,
      });
    });

    next();
  });
});

// BullMQ Live Visual Dashboard Setup
const serverAdapter = new ExpressAdapter();
serverAdapter.setBasePath('/admin/queues');

createBullBoard({
  queues: [new BullMQAdapter(emailQueue as any) as any],
  serverAdapter,
});

app.use('/admin/queues', serverAdapter.getRouter());

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/emails', emailRoutes);
app.use('/api/slack', slackRoutes);

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', service: 'Email Scheduler Service', timestamp: new Date() });
});

// Prometheus Metrics endpoint
app.get('/metrics', async (req: Request, res: Response) => {
  try {
    res.set('Content-Type', register.contentType);
    res.end(await register.metrics());
  } catch (err: any) {
    res.status(500).end(err);
  }
});

const PORT = parseInt(env.PORT, 10) || 4000;

async function bootstrap() {
  try {
    // 1. Initialize Elasticsearch index
    await initElasticsearch();

    // 2. Start BullMQ worker
    startEmailWorker();

    // 3. Start Express HTTP Server
    app.listen(PORT, () => {
      logger.info(`🚀 Email Scheduler Backend running on http://localhost:${PORT}`);
      logger.info(`📊 BullMQ Live Queue Dashboard: http://localhost:${PORT}/admin/queues`);
      logger.info(`📈 Prometheus Metrics Endpoint: http://localhost:${PORT}/metrics`);
    });
  } catch (err: any) {
    logger.error('❌ Failed to start server:', { error: err.message || err });
    process.exit(1);
  }
}

if (process.env.NODE_ENV !== 'test') {
  bootstrap();
}

export default app;
