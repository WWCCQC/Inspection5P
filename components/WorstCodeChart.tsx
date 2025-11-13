'use client';

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';
import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell, LabelList } from 'recharts';

type FivePData = {
  Code: string | null;
  Item: string | null;
  P: string | null;
  Score: string | null;
};

type WorstCodeChartData = {
  code: string;
  item: string;
  percentCritical: number;
};

type WorstCodeChartProps = {
  project?: string;
};

const WorstCodeChart = ({ project }: WorstCodeChartProps = {}) => {
  const { data, isLoading, error } = useQuery({
    queryKey: ['worst-code-chart', project],
    queryFn: async () => {
      let allData: FivePData[] = [];
      let page = 0;
      const pageSize = 1000;
      let hasMore = true;

      while (hasMore) {
        let query = supabase
          .from('5p')
          .select('Code, Item, P, Score')
          .range(page * pageSize, (page + 1) * pageSize - 1);

        if (project) {
          query = query.eq('Project', project);
        }

        const { data: fivePData, error } = await query;

        if (error) {
          console.error('Supabase error:', error);
          throw error;
        }

        if (!fivePData || fivePData.length === 0) {
          hasMore = false;
        } else {
          allData = [...allData, ...(fivePData as FivePData[])];
          page++;
        }
      }

      return allData;
    },
  });

  const chartData: WorstCodeChartData[] = React.useMemo(() => {
    if (!data || data.length === 0) return [];

    const codeMap = new Map<string, {
      item: string;
      scores: number[];
    }>();

    data.forEach(item => {
      const code = item.Code || '-';
      const scoreStr = (item.Score || '').toString().trim().toUpperCase();
      
      // Skip invalid scores (null, empty, or "NA")
      if (!scoreStr || scoreStr === '' || scoreStr === 'NA') {
        return;
      }

      const scoreValue = parseFloat(item.Score || '0');
      const score = isNaN(scoreValue) ? 0 : scoreValue;

      // Only include valid scores (0, 1, 2, 3, 4, 5)
      if (score < 0 || score > 5) {
        return;
      }

      if (!codeMap.has(code)) {
        codeMap.set(code, {
          item: item.Item || '-',
          scores: [],
        });
      }

      const codeData = codeMap.get(code)!;
      codeData.scores.push(score);
    });

    const summary: Array<{
      code: string;
      item: string;
      percentCritical: number;
      avgScore: number;
    }> = [];

    codeMap.forEach((codeData, code) => {
      const totalCheck = codeData.scores.length;
      const criticalCount = codeData.scores.filter(s => s <= 1).length;
      const totalScore = codeData.scores.reduce((sum, s) => sum + s, 0);
      const avgScore = totalCheck > 0 ? totalScore / totalCheck : 0;
      const percentCritical = totalCheck > 0 ? (criticalCount / totalCheck) * 100 : 0;

      summary.push({
        code,
        item: codeData.item,
        percentCritical,
        avgScore,
      });
    });

    // Sort by %Critical descending, then by avg_score ascending
    summary.sort((a, b) => {
      if (b.percentCritical !== a.percentCritical) {
        return b.percentCritical - a.percentCritical;
      }
      return a.avgScore - b.avgScore;
    });

    // Take top 10 (already sorted from highest to lowest %Critical)
    const top10 = summary.slice(0, 10);
    return top10.map(item => ({
      code: item.code,
      item: item.item,
      percentCritical: parseFloat(item.percentCritical.toFixed(1)),
    }));
  }, [data]);

  if (isLoading) return <div className="text-center py-4">Loading chart…</div>;
  if (error) return <div className="text-red-600 py-4">Error loading chart data</div>;
  if (chartData.length === 0) return <div className="text-center py-4">No data available</div>;

  // Custom tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div style={{
          backgroundColor: 'white',
          padding: '10px',
          border: '1px solid #ccc',
          borderRadius: '4px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
          <p style={{ margin: '0 0 5px 0', fontWeight: 'bold', fontSize: '13px' }}>
            {payload[0].payload.code}
          </p>
          <p style={{ margin: '0 0 5px 0', fontSize: '12px', color: '#666' }}>
            {payload[0].payload.item}
          </p>
          <p style={{ margin: '3px 0', fontSize: '12px', color: '#D01716' }}>
            %Critical: <strong>{payload[0].value}%</strong>
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white rounded-lg border shadow-sm overflow-hidden" style={{ height: '100%' }}>
      <div 
        style={{
          padding: '12px 16px',
          backgroundColor: '#5c6bc0',
          color: 'white',
          fontWeight: '600',
          fontSize: '16px',
        }}
      >
        5P Worst Code Chart
      </div>
      <div style={{ padding: '16px' }}>
        <ResponsiveContainer width="100%" height={600}>
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{ top: 5, right: 10, left: 5, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              type="number" 
              domain={[0, 100]}
              tick={{ fontSize: 10 }}
            />
            <YAxis 
              type="category" 
              dataKey="code" 
              width={50}
              tick={{ fontSize: 10 }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar 
              dataKey="percentCritical" 
              name="%Critical" 
              fill="#D01716"
              radius={[0, 4, 4, 0]}
            >
              <LabelList 
                dataKey="percentCritical" 
                position="right" 
                formatter={(value: number) => value > 0 ? `${value}%` : ''}
                style={{ fontSize: '10px', fill: '#333', fontWeight: '500' }}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default WorstCodeChart;
