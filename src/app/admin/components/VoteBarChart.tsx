'use client';

import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';

interface Aggregate {
  candidate_id: string;
  nomor_urut: number;
  nama_ketua: string;
  vote_count: number;
  percentage: number;
}

interface VoteBarChartProps {
  aggregates: Aggregate[];
}

const COLORS = ['#3b82f6', '#8b5cf6', '#06b6d4'];

function CustomTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: Aggregate; value: number }> }) {
  if (!active || !payload || !payload.length) return null;
  const data = payload[0].payload;
  return (
    <div className="bg-card border border-border rounded-xl shadow-modal p-3 text-sm">
      <p className="font-700 text-foreground mb-1">
        Pasangan {String(data.nomor_urut).padStart(2, '0')}
      </p>
      <p className="text-muted-foreground text-xs">{data.nama_ketua}</p>
      <p className="font-700 text-accent mt-1">{data.vote_count} suara ({data.percentage}%)</p>
    </div>
  );
}

export default function VoteBarChart({ aggregates }: VoteBarChartProps) {
  const data = aggregates.map((a) => ({
    ...a,
    name: `Pasangan ${String(a.nomor_urut).padStart(2, '0')}`,
  }));

  return (
    <ResponsiveContainer width="100%" height={180}>
      <BarChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
        <XAxis
          dataKey="name"
          tick={{ fontSize: 11, fill: 'var(--muted-foreground)', fontWeight: 600 }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
          axisLine={false}
          tickLine={false}
          allowDecimals={false}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'var(--muted)', opacity: 0.5 }} />
        <Bar dataKey="vote_count" radius={[6, 6, 0, 0]} maxBarSize={60}>
          {data.map((_, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}