'use client';

import { useQuery } from '@tanstack/react-query';
import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { supabase } from '@/lib/supabaseClient';

interface InspectionData {
  RSM: string;
  Technician_Code: string;
  Date: string;
}

interface ChartData {
  rsm: string;
  actual: number;
  target: number;
}

interface RSMInspectionChartProps {
  project?: string;
}

const RSMInspectionChart = ({ project = 'Track C' }: RSMInspectionChartProps) => {
  const { data: chartData, isLoading, error } = useQuery({
    queryKey: ['rsmInspections', project],
    queryFn: async () => {
      // 1. Fetch inspection data (Actual) from 5p table
      let allInspections: any[] = [];
      let from = 0;
      const pageSize = 1000;
      
      while (true) {
        const { data, error } = await supabase
          .from('5p')
          .select('RSM, Technician_Code, Date, Project')
          .eq('Project', project)
          .range(from, from + pageSize - 1);
        
        if (error) throw new Error(error.message);
        
        if (!data || data.length === 0) break;
        
        allInspections = [...allInspections, ...data];
        
        if (data.length < pageSize) break;
        
        from += pageSize;
      }
      
      // 2. Fetch technicians data (Target) from technicians table
      let allTechnicians: any[] = [];
      let techPage = 0;
      
      while (true) {
        const { data: techData, error: techError } = await supabase
          .from('technicians')
          .select('rsm, workgroup_status, depot_code')
          .range(techPage * pageSize, (techPage + 1) * pageSize - 1);
        
        if (techError) throw new Error(techError.message);
        
        if (!techData || techData.length === 0) break;
        
        allTechnicians = [...allTechnicians, ...techData];
        
        if (techData.length < pageSize) break;
        
        techPage++;
      }
      
      // 3. Count target (จำนวนช่างหัวหน้าแต่ละ RSM)
      const excludedDepotCodes = ['PTT1-38', 'WW-BM-0093', 'WW-CR-1309'];
      const targetByRSM: Record<string, number> = {};
      
      allTechnicians.forEach((tech) => {
        if (tech.rsm && 
            tech.workgroup_status && 
            tech.workgroup_status.includes('หัวหน้า') &&
            !excludedDepotCodes.includes(tech.depot_code || '')) {
          if (!targetByRSM[tech.rsm]) {
            targetByRSM[tech.rsm] = 0;
          }
          targetByRSM[tech.rsm]++;
        }
      });
      
      // 4. Count actual (จำนวนการตรวจจริงแต่ละ RSM)
      const actualByRSM: Record<string, Set<string>> = {};
      
      allInspections.forEach((item) => {
        if (item.RSM && item.Technician_Code && item.Date) {
          // Format date as DD/MM/YYYY
          const dateObj = new Date(item.Date);
          const day = String(dateObj.getDate()).padStart(2, '0');
          const month = String(dateObj.getMonth() + 1).padStart(2, '0');
          const year = dateObj.getFullYear();
          const formattedDate = `${day}/${month}/${year}`;
          
          // Create composite key: RSM + Date + Technician_Code
          const key = `${item.RSM}|${formattedDate}|${item.Technician_Code}`;
          
          if (!actualByRSM[item.RSM]) {
            actualByRSM[item.RSM] = new Set();
          }
          actualByRSM[item.RSM].add(key);
        }
      });
      
      // 5. Combine actual and target data
      const allRSMs = new Set([
        ...Object.keys(targetByRSM),
        ...Object.keys(actualByRSM)
      ]);
      
      const chartArray: ChartData[] = Array.from(allRSMs).map((rsm) => ({
        rsm,
        actual: actualByRSM[rsm]?.size || 0,
        target: targetByRSM[rsm] || 0,
      }));
      
      // Sort by actual count descending
      chartArray.sort((a, b) => b.actual - a.actual);
      
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
        <ComposedChart
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
            formatter={(value, name) => {
              if (name === 'actual') return [`${value} ครั้ง`, 'Actual'];
              if (name === 'target') return [`${value} คน`, 'Target'];
              return [value, name];
            }}
            labelFormatter={(label) => `RSM: ${label}`}
          />
          <Legend verticalAlign="top" height={36} />
          <Bar
            dataKey="actual"
            fill="#056D8D"
            name="Actual"
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
          <Line
            type="monotone"
            dataKey="target"
            stroke="#ff0000"
            strokeWidth={2}
            name="Target"
            dot={{ r: 5, fill: '#ff0000' }}
            activeDot={{ r: 7 }}
            label={{
              position: 'top',
              fill: '#ff0000',
              fontSize: 11,
              fontWeight: 600,
              offset: 10
            }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
};

export default RSMInspectionChart;
