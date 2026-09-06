import React, { useState } from 'react';
import { User, SlackStatus } from '../types';
import {
  User as UserIcon,
  Slack,
  Activity,
  ShieldCheck,
  Bell,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  LogOut,
  UserCheck,
  Lock,
  Trash2,
} from 'lucide-react';
import { connectSlackWebhook, sendTestSlackAlert, updatePassword, deleteUserAccount } from '../api/client';

interface ProfileViewProps {
  user: User | null;
  slackStatus: SlackStatus;
  onRefreshSlackStatus: () => void;
  onLogout: () => void;
  onSwitchAccount: () => void;
}

export const ProfileView: React.FC<ProfileViewProps> = ({
  user,
  slackStatus,
  onRefreshSlackStatus,
  onLogout,
  onSwitchAccount,
}) => {
  const [webhookUrl, setWebhookUrl] = useState('');
  const [channel, setChannel] = useState('#email-alerts');
  
  // Password Updation Form State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passLoading, setPassLoading] = useState(false);

  const [loading, setLoading] = useState(false);
  const [testSending, setTestSending] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    if (newPassword.length < 6) {
      setMessage({ type: 'error', text: 'New password must be at least 6 characters long.' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setMessage({ type: 'error', text: 'New passwords do not match.' });
      return;
    }

    try {
      setPassLoading(true);
      await updatePassword(newPassword, currentPassword, user?.id);
      setPassLoading(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setMessage({ type: 'success', text: 'Password updated successfully!' });
    } catch (err: any) {
      setPassLoading(false);
      setMessage({ type: 'error', text: err.response?.data?.error || 'Failed to update password' });
    }
  };

  const handleDeleteAccount = async () => {
    if (!window.confirm('Are you sure you want to delete your account? All past scheduled emails and log data will be safely preserved under event logs with userId set to NULL.')) {
      return;
    }

    try {
      setLoading(true);
      await deleteUserAccount(user?.id);
      setLoading(false);
      onLogout();
    } catch (err: any) {
      setLoading(false);
      setMessage({ type: 'error', text: err.response?.data?.error || 'Failed to delete account' });
    }
  };

  const handleSaveWebhook = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    if (!webhookUrl.trim()) {
      setMessage({ type: 'error', text: 'Please enter a valid Slack Webhook URL.' });
      return;
    }

    try {
      setLoading(true);
      await connectSlackWebhook(webhookUrl, channel);
      setLoading(false);
      setMessage({ type: 'success', text: 'Slack Webhook connected successfully!' });
      onRefreshSlackStatus();
    } catch (err: any) {
      setLoading(false);
      setMessage({ type: 'error', text: err.response?.data?.error || 'Failed to connect Slack' });
    }
  };

  const handleSendTestAlert = async () => {
    setMessage(null);
    try {
      setTestSending(true);
      await sendTestSlackAlert(user?.email || 'oliver.brown@domain.io');
      setTestSending(false);
      setMessage({ type: 'success', text: 'Live Slack Rate-Limit notification dispatched! Check your Slack channel.' });
    } catch (err: any) {
      setTestSending(false);
      setMessage({ type: 'error', text: err.response?.data?.error || 'Failed to send Slack alert' });
    }
  };

  return (
    <div className="flex-1 bg-white flex flex-col h-full overflow-y-auto p-8 max-w-5xl mx-auto w-full space-y-8 font-sans">
      {/* Title */}
      <div>
        <h2 className="text-xl font-bold text-slate-900 tracking-tight">Profile & Security Settings</h2>
        <p className="text-xs text-slate-500 mt-1">
          Manage your account credentials, password security, Slack rate-limit alert integrations, and BullMQ queue engine controls.
        </p>
      </div>

      {message && (
        <div
          className={`p-4 rounded-2xl border text-xs flex items-center space-x-2.5 ${
            message.type === 'success'
              ? 'bg-[#E6F4EA] border-[#A7F3D0] text-[#059669]'
              : 'bg-rose-50 border-rose-200 text-rose-700'
          }`}
        >
          {message.type === 'success' ? (
            <CheckCircle2 className="h-4 w-4 text-[#059669] shrink-0" />
          ) : (
            <AlertCircle className="h-4 w-4 text-rose-500 shrink-0" />
          )}
          <span className="font-semibold">{message.text}</span>
        </div>
      )}

      {/* Grid Layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Card 1: User Profile */}
        <div className="bg-[#F9FAFB] border border-slate-200 rounded-2xl p-6 space-y-5">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <div className="flex items-center space-x-2">
              <UserIcon className="h-4 w-4 text-[#059669]" />
              <h3 className="text-sm font-bold text-slate-900">Account Profile</h3>
            </div>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#E6F4EA] text-[#059669] border border-[#A7F3D0]">
              <ShieldCheck className="h-3 w-3" /> Active Session
            </span>
          </div>

          <div className="flex items-center space-x-4">
            <img
              src={user?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}
              alt={user?.name || 'Oliver Brown'}
              className="h-14 w-14 rounded-full object-cover ring-2 ring-slate-200 shrink-0"
            />
            <div>
              <h4 className="text-sm font-bold text-slate-900">{user?.name || 'Oliver Brown'}</h4>
              <p className="text-xs text-slate-500">{user?.email || 'oliver.brown@domain.io'}</p>
              <p className="text-[11px] text-slate-400 mt-1">Authorized Sender Account</p>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-200 flex items-center justify-between">
            <button
              onClick={onSwitchAccount}
              className="text-xs font-semibold text-[#059669] hover:underline flex items-center space-x-1"
            >
              <UserCheck className="h-3.5 w-3.5" />
              <span>Switch Account</span>
            </button>

            <button
              onClick={onLogout}
              className="px-4 py-1.5 rounded-full border border-rose-200 text-rose-600 hover:bg-rose-600 hover:text-white transition-all text-xs font-semibold flex items-center space-x-1.5 shadow-2xs"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>

        {/* Card 2: Password Updation Form */}
        <div className="bg-[#F9FAFB] border border-slate-200 rounded-2xl p-6 space-y-4">
          <div className="flex items-center space-x-2 border-b border-slate-200 pb-3">
            <Lock className="h-4 w-4 text-[#059669]" />
            <h3 className="text-sm font-bold text-slate-900">Security & Password Updation</h3>
          </div>

          <form onSubmit={handlePasswordUpdate} className="space-y-3 text-xs">
            <div>
              <label className="block text-slate-700 font-bold mb-1">Current Password (if set)</label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-[#10B981]"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1">New Password</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-[#10B981]"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1">Confirm New Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-[#10B981]"
              />
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                disabled={passLoading}
                className="border border-[#10B981] text-[#059669] hover:bg-[#10B981] hover:text-white rounded-full px-4 py-1.5 font-semibold text-xs transition-all shadow-xs disabled:opacity-50"
              >
                {passLoading ? 'Updating...' : 'Update Password'}
              </button>
            </div>
          </form>
        </div>

        {/* Card 3: BullMQ Queue Monitor & Infrastructure */}
        <div className="bg-[#F9FAFB] border border-slate-200 rounded-2xl p-6 space-y-5">
          <div className="flex items-center space-x-2 border-b border-slate-200 pb-3">
            <Activity className="h-4 w-4 text-[#059669]" />
            <h3 className="text-sm font-bold text-slate-900">BullMQ & Infrastructure</h3>
          </div>

          <div className="space-y-3 text-xs">
            <div className="flex items-center justify-between p-2.5 bg-white rounded-xl border border-slate-200">
              <span className="text-slate-600 font-medium">Redis Delayed Job Queue</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                Connected
              </span>
            </div>

            <div className="flex items-center justify-between p-2.5 bg-white rounded-xl border border-slate-200">
              <span className="text-slate-600 font-medium">Elasticsearch Index</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                Active (emails_index)
              </span>
            </div>

            <div className="flex items-center justify-between p-2.5 bg-white rounded-xl border border-slate-200">
              <span className="text-slate-600 font-medium">Worker Pool Concurrency</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                5 Parallel Workers
              </span>
            </div>
          </div>

          <a
            href="http://localhost:4000/admin/queues"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full border-2 border-[#10B981] text-[#059669] hover:bg-[#10B981] hover:text-white rounded-full py-2 px-4 font-semibold text-xs transition-all shadow-xs flex items-center justify-center space-x-1.5"
          >
            <span>Open BullMQ Visual Dashboard</span>
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>

        {/* Card 4: Slack OAuth & Alert Integration */}
        <div className="bg-[#F9FAFB] border border-slate-200 rounded-2xl p-6 space-y-5">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <div className="flex items-center space-x-2">
              <Slack className="h-4 w-4 text-[#059669]" />
              <h3 className="text-sm font-bold text-slate-900">Slack OAuth Rate Limit Alerts</h3>
            </div>
            <span
              className={`px-3 py-1 rounded-full text-xs font-bold ${
                slackStatus.connected
                  ? 'bg-[#E6F4EA] text-[#059669] border border-[#A7F3D0]'
                  : 'bg-amber-50 text-amber-700 border border-amber-200'
              }`}
            >
              {slackStatus.connected ? 'Slack Alerts Active' : 'Disconnected'}
            </span>
          </div>

          <div className="space-y-4 text-xs">
            <div className="space-y-2">
              <label className="block text-slate-800 font-bold">Option 1: Official Slack Authorize Flow</label>
              <a
                href="http://localhost:4000/api/slack/connect-url"
                className="w-full py-2 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold flex items-center justify-center space-x-2 transition-all shadow-xs"
              >
                <Slack className="h-4 w-4 text-emerald-400" />
                <span>Connect via Slack OAuth</span>
              </a>
            </div>

            <form onSubmit={handleSaveWebhook} className="space-y-2">
              <label className="block text-slate-800 font-bold">Option 2: Enter Slack Webhook URL</label>
              <input
                type="url"
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
                placeholder="https://hooks.slack.com/services/..."
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-emerald-500"
              />
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  value={channel}
                  onChange={(e) => setChannel(e.target.value)}
                  placeholder="#email-alerts"
                  className="w-1/2 bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-emerald-500"
                />
                <button
                  type="submit"
                  disabled={loading}
                  className="w-1/2 py-1.5 rounded-xl font-semibold bg-[#10B981] hover:bg-[#059669] text-white transition-all disabled:opacity-50"
                >
                  {loading ? 'Saving...' : 'Save Webhook'}
                </button>
              </div>
            </form>

            {slackStatus.connected && (
              <div className="pt-2 border-t border-slate-200 flex justify-end">
                <button
                  type="button"
                  onClick={handleSendTestAlert}
                  disabled={testSending}
                  className="border border-[#10B981] text-[#059669] hover:bg-[#10B981] hover:text-white rounded-full px-4 py-1.5 text-xs font-semibold transition-all shadow-xs flex items-center space-x-1.5"
                >
                  <Bell className="h-3.5 w-3.5" />
                  <span>{testSending ? 'Dispatching...' : 'Test Slack Alert'}</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Card 5: Account Deletion with Soft-Unlink Data Preservation */}
        <div className="bg-rose-50/50 border border-rose-200 rounded-2xl p-6 space-y-3 md:col-span-2">
          <div className="flex items-center justify-between border-b border-rose-200 pb-2">
            <div className="flex items-center space-x-2">
              <Trash2 className="h-4 w-4 text-rose-600" />
              <h3 className="text-sm font-bold text-rose-900">Delete Account & Data Preservation Guarantee</h3>
            </div>
          </div>
          <p className="text-xs text-slate-600">
            If you delete your account, your user account record will be removed. However, to prevent data tampering and preserve historical event logs, all past email schedule records and audit logs will remain safely stored with backup details (<span className="font-mono text-slate-800">{user?.email}</span>) while setting <span className="font-mono text-slate-800">userId = NULL</span>.
          </p>
          <div className="flex justify-end pt-2">
            <button
              onClick={handleDeleteAccount}
              className="bg-rose-600 hover:bg-rose-700 text-white rounded-full px-5 py-2 text-xs font-semibold transition-all shadow-xs"
            >
              Delete My Account (Preserve Event Logs)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
