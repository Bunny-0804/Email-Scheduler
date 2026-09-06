import { redisClient } from '../services/redis';
import { EmailJobData } from './emailQueue';
import { logger } from '../services/logger';

export class DRRScheduler {
  private static QUANTUM = 1; // 1 job credit per round-robin turn

  /**
   * Enqueue a job into the tenant's isolated DRR queue in Redis
   */
  public static async enqueueJob(tenantId: string, jobData: EmailJobData): Promise<void> {
    const queueKey = `drr:queue:${tenantId}`;
    const activeTenantsKey = `drr:active_tenants`;

    const jobStr = JSON.stringify(jobData);
    await redisClient.rpush(queueKey, jobStr);
    await redisClient.sadd(activeTenantsKey, tenantId);

    logger.info(`🎯 DRR Enqueued job ${jobData.jobId} for tenant ${tenantId}`, {
      tenantId,
      jobId: jobData.jobId,
    });
  }

  /**
   * Pop the next fair job according to Deficit Round-Robin scheduling across active tenants
   */
  public static async popNextFairJob(): Promise<EmailJobData | null> {
    const activeTenantsKey = `drr:active_tenants`;
    const activeTenants = await redisClient.smembers(activeTenantsKey);

    if (!activeTenants || activeTenants.length === 0) {
      return null;
    }

    // Get or initialize Round-Robin pointer
    let pointerStr = await redisClient.get('drr:rr_pointer');
    let pointer = pointerStr ? parseInt(pointerStr, 10) : 0;
    if (isNaN(pointer) || pointer >= activeTenants.length) {
      pointer = 0;
    }

    const totalTenants = activeTenants.length;
    let checkedCount = 0;

    while (checkedCount < totalTenants) {
      const currentTenant = activeTenants[pointer % totalTenants];
      const queueKey = `drr:queue:${currentTenant}`;
      const deficitKey = `drr:deficit:${currentTenant}`;

      // Check tenant queue length
      const queueLen = await redisClient.llen(queueKey);

      if (queueLen === 0) {
        // Tenant queue is empty: remove tenant from active set & reset deficit
        await redisClient.srem(activeTenantsKey, currentTenant);
        await redisClient.del(deficitKey);
      } else {
        // Tenant has pending jobs: update deficit balance
        let currentDeficit = parseInt((await redisClient.get(deficitKey)) || '0', 10);
        currentDeficit += this.QUANTUM;

        if (currentDeficit >= 1) {
          // Dequeue 1 job
          const jobStr = await redisClient.lpop(queueKey);

          if (jobStr) {
            currentDeficit -= 1;
            await redisClient.set(deficitKey, currentDeficit.toString());

            // Advance pointer for next round
            await redisClient.set('drr:rr_pointer', ((pointer + 1) % totalTenants).toString());

            const jobData: EmailJobData = JSON.parse(jobStr);
            logger.info(`✨ DRR Dispatched job ${jobData.jobId} for tenant ${currentTenant} (Deficit: ${currentDeficit})`, {
              tenantId: currentTenant,
              jobId: jobData.jobId,
            });
            return jobData;
          }
        }
      }

      pointer++;
      checkedCount++;
    }

    // Advance pointer
    await redisClient.set('drr:rr_pointer', (pointer % totalTenants).toString());
    return null;
  }

  /**
   * Get total pending jobs for a tenant
   */
  public static async getTenantQueueLength(tenantId: string): Promise<number> {
    return await redisClient.llen(`drr:queue:${tenantId}`);
  }

  /**
   * Get all active tenant IDs
   */
  public static async getActiveTenants(): Promise<string[]> {
    return await redisClient.smembers('drr:active_tenants');
  }

  /**
   * Clear all DRR queue state (useful for test reset)
   */
  public static async clearAllState(): Promise<void> {
    const keys = await redisClient.keys('drr:*');
    if (keys.length > 0) {
      await redisClient.del(...keys);
    }
  }
}
