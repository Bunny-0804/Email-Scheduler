import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../services/db';
import { enqueueEmailBatch } from '../queue/emailQueue';
import { indexEmailDoc, searchEmailsInES } from '../services/elasticsearch';

const router = Router();

const attachmentSchema = z.object({
  filename: z.string(),
  contentType: z.string().optional(),
  size: z.number().optional(),
  data: z.string(), // base64 string
});

const scheduleSchema = z.object({
  userId: z.string().optional(),
  senderEmail: z.string().email(),
  subject: z.string().min(1, 'Subject is required'),
  body: z.string().min(1, 'Body is required'),
  recipients: z.array(z.string().email()).min(1, 'At least one valid recipient is required'),
  startTime: z.string().datetime().or(z.string()),
  delayBetweenSec: z.number().min(0).default(2),
  hourlyLimit: z.number().min(1).default(100),
  attachments: z.array(attachmentSchema).optional(),
});

// 1. Schedule New Emails API
router.post('/schedule', async (req: Request, res: Response) => {
  try {
    const parsed = scheduleSchema.parse(req.body);

    let userId = parsed.userId;
    let currentUser;

    if (userId) {
      currentUser = await prisma.user.findUnique({ where: { id: userId } });
    }

    if (!currentUser) {
      currentUser = await prisma.user.findFirst();
    }

    if (!currentUser) {
      currentUser = await prisma.user.create({
        data: {
          email: parsed.senderEmail || 'oliver.brown@domain.io',
          name: 'Oliver Brown',
        },
      });
    }

    userId = currentUser.id;

    // ENFORCE SINGLE SENDER ACCOUNT RULE: User can ONLY send from their account email
    const allowedSenderEmail = currentUser.email;

    const startDateTime = new Date(parsed.startTime);

    // Create EmailSchedule record in Postgres DB
    const schedule = await prisma.emailSchedule.create({
      data: {
        userId,
        userEmailBackup: currentUser.email,
        userNameBackup: currentUser.name,
        senderEmail: allowedSenderEmail,
        subject: parsed.subject,
        body: parsed.body,
        attachments: parsed.attachments ? (parsed.attachments as any) : undefined,
        totalRecipients: parsed.recipients.length,
        startTime: startDateTime,
        delayBetweenSec: parsed.delayBetweenSec,
        hourlyLimit: parsed.hourlyLimit,
        status: 'SCHEDULED',
      },
    });

    // Create individual EmailJob records in DB
    const jobData = parsed.recipients.map((recipient) => ({
      scheduleId: schedule.id,
      recipient,
      subject: parsed.subject,
      body: parsed.body,
      attachments: parsed.attachments ? (parsed.attachments as any) : undefined,
      senderEmail: allowedSenderEmail,
      scheduledAt: startDateTime,
      status: 'SCHEDULED',
    }));

    await prisma.emailJob.createMany({
      data: jobData,
    });

    const createdJobs = await prisma.emailJob.findMany({
      where: { scheduleId: schedule.id },
      select: { id: true, recipient: true },
    });

    // Enqueue delayed jobs in BullMQ
    await enqueueEmailBatch({
      scheduleId: schedule.id,
      userId,
      senderEmail: allowedSenderEmail,
      subject: parsed.subject,
      body: parsed.body,
      attachments: parsed.attachments,
      startTime: startDateTime,
      delayBetweenSec: parsed.delayBetweenSec,
      hourlyLimit: parsed.hourlyLimit,
      jobs: createdJobs,
    });

    // Index created jobs in Elasticsearch
    for (const job of createdJobs) {
      await indexEmailDoc({
        id: job.id,
        scheduleId: schedule.id,
        recipient: job.recipient,
        subject: parsed.subject,
        body: parsed.body,
        senderEmail: allowedSenderEmail,
        status: 'SCHEDULED',
        scheduledAt: startDateTime,
        createdAt: new Date(),
      });
    }

    return res.status(201).json({
      message: 'Emails successfully scheduled',
      scheduleId: schedule.id,
      senderEmail: allowedSenderEmail,
      totalEnqueued: createdJobs.length,
      startTime: startDateTime.toISOString(),
    });
  } catch (err: any) {
    console.error('Schedule Error:', err);
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation Error', details: err.errors });
    }
    return res.status(500).json({ error: err.message || 'Failed to schedule emails' });
  }
});

// 2. CSV / Lead List Text Parser API
router.post('/parse-csv', (req: Request, res: Response) => {
  try {
    const { textContent } = req.body;
    if (!textContent || typeof textContent !== 'string') {
      return res.status(400).json({ error: 'textContent string is required' });
    }

    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    const matches = textContent.match(emailRegex) || [];
    const uniqueEmails = Array.from(new Set(matches.map((e) => e.toLowerCase())));

    return res.json({
      totalCount: uniqueEmails.length,
      emails: uniqueEmails,
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to parse lead list' });
  }
});

// 3. Get Scheduled Emails API
router.get('/scheduled', async (req: Request, res: Response) => {
  try {
    const jobs = await prisma.emailJob.findMany({
      where: {
        status: { in: ['SCHEDULED', 'RATE_LIMITED', 'PROCESSING'] },
      },
      orderBy: { scheduledAt: 'asc' },
      take: 200,
    });

    return res.json({ jobs });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to fetch scheduled emails' });
  }
});

// 4. Get Sent Emails API
router.get('/sent', async (req: Request, res: Response) => {
  try {
    const jobs = await prisma.emailJob.findMany({
      where: {
        status: { in: ['SENT', 'FAILED'] },
      },
      orderBy: { sentAt: 'desc' },
      take: 200,
    });

    return res.json({ jobs });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to fetch sent emails' });
  }
});

// 5. Elasticsearch Search Endpoint API
router.get('/search', async (req: Request, res: Response) => {
  try {
    const q = (req.query.q as string) || '';
    const status = (req.query.status as string) || 'ALL';

    const esResults = await searchEmailsInES(q, status);

    if (esResults !== null) {
      return res.json({ source: 'elasticsearch', jobs: esResults });
    }

    const whereCondition: any = {};
    if (status !== 'ALL') {
      whereCondition.status = status;
    }
    if (q) {
      whereCondition.OR = [
        { subject: { contains: q, mode: 'insensitive' } },
        { body: { contains: q, mode: 'insensitive' } },
        { recipient: { contains: q, mode: 'insensitive' } },
        { senderEmail: { contains: q, mode: 'insensitive' } },
      ];
    }

    const dbJobs = await prisma.emailJob.findMany({
      where: whereCondition,
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    return res.json({ source: 'database_fallback', jobs: dbJobs });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Search failed' });
  }
});

// 6. Get Dashboard Stats API
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const [scheduledCount, sentCount, rateLimitedCount, failedCount] = await Promise.all([
      prisma.emailJob.count({ where: { status: 'SCHEDULED' } }),
      prisma.emailJob.count({ where: { status: 'SENT' } }),
      prisma.emailJob.count({ where: { status: 'RATE_LIMITED' } }),
      prisma.emailJob.count({ where: { status: 'FAILED' } }),
    ]);

    return res.json({
      scheduled: scheduledCount,
      sent: sentCount,
      rateLimited: rateLimitedCount,
      failed: failedCount,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to fetch stats' });
  }
});

export default router;
