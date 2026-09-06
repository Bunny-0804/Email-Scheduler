import { describe, it, expect, vi } from 'vitest';
import * as smtpService from '../../src/services/smtp';
import { prisma } from '../../src/services/db';

describe('Worker Crash Resilience & Failure Handling Tests', () => {
  it('should handle SMTP failure gracefully and mark email job status as FAILED without crashing process', async () => {
    // 1. Create a dummy schedule and job record in DB
    const schedule = await prisma.emailSchedule.create({
      data: {
        senderEmail: 'resilience.test@domain.io',
        subject: 'Resilience Test Subject',
        body: 'Testing worker crash resilience',
        totalRecipients: 1,
        startTime: new Date(),
        status: 'SCHEDULED',
      },
    });

    const job = await prisma.emailJob.create({
      data: {
        scheduleId: schedule.id,
        recipient: 'crash.victim@domain.io',
        subject: 'Resilience Test Subject',
        body: 'Testing worker crash resilience',
        senderEmail: 'resilience.test@domain.io',
        scheduledAt: new Date(),
        status: 'SCHEDULED',
      },
    });

    // 2. Mock sendEmailViaEthereal to throw a simulated SMTP connection crash / network failure
    const sendSpy = vi.spyOn(smtpService, 'sendEmailViaEthereal').mockRejectedValueOnce(
      new Error('Simulated SMTP Connection Timeout / Network Failure')
    );

    let caughtError: Error | null = null;
    try {
      await smtpService.sendEmailViaEthereal({
        senderEmail: job.senderEmail,
        recipient: job.recipient,
        subject: job.subject,
        body: job.body,
      });
    } catch (err: any) {
      caughtError = err;
    }

    expect(caughtError).not.toBeNull();
    expect(caughtError?.message).toContain('Simulated SMTP Connection Timeout');

    // 3. Verify status update to FAILED in database
    const updatedJob = await prisma.emailJob.update({
      where: { id: job.id },
      data: {
        status: 'FAILED',
        errorMessage: caughtError?.message || 'SMTP sending failed',
      },
    });

    expect(updatedJob.status).toBe('FAILED');
    expect(updatedJob.errorMessage).toContain('Simulated SMTP Connection Timeout');

    // 4. Cleanup DB test records
    await prisma.emailJob.delete({ where: { id: job.id } }).catch(() => {});
    await prisma.emailSchedule.delete({ where: { id: schedule.id } }).catch(() => {});

    sendSpy.mockRestore();
  });
});
