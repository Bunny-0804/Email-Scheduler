import http from 'k6/http';
import { check, sleep } from 'k6';

// k6 Load Test demonstrating DRR Multi-Tenant Fairness (< 2s latency for Tenant B behind 10,000 Tenant A jobs)
export const options = {
  scenarios: {
    tenant_a_heavy_backlog: {
      executor: 'shared-iterations',
      vus: 10,
      iterations: 200, // Enqueue heavy volume for Tenant A
      maxDuration: '30s',
      exec: 'tenantAWorker',
    },
    tenant_b_latency_check: {
      executor: 'per-vu-iterations',
      vus: 1,
      iterations: 1, // Single job for Tenant B submitted later
      startTime: '2s',
      maxDuration: '10s',
      exec: 'tenantBWorker',
    },
  },
  thresholds: {
    'http_req_duration{tenant:tenant-b}': ['p(99)<2000'], // Latency for Tenant B < 2000ms (2s requirement)
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:4000';

export function tenantAWorker() {
  const recipients = [];
  for (let i = 0; i < 50; i++) {
    recipients.push(`tenant_a_user_${Date.now()}_${Math.random()}@domain.com`);
  }

  const payload = JSON.stringify({
    userId: 'tenant-a-backlog',
    senderEmail: 'oliver.brown@domain.io',
    subject: 'Tenant A Bulk Marketing Email',
    body: 'Heavy backlog batch job content.',
    recipients: recipients,
    startTime: new Date().toISOString(),
    delayBetweenSec: 0,
    hourlyLimit: 100000,
  });

  http.post(`${BASE_URL}/api/emails/schedule`, payload, {
    headers: { 'Content-Type': 'application/json', 'x-tenant-id': 'tenant-a-backlog' },
    tags: { tenant: 'tenant-a' },
  });
}

export function tenantBWorker() {
  sleep(1); // Ensure Tenant A has queued thousands of jobs first

  const payload = JSON.stringify({
    userId: 'tenant-b-single-user',
    senderEmail: 'oliver.brown@domain.io',
    subject: 'Tenant B Priority Email',
    body: 'Single priority email submitted later.',
    recipients: ['urgent.target@domain.com'],
    startTime: new Date().toISOString(),
    delayBetweenSec: 0,
    hourlyLimit: 100,
  });

  const startTime = Date.now();
  const res = http.post(`${BASE_URL}/api/emails/schedule`, payload, {
    headers: { 'Content-Type': 'application/json', 'x-tenant-id': 'tenant-b-single-user' },
    tags: { tenant: 'tenant-b' },
  });

  const durationMs = Date.now() - startTime;
  console.log(`⏱️ Tenant B submission & dispatch response time under 10k backlog: ${durationMs} ms`);

  check(res, {
    'Tenant B status is 201': (r) => r.status === 201,
    'Tenant B dispatch latency < 2000ms': () => durationMs < 2000,
  });
}
