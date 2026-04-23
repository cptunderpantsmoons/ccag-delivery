// components/agents/charts.tsx
'use client';

import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import type { ComponentConfig } from '@/lib/agent-types';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

interface ChartData {
  labels: string[];
  datasets: { label: string; data: number[] }[];
}

export function AgentBarChart({ config, data }: { config: ComponentConfig; data: ChartData }) {
  const chartData = data.labels.map((label, i) => ({
    name: label,
    ...Object.fromEntries(data.datasets.map((ds) => [ds.label, ds.data[i] || 0])),
  }));

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
        <XAxis dataKey="name" stroke="var(--text-secondary)" fontSize={12} />
        <YAxis stroke="var(--text-secondary)" fontSize={12} />
        <Tooltip
          contentStyle={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: '8px',
          }}
        />
        <Legend />
        {data.datasets.map((ds, i) => (
          <Bar key={ds.label} dataKey={ds.label} fill={COLORS[i % COLORS.length]} radius={[4, 4, 0, 0]} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}

export function AgentLineChart({ config, data }: { config: ComponentConfig; data: ChartData }) {
  const chartData = data.labels.map((label, i) => ({
    name: label,
    ...Object.fromEntries(data.datasets.map((ds) => [ds.label, ds.data[i] || 0])),
  }));

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
        <XAxis dataKey="name" stroke="var(--text-secondary)" fontSize={12} />
        <YAxis stroke="var(--text-secondary)" fontSize={12} />
        <Tooltip
          contentStyle={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: '8px',
          }}
        />
        <Legend />
        {data.datasets.map((ds, i) => (
          <Line
            key={ds.label}
            type="monotone"
            dataKey={ds.label}
            stroke={COLORS[i % COLORS.length]}
            strokeWidth={2}
            dot={{ r: 4 }}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}

export function AgentPieChart({ config, data }: { config: ComponentConfig; data: ChartData }) {
  const pieData = data.labels.map((label, i) => ({
    name: label,
    value: data.datasets[0]?.data[i] || 0,
  }));

  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie
          data={pieData}
          cx="50%"
          cy="50%"
          labelLine={false}
          label={(props: { name?: string; percent?: number }) =>
            `${props.name || ''}: ${((props.percent || 0) * 100).toFixed(0)}%`
          }
          outerRadius={100}
          fill="#8884d8"
          dataKey="value"
        >
          {pieData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: '8px',
          }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}

export function KpiCard({ title, value, subtitle }: { title: string; value: string | number; subtitle?: string }) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm">
      <h4 className="text-sm font-medium text-[var(--text-secondary)]">{title}</h4>
      <div className="mt-2 text-2xl font-bold text-[var(--text-primary)]">{value}</div>
      {subtitle && <p className="mt-1 text-xs text-[var(--text-tertiary)]">{subtitle}</p>}
    </div>
  );
}
