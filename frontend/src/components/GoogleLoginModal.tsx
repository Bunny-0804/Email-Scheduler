import React from 'react';
import { User } from '../types';
import { LogIn, Shield, CheckCircle2 } from 'lucide-react';
import { loginWithGoogle } from '../api/client';

interface GoogleLoginModalProps {
  isOpen: boolean;
  onSelectUser: (user: User) => void;
  onClose?: () => void;
}

export const GoogleLoginModal: React.FC<GoogleLoginModalProps> = ({
  isOpen,
  onSelectUser,
  onClose,
}) => {
  if (!isOpen) return null;

  const defaultAccounts = [
    {
      name: 'Oliver Brown',
      email: 'oliver.brown@domain.io',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      googleId: 'google-oliver-123',
    },
    {
      name: 'Alex Developer',
      email: 'alex.developer@reachinbox.ai',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
      googleId: 'google-alex-456',
    },
    {
      name: 'Sarah Wilson',
      email: 'sarah.wilson@domain.io',
      avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
      googleId: 'google-sarah-789',
    },
  ];

  const handleAccountClick = async (acc: typeof defaultAccounts[0]) => {
    try {
      const res = await loginWithGoogle('MOCK_TOKEN', acc);
      onSelectUser(res.user);
    } catch (e) {
      onSelectUser({
        id: acc.googleId,
        name: acc.name,
        email: acc.email,
        avatar: acc.avatar,
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in font-sans">
      <div className="bg-white rounded-3xl border border-slate-200 w-full max-w-md p-8 shadow-2xl space-y-6 text-center">
        {/* Google Badge Header */}
        <div className="flex flex-col items-center">
          <div className="h-12 w-12 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center mb-3">
            <svg className="h-6 w-6" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
          </div>
          <h3 className="text-xl font-extrabold text-slate-900">Sign in with Google</h3>
          <p className="text-xs text-slate-500 mt-1">Choose an account to continue to ONB Email Scheduler</p>
        </div>

        {/* Account Selector List */}
        <div className="space-y-2.5 text-left">
          {defaultAccounts.map((acc) => (
            <button
              key={acc.email}
              type="button"
              onClick={() => handleAccountClick(acc)}
              className="w-full flex items-center justify-between p-3 rounded-2xl bg-slate-50 hover:bg-slate-100 border border-slate-200 transition-all group"
            >
              <div className="flex items-center space-x-3 overflow-hidden">
                <img
                  src={acc.avatar}
                  alt={acc.name}
                  className="h-10 w-10 rounded-full object-cover ring-1 ring-slate-200"
                />
                <div className="truncate">
                  <p className="text-xs font-bold text-slate-900 group-hover:text-[#059669] transition-colors truncate">
                    {acc.name}
                  </p>
                  <p className="text-[11px] text-slate-500 truncate">{acc.email}</p>
                </div>
              </div>
              <LogIn className="h-4 w-4 text-slate-400 group-hover:text-[#059669] transition-colors shrink-0" />
            </button>
          ))}
        </div>

        {/* Footer info */}
        <div className="pt-2 text-[11px] text-slate-400 flex items-center justify-center space-x-1">
          <Shield className="h-3.5 w-3.5 text-[#059669]" />
          <span>Secure Google OAuth 2.0 Single Sign-On</span>
        </div>
      </div>
    </div>
  );
};
