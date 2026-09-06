import { Router, Request, Response } from 'express';
import axios from 'axios';
import { prisma } from '../services/db';
import { env } from '../config/env';
import { sendSlackRateLimitNotification } from '../services/slack';

const router = Router();

// 1. Get Slack Authorization URL
router.get('/connect-url', async (req: Request, res: Response) => {
  const scope = 'incoming-webhook,chat:write,chat:write.public';
  const slackAuthUrl = `https://slack.com/oauth/v2/authorize?client_id=${env.SLACK_CLIENT_ID}&scope=${encodeURIComponent(
    scope
  )}&redirect_uri=${encodeURIComponent(env.SLACK_REDIRECT_URI)}`;

  return res.json({ url: slackAuthUrl });
});

// 2. Slack OAuth Callback Handler
router.get('/callback', async (req: Request, res: Response) => {
  try {
    const { code, state } = req.query;

    let userId: string = (state as string) || (req.query.userId as string) || '';
    if (!userId) {
      const defaultUser = await prisma.user.findFirst();
      userId = defaultUser?.id || 'demo-user-id';
    }

    if (!userId) {
      return res.status(400).send('User ID missing for Slack connection');
    }

    let webhookUrl: string | undefined;
    let accessToken: string | undefined;
    let teamName: string = 'ReachInbox Workspace';
    let channel: string = '#email-alerts';

    if (code && code !== 'MOCK_CODE') {
      try {
        const tokenRes = await axios.post(
          'https://slack.com/api/oauth.v2.access',
          new URLSearchParams({
            client_id: env.SLACK_CLIENT_ID,
            client_secret: env.SLACK_CLIENT_SECRET,
            code: code as string,
            redirect_uri: env.SLACK_REDIRECT_URI,
          }).toString(),
          { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
        );

        if (tokenRes.data && tokenRes.data.ok) {
          accessToken = tokenRes.data.access_token;
          webhookUrl = tokenRes.data.incoming_webhook?.url;
          channel = tokenRes.data.incoming_webhook?.channel || '#email-alerts';
          teamName = tokenRes.data.team?.name || 'Slack Workspace';
        }
      } catch (err) {
        console.warn('Slack OAuth exchange fallback to webhook mode:', err);
      }
    }

    // Save or update Slack integration for user
    const existing = await prisma.slackIntegration.findFirst({
      where: { userId },
    });

    if (existing) {
      await prisma.slackIntegration.update({
        where: { id: existing.id },
        data: {
          accessToken: accessToken || existing.accessToken,
          webhookUrl: webhookUrl || existing.webhookUrl,
          channel: channel || existing.channel,
          teamName,
        },
      });
    } else {
      await prisma.slackIntegration.create({
        data: {
          userId,
          accessToken,
          webhookUrl,
          channel,
          teamName,
        },
      });
    }

    return res.redirect('http://localhost:3000?slack_connected=true');
  } catch (err: any) {
    console.error('Slack OAuth Callback Error:', err);
    return res.status(500).send('Failed to complete Slack integration');
  }
});

// 3. Connect Direct Webhook or Mock Slack Channel (for instant demo setup)
router.post('/connect-webhook', async (req: Request, res: Response) => {
  try {
    const { userId, webhookUrl, channel } = req.body;

    let targetUserId = userId;
    if (!targetUserId) {
      const u = await prisma.user.findFirst();
      targetUserId = u?.id;
    }

    if (!targetUserId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    const existing = await prisma.slackIntegration.findFirst({
      where: { userId: targetUserId },
    });

    if (existing) {
      await prisma.slackIntegration.update({
        where: { id: existing.id },
        data: {
          webhookUrl: webhookUrl || existing.webhookUrl,
          channel: channel || '#email-scheduler-alerts',
          teamName: 'ReachInbox Workspace',
        },
      });
    } else {
      await prisma.slackIntegration.create({
        data: {
          userId: targetUserId,
          webhookUrl: webhookUrl || 'https://hooks.slack.com/services/MOCK/DEMO/WEBHOOK',
          channel: channel || '#email-scheduler-alerts',
          teamName: 'ReachInbox Workspace',
        },
      });
    }

    return res.json({ message: 'Slack connected successfully' });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to connect Slack webhook' });
  }
});

// 4. Get Current Slack Connection Status
router.get('/status', async (req: Request, res: Response) => {
  try {
    const userId = req.query.userId as string;
    let integration;

    if (userId) {
      integration = await prisma.slackIntegration.findFirst({ where: { userId } });
    } else {
      integration = await prisma.slackIntegration.findFirst();
    }

    return res.json({
      connected: !!integration,
      integration: integration
        ? {
            teamName: integration.teamName,
            channel: integration.channel,
            hasWebhook: !!integration.webhookUrl,
          }
        : null,
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to fetch Slack status' });
  }
});

// 5. Test Live Slack Alert Trigger
router.post('/test-alert', async (req: Request, res: Response) => {
  try {
    const { userId, senderEmail } = req.body;
    let targetUserId = userId;
    if (!targetUserId) {
      const u = await prisma.user.findFirst();
      targetUserId = u?.id;
    }

    await sendSlackRateLimitNotification({
      userId: targetUserId,
      senderEmail: senderEmail || 'marketing@reachinbox.ai',
      hourlyLimit: 50,
      currentCount: 51,
      rescheduledCount: 15,
      nextAvailableHour: new Date(Date.now() + 3600000).toISOString(),
    });

    return res.json({ message: 'Test Slack alert dispatched successfully' });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to send test alert' });
  }
});

export default router;
