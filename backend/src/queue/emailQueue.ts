import { Queue } from 'bullmq';
import { redisConnectionOptions } from '../services/redis';
import { EmailAttachmentInput } from '../services/smtp';
import { DRRScheduler } from './drrScheduler';

export const EMAIL_QUEUE_NAME = 'email-scheduler-queue';

export const emailQueue = new Queue(EMAIL_QUEUE_NAME, {
  connection: redisConnectionOptions,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
    removeOnComplete: { age: 86400 },
    removeOnFail: { age: 604800 },
  },
});

export interface EmailJobData {
  jobId: string;
  scheduleId: string;
  userId: string;
  recipient: string;
  subject: string;
  body: string;
  attachments?: EmailAttachmentInput[];
  senderEmail: string;
  scheduledAt: string;
  delayBetweenSec: number;
  hourlyLimit: number;
}

export async function enqueueEmailBatch(params: {
  scheduleId: string;
  userId: string;
  senderEmail: string;
  subject: string;
  body: string;
  attachments?: EmailAttachmentInput[];
  startTime: Date;
  delayBetweenSec: number;
  hourlyLimit: number;
  jobs: Array<{ id: string; recipient: string }>;
}) {
  const now = Date.now();
  const startTimeMs = params.startTime.getTime();
  const baseDelayMs = Math.max(0, startTimeMs - now);
  const tenantId = params.userId || params.senderEmail;

  const bulkJobs = [];

  for (let index = 0; index < params.jobs.length; index++) {
    const job = params.jobs[index];
    const pacerDelayMs = index * (params.delayBetweenSec * 1000);
    const totalDelayMs = baseDelayMs + pacerDelayMs;
    const scheduledTimestamp = new Date(now + totalDelayMs).toISOString();

    const jobData: EmailJobData = {
      jobId: job.id,
      scheduleId: params.scheduleId,
      userId: params.userId,
      recipient: job.recipient,
      subject: params.subject,
      body: params.body,
      attachments: params.attachments,
      senderEmail: params.senderEmail,
      scheduledAt: scheduledTimestamp,
      delayBetweenSec: params.delayBetweenSec,
      hourlyLimit: params.hourlyLimit,
    };

    // Register job in tenant-isolated DRR queue
    await DRRScheduler.enqueueJob(tenantId, jobData);

    bulkJobs.push({
      name: 'send-email',
      data: { ...jobData },
      opts: {
        delay: totalDelayMs,
        jobId: `email_job_${job.id}`,
      },
    });
  }

  await emailQueue.addBulk(bulkJobs);
  console.log(`📦 Enqueued ${bulkJobs.length} DRR fair-dispatch jobs for schedule batch ${params.scheduleId} (Tenant: ${tenantId})`);
}
