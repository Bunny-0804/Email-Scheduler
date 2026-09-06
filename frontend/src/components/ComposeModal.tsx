import React, { useState } from 'react';
import { X, Upload, Users, Clock, Shield, Sliders, CheckCircle2, AlertCircle, Sparkles } from 'lucide-react';
import { parseLeadCsv, scheduleEmails } from '../api/client';

interface ComposeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const ComposeModal: React.FC<ComposeModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [senderEmail, setSenderEmail] = useState('outreach@reachinbox.ai');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [leadText, setLeadText] = useState('');
  const [parsedRecipients, setParsedRecipients] = useState<string[]>([]);
  const [startTime, setStartTime] = useState(() => {
    const now = new Date();
    now.setMinutes(now.getMinutes() + 1); // default 1 min in future
    return now.toISOString().slice(0, 16);
  });
  const [delayBetweenSec, setDelayBetweenSec] = useState(2);
  const [hourlyLimit, setHourlyLimit] = useState(50);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleLeadTextChange = async (val: string) => {
    setLeadText(val);
    if (!val.trim()) {
      setParsedRecipients([]);
      return;
    }
    try {
      const res = await parseLeadCsv(val);
      setParsedRecipients(res.emails);
    } catch (e) {
      // client-side regex fallback
      const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
      const matches = val.match(emailRegex) || [];
      setParsedRecipients(Array.from(new Set(matches.map((e) => e.toLowerCase()))));
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        handleLeadTextChange(content);
      }
    };
    reader.readAsText(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (parsedRecipients.length === 0) {
      setError('Please upload a CSV or paste at least one valid recipient email address.');
      return;
    }
    if (!subject.trim()) {
      setError('Subject line is required.');
      return;
    }
    if (!body.trim()) {
      setError('Email body is required.');
      return;
    }

    try {
      setLoading(true);
      await scheduleEmails({
        senderEmail,
        subject,
        body,
        recipients: parsedRecipients,
        startTime: new Date(startTime).toISOString(),
        delayBetweenSec: Number(delayBetweenSec),
        hourlyLimit: Number(hourlyLimit),
      });

      setLoading(false);
      onSuccess();
      onClose();
    } catch (err: any) {
      setLoading(false);
      setError(err.response?.data?.error || err.message || 'Failed to schedule emails');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="bg-[#131926] border border-slate-700/80 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/50">
          <div className="flex items-center space-x-2">
            <Sparkles className="h-5 w-5 text-indigo-400" />
            <h2 className="text-lg font-bold text-white">Compose & Schedule Campaign</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Content Scroll Area */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5 flex-1 text-xs">
          {error && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 flex items-start space-x-2">
              <AlertCircle className="h-4 w-4 text-rose-400 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Sender Email Select */}
          <div>
            <label className="block text-slate-300 font-semibold mb-1.5">From Sender Email Account</label>
            <select
              value={senderEmail}
              onChange={(e) => setSenderEmail(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-slate-200 focus:outline-none focus:border-indigo-500 transition-all"
            >
              <option value="outreach@reachinbox.ai">outreach@reachinbox.ai (Default Sender)</option>
              <option value="sales@reachinbox.ai">sales@reachinbox.ai (Sales Account)</option>
              <option value="growth@reachinbox.ai">growth@reachinbox.ai (Growth Account)</option>
              <option value="founder@reachinbox.ai">founder@reachinbox.ai (Executive Account)</option>
            </select>
          </div>

          {/* Lead Upload & Parser */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-slate-300 font-semibold">Recipient Leads (CSV or Paste List)</label>
              <span className="text-[11px] font-semibold text-indigo-400 flex items-center gap-1">
                <Users className="h-3.5 w-3.5" />
                {parsedRecipients.length} Recipient{parsedRecipients.length === 1 ? '' : 's'} Detected
              </span>
            </div>
            
            <div className="relative">
              <textarea
                value={leadText}
                onChange={(e) => handleLeadTextChange(e.target.value)}
                placeholder="Paste emails separated by commas, newlines, or upload a CSV file below..."
                rows={3}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-all font-mono"
              />
              <label className="absolute bottom-2.5 right-2.5 cursor-pointer bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-300 px-3 py-1 rounded-lg flex items-center space-x-1.5 transition-all text-[11px]">
                <Upload className="h-3 w-3 text-indigo-400" />
                <span>Upload CSV</span>
                <input type="file" accept=".csv,.txt" onChange={handleFileUpload} className="hidden" />
              </label>
            </div>
          </div>

          {/* Subject Line */}
          <div>
            <label className="block text-slate-300 font-semibold mb-1.5">Email Subject</label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="e.g. Introducing Automated Cold Email Pipeline"
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-all"
            />
          </div>

          {/* Body Content */}
          <div>
            <label className="block text-slate-300 font-semibold mb-1.5">Email Body (Plain Text or HTML)</label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Hi {{name}},&#10;&#10;We are launching a persistent BullMQ email scheduler with Ethereal SMTP..."
              rows={4}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-all"
            />
          </div>

          {/* Rate Limiting & Scheduling Controls Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-4 rounded-xl bg-slate-900/60 border border-slate-800">
            <div>
              <label className="block text-slate-400 font-medium mb-1 flex items-center gap-1">
                <Clock className="h-3.5 w-3.5 text-indigo-400" />
                <span>Start Time</span>
              </label>
              <input
                type="datetime-local"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-slate-400 font-medium mb-1 flex items-center gap-1">
                <Sliders className="h-3.5 w-3.5 text-emerald-400" />
                <span>Delay Between (sec)</span>
              </label>
              <input
                type="number"
                min="0"
                max="60"
                value={delayBetweenSec}
                onChange={(e) => setDelayBetweenSec(Number(e.target.value))}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-slate-400 font-medium mb-1 flex items-center gap-1">
                <Shield className="h-3.5 w-3.5 text-amber-400" />
                <span>Hourly Limit (emails/hr)</span>
              </label>
              <input
                type="number"
                min="1"
                max="10000"
                value={hourlyLimit}
                onChange={(e) => setHourlyLimit(Number(e.target.value))}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Modal Actions */}
          <div className="pt-3 border-t border-slate-800 flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-slate-300 hover:bg-slate-800 transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 rounded-xl font-semibold bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white shadow-lg shadow-indigo-600/30 transition-all flex items-center space-x-2 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  <span>Enqueueing Delayed Jobs...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Schedule Email Campaign</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
