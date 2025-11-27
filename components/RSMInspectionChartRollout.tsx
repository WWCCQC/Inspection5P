'use client';

import { useQuery } from '@tanstack/react-query';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { supabase } from '@/lib/supabaseClient';
import { useProjectFilter } from '@/app/track-rollout/ProjectFilterContext';

interface InspectionData {
  RSM: string;
  Technician_Name: string;
  Date: string;
}

interface ChartData {
  rsm: string;
  actual: number;
}

const RSMInspectionChartRollout = () => {
  const { selectedProject } = useProjectFilter();
  
  const { data: chartData, isLoading, error } = useQuery({
    queryKey: ['rsmInspectionsRollout', selectedProject],
    queryFn: async () => {
      // Fetch inspection data (Actual) from 5p table
      let allInspections: any[] = [];
      let from = 0;
      const pageSize = 1000;
      
      while (true) {
        const { data, error } = await supabase
          .from('5p')
          .select('RSM, Technician_Name, Date, Project, "Type of work"')
          .eq('Project', 'Track Rollout')
          .range(from, from + pageSize - 1);
        
        if (error) throw new Error(error.message);
        
        if (!data || data.length === 0) break;
        
        allInspections = [...allInspections, ...data];
        
        if (data.length < pageSize) break;
        
        from += pageSize;
      }
      
      // Filter by selectedProject if not 'All'
      if (selectedProject !== 'All') {
        allInspections = allInspections.filter(item => {
          const typeOfWork = item['Type of work'];
          return typeOfWork && typeOfWork.startsWith(selectedProject);
        });
      }
      
      // Count actual (จำนวนการตรวจจริงแต่ละ RSM)
      const actualByRSM: Record<string, Set<string>> = {};
      
      allInspections.forEach((item) => {
        if (item.RSM && item.Technician_Name && item.Date) {
          // Format date as DD/MM/YYYY
          const dateObj = new Date(item.Date);
          const day = String(dateObj.getDate()).padStart(2, '0');
          const month = String(dateObj.getMonth() + 1).padStart(2, '0');
          const year = dateObj.getFullYear();
          const formattedDate = `${day}/${month}/${year}`;
          
          // Create composite key: RSM + Date + Technician_Name
          const key = `${item.RSM}|${formattedDate}|${item.Technician_Name}`;
          
          if (!actualByRSM[item.RSM]) {
            actualByRSM[item.RSM] = new Set();
          }
          actualByRSM[item.RSM].add(key);
        }
      });
      
      // Create chart data
      const chartArray: ChartData[] = Object.keys(actualByRSM).map((rsm) => {
        return {
          rsm,
          actual: actualByRSM[rsm]?.size || 0,
        };
      });
      
      // Sort by RSM name alphabetically (A-Z)
      chartArray.sort((a, b) => {
        const rsmA = a.rsm || '';
        const rsmB = b.rsm || '';
        return rsmA.localeCompare(rsmB, undefined, { numeric: true, sensitivity: 'base' });
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
        Inspection by RSM-Track Rollout
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
            formatter={(value) => [`${value} ครั้ง`, 'Actual']}
            labelFormatter={(label) => `RSM: ${label}`}
          />
          <Legend verticalAlign="top" height={36} />
          <Bar
            dataKey="actual"
            fill="#203864"
            name="Actual"
            isAnimationActive={true}
            radius={[8, 8, 0, 0]}
            label={{
              position: 'top',
              fill: '#203864',
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

export default RSMInspectionChartRollout;
