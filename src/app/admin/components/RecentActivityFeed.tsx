'use client';

import React, { useState, useEffect } from 'react';

interface ActivityItem {
  id: string;
  time: string;
  message: string;
  type: 'vote' | 'system' | 'info';
}

const INITIAL_ACTIVITIES: ActivityItem[] = [
  { id: 'act-001', time: '10:45', message: 'Suara baru masuk — Pasangan 03', type: 'vote' },
  { id: 'act-002', time: '10:20', message: 'Suara baru masuk — Pasangan 02', type: 'vote' },
  { id: 'act-003', time: '10:00', message: 'Suara baru masuk — Pasangan 02', type: 'vote' },
  { id: 'act-004', time: '09:45', message: 'Suara baru masuk — Pasangan 01', type: 'vote' },
  { id: 'act-005', time: '09:15', message: 'Suara baru masuk — Pasangan 01', type: 'vote' },
  { id: 'act-006', time: '08:30', message: 'Suara baru masuk — Pasangan 01', type: 'vote' },
  { id: 'act-007', time: '08:00', message: 'Sistem voting dibuka', type: 'system' },
];

const MOCK_NEW_VOTES = [
  'Pasangan 01',
  'Pasangan 02',
  'Pasangan 03',
  'Pasangan 01',
  'Pasangan 02',
];

interface RecentActivityFeedProps {
  tickCount: number;
}

export default function RecentActivityFeed({ tickCount }: RecentActivityFeedProps) {
  const [activities, setActivities] = useState<ActivityItem[]>(INITIAL_ACTIVITIES);

  useEffect(() => {
    if (tickCount === 0) return;
    const pick = MOCK_NEW_VOTES[tickCount % MOCK_NEW_VOTES.length];
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const timeStr = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
    const newItem: ActivityItem = {
      id: `act-live-${tickCount}`,
      time: timeStr,
      message: `Suara baru masuk — ${pick}`,
      type: 'vote',
    };
    setActivities((prev) => [newItem, ...prev.slice(0, 9)]);
  }, [tickCount]);

  return (
    <div className="bg-card rounded-2xl border border-border shadow-card p-5 sm:p-6 h-full">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="font-700 text-foreground text-base">Aktivitas Terkini</h3>
          <p className="text-muted-foreground text-xs mt-0.5">Log suara masuk</p>
        </div>
        <div className="flex items-center gap-1.5 text-xs font-600 text-emerald-700">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block pulse-live"></span>
          Live
        </div>
      </div>

      <div className="space-y-2.5 max-h-80 overflow-y-auto">
        {activities.map((item) => (
          <div
            key={item.id}
            className="flex items-start gap-3 p-2.5 rounded-xl hover:bg-muted/50 transition-colors"
          >
            <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${
              item.type === 'vote' ?'bg-accent/10'
                : item.type === 'system' ?'bg-emerald-50' :'bg-muted'
            }`}>
              {item.type === 'vote' ? (
                <svg className="w-3.5 h-3.5 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg className="w-3.5 h-3.5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-500 text-foreground leading-tight">{item.message}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{item.time} WIB</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}