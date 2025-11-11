'use client';

import { useQuery } from '@tanstack/react-query';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { supabase } from '@/lib/supabaseClient';

interface InspectionData {
  Date: string;
  Technician_Code: string;
}

interface ChartData {
  date: string;
  count: number;
}

const DailyInspectionChart = () => {
  const { data: chartData, isLoading, error } = useQuery({
    queryKey: ['dailyInspections'],
    queryFn: async () => {
      const { data, error } = await supabase.from('5p').select('Date, Technician_Code, Project');
      
      if (error) throw new Error(error.message);
      
      // Group by date and count unique technician codes
      const groupedData: Record<string, Set<string>> = {};
      
      (data as any[]).forEach((item) => {
        // Filter for Track C only
        if (item.Project !== 'Track C') return;
        
        if (item.Date && item.Technician_Code) {
          // Parse date and format as DD/MM/YYYY (AD/Gregorian calendar)
          const dateObj = new Date(item.Date);
          const day = String(dateObj.getDate()).padStart(2, '0');
          const month = String(dateObj.getMonth() + 1).padStart(2, '0');
          const year = dateObj.getFullYear();
          const formattedDate = `${day}/${month}/${year}`;
          
          // Use Set to store unique technician codes
          if (!groupedData[formattedDate]) {
            groupedData[formattedDate] = new Set();
          }
          groupedData[formattedDate].add(item.Technician_Code);
        }
      });
      
      // Convert to array with count of unique technician codes
      const chartArray: ChartData[] = Object.entries(groupedData).map(([date, technicianSet]) => ({
        date,
        count: technicianSet.size,
      }));
      
      // Sort by date (convert back to Date object for sorting)
      chartArray.sort((a, b) => {
        const dateA = new Date(a.date.split('/').reverse().join('-'));
        const dateB = new Date(b.date.split('/').reverse().join('-'));
        return dateA.getTime() - dateB.getTime();
      });
      
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
      <h3 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '12px', color: '#333' }}>
        Daily-Inspection 5P
      </h3>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={chartData}
          margin={{ top: 5, right: 30, left: 0, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 12 }}
            angle={-45}
            textAnchor="end"
            height={80}
          />
          <YAxis
            tick={{ fontSize: 12 }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#fff',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              padding: '12px',
            }}
            formatter={(value) => [`${value} ครั้ง`, 'จำนวน']}
            labelFormatter={(label) => `วันที่: ${label}`}
          />
          <Legend verticalAlign="top" height={36} />
          <Line
            type="monotone"
            dataKey="count"
            stroke="#12239E"
            strokeWidth={2}
            dot={{ fill: '#12239E', r: 4 }}
            activeDot={{ r: 6 }}
            name="จำนวน"
            isAnimationActive={true}
            label={{
              position: 'top',
              fill: '#12239E',
              fontSize: 12,
              fontWeight: 600,
              offset: 5
            }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default DailyInspectionChart;
