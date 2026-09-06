import client from 'prom-client';

export const register = new client.Registry();
client.collectDefaultMetrics({ register, prefix: 'email_scheduler_' });

export const queueDelayGauge = new client.Gauge({
  name: 'email_scheduler_queue_delay_seconds',
  help: 'Active delay in seconds for jobs waiting in the queue until execution',
  labelNames: ['schedule_id', 'sender_email'],
});
register.registerMetric(queueDelayGauge);

export const workerExecutionDurationHistogram = new client.Histogram({
  name: 'email_scheduler_worker_execution_duration_seconds',
  help: 'Duration of email worker processing execution in seconds',
  labelNames: ['status', 'sender_email'],
  buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
});
register.registerMetric(workerExecutionDurationHistogram);

export const jobCounter = new client.Counter({
  name: 'email_scheduler_jobs_total',
  help: 'Total count of processed email jobs by status',
  labelNames: ['status'],
});
register.registerMetric(jobCounter);

export const httpRequestDurationHistogram = new client.Histogram({
  name: 'email_scheduler_http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
});
register.registerMetric(httpRequestDurationHistogram);

export const httpRequestsTotal = new client.Counter({
  name: 'email_scheduler_http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
});
register.registerMetric(httpRequestsTotal);
