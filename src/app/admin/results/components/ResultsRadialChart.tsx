'use client';

import React from 'react';
import {
  RadialBarChart,
  RadialBar,
  ResponsiveContainer,
  PolarAngleAxis,
} from 'recharts';

interface Props {
  voted: number;
  total: number;
  percentage: number;
}

export default function ResultsRadialChart({ voted, total, percentage }: Props) {
  const data = [{ name: 'Partisipasi', value: percentage, fill: '#3b82f6' }];

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-48 h-48">
        <ResponsiveContainer width="100%" height="100%">
          <RadialBarChart
            cx="50%"
            cy="50%"
            innerRadius="65%"
            outerRadius="90%"
            data={data}
            startAngle={90}
            endAngle={-270}
          >
            <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
            <RadialBar
              dataKey="value"
              cornerRadius={8}
              background={{ fill: 'var(--muted)' }}
            />
          </RadialBarChart>
        </ResponsiveContainer>
        {/* Center text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-800 text-foreground tabular-nums">{percentage}%</span>
          <span className="text-xs text-muted-foreground font-600">Partisipasi</span>
        </div>
      </div>

      <div className="flex gap-6 mt-4 text-center">
        <div>
          <div className="text-xl font-800 text-emerald-600 tabular-nums">{voted}</div>
          <div className="text-xs text-muted-foreground font-600">Sudah Voting</div>
        </div>
        <div className="w-px bg-border"></div>
        <div>
          <div className="text-xl font-800 text-amber-600 tabular-nums">{total - voted}</div>
          <div className="text-xs text-muted-foreground font-600">Belum Voting</div>
        </div>
        <div className="w-px bg-border"></div>
        <div>
          <div className="text-xl font-800 text-foreground tabular-nums">{total}</div>
          <div className="text-xs text-muted-foreground font-600">Total PKL</div>
        </div>
      </div>
    </div>
  );
}