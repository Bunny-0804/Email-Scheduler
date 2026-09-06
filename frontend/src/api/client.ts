import axios from 'axios';
import { SchedulePayload, User, EmailJob, SlackStatus, DashboardStats } from '../types';

const API_BASE_URL = 'http://localhost:4000/api';

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export async function loginWithGoogle(credential?: string, mockUser?: any): Promise<{ token: string; user: User }> {
  const res = await api.post('/auth/google', { credential, mockUser });
  if (res.data.token) {
    localStorage.setItem('auth_token', res.data.token);
  }
  return res.data;
}

export async function registerWithEmail(name: string, email: string, password: string): Promise<{ token: string; user: User }> {
  const res = await api.post('/auth/register', { name, email, password });
  if (res.data.token) {
    localStorage.setItem('auth_token', res.data.token);
  }
  return res.data;
}

export async function loginWithEmail(email: string, password: string): Promise<{ token: string; user: User }> {
  const res = await api.post('/auth/login', { email, password });
  if (res.data.token) {
    localStorage.setItem('auth_token', res.data.token);
  }
  return res.data;
}

export async function updatePassword(newPassword: string, currentPassword?: string, userId?: string) {
  const token = localStorage.getItem('auth_token');
  const headers = token ? { Authorization: `Bearer ${token}` } : {};
  const res = await api.put('/auth/password', { newPassword, currentPassword, userId }, { headers });
  return res.data;
}

export async function deleteUserAccount(userId?: string) {
  const token = localStorage.getItem('auth_token');
  const headers = token ? { Authorization: `Bearer ${token}` } : {};
  const res = await api.delete('/auth/account', { data: { userId }, headers });
  localStorage.removeItem('auth_token');
  return res.data;
}

export async function getCurrentUser(): Promise<{ user: User }> {
  const token = localStorage.getItem('auth_token');
  const headers = token ? { Authorization: `Bearer ${token}` } : {};
  const res = await api.get('/auth/me', { headers });
  return res.data;
}

export async function scheduleEmails(payload: SchedulePayload) {
  const res = await api.post('/emails/schedule', payload);
  return res.data;
}

export async function parseLeadCsv(textContent: string): Promise<{ totalCount: number; emails: string[] }> {
  const res = await api.post('/emails/parse-csv', { textContent });
  return res.data;
}

export async function fetchScheduledEmails(): Promise<{ jobs: EmailJob[] }> {
  const res = await api.get('/emails/scheduled');
  return res.data;
}

export async function fetchSentEmails(): Promise<{ jobs: EmailJob[] }> {
  const res = await api.get('/emails/sent');
  return res.data;
}

export async function searchEmails(q: string, status: string = 'ALL'): Promise<{ source: string; jobs: EmailJob[] }> {
  const res = await api.get('/emails/search', { params: { q, status } });
  return res.data;
}

export async function fetchDashboardStats(): Promise<DashboardStats> {
  const res = await api.get('/emails/stats');
  return res.data;
}

export async function getSlackStatus(userId?: string): Promise<SlackStatus> {
  const res = await api.get('/slack/status', { params: { userId } });
  return res.data;
}

export async function connectSlackWebhook(webhookUrl: string, channel: string, userId?: string) {
  const res = await api.post('/slack/connect-webhook', { webhookUrl, channel, userId });
  return res.data;
}

export async function sendTestSlackAlert(senderEmail: string, userId?: string) {
  const res = await api.post('/slack/test-alert', { senderEmail, userId });
  return res.data;
}
