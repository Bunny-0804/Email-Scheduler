import React from 'react';
import { EmailJob, EmailAttachment } from '../types';
import { ArrowLeft, Star, Trash2, Archive, ChevronDown, ExternalLink, MailCheck, FileText, Image as ImageIcon } from 'lucide-react';

interface EmailDetailViewProps {
  job: EmailJob;
  onBack: () => void;
  onViewEthereal: (url: string) => void;
}

export const EmailDetailView: React.FC<EmailDetailViewProps> = ({
  job,
  onBack,
  onViewEthereal,
}) => {
  const senderInitial = job.senderEmail.charAt(0).toUpperCase();

  const attachments: EmailAttachment[] = (job.attachments as any) || [];

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'Unknown size';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="flex-1 bg-white flex flex-col h-full overflow-y-auto font-sans">
      {/* Top Action Header Bar matching Figma Image 5 */}
      <div className="h-16 px-8 border-b border-slate-200 flex items-center justify-between shrink-0 bg-white sticky top-0 z-20">
        <div className="flex items-center space-x-4">
          <button
            onClick={onBack}
            className="p-1 rounded-full text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h2 className="text-base font-bold text-slate-900 truncate max-w-xl">
            {job.subject} <span className="text-slate-400 font-normal">| {job.id.slice(0, 8)}</span>
          </h2>
        </div>

        {/* Right Action Icons */}
        <div className="flex items-center space-x-3 text-slate-400">
          <button className="p-2 rounded-full hover:bg-slate-100 hover:text-amber-500 transition-colors">
            <Star className="h-4 w-4" />
          </button>
          <button className="p-2 rounded-full hover:bg-slate-100 hover:text-slate-700 transition-colors">
            <Archive className="h-4 w-4" />
          </button>
          <button className="p-2 rounded-full hover:bg-slate-100 hover:text-rose-600 transition-colors">
            <Trash2 className="h-4 w-4" />
          </button>
          <div className="h-4 w-px bg-slate-200 mx-1"></div>
          <img
            src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80"
            alt="User Avatar"
            className="h-7 w-7 rounded-full object-cover ring-1 ring-slate-200"
          />
        </div>
      </div>

      {/* Email Content Body */}
      <div className="p-8 max-w-4xl mx-auto w-full space-y-8 flex-1">
        {/* Sender Info Bar */}
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3.5">
            <div className="h-10 w-10 rounded-full bg-[#10B981] text-white font-bold flex items-center justify-center text-sm shadow-xs shrink-0">
              {senderInitial}
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-sm font-bold text-slate-900">
                  {job.senderEmail.split('@')[0]}
                </span>
                <span className="text-xs text-slate-400 font-normal">
                  &lt;{job.senderEmail}&gt;
                </span>
              </div>
              <div className="flex items-center space-x-1 text-xs text-slate-400 mt-0.5">
                <span>to {job.recipient}</span>
                <ChevronDown className="h-3 w-3" />
              </div>
            </div>
          </div>

          <div className="text-right">
            <span className="text-xs text-slate-400 font-medium">
              {new Date(job.sentAt || job.scheduledAt).toLocaleString(undefined, {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
          </div>
        </div>

        {/* Message HTML Body Content */}
        <div className="space-y-6 text-xs text-slate-800 leading-relaxed font-sans border-b border-slate-100 pb-6">
          {job.body.includes('<') ? (
            <div
              className="prose prose-sm max-w-none text-slate-800"
              dangerouslySetInnerHTML={{ __html: job.body }}
            />
          ) : (
            <p className="whitespace-pre-wrap text-slate-800">{job.body}</p>
          )}
        </div>

        {/* Dynamically Rendered Real File Attachments */}
        {attachments.length > 0 ? (
          <div className="pt-2">
            <p className="text-xs font-semibold text-slate-400 mb-3">
              Attachments ({attachments.length})
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {attachments.map((att, idx) => {
                const isImage = att.contentType?.startsWith('image/');
                const dataUrl = `data:${att.contentType || 'application/octet-stream'};base64,${att.data}`;

                return (
                  <div
                    key={idx}
                    className="border border-slate-200 rounded-2xl overflow-hidden bg-slate-50 hover:border-slate-300 transition-all group"
                  >
                    {isImage ? (
                      <div className="h-36 bg-slate-200 relative overflow-hidden flex items-center justify-center">
                        <img
                          src={dataUrl}
                          alt={att.filename}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                        />
                      </div>
                    ) : (
                      <div className="h-28 bg-emerald-50 text-[#059669] flex flex-col items-center justify-center space-y-1">
                        <FileText className="h-8 w-8" />
                        <span className="text-[10px] font-bold uppercase">{att.filename.split('.').pop()}</span>
                      </div>
                    )}
                    <div className="p-3 bg-white flex items-center justify-between">
                      <div className="truncate">
                        <p className="text-xs font-bold text-slate-800 truncate">{att.filename}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">{formatFileSize(att.size)}</p>
                      </div>
                      <a
                        href={dataUrl}
                        download={att.filename}
                        className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-[#10B981] hover:text-white text-slate-700 text-[11px] font-semibold transition-colors"
                      >
                        Download
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="pt-2 border-t border-slate-100">
            <p className="text-xs text-slate-400 italic">No files attached to this message.</p>
          </div>
        )}

        {/* Ethereal Fake SMTP Live Preview Action */}
        {job.etherealPreviewUrl && (
          <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Delivered via Ethereal Fake SMTP</span>
            <button
              onClick={() => onViewEthereal(job.etherealPreviewUrl!)}
              className="border border-[#10B981] text-[#059669] hover:bg-[#10B981] hover:text-white rounded-full px-4 py-1.5 text-xs font-semibold transition-all shadow-xs flex items-center space-x-1.5"
            >
              <MailCheck className="h-3.5 w-3.5" />
              <span>View Email in Ethereal</span>
              <ExternalLink className="h-3 w-3" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
