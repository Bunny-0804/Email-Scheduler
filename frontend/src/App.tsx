import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { EmailListView } from './components/EmailListView';
import { ComposeView } from './components/ComposeView';
import { EmailDetailView } from './components/EmailDetailView';
import { ProfileView } from './components/ProfileView';
import { EtherealModal } from './components/EtherealModal';
import { LoginScreen } from './components/LoginScreen';
import { GoogleLoginModal } from './components/GoogleLoginModal';

import { User, EmailJob, SlackStatus } from './types';
import {
  getCurrentUser,
  fetchScheduledEmails,
  fetchSentEmails,
  searchEmails,
  fetchDashboardStats,
  getSlackStatus,
} from './api/client';

export const App: React.FC = () => {
  const defaultAccounts: User[] = [
    {
      id: 'google-oliver-123',
      name: 'Oliver Brown',
      email: 'oliver.brown@domain.io',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    },
    {
      id: 'google-alex-456',
      name: 'Alex Developer',
      email: 'alex.developer@reachinbox.ai',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    },
    {
      id: 'google-sarah-789',
      name: 'Sarah Wilson',
      email: 'sarah.wilson@domain.io',
      avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
    },
  ];

  const [userAccounts, setUserAccounts] = useState<User[]>(defaultAccounts);
  const [user, setUser] = useState<User | null>(defaultAccounts[0]);
  const [isAccountChooserOpen, setIsAccountChooserOpen] = useState(false);

  // Navigation State
  const [activeTab, setActiveTab] = useState<'scheduled' | 'sent' | 'profile'>('sent');
  const [viewMode, setViewMode] = useState<'list' | 'compose' | 'detail'>('list');
  const [selectedJob, setSelectedJob] = useState<EmailJob | null>(null);

  // Data States
  const [scheduledJobs, setScheduledJobs] = useState<EmailJob[]>([]);
  const [sentJobs, setSentJobs] = useState<EmailJob[]>([]);
  const [scheduledCount, setScheduledCount] = useState(12);
  const [sentCount, setSentCount] = useState(785);

  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const [slackStatus, setSlackStatus] = useState<SlackStatus>({ connected: false });
  const [etherealPreviewUrl, setEtherealPreviewUrl] = useState<string | null>(null);

  // Initial Data Load
  useEffect(() => {
    loadUser();
    loadSlackStatus();
    loadStats();
    loadData(false);

    // Silent Background Polling every 4 seconds to prevent UI flickering
    const interval = setInterval(() => {
      loadStats();
      if (viewMode === 'list') {
        loadData(true); // silent refresh
      }
    }, 4000);

    return () => clearInterval(interval);
  }, [activeTab, searchQuery, user]);

  const loadUser = async () => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      try {
        const res = await getCurrentUser();
        if (res.user) {
          setUser(res.user);
        }
      } catch (e) {
        console.warn('Session expired');
      }
    }
  };

  const loadSlackStatus = async () => {
    try {
      const res = await getSlackStatus(user?.id);
      setSlackStatus(res);
    } catch (e) {
      console.warn('Slack status error');
    }
  };

  const loadStats = async () => {
    try {
      const stats = await fetchDashboardStats();
      setScheduledCount(stats.scheduled);
      setSentCount(stats.sent);
    } catch (e) {
      console.warn('Stats error');
    }
  };

  const loadData = async (isSilent: boolean = false) => {
    try {
      if (!isSilent) setLoading(true);
      if (activeTab === 'scheduled') {
        if (searchQuery.trim()) {
          const res = await searchEmails(searchQuery, 'SCHEDULED');
          setScheduledJobs(res.jobs);
        } else {
          const res = await fetchScheduledEmails();
          setScheduledJobs(res.jobs);
        }
      } else if (activeTab === 'sent') {
        if (searchQuery.trim()) {
          const res = await searchEmails(searchQuery, 'SENT');
          setSentJobs(res.jobs);
        } else {
          const res = await fetchSentEmails();
          setSentJobs(res.jobs);
        }
      }
    } catch (e) {
      console.error('Data load error:', e);
    } finally {
      if (!isSilent) setLoading(false);
    }
  };

  const handleTabChange = (tab: 'scheduled' | 'sent' | 'profile') => {
    setActiveTab(tab);
    setViewMode('list');
    setSelectedJob(null);
  };

  const handleComposeClick = () => {
    setViewMode('compose');
  };

  const handleSelectJob = (job: EmailJob) => {
    setSelectedJob(job);
    setViewMode('detail');
  };

  const handleSelectUser = (selectedUser: User) => {
    setUser(selectedUser);
    setIsAccountChooserOpen(false);
    loadSlackStatus();
  };

  const handleSignOut = () => {
    localStorage.removeItem('auth_token');
    setUser(null);
  };

  if (!user) {
    return <LoginScreen onLoginSuccess={(u) => setUser(u)} />;
  }

  return (
    <div className="flex h-screen bg-[#FFFFFF] text-[#111827] font-sans overflow-hidden">
      {/* Sidebar matching Figma ONB Logo & Account Switcher */}
      <Sidebar
        user={user}
        userAccounts={userAccounts}
        activeTab={activeTab}
        scheduledCount={scheduledCount}
        sentCount={sentCount}
        onTabChange={handleTabChange}
        onComposeClick={handleComposeClick}
        onSelectUser={handleSelectUser}
        onSignOut={handleSignOut}
        onAddAccount={() => setIsAccountChooserOpen(true)}
      />

      {/* Main Right Content Section */}
      <div className="flex-1 flex flex-col h-full min-w-0 bg-white">
        {/* Render Compose View */}
        {viewMode === 'compose' ? (
          <ComposeView
            user={user}
            onBack={() => setViewMode('list')}
            onSuccess={() => {
              loadStats();
              loadData(false);
            }}
          />
        ) : viewMode === 'detail' && selectedJob ? (
          /* Render Email Detail View */
          <EmailDetailView
            job={selectedJob}
            onBack={() => setViewMode('list')}
            onViewEthereal={(url) => setEtherealPreviewUrl(url)}
          />
        ) : activeTab === 'profile' ? (
          /* Render Profile & Settings View */
          <ProfileView
            user={user}
            slackStatus={slackStatus}
            onRefreshSlackStatus={loadSlackStatus}
            onLogout={handleSignOut}
            onSwitchAccount={() => setIsAccountChooserOpen(true)}
          />
        ) : (
          /* Render List View (Scheduled / Sent) */
          <>
            <Header
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              onRefresh={() => loadData(false)}
              loading={loading}
            />
            <main className="flex-1 overflow-y-auto">
              <EmailListView
                jobs={activeTab === 'scheduled' ? scheduledJobs : sentJobs}
                type={activeTab}
                loading={loading}
                onSelectJob={handleSelectJob}
              />
            </main>
          </>
        )}
      </div>

      {/* Ethereal SMTP Preview Modal */}
      <EtherealModal url={etherealPreviewUrl} onClose={() => setEtherealPreviewUrl(null)} />

      {/* Google Account Chooser Modal */}
      <GoogleLoginModal
        isOpen={isAccountChooserOpen}
        onSelectUser={handleSelectUser}
        onClose={() => setIsAccountChooserOpen(false)}
      />
    </div>
  );
};
