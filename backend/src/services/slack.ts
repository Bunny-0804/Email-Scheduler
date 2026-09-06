import axios from 'axios';
import { prisma } from './db';

export async function sendSlackRateLimitNotification(params: {
  userId: string;
  senderEmail: string;
  hourlyLimit: number;
  currentCount: number;
  rescheduledCount: number;
  nextAvailableHour: string;
}) {
  try {
    const slackIntegration = await prisma.slackIntegration.findFirst({
      where: { userId: params.userId },
    });

    if (!slackIntegration) {
      console.log(`ℹ️ Slack not connected for user ${params.userId}. Skipping rate limit notification.`);
      return;
    }

    const payload = {
      text: `⚠️ Rate Limit Reached for ${params.senderEmail}`,
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: '⚠️ Email Sender Rate Limit Exceeded',
            emoji: true,
          },
        },
        {
          type: 'section',
          fields: [
            {
              type: 'mrkdwn',
              text: `*Sender:* \`${params.senderEmail}\``,
            },
            {
              type: 'mrkdwn',
              text: `*Hourly Limit:* \`${params.hourlyLimit} emails/hr\``,
            },
            {
              type: 'mrkdwn',
              text: `*Current Hour Count:* \`${params.currentCount}\``,
            },
            {
              type: 'mrkdwn',
              text: `*Rescheduled Jobs:* \`${params.rescheduledCount}\``,
            },
          ],
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `⏰ *Action Taken:* Excess emails have been automatically delayed and rescheduled to start in the next hourly window: *${params.nextAvailableHour}*. No jobs were lost!`,
          },
        },
        {
          type: 'context',
          elements: [
            {
              type: 'mrkdwn',
              text: '📧 ReachInbox Email Scheduler • Rate Limiting Safety System',
            },
          ],
        },
      ],
    };

    if (slackIntegration.webhookUrl) {
      await axios.post(slackIntegration.webhookUrl, payload);
      console.log(`💬 Slack Notification sent successfully via Webhook to user ${params.userId}`);
    } else if (slackIntegration.accessToken && slackIntegration.channel) {
      await axios.post(
        'https://slack.com/api/chat.postMessage',
        {
          channel: slackIntegration.channel,
          ...payload,
        },
        {
          headers: {
            Authorization: `Bearer ${slackIntegration.accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );
      console.log(`💬 Slack Notification sent successfully via OAuth API to channel ${slackIntegration.channel}`);
    }
  } catch (err: any) {
    console.error('❌ Failed to send Slack notification:', err.response?.data || err.message || err);
  }
}
