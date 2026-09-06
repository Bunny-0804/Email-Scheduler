import React, { useState, useRef, useEffect } from 'react';
import { Clock, Send, User as UserIcon, ChevronDown, Plus, Shield, Check, UserPlus, LogOut } from 'lucide-react';
import { User } from '../types';

interface SidebarProps {
  user: User | null;
  userAccounts: User[];
  activeTab: 'scheduled' | 'sent' | 'profile';
  scheduledCount: number;
  sentCount: number;
  onTabChange: (tab: 'scheduled' | 'sent' | 'profile') => void;
  onComposeClick: () => void;
  onSelectUser: (user: User) => void;
  onSignOut: () => void;
  onAddAccount: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  user,
  userAccounts,
  activeTab,
  scheduledCount,
  sentCount,
  onTabChange,
  onComposeClick,
  onSelectUser,
  onSignOut,
  onAddAccount,
}) => {
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsAccountMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <aside className="w-64 bg-white border-r border-slate-200 flex flex-col h-screen shrink-0 font-sans select-none relative">
      {/* Brand Logo Header - ONB */}
      <div className="p-6 pb-2">
        <h1 className="text-2xl font-black tracking-tight text-slate-900 font-sans">ONB</h1>
      </div>

      {/* User Profile Card Dropdown Container */}
      <div className="px-4 py-2 relative" ref={menuRef}>
        <div
          onClick={() => setIsAccountMenuOpen(!isAccountMenuOpen)}
          className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-100 hover:border-slate-300 transition-all cursor-pointer shadow-2xs"
        >
          <div className="flex items-center space-x-2.5 overflow-hidden">
            <img
              src={user?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}
              alt={user?.name || 'Oliver Brown'}
              className="h-8 w-8 rounded-full object-cover shrink-0 ring-1 ring-slate-200"
            />
            <div className="truncate text-left">
              <p className="text-xs font-bold text-slate-900 leading-tight truncate">
                {user?.name || 'Oliver Brown'}
              </p>
              <p className="text-[11px] text-slate-400 truncate leading-none mt-0.5">
                {user?.email || 'oliver.brown@domain.io'}
              </p>
            </div>
          </div>
          <ChevronDown className={`h-4 w-4 text-slate-400 shrink-0 transition-transform ${isAccountMenuOpen ? 'rotate-180' : ''}`} />
        </div>

        {/* Google-Style Account Switcher Dropdown Menu */}
        {isAccountMenuOpen && (
          <div className="absolute left-4 right-4 top-14 z-50 bg-white rounded-2xl border border-slate-200 shadow-xl py-2 animate-in fade-in zoom-in-95 duration-150">
            <div className="px-3 py-1.5 border-b border-slate-100 mb-1">
              <p className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Active Account</p>
            </div>

            {/* Account List */}
            <div className="space-y-0.5 px-1 max-h-48 overflow-y-auto">
              {userAccounts.map((acc) => {
                const isActive = user?.email === acc.email;
                return (
                  <button
                    key={acc.email}
                    type="button"
                    onClick={() => {
                      onSelectUser(acc);
                      setIsAccountMenuOpen(false);
                    }}
                    className={`w-full flex items-center justify-between p-2 rounded-xl text-left transition-colors ${
                      isActive ? 'bg-[#E6F4EA] text-[#059669]' : 'hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center space-x-2.5 overflow-hidden">
                      <img
                        src={acc.avatar}
                        alt={acc.name}
                        className="h-7 w-7 rounded-full object-cover shrink-0"
                      />
                      <div className="truncate">
                        <p className="text-xs font-bold truncate leading-tight">{acc.name}</p>
                        <p className="text-[10px] text-slate-400 truncate">{acc.email}</p>
                      </div>
                    </div>
                    {isActive && <Check className="h-4 w-4 text-[#059669] shrink-0" />}
                  </button>
                );
              })}
            </div>

            <div className="my-1 border-t border-slate-100"></div>

            {/* Add Another Account */}
            <button
              type="button"
              onClick={() => {
                setIsAccountMenuOpen(false);
                onAddAccount();
              }}
              className="w-full flex items-center space-x-2 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors"
            >
              <UserPlus className="h-4 w-4 text-slate-400" />
              <span>Add another account</span>
            </button>

            {/* Sign Out */}
            <button
              type="button"
              onClick={() => {
                setIsAccountMenuOpen(false);
                onSignOut();
              }}
              className="w-full flex items-center space-x-2 px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 transition-colors border-t border-slate-100 mt-1"
            >
              <LogOut className="h-4 w-4 text-rose-500" />
              <span>Sign out of all accounts</span>
            </button>
          </div>
        )}
      </div>

      {/* Primary Compose Action Button */}
      <div className="px-4 py-3">
        <button
          onClick={onComposeClick}
          className="w-full border-2 border-[#10B981] text-[#059669] hover:bg-[#10B981] hover:text-white rounded-full py-2 px-4 font-semibold text-xs transition-all shadow-xs flex items-center justify-center space-x-1.5"
        >
          <Plus className="h-4 w-4" />
          <span>Compose</span>
        </button>
      </div>

      {/* Navigation Sections */}
      <div className="px-4 py-3 flex-1 space-y-6 overflow-y-auto">
        <div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 px-3">CORE</p>
          <nav className="space-y-1">
            {/* Scheduled Emails Nav */}
            <button
              onClick={() => onTabChange('scheduled')}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                activeTab === 'scheduled'
                  ? 'bg-[#E6F4EA] text-[#059669]'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <div className="flex items-center space-x-2.5">
                <Clock className="h-4 w-4" />
                <span>Scheduled</span>
              </div>
              <span
                className={`text-[11px] font-semibold px-2 py-0.5 rounded-md ${
                  activeTab === 'scheduled' ? 'text-[#059669]' : 'text-slate-400'
                }`}
              >
                {scheduledCount}
              </span>
            </button>

            {/* Sent Emails Nav */}
            <button
              onClick={() => onTabChange('sent')}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                activeTab === 'sent'
                  ? 'bg-[#E6F4EA] text-[#059669]'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <div className="flex items-center space-x-2.5">
                <Send className="h-4 w-4" />
                <span>Sent</span>
              </div>
              <span
                className={`text-[11px] font-semibold px-2 py-0.5 rounded-md ${
                  activeTab === 'sent' ? 'text-[#059669]' : 'text-slate-400'
                }`}
              >
                {sentCount}
              </span>
            </button>

            {/* Profile & Settings Nav */}
            <button
              onClick={() => onTabChange('profile')}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                activeTab === 'profile'
                  ? 'bg-[#E6F4EA] text-[#059669]'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <div className="flex items-center space-x-2.5">
                <UserIcon className="h-4 w-4" />
                <span>Profile & Settings</span>
              </div>
              <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
            </button>
          </nav>
        </div>
      </div>

      {/* Sidebar Footer Link */}
      <div className="p-4 border-t border-slate-100 text-[11px] text-slate-400 flex items-center justify-between">
        <span>ReachInbox Engine</span>
        <span className="flex items-center gap-1 text-[#059669] font-medium">
          <Shield className="h-3 w-3" /> Persistent
        </span>
      </div>
    </aside>
  );
};
