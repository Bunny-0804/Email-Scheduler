import React from 'react';
import { EmailJob } from '../types';
import { Star, Inbox } from 'lucide-react';

interface EmailListViewProps {
  jobs: EmailJob[];
  type: 'scheduled' | 'sent';
  loading: boolean;
  onSelectJob: (job: EmailJob) => void;
}

export const EmailListView: React.FC<EmailListViewProps> = ({
  jobs,
  type,
  loading,
  onSelectJob,
}) => {
  // Only show central spinner if loading AND we have no jobs yet (prevents flickering during background polling)
  if (loading && jobs.length === 0) {
    return (
      <div className="py-20 text-center flex flex-col items-center">
        <div className="h-7 w-7 border-2 border-[#10B981] border-t-transparent rounded-full animate-spin mb-3"></div>
        <p className="text-xs text-slate-400 font-medium">Fetching email records...</p>
      </div>
    );
  }

  if (!loading && jobs.length === 0) {
    return (
      <div className="py-20 text-center flex flex-col items-center justify-center">
        <Inbox className="h-10 w-10 text-slate-300 mb-3" />
        <h3 className="text-sm font-semibold text-slate-700">No {type === 'scheduled' ? 'Scheduled' : 'Sent'} Emails</h3>
        <p className="text-xs text-slate-400 mt-1 max-w-sm">
          {type === 'scheduled'
            ? 'Compose an email to queue delayed jobs in BullMQ.'
            : 'Sent emails delivered via Ethereal SMTP will appear here.'}
        </p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-slate-100 border-b border-slate-100">
      {jobs.map((job) => {
        const isSent = job.status === 'SENT';
        const isRateLimited = job.status === 'RATE_LIMITED';
        const isProcessing = job.status === 'PROCESSING';

        let statusText = 'Sent';
        let statusBg = 'bg-slate-100 text-slate-600';

        if (job.status === 'SCHEDULED') {
          statusText = 'Scheduled';
          statusBg = 'bg-sky-50 text-sky-700 border border-sky-200';
        } else if (isRateLimited) {
          statusText = 'Rate Limited';
          statusBg = 'bg-amber-50 text-amber-700 border border-amber-200';
        } else if (isProcessing) {
          statusText = 'Processing';
          statusBg = 'bg-emerald-50 text-emerald-700 border border-emerald-200';
        }

        return (
          <div
            key={job.id}
            onClick={() => onSelectJob(job)}
            className="flex items-center justify-between px-8 py-4 hover:bg-slate-50/80 transition-colors cursor-pointer group"
          >
            {/* Recipient info & Status Badge */}
            <div className="flex items-center space-x-6 min-w-0 flex-1">
              <span className="text-xs font-bold text-slate-900 w-44 truncate shrink-0">
                To: {job.recipient.split('@')[0]}
              </span>

              {/* Status Pill Badge matching Figma */}
              <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold shrink-0 ${statusBg}`}>
                {statusText}
              </span>

              {/* Subject & Preview Snippet */}
              <div className="truncate text-xs text-slate-500 font-sans flex-1">
                <span className="font-semibold text-slate-900 mr-2">{job.subject}</span>
                <span className="text-slate-400 hidden sm:inline">- {job.body.replace(/<[^>]*>?/gm, '').slice(0, 70)}...</span>
              </div>
            </div>

            {/* Right Action / Timestamp & Star */}
            <div className="flex items-center space-x-4 pl-4 shrink-0">
              <span className="text-[11px] text-slate-400 font-medium">
                {new Date(job.sentAt || job.scheduledAt).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                }}
                className="text-slate-300 hover:text-amber-400 transition-colors"
              >
                <Star className="h-4 w-4" />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
};
