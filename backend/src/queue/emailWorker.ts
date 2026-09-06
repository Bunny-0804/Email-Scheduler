import { Worker, Job } from 'bullmq';
import { EMAIL_QUEUE_NAME, EmailJobData, emailQueue } from './emailQueue';
import { redisConnectionOptions, redisClient } from '../services/redis';
import { sendEmailViaEthereal } from '../services/smtp';
import { sendSlackRateLimitNotification } from '../services/slack';
import { prisma } from '../services/db';
import { indexEmailDoc } from '../services/elasticsearch';
import { env } from '../config/env';
import { logger, runWithLogContext, generateTraceId } from '../services/logger';
import {
  queueDelayGauge,
  workerExecutionDurationHistogram,
  jobCounter,
} from '../services/metrics';

function getHourWindowKey(senderEmail: string, date: Date = new Date()): { key: string; windowStr: string; nextHourMs: number } {
  const yyyy = date.getUTCFullYear();
  const mm = String(date.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(date.getUTCDate()).padStart(2, '0');
  const hh = String(date.getUTCHours()).padStart(2, '0');
  
  const windowStr = `${yyyy}-${mm}-${dd}-${hh}`;
  const key = `rate_limit:${senderEmail}:${windowStr}`;
  
  const nextHourDate = new Date(Date.UTC(yyyy, date.getUTCMonth(), date.getUTCDate(), date.getUTCHours() + 1, 0, 0, 0));
  return { key, windowStr, nextHourMs: nextHourDate.getTime() };
}

export function startEmailWorker() {
  const workerConcurrency = parseInt(env.WORKER_CONCURRENCY, 10) || 5;

  const worker = new Worker<EmailJobData>(
    EMAIL_QUEUE_NAME,
    async (job: Job<EmailJobData>) => {
      const { jobId, scheduleId, userId, recipient, subject, body, attachments, senderEmail, hourlyLimit, scheduledAt } = job.data;
      const traceId = generateTraceId();

      return runWithLogContext({ trace_id: traceId, tenant_id: userId || 'N/A', job_id: jobId }, async () => {
        const startTime = Date.now();

        // Record Queue Delay Metric
        if (scheduledAt) {
          const scheduledMs = new Date(scheduledAt).getTime();
          const queueDelaySec = Math.max(0, (startTime - scheduledMs) / 1000);
          queueDelayGauge.set({ schedule_id: scheduleId, sender_email: senderEmail }, queueDelaySec);
        }

        logger.info(`🚀 Worker processing job ${jobId}`, { recipient, senderEmail, scheduleId });

        // 1. Rate Limit Check using Redis
        const { key, windowStr, nextHourMs } = getHourWindowKey(senderEmail);
        const currentCount = await redisClient.incr(key);

        if (currentCount === 1) {
          await redisClient.expire(key, 3600);
        }

        const limitToUse = hourlyLimit || parseInt(env.DEFAULT_HOURLY_LIMIT, 10);

        if (currentCount > limitToUse) {
          logger.warn(`🛑 Rate limit hit for sender ${senderEmail} (${currentCount}/${limitToUse}). Rescheduling job ${jobId}`, {
            currentCount,
            limitToUse,
            senderEmail,
          });

          const now = Date.now();
          const nextHourDelayMs = Math.max(1000, nextHourMs - now);
          const nextHourFormatted = new Date(nextHourMs).toISOString();

          await prisma.emailJob.update({
            where: { id: jobId },
            data: {
              status: 'RATE_LIMITED',
              rateLimitWindow: windowStr,
              errorMessage: `Exceeded hourly limit of ${limitToUse} emails/hr. Rescheduled for ${nextHourFormatted}`,
            },
          });

          await sendSlackRateLimitNotification({
            userId,
            senderEmail,
            hourlyLimit: limitToUse,
            currentCount,
            rescheduledCount: 1,
            nextAvailableHour: nextHourFormatted,
          });

          await emailQueue.add(
            'send-email',
            { ...job.data },
            {
              delay: nextHourDelayMs,
              jobId: `email_job_${jobId}_rescheduled_${nextHourMs}`,
            }
          );

          jobCounter.inc({ status: 'RATE_LIMITED' });
          const durationSec = (Date.now() - startTime) / 1000;
          workerExecutionDurationHistogram.observe({ status: 'RATE_LIMITED', sender_email: senderEmail }, durationSec);

          return { status: 'RATE_LIMITED', nextAvailableHour: nextHourFormatted };
        }

        // 2. Update DB status to PROCESSING
        await prisma.emailJob.update({
          where: { id: jobId },
          data: { status: 'PROCESSING' },
        });

        // 3. Send Email via Ethereal SMTP
        try {
          const result = await sendEmailViaEthereal({
            senderEmail,
            recipient,
            subject,
            body,
            attachments,
          });

          const sentAtDate = new Date();

          const updatedJob = await prisma.emailJob.update({
            where: { id: jobId },
            data: {
              status: 'SENT',
              sentAt: sentAtDate,
              etherealPreviewUrl: result.previewUrl || null,
            },
          });

          // 4. Index in Elasticsearch
          await indexEmailDoc({
            id: updatedJob.id,
            scheduleId: updatedJob.scheduleId,
            recipient: updatedJob.recipient,
            subject: updatedJob.subject,
            body: updatedJob.body,
            senderEmail: updatedJob.senderEmail,
            status: 'SENT',
            scheduledAt: updatedJob.scheduledAt,
            sentAt: updatedJob.sentAt,
            etherealPreviewUrl: updatedJob.etherealPreviewUrl,
            createdAt: updatedJob.createdAt,
          });

          const durationSec = (Date.now() - startTime) / 1000;
          workerExecutionDurationHistogram.observe({ status: 'SENT', sender_email: senderEmail }, durationSec);
          jobCounter.inc({ status: 'SENT' });

          logger.info(`✅ Email successfully sent to ${recipient}`, { previewUrl: result.previewUrl, recipient });
          return { status: 'SENT', previewUrl: result.previewUrl };
        } catch (err: any) {
          const durationSec = (Date.now() - startTime) / 1000;
          workerExecutionDurationHistogram.observe({ status: 'FAILED', sender_email: senderEmail }, durationSec);
          jobCounter.inc({ status: 'FAILED' });

          logger.error(`❌ Error sending email to ${recipient}: ${err.message || err}`, { error: err.message || err });

          await prisma.emailJob.update({
            where: { id: jobId },
            data: {
              status: 'FAILED',
              errorMessage: err.message || 'SMTP sending failed',
            },
          });

          throw err;
        }
      });
    },
    {
      connection: redisConnectionOptions,
      concurrency: workerConcurrency,
    }
  );

  worker.on('failed', (job, err) => {
    logger.error(`❌ Worker Job ${job?.id} failed with error: ${err.message}`, { jobId: job?.id, error: err.message });
  });

  worker.on('completed', (job) => {
    logger.info(`🎉 Worker Job ${job.id} completed successfully`, { jobId: job.id });
  });

  logger.info(`👷 BullMQ Email Worker started with concurrency level: ${workerConcurrency}`);
  return worker;
}
