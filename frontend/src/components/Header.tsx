import React from 'react';
import { Search, SlidersHorizontal, RefreshCw, Activity } from 'lucide-react';

interface HeaderProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onRefresh: () => void;
  loading: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  searchQuery,
  onSearchChange,
  onRefresh,
  loading,
}) => {
  return (
    <header className="h-16 bg-white border-b border-slate-200 px-8 flex items-center justify-between shrink-0">
      {/* Search Input matching Figma */}
      <div className="flex-1 max-w-xl relative">
        <Search className="absolute left-4 top-2.5 h-4 w-4 text-slate-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search..."
          className="w-full bg-[#F9FAFB] border border-transparent hover:border-slate-200 focus:border-slate-300 focus:bg-white rounded-full pl-11 pr-4 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none transition-all"
        />
      </div>

      {/* Action Icons */}
      <div className="flex items-center space-x-3 text-slate-500">
        <button
          onClick={onRefresh}
          className="p-2 rounded-full hover:bg-slate-100 transition-colors text-slate-500 hover:text-slate-800"
          title="Refresh List"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </button>

        <a
          href="http://localhost:4000/admin/queues"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center space-x-1.5 px-3 py-1.5 rounded-full text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 transition-colors shadow-xs"
          title="Open BullMQ Queue Board"
        >
          <Activity className="h-3.5 w-3.5 text-emerald-600 animate-pulse" />
          <span>BullMQ Queue</span>
        </a>
      </div>
    </header>
  );
};
