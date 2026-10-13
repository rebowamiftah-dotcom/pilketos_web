import React from 'react';

interface VotingHeaderProps {
  voterName: string;
  voterKelas: string;
}

export default function VotingHeader({ voterName, voterKelas }: VotingHeaderProps) {
  return (
    <div className="hero-gradient py-8">
      <div className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 text-white text-xs font-600 mb-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block pulse-live"></span>
              Voting Sedang Berlangsung
            </div>
            <h1 className="text-xl sm:text-2xl font-800 text-white tracking-tight">
              PEMILIHAN KETUA &amp; WAKIL OSIS
            </h1>
            <p className="text-blue-200 text-sm font-500 mt-1">
              Periode Oktober 2026 &bull; PILKETOS DIGITAL
            </p>
          </div>

          {/* Voter identity */}
          <div className="flex items-center gap-3 bg-white/15 backdrop-blur-sm rounded-2xl px-4 py-3 border border-white/25">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <div>
              <p className="text-white font-700 text-sm">{voterName}</p>
              <p className="text-blue-200 text-xs font-500">{voterKelas} &bull; Siswa PKL ✓</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}