'use client';

import { useQuery } from '@tanstack/react-query';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { supabase } from '@/lib/supabaseClient';

interface ChartData {
  month: string;
  count: number;
}

interface RSMInspectionChartProps {
  project?: string;
}

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const RSMInspectionChart = ({ project = 'Track C' }: RSMInspectionChartProps) => {
  const { data: chartData, isLoading, error } = useQuery({
    queryKey: ['rsmInspectionsByMonth', project],
    queryFn: async () => {
      // Fetch all inspection data from 5p table, filtered by project
      let allInspections: any[] = [];
      let from = 0;
      const pageSize = 1000;

      while (true) {
        const { data, error } = await supabase
          .from('5p')
          .select('Date, Technician_Code')
          .eq('Project', project)
          .range(from, from + pageSize - 1);

        if (error) throw new Error(error.message);
        if (!data || data.length === 0) break;

        allInspections = [...allInspections, ...data];
        if (data.length < pageSize) break;
        from += pageSize;
      }

      // Group by month, count unique Technician_Code per day then sum per month
      const uniqueByMonth: Record<string, Set<string>> = {};

      allInspections.forEach((item) => {
        if (item.Date && item.Technician_Code) {
          const dateObj = new Date(item.Date);
          const day = String(dateObj.getDate()).padStart(2, '0');
          const month = dateObj.getMonth(); // 0-11
          const year = dateObj.getFullYear();
          const monthKey = `${year}-${String(month + 1).padStart(2, '0')}`;
          // Composite key: Date + Technician_Code (unique per day)
          const uniqueKey = `${year}-${String(month + 1).padStart(2, '0')}-${day}|${item.Technician_Code}`;

          if (!uniqueByMonth[monthKey]) {
            uniqueByMonth[monthKey] = new Set();
          }
          uniqueByMonth[monthKey].add(uniqueKey);
        }
      });

      // Convert to array and sort by date
      const chartArray: ChartData[] = Object.entries(uniqueByMonth)
        .map(([key, uniqueSet]) => {
          const [year, monthStr] = key.split('-');
          const monthIndex = parseInt(monthStr, 10) - 1;
          return {
            month: `${MONTH_NAMES[monthIndex]} ${year}`,
            sortKey: key,
            count: uniqueSet.size,
          };
        })
        .sort((a, b) => a.sortKey.localeCompare(b.sortKey))
        .map(({ month, count }) => ({ month, count }));

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
        <span style={{ color: '#333' }}>Inspection 5P by month</span>
      </h3>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={chartData}
          margin={{ top: 20, right: 30, left: 0, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis
            dataKey="month"
            tick={{ fontSize: 12 }}
            angle={-45}
            textAnchor="end"
            height={80}
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
            fill="#203864"
            name="จำนวนการตรวจ"
            isAnimationActive={true}
            radius={[8, 8, 0, 0]}
            label={{
              position: 'top',
              fill: '#203864',
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

export default RSMInspectionChart;
