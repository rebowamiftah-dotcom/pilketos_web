import React from 'react';

interface Stats {
  total_pkl: number;
  sudah_voting: number;
  belum_voting: number;
  total_suara: number;
  partisipasi: number;
}

interface StatCardsProps {
  stats: Stats;
}

export default function StatCards({ stats }: StatCardsProps) {
  const cards = [
    {
      id: 'stat-total-pkl',
      label: 'Total Pemilih PKL',
      value: stats.total_pkl,
      suffix: '',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ),
      color: 'text-accent bg-accent/10',
      description: 'Siswa PKL terdaftar',
    },
    {
      id: 'stat-sudah-voting',
      label: 'Sudah Voting',
      value: stats.sudah_voting,
      suffix: '',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      color: 'text-emerald-600 bg-emerald-50',
      description: 'Suara telah dikirim',
    },
    {
      id: 'stat-belum-voting',
      label: 'Belum Voting',
      value: stats.belum_voting,
      suffix: '',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      color: 'text-amber-600 bg-amber-50',
      description: 'Menunggu pemilihan',
    },
    {
      id: 'stat-total-suara',
      label: 'Total Suara',
      value: stats.total_suara,
      suffix: '',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
      ),
      color: 'text-primary bg-primary/10',
      description: 'Suara masuk sistem',
    },
    {
      id: 'stat-partisipasi',
      label: 'Partisipasi',
      value: stats.partisipasi,
      suffix: '%',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
        </svg>
      ),
      color: 'text-violet-600 bg-violet-50',
      description: 'Tingkat partisipasi',
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
      {cards.map((card) => (
        <div
          key={card.id}
          className="bg-card rounded-2xl border border-border shadow-card p-4 sm:p-5"
        >
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${card.color}`}>
            {card.icon}
          </div>
          <div className="text-2xl sm:text-3xl font-800 text-foreground tabular-nums">
            {card.value}{card.suffix}
          </div>
          <div className="text-xs font-700 text-foreground mt-1">{card.label}</div>
          <div className="text-xs text-muted-foreground mt-0.5">{card.description}</div>
        </div>
      ))}
    </div>
  );
}