import dotenv from 'dotenv';
import path from 'path';
import { z } from 'zod';

dotenv.config({ path: path.join(__dirname, '../../.env') });

const envSchema = z.object({
  PORT: z.string().default('4000'),
  DATABASE_URL: z.string().default('postgresql://postgres:postgrespassword@localhost:5432/email_scheduler_db?schema=public'),
  REDIS_HOST: z.string().default('localhost'),
  REDIS_PORT: z.string().default('6379'),
  ELASTICSEARCH_NODE: z.string().default('http://localhost:9200'),
  WORKER_CONCURRENCY: z.string().default('5'),
  DEFAULT_HOURLY_LIMIT: z.string().default('100'),
  MIN_DELAY_BETWEEN_SENDS_SEC: z.string().default('2'),
  SLACK_CLIENT_ID: z.string().default('mock_slack_client_id'),
  SLACK_CLIENT_SECRET: z.string().default('mock_slack_client_secret'),
  SLACK_REDIRECT_URI: z.string().default('http://localhost:4000/api/slack/callback'),
  GOOGLE_CLIENT_ID: z.string().default('mock_google_client_id'),
  JWT_SECRET: z.string().default('super-secret-jwt-key'),
});

export const env = envSchema.parse(process.env);
