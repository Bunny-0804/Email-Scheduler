export interface EmailAttachment {
  filename: string;
  contentType?: string;
  size?: number;
  data: string; // base64 payload
}

export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  googleId?: string;
}

export interface EmailJob {
  id: string;
  scheduleId: string;
  recipient: string;
  subject: string;
  body: string;
  attachments?: EmailAttachment[] | null;
  senderEmail: string;
  status: 'SCHEDULED' | 'PROCESSING' | 'SENT' | 'FAILED' | 'RATE_LIMITED';
  scheduledAt: string;
  sentAt?: string | null;
  etherealPreviewUrl?: string | null;
  errorMessage?: string | null;
  rateLimitWindow?: string | null;
  createdAt: string;
}

export interface SlackStatus {
  connected: boolean;
  integration?: {
    teamName?: string;
    channel?: string;
    hasWebhook: boolean;
  } | null;
}

export interface SchedulePayload {
  userId?: string;
  senderEmail: string;
  subject: string;
  body: string;
  recipients: string[];
  startTime: string;
  delayBetweenSec: number;
  hourlyLimit: number;
  attachments?: EmailAttachment[];
}

export interface DashboardStats {
  scheduled: number;
  sent: number;
  rateLimited: number;
  failed: number;
}
