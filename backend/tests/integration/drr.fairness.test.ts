import { describe, it, expect, beforeEach } from 'vitest';
import { DRRScheduler } from '../../src/queue/drrScheduler';

describe('Multi-Tenant Deficit Round-Robin (DRR) Scheduling Fairness Tests', () => {
  beforeEach(async () => {
    await DRRScheduler.clearAllState();
  });

  it('should dispatch Tenant B single job within < 2 seconds despite Tenant A having 10,000 queued backlog jobs', async () => {
    const TENANT_A = 'tenant-a-10k-backlog';
    const TENANT_B = 'tenant-b-single-job';

    console.log(`📥 Enqueuing 10,000 backlog jobs for Tenant A...`);
    const tenantAJobs = [];
    for (let i = 0; i < 10000; i++) {
      tenantAJobs.push(
        DRRScheduler.enqueueJob(TENANT_A, {
          jobId: `job_tenant_a_${i}`,
          scheduleId: 'schedule_tenant_a',
          userId: TENANT_A,
          recipient: `recipient_a_${i}@domain.com`,
          subject: 'Tenant A Bulk Marketing Email',
          body: 'Heavy backlog email payload',
          senderEmail: 'sender_a@company.com',
          scheduledAt: new Date().toISOString(),
          delayBetweenSec: 0,
          hourlyLimit: 100000,
        })
      );
    }
    await Promise.all(tenantAJobs);

    const tenantALen = await DRRScheduler.getTenantQueueLength(TENANT_A);
    expect(tenantALen).toBe(10000);

    // Tenant B submits 1 single job later
    const tenantBSubmitTime = Date.now();
    await DRRScheduler.enqueueJob(TENANT_B, {
      jobId: 'job_tenant_b_priority_1',
      scheduleId: 'schedule_tenant_b',
      userId: TENANT_B,
      recipient: 'urgent_ceo@company.org',
      subject: 'Tenant B Priority Email',
      body: 'Single urgent email message',
      senderEmail: 'sender_b@company.com',
      scheduledAt: new Date().toISOString(),
      delayBetweenSec: 0,
      hourlyLimit: 100,
    });

    const activeTenants = await DRRScheduler.getActiveTenants();
    expect(activeTenants).toContain(TENANT_A);
    expect(activeTenants).toContain(TENANT_B);

    // Simulate worker dispatch popping
    let dispatchedJobForB = null;
    let popsPerformed = 0;
    const startDispatchTime = Date.now();

    // With DRR round-robin, Tenant B is guaranteed to pop within the first 2 pops!
    while (popsPerformed < 10 && !dispatchedJobForB) {
      const poppedJob = await DRRScheduler.popNextFairJob();
      popsPerformed++;

      if (poppedJob && poppedJob.userId === TENANT_B) {
        dispatchedJobForB = poppedJob;
      }
    }

    const dispatchLatencyMs = Date.now() - tenantBSubmitTime;

    console.log(`⏱️ Tenant B Dispatch Latency: ${dispatchLatencyMs} ms (Pops required: ${popsPerformed})`);

    // SLA Assertions
    expect(dispatchedJobForB).not.toBeNull();
    expect(dispatchedJobForB?.userId).toBe(TENANT_B);
    expect(dispatchedJobForB?.jobId).toBe('job_tenant_b_priority_1');
    expect(dispatchLatencyMs).toBeLessThan(2000); // Must be < 2 seconds (2000 ms)
  });
});
