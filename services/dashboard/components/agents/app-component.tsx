// components/agents/app-component.tsx
'use client';

import { useAgentStore } from '@/lib/agent-store';
import { aggregateColumn } from '@/lib/excel-parser';
import { AgentBarChart, AgentLineChart, AgentPieChart, KpiCard } from './charts';
import type { AppComponent as AppComponentType } from '@/lib/agent-types';

export function AppComponent({ component }: { component: AppComponentType }) {
  const { type, title, config } = component;
  const { canvasContent } = useAgentStore();
  const excelData = canvasContent?.excelData;

  // Compute real data from Excel if available
  function computeValue(column: string, fn: 'sum' | 'avg' | 'count' | 'min' | 'max'): string {
    if (!excelData) return '—';
    const val = aggregateColumn(excelData, column, fn);
    return val.toLocaleString();
  }

  // Build real chart data from Excel if available
  function buildChartData() {
    if (!excelData) return null;
    
    // Use first categorical column as labels, first numeric as values
    const catCol = config.columns?.find((c) => excelData.headers.includes(c)) || excelData.headers[0];
    const numCol = config.aggregations?.[0]?.column;
    
    const catIdx = excelData.headers.indexOf(catCol);
    const numIdx = numCol ? excelData.headers.indexOf(numCol) : 1;
    
    const labels = excelData.rows.slice(0, 6).map((r) => String(r[catIdx] || ''));
    const values = excelData.rows.slice(0, 6).map((r) => {
      const v = r[numIdx];
      return typeof v === 'number' ? v : Number(v) || 0;
    });

    return {
      labels,
      datasets: config.aggregations?.map((agg) => ({
        label: agg.alias,
        data: values,
      })) || [{ label: 'Value', data: values }],
    };
  }

  const chartData = buildChartData();

  switch (type) {
    case 'kpi': {
      const agg = config.aggregations?.[0];
      return (
        <KpiCard
          title={title}
          value={agg ? computeValue(agg.column, agg.function) : '—'}
          subtitle={agg ? `${agg.function}(${agg.column})` : config.dataSource}
        />
      );
    }
    case 'chart': {
      if (!chartData) {
        return (
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm">
            <h4 className="text-sm font-semibold text-[var(--text-primary)]">{title}</h4>
            <p className="mt-2 text-xs text-[var(--text-tertiary)]">Upload Excel data to see chart</p>
          </div>
        );
      }
      if (config.chartType === 'line') {
        return (
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm">
            <h4 className="mb-4 text-sm font-semibold text-[var(--text-primary)]">{title}</h4>
            <AgentLineChart config={config} data={chartData} />
          </div>
        );
      }
      if (config.chartType === 'pie') {
        return (
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm">
            <h4 className="mb-4 text-sm font-semibold text-[var(--text-primary)]">{title}</h4>
            <AgentPieChart config={config} data={chartData} />
          </div>
        );
      }
      return (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm">
          <h4 className="mb-4 text-sm font-semibold text-[var(--text-primary)]">{title}</h4>
          <AgentBarChart config={config} data={chartData} />
        </div>
      );
    }
    case 'table': {
      const rows = excelData?.rows.slice(0, 10) || [];
      const headers = config.columns?.filter((c) => excelData?.headers.includes(c)) || excelData?.headers.slice(0, 4) || [];
      
      return (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm">
          <h4 className="mb-4 text-sm font-semibold text-[var(--text-primary)]">{title}</h4>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border)]">
                  {headers.map((col) => (
                    <th key={col} className="px-3 py-2 text-left font-medium text-[var(--text-secondary)]">
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => (
                  <tr key={i} className="border-b border-[var(--border)] last:border-0">
                    {headers.map((col) => {
                      const idx = excelData?.headers.indexOf(col) ?? -1;
                      return (
                        <td key={col} className="px-3 py-2 text-[var(--text-primary)]">
                          {idx >= 0 ? String(row[idx] ?? '') : ''}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      );
    }
    case 'form':
      return (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm">
          <h4 className="mb-4 text-sm font-semibold text-[var(--text-primary)]">{title}</h4>
          <div className="space-y-3">
            {config.columns?.map((col) => (
              <div key={col}>
                <label className="block text-xs text-[var(--text-secondary)]">{col}</label>
                <input
                  type="text"
                  className="carbon-input mt-1 w-full px-3 py-2 text-sm"
                  placeholder={`Enter ${col}`}
                />
              </div>
            )) || <p className="text-sm text-[var(--text-tertiary)]">Form fields will be generated here</p>}
          </div>
        </div>
      );
    default:
      return (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm">
          <h4 className="text-sm font-semibold text-[var(--text-primary)]">{title}</h4>
          <p className="text-xs text-[var(--text-tertiary)]">Component type: {type}</p>
        </div>
      );
  }
}
