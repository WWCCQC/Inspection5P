'use client';

import { useQuery } from '@tanstack/react-query';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { supabase } from '@/lib/supabaseClient';
import { useProjectFilter } from '@/app/track-rollout/ProjectFilterContext';

interface ChartData {
  rsm: string;
  count: number;
}

interface AverageScoreChartProps {
  project?: string;
}

const AverageScoreChart = ({ project = 'Track C' }: AverageScoreChartProps) => {
  const { selectedProject } = useProjectFilter();

  const { data: chartData, isLoading, error } = useQuery({
    queryKey: ['inspectionByRSM', project, selectedProject],
    queryFn: async () => {
      // ดึงข้อมูล RSM, Date, Technician_Code จากตาราง 5p
      let allData: any[] = [];
      let from = 0;
      const pageSize = 1000;

      while (true) {
        const { data, error } = await supabase
          .from('5p')
          .select('RSM, Date, Technician_Code, "Type of work"')
          .eq('Project', project)
          .range(from, from + pageSize - 1);

        if (error) throw new Error(error.message);
        if (!data || data.length === 0) break;

        allData = [...allData, ...(data as any[])];
        if (data.length < pageSize) break;
        from += pageSize;
      }

      // Filter by selectedProject if not 'All'
      if (selectedProject !== 'All') {
        allData = allData.filter(item => {
          const typeOfWork = item['Type of work'];
          return typeOfWork && typeOfWork.startsWith(selectedProject);
        });
      }

      // Group by RSM, count unique (Date + Technician_Code) per RSM
      const uniqueByRSM: Record<string, Set<string>> = {};

      allData.forEach((item) => {
        if (item.RSM && item.Date && item.Technician_Code) {
          const dateObj = new Date(item.Date);
          const day = String(dateObj.getDate()).padStart(2, '0');
          const month = String(dateObj.getMonth() + 1).padStart(2, '0');
          const year = dateObj.getFullYear();
          const uniqueKey = `${year}-${month}-${day}|${item.Technician_Code}`;

          if (!uniqueByRSM[item.RSM]) {
            uniqueByRSM[item.RSM] = new Set();
          }
          uniqueByRSM[item.RSM].add(uniqueKey);
        }
      });

      // Convert to array and sort by RSM name
      const chartArray: ChartData[] = Object.entries(uniqueByRSM)
        .map(([rsm, uniqueSet]) => ({
          rsm,
          count: uniqueSet.size,
        }))
        .sort((a, b) => a.rsm.localeCompare(b.rsm, 'th'));

      return chartArray;
    },
  });

  if (isLoading) {
    return (
      <div style={{ padding: '20px', textAlign: 'center', color: '#666' }}>
        กำลังโหลดข้อมูล...
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '20px', textAlign: 'center', color: '#d90429' }}>
        เกิดข้อผิดพลาดในการโหลดข้อมูล
      </div>
    );
  }

  return (
    <div style={{ width: '100%', height: 280, marginTop: '20px' }}>
      <h3 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '12px' }}>
        <span style={{ color: '#333' }}>Inspection 5P by RBM</span>
      </h3>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={chartData}
          margin={{ top: 20, right: 30, left: 0, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis
            dataKey="rsm"
            tick={{ fontSize: 11 }}
            angle={-45}
            textAnchor="end"
            height={100}
          />
          <YAxis tick={{ fontSize: 12 }} />
          <Tooltip
            contentStyle={{
              backgroundColor: '#fff',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              padding: '12px',
            }}
            formatter={(value: number) => [`${value} ครั้ง`, 'จำนวนการตรวจ']}
          />
          <Legend verticalAlign="top" height={36} />
          <Bar
            dataKey="count"
            fill="#5c6bc0"
            name="จำนวนการตรวจ"
            isAnimationActive={true}
            radius={[8, 8, 0, 0]}
            label={{
              position: 'top',
              fill: '#5c6bc0',
              fontSize: 12,
              fontWeight: 600,
              offset: 5,
            }}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default AverageScoreChart;
