import React from 'react';
import { X, ExternalLink, MailCheck } from 'lucide-react';

interface EtherealModalProps {
  url: string | null;
  onClose: () => void;
}

export const EtherealModal: React.FC<EtherealModalProps> = ({ url, onClose }) => {
  if (!url) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-[#131926] border border-slate-700/80 rounded-2xl w-full max-w-4xl h-[85vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-3.5 border-b border-slate-800 flex items-center justify-between bg-slate-900/80">
          <div className="flex items-center space-x-2">
            <MailCheck className="h-5 w-5 text-indigo-400" />
            <h3 className="text-sm font-bold text-white">Ethereal Fake SMTP Email Previewer</h3>
          </div>
          <div className="flex items-center space-x-3">
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center space-x-1 underline"
            >
              <span>Open in New Tab</span>
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Embedded Ethereal Preview iframe */}
        <div className="flex-1 bg-white">
          <iframe src={url} className="w-full h-full border-none" title="Ethereal Email Preview" />
        </div>
      </div>
    </div>
  );
};
