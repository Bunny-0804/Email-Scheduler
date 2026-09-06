import React, { useState } from 'react';
import { Calendar, Check } from 'lucide-react';

interface SendLaterPopupProps {
  isOpen: boolean;
  selectedDateTime: string;
  onSelectDateTime: (dateTimeIso: string) => void;
  onClose: () => void;
}

export const SendLaterPopup: React.FC<SendLaterPopupProps> = ({
  isOpen,
  selectedDateTime,
  onSelectDateTime,
  onClose,
}) => {
  const [customDateTime, setCustomDateTime] = useState(selectedDateTime);

  if (!isOpen) return null;

  const presets = [
    {
      label: 'Tomorrow',
      getTime: () => {
        const d = new Date();
        d.setDate(d.getDate() + 1);
        d.setHours(9, 0, 0, 0);
        return d;
      },
    },
    {
      label: 'Tomorrow, 10:00 AM',
      getTime: () => {
        const d = new Date();
        d.setDate(d.getDate() + 1);
        d.setHours(10, 0, 0, 0);
        return d;
      },
    },
    {
      label: 'Tomorrow, 11:00 AM',
      getTime: () => {
        const d = new Date();
        d.setDate(d.getDate() + 1);
        d.setHours(11, 0, 0, 0);
        return d;
      },
    },
    {
      label: 'Tomorrow, 3:00 PM',
      getTime: () => {
        const d = new Date();
        d.setDate(d.getDate() + 1);
        d.setHours(15, 0, 0, 0);
        return d;
      },
    },
  ];

  const handleApplyPreset = (presetFn: () => Date) => {
    const d = presetFn();
    const isoStr = d.toISOString().slice(0, 16);
    setCustomDateTime(isoStr);
  };

  const handleDone = () => {
    onSelectDateTime(customDateTime);
    onClose();
  };

  return (
    <div className="absolute right-0 top-12 z-50 w-72 bg-white rounded-2xl border border-slate-200 shadow-xl p-4 animate-in fade-in zoom-in-95 duration-150">
      <h4 className="text-xs font-bold text-slate-900 mb-3">Send Later</h4>

      {/* Date Time Picker Input */}
      <div className="relative mb-3">
        <input
          type="datetime-local"
          value={customDateTime}
          onChange={(e) => setCustomDateTime(e.target.value)}
          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-emerald-500 font-sans"
        />
      </div>

      {/* Quick Presets List */}
      <div className="space-y-1 mb-4">
        {presets.map((preset, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => handleApplyPreset(preset.getTime)}
            className="w-full text-left px-3 py-2 rounded-lg text-xs text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors font-medium"
          >
            {preset.label}
          </button>
        ))}
      </div>

      {/* Footer Buttons */}
      <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100">
        <button
          type="button"
          onClick={onClose}
          className="px-3 py-1.5 text-xs text-slate-500 hover:text-slate-800 font-medium transition-colors"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleDone}
          className="border border-[#10B981] text-[#059669] hover:bg-[#10B981] hover:text-white rounded-full px-4 py-1 text-xs font-semibold transition-all shadow-xs"
        >
          Done
        </button>
      </div>
    </div>
  );
};
