'use client';

import React from 'react';
import dynamic from 'next/dynamic';

const VoteBarChart = dynamic(() => import('./VoteBarChart'), { ssr: false });

interface Aggregate {
  candidate_id: string;
  nomor_urut: number;
  nama_ketua: string;
  nama_wakil: string;
  vote_count: number;
  percentage: number;
}

interface VoteResultsChartProps {
  aggregates: Aggregate[];
  totalVotes: number;
}

export default function VoteResultsChart({ aggregates, totalVotes }: VoteResultsChartProps) {
  const sorted = [...aggregates].sort((a, b) => b.vote_count - a.vote_count);

  return (
    <div className="bg-card rounded-2xl border border-border shadow-card p-5 sm:p-6 h-full">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="font-700 text-foreground text-base">Hasil Voting Sementara</h3>
          <p className="text-muted-foreground text-xs mt-0.5">
            Total {totalVotes} suara masuk &bull; Data rahasia agregat
          </p>
        </div>
        <span className="text-xs bg-amber-50 text-amber-700 border border-amber-200 px-2.5 py-1 rounded-full font-600">
          Sementara
        </span>
      </div>

      {/* Chart */}
      <VoteBarChart aggregates={aggregates} />

      {/* Progress bars */}
      <div className="mt-5 space-y-3">
        {sorted.map((agg, index) => {
          const medals = ['🥇', '🥈', '🥉'];
          return (
            <div key={`result-bar-${agg.candidate_id}`}>
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-sm">{medals[index] || ''}</span>
                  <span className="text-sm font-700 text-foreground">
                    Pasangan {String(agg.nomor_urut).padStart(2, '0')}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {agg.nama_ketua} &amp; {agg.nama_wakil}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-700 text-foreground tabular-nums">{agg.vote_count} suara</span>
                  <span className="text-xs text-muted-foreground tabular-nums w-12 text-right">{agg.percentage}%</span>
                </div>
              </div>
              <div className="w-full bg-muted rounded-full h-2.5 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{
                    width: `${agg.percentage}%`,
                    background: index === 0
                      ? 'linear-gradient(90deg, #1d4ed8, #3b82f6)'
                      : index === 1
                      ? 'linear-gradient(90deg, #7c3aed, #a78bfa)'
                      : 'linear-gradient(90deg, #0891b2, #22d3ee)',
                  }}
                ></div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}