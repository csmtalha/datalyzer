'use client';

import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { ChartConfig } from '@/types/analytics';

interface ChartPanelProps {
  config: ChartConfig;
}

const TOOLTIP_STYLE = {
  backgroundColor: '#0f172a',
  border: '1px solid #1e293b',
  borderRadius: '12px',
  color: '#e2e8f0',
  fontSize: '12px',
};

function truncateLabel(label: string, max = 12): string {
  return String(label).length > max ? String(label).substring(0, max) + '…' : String(label);
}

export function ChartPanel({ config }: ChartPanelProps) {
  const height = 280;

  const chartContent = () => {
    switch (config.type) {
      case 'bar':
        return (
          <ResponsiveContainer width="100%" height={height}>
            <BarChart data={config.data} margin={{ top: 5, right: 10, bottom: 40, left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis
                dataKey={config.xKey}
                tick={{ fill: '#64748b', fontSize: 11 }}
                tickFormatter={v => truncateLabel(String(v), 10)}
                angle={-30}
                textAnchor="end"
                interval={0}
              />
              <YAxis tick={{ fill: '#64748b', fontSize: 11 }} />
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <Bar dataKey={config.yKey!} fill={config.color} radius={[4, 4, 0, 0]} maxBarSize={50} />
            </BarChart>
          </ResponsiveContainer>
        );

      case 'line':
        return (
          <ResponsiveContainer width="100%" height={height}>
            <LineChart data={config.data} margin={{ top: 5, right: 10, bottom: 40, left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis
                dataKey={config.xKey}
                tick={{ fill: '#64748b', fontSize: 10 }}
                tickFormatter={v => truncateLabel(String(v), 8)}
                angle={-30}
                textAnchor="end"
                interval={Math.ceil(config.data.length / 10)}
              />
              <YAxis tick={{ fill: '#64748b', fontSize: 11 }} />
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <Line
                type="monotone"
                dataKey={config.yKey}
                stroke={config.color}
                dot={false}
                strokeWidth={2}
              />
            </LineChart>
          </ResponsiveContainer>
        );

      case 'pie':
        return (
          <ResponsiveContainer width="100%" height={height}>
            <PieChart>
              <Pie
                data={config.data}
                dataKey={config.dataKey!}
                nameKey="label"
                cx="50%"
                cy="50%"
                outerRadius={100}
                innerRadius={50}
                paddingAngle={2}
              >
                {config.data.map((entry, i) => (
                  <Cell key={i} fill={(entry as Record<string, string>).color || config.color} />
                ))}
              </Pie>
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <Legend
                formatter={(v) => truncateLabel(String(v), 14)}
                wrapperStyle={{ fontSize: 11, color: '#94a3b8' }}
              />
            </PieChart>
          </ResponsiveContainer>
        );

      case 'histogram':
        return (
          <ResponsiveContainer width="100%" height={height}>
            <BarChart data={config.data} margin={{ top: 5, right: 10, bottom: 40, left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis
                dataKey={config.xKey}
                tick={{ fill: '#64748b', fontSize: 10 }}
                tickFormatter={v => truncateLabel(String(v), 8)}
                angle={-30}
                textAnchor="end"
                interval={Math.ceil(config.data.length / 8)}
              />
              <YAxis tick={{ fill: '#64748b', fontSize: 11 }} />
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <Bar dataKey={config.yKey!} fill={config.color} radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        );

      case 'scatter':
        return (
          <ResponsiveContainer width="100%" height={height}>
            <ScatterChart margin={{ top: 5, right: 10, bottom: 20, left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="x" type="number" name={config.xKey} tick={{ fill: '#64748b', fontSize: 11 }} />
              <YAxis dataKey="y" type="number" name={config.yKey} tick={{ fill: '#64748b', fontSize: 11 }} />
              <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ strokeDasharray: '3 3' }} />
              <Scatter data={config.data} fill={config.color} opacity={0.7} />
            </ScatterChart>
          </ResponsiveContainer>
        );

      default:
        return <div className="text-slate-500 text-sm text-center py-10">Unknown chart type</div>;
    }
  };

  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 hover:border-slate-700 transition-colors">
      <h3 className="text-sm font-semibold text-slate-300 mb-4 truncate">{config.title}</h3>
      {chartContent()}
    </div>
  );
}
