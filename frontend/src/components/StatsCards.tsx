import React from 'react';
import { DashboardStats } from '../types';
import { Clock, Send, ShieldAlert, AlertTriangle } from 'lucide-react';

interface StatsCardsProps {
  stats: DashboardStats;
}

export const StatsCards: React.FC<StatsCardsProps> = ({ stats }) => {
  const cards = [
    {
      title: 'Scheduled Emails',
      count: stats.scheduled,
      icon: Clock,
      color: 'text-sky-400',
      bg: 'bg-sky-500/10',
      border: 'border-sky-500/20',
      desc: 'BullMQ Delayed Queue',
    },
    {
      title: 'Successfully Sent',
      count: stats.sent,
      icon: Send,
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/10',
      border: 'border-emerald-500/20',
      desc: 'Delivered via Ethereal SMTP',
    },
    {
      title: 'Rate Limited',
      count: stats.rateLimited,
      icon: ShieldAlert,
      color: 'text-amber-400',
      bg: 'bg-amber-500/10',
      border: 'border-amber-500/20',
      desc: 'Delayed to next hour window',
    },
    {
      title: 'Failed Deliveries',
      count: stats.failed,
      icon: AlertTriangle,
      color: 'text-rose-400',
      bg: 'bg-rose-500/10',
      border: 'border-rose-500/20',
      desc: 'SMTP error trace',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {cards.map((card, idx) => {
        const Icon = card.icon;
        return (
          <div
            key={idx}
            className={`p-5 rounded-2xl border ${card.border} glass-panel flex items-center justify-between transition-all hover:translate-y-[-2px]`}
          >
            <div>
              <p className="text-xs font-medium text-slate-400">{card.title}</p>
              <h3 className="text-2xl font-bold text-white mt-1">{card.count.toLocaleString()}</h3>
              <p className="text-[11px] text-slate-500 mt-1">{card.desc}</p>
            </div>
            <div className={`p-3 rounded-xl ${card.bg} ${card.color}`}>
              <Icon className="h-6 w-6" />
            </div>
          </div>
        );
      })}
    </div>
  );
};
