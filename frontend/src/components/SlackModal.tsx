import React, { useState } from 'react';
import { X, Slack, Bell, CheckCircle2, AlertCircle } from 'lucide-react';
import { SlackStatus } from '../types';
import { connectSlackWebhook, sendTestSlackAlert } from '../api/client';

interface SlackModalProps {
  isOpen: boolean;
  slackStatus: SlackStatus;
  onClose: () => void;
  onRefreshStatus: () => void;
}

export const SlackModal: React.FC<SlackModalProps> = ({
  isOpen,
  slackStatus,
  onClose,
  onRefreshStatus,
}) => {
  const [webhookUrl, setWebhookUrl] = useState('');
  const [channel, setChannel] = useState('#email-alerts');
  const [loading, setLoading] = useState(false);
  const [testSending, setTestSending] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  if (!isOpen) return null;

  const handleSaveWebhook = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    if (!webhookUrl.trim()) {
      setMessage({ type: 'error', text: 'Please provide a valid Slack Webhook URL.' });
      return;
    }

    try {
      setLoading(true);
      await connectSlackWebhook(webhookUrl, channel);
      setLoading(false);
      setMessage({ type: 'success', text: 'Slack Webhook connected successfully!' });
      onRefreshStatus();
    } catch (err: any) {
      setLoading(false);
      setMessage({ type: 'error', text: err.response?.data?.error || 'Failed to connect Slack' });
    }
  };

  const handleSendTestAlert = async () => {
    setMessage(null);
    try {
      setTestSending(true);
      await sendTestSlackAlert('outreach@reachinbox.ai');
      setTestSending(false);
      setMessage({ type: 'success', text: 'Live Slack Rate Limit alert dispatched successfully! Check your channel.' });
    } catch (err: any) {
      setTestSending(false);
      setMessage({ type: 'error', text: err.response?.data?.error || 'Failed to send Slack test alert' });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="bg-[#131926] border border-slate-700/80 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/50">
          <div className="flex items-center space-x-2">
            <Slack className="h-5 w-5 text-emerald-400" />
            <h2 className="text-base font-bold text-white">Slack OAuth & Alert Integration</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 text-xs">
          {message && (
            <div
              className={`p-3 rounded-xl border flex items-start space-x-2 ${
                message.type === 'success'
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                  : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
              }`}
            >
              {message.type === 'success' ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-400 mt-0.5 shrink-0" />
              ) : (
                <AlertCircle className="h-4 w-4 text-rose-400 mt-0.5 shrink-0" />
              )}
              <span>{message.text}</span>
            </div>
          )}

          {/* Current Status Pill */}
          <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
            <div>
              <span className="text-slate-400 font-medium block">Connection Status</span>
              <span className="text-slate-200 font-semibold">
                {slackStatus.connected ? `Connected (${slackStatus.integration?.channel || '#email-alerts'})` : 'Not Connected'}
              </span>
            </div>
            <span
              className={`px-2.5 py-1 rounded-full text-[11px] font-bold border ${
                slackStatus.connected
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                  : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
              }`}
            >
              {slackStatus.connected ? 'ACTIVE' : 'DISCONNECTED'}
            </span>
          </div>

          {/* OAuth Redirect Flow Button */}
          <div>
            <label className="block text-slate-300 font-semibold mb-1.5">Option A: Official Slack OAuth 2.0 Flow</label>
            <a
              href="http://localhost:4000/api/slack/connect-url"
              className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-medium flex items-center justify-center space-x-2 border border-slate-700 transition-all text-xs shadow-sm"
            >
              <Slack className="h-4 w-4 text-emerald-400" />
              <span>Connect via Slack Authorize OAuth</span>
            </a>
          </div>

          <div className="relative flex items-center py-1">
            <div className="flex-grow border-t border-slate-800"></div>
            <span className="flex-shrink mx-3 text-[10px] text-slate-500 font-semibold uppercase">OR</span>
            <div className="flex-grow border-t border-slate-800"></div>
          </div>

          {/* Incoming Webhook Form */}
          <form onSubmit={handleSaveWebhook} className="space-y-3">
            <label className="block text-slate-300 font-semibold">Option B: Enter Slack Webhook URL</label>
            <input
              type="url"
              value={webhookUrl}
              onChange={(e) => setWebhookUrl(e.target.value)}
              placeholder="https://hooks.slack.com/services/T.../B.../..."
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500"
            />
            <div className="flex items-center space-x-2">
              <input
                type="text"
                value={channel}
                onChange={(e) => setChannel(e.target.value)}
                placeholder="#email-alerts"
                className="w-1/2 bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500"
              />
              <button
                type="submit"
                disabled={loading}
                className="w-1/2 py-2 rounded-xl font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition-all disabled:opacity-50"
              >
                {loading ? 'Saving...' : 'Save Webhook'}
              </button>
            </div>
          </form>

          {/* Test Live Slack Notification Dispatcher */}
          {slackStatus.connected && (
            <div className="pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={handleSendTestAlert}
                disabled={testSending}
                className="w-full py-2.5 rounded-xl font-semibold bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 transition-all flex items-center justify-center space-x-2"
              >
                <Bell className="h-4 w-4" />
                <span>{testSending ? 'Sending Alert...' : 'Dispatch Live Slack Rate-Limit Alert'}</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
