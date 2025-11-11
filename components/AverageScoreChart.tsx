'use client';

import { useQuery } from '@tanstack/react-query';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import { supabase } from '@/lib/supabaseClient';

interface InspectionData {
  P: string;
  Score: string;
}

interface ChartData {
  pillar: string;
  averageScore: number;
  fill: string;
}

// ฟังก์ชั่นเพื่อกำหนดสีตามคะแนน
const getColorByScore = (score: number): string => {
  if (score === 3.00) {
    return '#22C55E'; // เขียว
  } else if (score >= 2.00 && score < 3.00) {
    return '#FBBF24'; // เหลือง
  } else if (score < 2.00) {
    return '#EF4444'; // แดง
  }
  return '#F59E0B'; // สีเดิม (default)
};

const AverageScoreChart = () => {
  const { data: chartData, isLoading, error } = useQuery({
    queryKey: ['averageScoreByPillar'],
    queryFn: async () => {
      // ดึงข้อมูล P และ Score จากตาราง 5p
      let allData: InspectionData[] = [];
      let from = 0;
      const pageSize = 1000;
      
      // วนลูปดึงข้อมูลทั้งหมด
      while (true) {
        const { data, error } = await supabase
          .from('5p')
          .select('P, Score')
          .range(from, from + pageSize - 1);
        
        if (error) throw new Error(error.message);
        
        if (!data || data.length === 0) break;
        
        allData = [...allData, ...(data as InspectionData[])];
        
        if (data.length < pageSize) break;
        
        from += pageSize;
      }
      
      // จัดกลุ่มตามค่า P และคิดค่าเฉลี่ย Score
      const groupedData: Record<string, number[]> = {};
      
      allData.forEach((item) => {
        if (item.P && item.Score) {
          const score = parseFloat(item.Score);
          
          if (!isNaN(score)) {
            if (!groupedData[item.P]) {
              groupedData[item.P] = [];
            }
            groupedData[item.P].push(score);
          }
        }
      });
      
      // คิดค่าเฉลี่ยและแปลงเป็น array
      const chartArray: ChartData[] = Object.entries(groupedData).map(([pillar, scores]) => {
        const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
        return {
          pillar,
          averageScore: avg,
          fill: getColorByScore(avg)
        };
      });
      
      // เรียงลำดับตาม pillar name
      chartArray.sort((a, b) => a.pillar.localeCompare(b.pillar, 'th'));
      
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
        Average Score by 5P
      </h3>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={chartData}
          margin={{ top: 5, right: 30, left: 0, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis
            dataKey="pillar"
            tick={{ fontSize: 12 }}
            angle={-45}
            textAnchor="end"
            height={100}
          />
          <YAxis
            tick={{ fontSize: 12 }}
            domain={[0, 3]}
            ticks={[0, 1, 2, 3]}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#fff',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              padding: '12px',
            }}
            formatter={(value: number) => [`${value.toFixed(2)}`, 'Average Score']}
            labelFormatter={(label) => `Pillar: ${label}`}
          />
          <Legend verticalAlign="top" height={36} />
          <Bar
            dataKey="averageScore"
            name="Average Score"
            isAnimationActive={true}
            radius={[8, 8, 0, 0]}
            label={{ 
              position: 'center',
              fill: 'white',
              fontSize: 12,
              fontWeight: 600,
              formatter: (value: number) => value.toFixed(2)
            }}
          >
            {chartData?.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.fill} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default AverageScoreChart;
