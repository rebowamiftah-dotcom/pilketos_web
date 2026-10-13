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
  LabelList,
} from 'recharts';

interface Aggregate {
  candidate_id: string;
  nomor_urut: number;
  nama_ketua: string;
  nama_wakil: string;
  vote_count: number;
  percentage: number;
}

interface Props {
  aggregates: Aggregate[];
}

const COLORS = ['#3b82f6', '#8b5cf6', '#06b6d4'];

function CustomTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: Aggregate }> }) {
  if (!active || !payload || !payload.length) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-card border border-border rounded-xl shadow-modal p-3">
      <p className="font-700 text-foreground text-sm">Pasangan {String(d.nomor_urut).padStart(2, '0')}</p>
      <p className="text-xs text-muted-foreground mt-0.5">{d.nama_ketua} &amp; {d.nama_wakil}</p>
      <p className="font-700 text-accent mt-1 text-sm">{d.vote_count} suara — {d.percentage}%</p>
    </div>
  );
}

export default function ResultsBarChartFull({ aggregates }: Props) {
  const data = aggregates.map((a) => ({
    ...a,
    name: `Pasangan ${String(a.nomor_urut).padStart(2, '0')}`,
  }));

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 16, right: 8, left: -16, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
        <XAxis
          dataKey="name"
          tick={{ fontSize: 12, fill: 'var(--muted-foreground)', fontWeight: 600 }}
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
        <Bar dataKey="vote_count" radius={[8, 8, 0, 0]} maxBarSize={72}>
          <LabelList dataKey="vote_count" position="top" style={{ fontSize: 12, fontWeight: 700, fill: 'var(--foreground)' }} />
          {data.map((_, index) => (
            <Cell key={`result-cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}