'use client';

import { useQuery } from '@tanstack/react-query';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { supabase } from '@/lib/supabaseClient';

interface InspectionData {
  RSM: string;
  Technician_Code: string;
  Date: string;
}

interface ChartData {
  rsm: string;
  count: number;
}

const RSMInspectionChart = () => {
  const { data: chartData, isLoading, error } = useQuery({
    queryKey: ['rsmInspections'],
    queryFn: async () => {
      const { data, error } = await supabase.from('5p').select('RSM, Technician_Code, Date');
      
      if (error) throw new Error(error.message);
      
      // Group by RSM and count unique technician codes per day
      const groupedData: Record<string, Set<string>> = {};
      
      (data as InspectionData[]).forEach((item) => {
        if (item.RSM && item.Technician_Code && item.Date) {
          // Format date as DD/MM/YYYY
          const dateObj = new Date(item.Date);
          const day = String(dateObj.getDate()).padStart(2, '0');
          const month = String(dateObj.getMonth() + 1).padStart(2, '0');
          const year = dateObj.getFullYear();
          const formattedDate = `${day}/${month}/${year}`;
          
          // Create composite key: RSM + Date + Technician_Code
          const key = `${item.RSM}|${formattedDate}|${item.Technician_Code}`;
          
          if (!groupedData[item.RSM]) {
            groupedData[item.RSM] = new Set();
          }
          // Add the key to track unique technicians per RSM per day
          groupedData[item.RSM].add(key);
        }
      });
      
      // Convert to array with count of unique (technician, date) combinations
      const chartArray: ChartData[] = Object.entries(groupedData).map(([rsm, keySet]) => ({
        rsm,
        count: keySet.size,
      }));
      
      chartArray.sort((a, b) => b.count - a.count);
      
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
        Inspection by RSM
      </h3>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={chartData}
          margin={{ top: 5, right: 30, left: 0, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis
            dataKey="rsm"
            tick={{ fontSize: 12 }}
            angle={-45}
            textAnchor="end"
            height={100}
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
            labelFormatter={(label) => `RSM: ${label}`}
          />
          <Legend verticalAlign="top" height={36} />
          <Bar
            dataKey="count"
            fill="#056D8D"
            name="จำนวน"
            isAnimationActive={true}
            radius={[8, 8, 0, 0]}
            label={{
              position: 'top',
              fill: '#333',
              fontSize: 12,
              fontWeight: 600,
              offset: 5
            }}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default RSMInspectionChart;
