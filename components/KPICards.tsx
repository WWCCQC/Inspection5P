'use client';

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';

interface Technician {
  workgroup_status: string;
}

interface TargetData {
  total: number;
  heads: number;
}

interface ActualData {
  count: number;
}

const KPICards = () => {
  const { data: targetData = { total: 0, heads: 0 } } = useQuery({
    queryKey: ['targetCount'],
    queryFn: async () => {
      // ดึงทั้งหมดจากตาราง technicians โดยใช้ range เพื่อข้าม limit 1000
      let allData: Technician[] = [];
      let from = 0;
      const pageSize = 1000;
      
      // วนลูปดึงข้อมูลทั้งหมด
      while (true) {
        const { data, error } = await supabase
          .from('technicians')
          .select('workgroup_status, depot_code')
          .range(from, from + pageSize - 1);
        
        if (error) throw new Error(error.message);
        
        if (!data || data.length === 0) break;
        
        allData = [...allData, ...data];
        
        if (data.length < pageSize) break;
        
        from += pageSize;
      }
      
      // Depot codes ที่ต้องแยกออก
      const excludedDepotCodes = ['PTT1-38', 'WW-BM-0093', 'WW-CR-1309'];
      
      // นับจำนวนที่มี "หัวหน้า" และไม่อยู่ใน excluded list
      const headsCount = (allData as any[]).filter(item => {
        const hasHeadTitle = (item.workgroup_status || '').includes('หัวหน้า');
        const isNotExcluded = !excludedDepotCodes.includes(item.depot_code);
        return hasHeadTitle && isNotExcluded;
      }).length;
      
      return {
        total: allData.length,
        heads: headsCount
      };
    },
  });

  const { data: actualData = { count: 0 } } = useQuery({
    queryKey: ['actualCount'],
    queryFn: async () => {
      // ดึงข้อมูล Technician_Code และ Date จากตาราง 5p
      let allData: any[] = [];
      let from = 0;
      const pageSize = 1000;
      
      // วนลูปดึงข้อมูลทั้งหมด
      while (true) {
        const { data, error } = await supabase
          .from('5p')
          .select('Technician_Code, Date')
          .range(from, from + pageSize - 1);
        
        if (error) throw new Error(error.message);
        
        if (!data || data.length === 0) break;
        
        allData = [...allData, ...data];
        
        if (data.length < pageSize) break;
        
        from += pageSize;
      }
      
      // นับจำนวน unique (Technician_Code, Date) pairs
      const uniquePairs = new Set();
      allData.forEach((item) => {
        if (item.Technician_Code && item.Date) {
          uniquePairs.add(`${item.Technician_Code}|${item.Date}`);
        }
      });
      
      return {
        count: uniquePairs.size
      };
    },
  });

  // คำนวณเปอร์เซ็นต์ของ Actual
  const percentage = targetData.heads > 0 
    ? Math.round((actualData.count / targetData.heads) * 100) 
    : 0;

  // คำนวณ Pending = Target - Actual
  const pending = Math.max(0, targetData.heads - actualData.count);

  // คำนวณเปอร์เซ็นต์ของ Pending
  const pendingPercentage = targetData.heads > 0 
    ? Math.round((pending / targetData.heads) * 100) 
    : 0;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
      {/* Target Card */}
      <div 
        style={{ 
          backgroundColor: '#203864', 
          color: 'white',
          padding: '8px',
          borderRadius: '8px',
          textAlign: 'center',
          fontSize: '12px'
        }}
      >
        <div>Target</div>
        <div style={{ fontWeight: '700', fontSize: '16px' }}>
          {targetData.heads.toLocaleString()}
        </div>
      </div>

      {/* Actual Card */}
      <div 
        style={{ 
          backgroundColor: '#0EAD69', 
          color: 'white',
          padding: '8px',
          borderRadius: '8px',
          textAlign: 'center',
          fontSize: '12px'
        }}
      >
        <div>Actual</div>
        <div style={{ fontWeight: '700', fontSize: '16px' }}>
          {actualData.count.toLocaleString()} ({percentage.toFixed(2)}%)
        </div>
      </div>

      {/* Pending Card */}
      <div 
        style={{ 
          backgroundColor: '#D90429', 
          color: 'white',
          padding: '8px',
          borderRadius: '8px',
          textAlign: 'center',
          fontSize: '12px'
        }}
      >
        <div>Pending</div>
        <div style={{ fontWeight: '700', fontSize: '16px' }}>
          {pending.toLocaleString()} ({pendingPercentage.toFixed(2)}%)
        </div>
      </div>
    </div>
  );
};

export default KPICards;
