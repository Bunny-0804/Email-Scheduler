import winston from 'winston';
import { AsyncLocalStorage } from 'async_hooks';
import { v4 as uuidv4 } from 'uuid';

export interface LogContext {
  trace_id?: string;
  tenant_id?: string;
  job_id?: string;
  [key: string]: any;
}

export const asyncLocalStorage = new AsyncLocalStorage<LogContext>();

const structuredFormat = winston.format((info) => {
  const store = asyncLocalStorage.getStore() || {};
  
  info.trace_id = info.trace_id || store.trace_id || 'N/A';
  info.tenant_id = info.tenant_id || store.tenant_id || 'N/A';
  info.job_id = info.job_id || store.job_id || 'N/A';
  info.service = 'email-scheduler-backend';
  info.timestamp = info.timestamp || new Date().toISOString();

  return info;
});

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    structuredFormat(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({
      handleExceptions: true,
    }),
  ],
});

export function runWithLogContext<T>(context: LogContext, fn: () => Promise<T> | T): Promise<T> | T {
  const currentStore = asyncLocalStorage.getStore() || {};
  const mergedContext = { ...currentStore, ...context };
  return asyncLocalStorage.run(mergedContext, fn);
}

export function generateTraceId(): string {
  return uuidv4();
}
