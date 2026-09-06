import express, { Request, Response } from 'express';
import cors from 'cors';
import morgan from 'morgan';
import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { ExpressAdapter } from '@bull-board/express';

import { env } from './config/env';
import { emailQueue } from './queue/emailQueue';
import { startEmailWorker } from './queue/emailWorker';
import { initElasticsearch } from './services/elasticsearch';
import authRoutes from './routes/authRoutes';
import emailRoutes from './routes/emailRoutes';
import slackRoutes from './routes/slackRoutes';

const app = express();

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(morgan('dev'));

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

app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', service: 'Email Scheduler Service', timestamp: new Date() });
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
      console.log(`=======================================================`);
      console.log(`🚀 Email Scheduler Backend running on http://localhost:${PORT}`);
      console.log(`📊 BullMQ Live Queue Dashboard: http://localhost:${PORT}/admin/queues`);
      console.log(`=======================================================`);
    });
  } catch (err) {
    console.error('❌ Failed to start server:', err);
    process.exit(1);
  }
}

bootstrap();

export default app;
