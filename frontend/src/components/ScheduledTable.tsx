import React from 'react';
import { EmailJob } from '../types';
import { Clock, Search, ShieldAlert, RefreshCw, Inbox } from 'lucide-react';

interface ScheduledTableProps {
  jobs: EmailJob[];
  loading: boolean;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onRefresh: () => void;
}

export const ScheduledTable: React.FC<ScheduledTableProps> = ({
  jobs,
  loading,
  searchQuery,
  onSearchChange,
  onRefresh,
}) => {
  return (
    <div className="glass-panel rounded-2xl border border-slate-800 p-6">
      {/* Table Header & Search Input */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
        <div>
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Clock className="h-5 w-5 text-sky-400" />
            <span>Scheduled Emails Queue</span>
          </h3>
          <p className="text-xs text-slate-400">BullMQ delayed jobs awaiting execution</p>
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
            title="Refresh List"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Table Area */}
      {loading ? (
        <div className="py-16 text-center text-slate-400 flex flex-col items-center">
          <div className="h-8 w-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mb-3"></div>
          <p className="text-xs">Querying Redis BullMQ queue & Elasticsearch...</p>
        </div>
      ) : jobs.length === 0 ? (
        <div className="py-16 text-center border-2 border-dashed border-slate-800 rounded-xl bg-slate-900/30">
          <Inbox className="h-10 w-10 text-slate-600 mx-auto mb-3" />
          <h4 className="text-sm font-semibold text-slate-300">No Scheduled Emails Found</h4>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
            {searchQuery
              ? `No matching results for "${searchQuery}" in Elasticsearch.`
              : 'Click "Schedule New Email" above to add emails to the persistent BullMQ queue.'}
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
                <th className="px-4 py-3">Scheduled Delivery</th>
                <th className="px-4 py-3 text-right">Queue Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {jobs.map((job) => {
                const isRateLimited = job.status === 'RATE_LIMITED';
                const isProcessing = job.status === 'PROCESSING';

                return (
                  <tr key={job.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="px-4 py-3.5 font-medium text-white font-mono">{job.recipient}</td>
                    <td className="px-4 py-3.5 text-slate-200 max-w-xs truncate">{job.subject}</td>
                    <td className="px-4 py-3.5 text-slate-400 font-mono text-[11px]">{job.senderEmail}</td>
                    <td className="px-4 py-3.5 text-slate-400">
                      {new Date(job.scheduledAt).toLocaleString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                      })}
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      {isRateLimited ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-500/10 text-amber-300 border border-amber-500/20">
                          <ShieldAlert className="h-3 w-3" />
                          Rate Limited
                        </span>
                      ) : isProcessing ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                          <div className="h-2 w-2 rounded-full bg-indigo-400 animate-ping"></div>
                          Processing
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-sky-500/10 text-sky-300 border border-sky-500/20">
                          <Clock className="h-3 w-3" />
                          Scheduled
                        </span>
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
