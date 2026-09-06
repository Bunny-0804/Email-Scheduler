import React from 'react';
import { EmailJob } from '../types';
import { Send, Search, ExternalLink, RefreshCw, AlertTriangle, CheckCircle2, Inbox } from 'lucide-react';

interface SentTableProps {
  jobs: EmailJob[];
  loading: boolean;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onRefresh: () => void;
  onViewEthereal: (url: string) => void;
}

export const SentTable: React.FC<SentTableProps> = ({
  jobs,
  loading,
  searchQuery,
  onSearchChange,
  onRefresh,
  onViewEthereal,
}) => {
  return (
    <div className="glass-panel rounded-2xl border border-slate-800 p-6">
      {/* Table Header & Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
        <div>
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Send className="h-5 w-5 text-emerald-400" />
            <span>Sent Emails Log</span>
          </h3>
          <p className="text-xs text-slate-400">SMTP delivery audit trail & live Ethereal preview links</p>
        </div>

        <div className="flex items-center space-x-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search via Elasticsearch..."
              className="w-full bg-slate-900 border border-slate-700/80 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-all"
            />
          </div>
          <button
            onClick={onRefresh}
            className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-all border border-slate-700/50"
            title="Refresh Log"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Table Content */}
      {loading ? (
        <div className="py-16 text-center text-slate-400 flex flex-col items-center">
          <div className="h-8 w-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mb-3"></div>
          <p className="text-xs">Searching Elasticsearch logs...</p>
        </div>
      ) : jobs.length === 0 ? (
        <div className="py-16 text-center border-2 border-dashed border-slate-800 rounded-xl bg-slate-900/30">
          <Inbox className="h-10 w-10 text-slate-600 mx-auto mb-3" />
          <h4 className="text-sm font-semibold text-slate-300">No Sent Emails Recorded</h4>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
            {searchQuery
              ? `No matching sent emails found for "${searchQuery}".`
              : 'Emails will appear here automatically once BullMQ worker delivers them via Ethereal SMTP.'}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-900/80 text-slate-400 border-b border-slate-800 font-semibold uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3">Recipient Lead</th>
                <th className="px-4 py-3">Subject</th>
                <th className="px-4 py-3">Sender Account</th>
                <th className="px-4 py-3">Delivery Time</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Ethereal Preview</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {jobs.map((job) => {
                const isSent = job.status === 'SENT';

                return (
                  <tr key={job.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="px-4 py-3.5 font-medium text-white font-mono">{job.recipient}</td>
                    <td className="px-4 py-3.5 text-slate-200 max-w-xs truncate">{job.subject}</td>
                    <td className="px-4 py-3.5 text-slate-400 font-mono text-[11px]">{job.senderEmail}</td>
                    <td className="px-4 py-3.5 text-slate-400">
                      {job.sentAt
                        ? new Date(job.sentAt).toLocaleString(undefined, {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit',
                          })
                        : '—'}
                    </td>
                    <td className="px-4 py-3.5">
                      {isSent ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                          <CheckCircle2 className="h-3 w-3" />
                          Sent
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-rose-500/10 text-rose-300 border border-rose-500/20">
                          <AlertTriangle className="h-3 w-3" />
                          Failed
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      {job.etherealPreviewUrl ? (
                        <button
                          onClick={() => onViewEthereal(job.etherealPreviewUrl!)}
                          className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-lg text-[11px] font-medium bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 transition-all"
                        >
                          <span>View Email</span>
                          <ExternalLink className="h-3 w-3" />
                        </button>
                      ) : (
                        <span className="text-slate-600">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
