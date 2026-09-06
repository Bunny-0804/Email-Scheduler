import http from 'k6/http';
import { check, sleep } from 'k6';

// Performance Benchmark Configuration for 10,000 Queued Email Jobs
export const options = {
  scenarios: {
    queue_ingestion_load: {
      executor: 'ramping-arrival-rate',
      startRate: 50,
      timeUnit: '1s',
      preAllocatedVUs: 50,
      maxVUs: 200,
      stages: [
        { duration: '5s', target: 100 },
        { duration: '15s', target: 200 },
        { duration: '5s', target: 0 },
      ],
    },
  },
  thresholds: {
    // MANDATORY REQUIREMENT: Server must maintain p99 latency <= 25ms under 10,000 queued jobs
    http_req_duration: ['p(99)<=25'],
    http_req_failed: ['rate<0.01'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:4000';

export function setup() {
  console.log(`🔥 Starting k6 load test against ${BASE_URL} targeting 10,000 queued jobs with p99 <= 25ms requirement`);
}

export default function () {
  // Generate 50 recipients per request batch
  const recipients = [];
  for (let i = 0; i < 50; i++) {
    recipients.push(`loadtest_user_${Date.now()}_${Math.random().toString(36).substring(7)}@example.com`);
  }

  const payload = JSON.stringify({
    senderEmail: 'oliver.brown@domain.io',
    subject: 'High Volume Load Test Email Batch',
    body: 'Automated k6 load test simulating up to 10,000 queued jobs.',
    recipients: recipients,
    startTime: new Date().toISOString(),
    delayBetweenSec: 1,
    hourlyLimit: 1000,
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
      'x-tenant-id': 'tenant-loadtest-k6',
    },
  };

  // Schedule email batch endpoint execution
  const res = http.post(`${BASE_URL}/api/emails/schedule`, payload, params);

  check(res, {
    'status is 201': (r) => r.status === 201,
    'latency <= 25ms': (r) => r.timings.duration <= 25,
  });

  sleep(0.01);
}

export function teardown(data) {
  console.log('✅ k6 Load Test Execution completed.');
}
