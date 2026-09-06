import React, { useState, useRef, useEffect } from 'react';
import {
  ArrowLeft,
  Paperclip,
  Clock,
  Upload,
  RotateCcw,
  RotateCw,
  Bold,
  Italic,
  Underline,
  AlignLeft,
  AlignCenter,
  AlignRight,
  List,
  ListOrdered,
  Quote,
  Strikethrough,
  X,
  Send,
  AlertCircle,
  FileText,
  Image as ImageIcon,
  Lock,
  File,
} from 'lucide-react';
import { SendLaterPopup } from './SendLaterPopup';
import { parseLeadCsv, scheduleEmails } from '../api/client';
import { EmailAttachment, User } from '../types';

interface ComposeViewProps {
  user: User | null;
  onBack: () => void;
  onSuccess: () => void;
}

export const ComposeView: React.FC<ComposeViewProps> = ({ user, onBack, onSuccess }) => {
  const senderEmail = user?.email || 'oliver.brown@domain.io';
  const [recipients, setRecipients] = useState<string[]>(['tame@jmail.com', 'lame@jmail.com', 'dame@jmail.com']);
  const [recipientInput, setRecipientInput] = useState('');
  const [subject, setSubject] = useState('');
  
  // Rich Text Editor State
  const editorRef = useRef<HTMLDivElement>(null);
  const [bodyHtml, setBodyHtml] = useState('');
  const [fontSize, setFontSize] = useState('3');

  // Attachment State
  const [attachedFiles, setAttachedFiles] = useState<EmailAttachment[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Settings State
  const [delayBetweenSec, setDelayBetweenSec] = useState(2);
  const [hourlyLimit, setHourlyLimit] = useState(50);
  
  const [scheduledDateTime, setScheduledDateTime] = useState(() => {
    const d = new Date();
    d.setMinutes(d.getMinutes() + 5);
    return d.toISOString().slice(0, 16);
  });

  const [isSendLaterOpen, setIsSendLaterOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Execute Rich Text Command
  const formatText = (command: string, value: string | undefined = undefined) => {
    document.execCommand(command, false, value);
    if (editorRef.current) {
      setBodyHtml(editorRef.current.innerHTML);
    }
  };

  const handleEditorInput = () => {
    if (editorRef.current) {
      setBodyHtml(editorRef.current.innerHTML);
    }
  };

  // Recipient Handlers
  const handleAddRecipient = (e?: React.KeyboardEvent) => {
    if (e && e.key !== 'Enter' && e.key !== ',') return;
    if (e) e.preventDefault();

    const val = recipientInput.trim().replace(',', '').toLowerCase();
    if (val && !recipients.includes(val)) {
      setRecipients([...recipients, val]);
      setRecipientInput('');
    }
  };

  const handleRemoveRecipient = (email: string) => {
    setRecipients(recipients.filter((r) => r !== email));
  };

  // CSV Lead Upload
  const handleCsvUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      const text = evt.target?.result as string;
      if (text) {
        try {
          const res = await parseLeadCsv(text);
          const combined = Array.from(new Set([...recipients, ...res.emails]));
          setRecipients(combined);
        } catch (err) {
          const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
          const matches = text.match(emailRegex) || [];
          const combined = Array.from(new Set([...recipients, ...matches.map((m) => m.toLowerCase())]));
          setRecipients(combined);
        }
      }
    };
    reader.readAsText(file);
  };

  // File Attachment Upload (Photos, Docs, PDFs)
  const handleAttachmentUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (evt) => {
        const base64Data = (evt.target?.result as string).split(',')[1];
        if (base64Data) {
          const newAtt: EmailAttachment = {
            filename: file.name,
            contentType: file.type || 'application/octet-stream',
            size: file.size,
            data: base64Data,
          };
          setAttachedFiles((prev) => [...prev, newAtt]);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const handleRemoveAttachment = (index: number) => {
    setAttachedFiles(attachedFiles.filter((_, i) => i !== index));
  };

  // Submit Handler
  const handleSubmit = async () => {
    setError(null);
    if (recipients.length === 0) {
      setError('Please add at least one recipient email address.');
      return;
    }
    if (!subject.trim()) {
      setError('Subject is required.');
      return;
    }

    const currentContent = editorRef.current?.innerHTML || bodyHtml;
    if (!currentContent.trim() || currentContent === '<br>') {
      setError('Email body is required.');
      return;
    }

    try {
      setLoading(true);
      await scheduleEmails({
        senderEmail,
        subject,
        body: currentContent,
        recipients,
        startTime: new Date(scheduledDateTime).toISOString(),
        delayBetweenSec: Number(delayBetweenSec),
        hourlyLimit: Number(hourlyLimit),
        attachments: attachedFiles,
      });

      setLoading(false);
      onSuccess();
      onBack();
    } catch (err: any) {
      setLoading(false);
      setError(err.response?.data?.error || err.message || 'Failed to schedule campaign');
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'Unknown size';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="flex-1 bg-white flex flex-col h-full overflow-y-auto">
      {/* Hidden File Input for Attachments */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleAttachmentUpload}
        multiple
        className="hidden"
        accept="image/*,application/pdf,.doc,.docx,.txt,.csv,.xlsx"
      />

      {/* Top Header Bar matching Figma */}
      <div className="h-16 px-8 border-b border-slate-200 flex items-center justify-between shrink-0 bg-white sticky top-0 z-30">
        <div className="flex items-center space-x-4">
          <button
            onClick={onBack}
            className="p-1 rounded-full text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight">Compose New Email</h2>
        </div>

        {/* Right Top Actions: Attachment badge button, Schedule clock icon, Send Later green pill button */}
        <div className="flex items-center space-x-3 relative">
          {/* Attachment Icon Button with Real Badge Count */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="relative p-2 rounded-full text-slate-500 hover:bg-slate-100 transition-colors"
            title="Attach Files (Photos, Docs, PDFs)"
          >
            <Paperclip className="h-5 w-5 text-slate-700" />
            {attachedFiles.length > 0 && (
              <span className="absolute -top-1 -right-1 bg-[#10B981] text-white text-[10px] font-bold h-4 w-4 rounded-full flex items-center justify-center shadow-xs">
                {attachedFiles.length}
              </span>
            )}
          </button>

          {/* Schedule Clock Button */}
          <button
            type="button"
            onClick={() => setIsSendLaterOpen(!isSendLaterOpen)}
            className="p-2 rounded-full text-slate-500 hover:bg-slate-100 transition-colors"
            title="Schedule Date & Time"
          >
            <Clock className="h-5 w-5" />
          </button>

          {/* Primary Send Later / Send Pill Button */}
          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading}
            className="border-2 border-[#10B981] text-[#059669] hover:bg-[#10B981] hover:text-white rounded-full px-5 py-1.5 font-semibold text-xs transition-all shadow-xs disabled:opacity-50 flex items-center space-x-1.5"
          >
            {loading ? (
              <span>Scheduling...</span>
            ) : (
              <>
                <Send className="h-3.5 w-3.5" />
                <span>Send Later</span>
              </>
            )}
          </button>

          {/* Send Later Popover */}
          <SendLaterPopup
            isOpen={isSendLaterOpen}
            selectedDateTime={scheduledDateTime}
            onSelectDateTime={(dt) => setScheduledDateTime(dt)}
            onClose={() => setIsSendLaterOpen(false)}
          />
        </div>
      </div>

      {/* Main Compose Form */}
      <div className="p-8 max-w-5xl mx-auto w-full space-y-6 flex-1">
        {error && (
          <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center space-x-2">
            <AlertCircle className="h-4 w-4 text-rose-500 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* FROM Sender Locked to Account Email */}
        <div className="flex items-center space-x-4">
          <label className="w-16 text-xs font-semibold text-slate-400">From</label>
          <div className="flex items-center space-x-2 bg-[#F3F4F6] border border-slate-200 rounded-xl px-4 py-2 text-xs font-semibold text-slate-800">
            <span>{senderEmail}</span>
            <span title="Sender locked to your logged in account email">
              <Lock className="h-3.5 w-3.5 text-slate-400" />
            </span>
          </div>
          <span className="text-[11px] text-slate-400 italic">Account Sender Address</span>
        </div>

        {/* TO Recipient List Input matching Figma Green Pills */}
        <div className="flex items-start space-x-4 border-b border-slate-100 pb-4">
          <label className="w-16 text-xs font-semibold text-slate-400 pt-2">To</label>
          <div className="flex-1 flex flex-wrap items-center gap-2 min-h-[38px]">
            {recipients.map((email) => (
              <span
                key={email}
                className="bg-[#E6F4EA] text-[#059669] border border-[#A7F3D0] rounded-full px-3 py-1 text-xs font-medium flex items-center gap-1.5"
              >
                <span>{email}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveRecipient(email)}
                  className="hover:text-rose-600 transition-colors"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}

            <input
              type="email"
              value={recipientInput}
              onChange={(e) => setRecipientInput(e.target.value)}
              onKeyDown={handleAddRecipient}
              onBlur={() => handleAddRecipient()}
              placeholder={recipients.length === 0 ? 'recipient@example.com' : 'Add email...'}
              className="flex-1 bg-transparent border-none text-xs text-slate-800 placeholder-slate-400 focus:outline-none min-w-[150px]"
            />
          </div>

          {/* Upload List Action Link */}
          <label className="cursor-pointer text-xs font-semibold text-[#059669] hover:text-[#10B981] flex items-center space-x-1 transition-colors shrink-0 pt-2">
            <Upload className="h-3.5 w-3.5" />
            <span>Upload List</span>
            <input type="file" accept=".csv,.txt" onChange={handleCsvUpload} className="hidden" />
          </label>
        </div>

        {/* SUBJECT Line Input */}
        <div className="flex items-center space-x-4 border-b border-slate-100 pb-3">
          <label className="w-16 text-xs font-semibold text-slate-400">Subject</label>
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Subject"
            className="flex-1 bg-transparent border-none text-xs text-slate-800 placeholder-slate-400 focus:outline-none font-medium"
          />
        </div>

        {/* Delay & Hourly Limit Settings */}
        <div className="flex items-center space-x-8 pt-1">
          <div className="flex items-center space-x-3">
            <label className="text-xs font-semibold text-slate-600">Delay between 2 emails</label>
            <input
              type="number"
              min="0"
              max="3600"
              value={delayBetweenSec}
              onChange={(e) => setDelayBetweenSec(Number(e.target.value))}
              className="w-16 bg-[#F9FAFB] border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-center text-slate-800 font-bold focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="flex items-center space-x-3">
            <label className="text-xs font-semibold text-slate-600">Hourly Limit</label>
            <input
              type="number"
              min="1"
              max="10000"
              value={hourlyLimit}
              onChange={(e) => setHourlyLimit(Number(e.target.value))}
              className="w-20 bg-[#F9FAFB] border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-center text-slate-800 font-bold focus:outline-none focus:border-emerald-500"
            />
          </div>
        </div>

        {/* Attached Files Section (Photos, Docs, PDFs) */}
        {attachedFiles.length > 0 && (
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700">Attached Files ({attachedFiles.length})</span>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="text-[11px] font-semibold text-[#059669] hover:underline"
              >
                + Add More Files
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {attachedFiles.map((file, idx) => {
                const isImage = file.contentType?.startsWith('image/');
                return (
                  <div
                    key={idx}
                    className="bg-white border border-slate-200 rounded-xl p-2.5 flex items-center justify-between space-x-2 shadow-2xs"
                  >
                    <div className="flex items-center space-x-2.5 overflow-hidden">
                      {isImage ? (
                        <img
                          src={`data:${file.contentType};base64,${file.data}`}
                          alt={file.filename}
                          className="h-9 w-9 rounded-lg object-cover shrink-0 ring-1 ring-slate-200"
                        />
                      ) : (
                        <div className="h-9 w-9 rounded-lg bg-emerald-50 text-[#059669] flex items-center justify-center shrink-0">
                          <FileText className="h-5 w-5" />
                        </div>
                      )}
                      <div className="truncate">
                        <p className="text-xs font-bold text-slate-800 truncate">{file.filename}</p>
                        <p className="text-[10px] text-slate-400">{formatFileSize(file.size)}</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveAttachment(idx)}
                      className="p-1 text-slate-400 hover:text-rose-600 transition-colors"
                      title="Remove Attachment"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Body Container & Interactive Rich Text Toolbar */}
        <div className="bg-[#F9FAFB] rounded-2xl p-6 min-h-[360px] flex flex-col border border-slate-100">
          {/* Fully Usable Rich Text Toolbar */}
          <div className="bg-white rounded-xl border border-slate-200 p-1.5 mb-4 flex items-center space-x-1 flex-wrap text-slate-600 shadow-xs">
            <button
              type="button"
              onClick={() => formatText('undo')}
              className="editor-toolbar-button"
              title="Undo (Ctrl+Z)"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => formatText('redo')}
              className="editor-toolbar-button"
              title="Redo (Ctrl+Y)"
            >
              <RotateCw className="h-3.5 w-3.5" />
            </button>

            <div className="h-4 w-px bg-slate-200 mx-1"></div>

            {/* Font Size Selector */}
            <select
              value={fontSize}
              onChange={(e) => {
                setFontSize(e.target.value);
                formatText('fontSize', e.target.value);
              }}
              className="text-xs bg-slate-50 border border-slate-200 rounded px-1.5 py-0.5 font-medium text-slate-700 focus:outline-none"
            >
              <option value="1">Small</option>
              <option value="3">Normal</option>
              <option value="5">Large</option>
              <option value="7">Heading</option>
            </select>

            <div className="h-4 w-px bg-slate-200 mx-1"></div>

            {/* Basic Styles */}
            <button
              type="button"
              onClick={() => formatText('bold')}
              className="editor-toolbar-button font-bold"
              title="Bold (Ctrl+B)"
            >
              <Bold className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => formatText('italic')}
              className="editor-toolbar-button italic"
              title="Italic (Ctrl+I)"
            >
              <Italic className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => formatText('underline')}
              className="editor-toolbar-button underline"
              title="Underline (Ctrl+U)"
            >
              <Underline className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => formatText('strikeThrough')}
              className="editor-toolbar-button line-through"
              title="Strikethrough"
            >
              <Strikethrough className="h-3.5 w-3.5" />
            </button>

            <div className="h-4 w-px bg-slate-200 mx-1"></div>

            {/* Alignments */}
            <button
              type="button"
              onClick={() => formatText('justifyLeft')}
              className="editor-toolbar-button"
              title="Align Left"
            >
              <AlignLeft className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => formatText('justifyCenter')}
              className="editor-toolbar-button"
              title="Align Center"
            >
              <AlignCenter className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => formatText('justifyRight')}
              className="editor-toolbar-button"
              title="Align Right"
            >
              <AlignRight className="h-3.5 w-3.5" />
            </button>

            <div className="h-4 w-px bg-slate-200 mx-1"></div>

            {/* Lists & Quotes */}
            <button
              type="button"
              onClick={() => formatText('insertOrderedList')}
              className="editor-toolbar-button"
              title="Numbered List"
            >
              <ListOrdered className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => formatText('insertUnorderedList')}
              className="editor-toolbar-button"
              title="Bullet List"
            >
              <List className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => formatText('formatBlock', 'blockquote')}
              className="editor-toolbar-button"
              title="Quote Callout"
            >
              <Quote className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Interactive ContentEditable Editor Div */}
          <div
            ref={editorRef}
            contentEditable
            onInput={handleEditorInput}
            className="w-full min-h-[260px] bg-transparent text-xs text-slate-800 focus:outline-none resize-none font-sans leading-relaxed flex-1 overflow-y-auto p-2 border border-slate-200/60 rounded-xl bg-white focus:border-emerald-500 transition-all"
            style={{ minHeight: '260px' }}
          />
          {!bodyHtml && (
            <p className="text-slate-400 text-xs italic pointer-events-none mt-2">
              Type your formatted message body above...
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
