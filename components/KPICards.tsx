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

interface KPICardsProps {
  project?: string;
  hideTarget?: boolean;
}

const KPICards = ({ project = 'Track C', hideTarget = false }: KPICardsProps) => {
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
    queryKey: ['actualCount', project],
    queryFn: async () => {
      // ดึงข้อมูล Technician_Name, Date และ Project จากตาราง 5p
      let allData: any[] = [];
      let from = 0;
      const pageSize = 1000;
      
      // วนลูปดึงข้อมูลทั้งหมด
      while (true) {
        const { data, error } = await supabase
          .from('5p')
          .select('Technician_Name, Date, Project')
          .range(from, from + pageSize - 1);
        
        if (error) throw new Error(error.message);
        
        if (!data || data.length === 0) break;
        
        allData = [...allData, ...data];
        
        if (data.length < pageSize) break;
        
        from += pageSize;
      }
      
      // นับจำนวน unique (Technician_Name, Date) pairs สำหรับ project ที่ระบุ
      const uniquePairs = new Set();
      allData.forEach((item) => {
        // Filter for specified project
        if (item.Project !== project) return;
        
        if (item.Technician_Name && item.Date) {
          uniquePairs.add(`${item.Technician_Name}|${item.Date}`);
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
    <div style={{ display: hideTarget ? 'flex' : 'grid', gridTemplateColumns: hideTarget ? undefined : 'repeat(3, 1fr)', gap: '8px' }}>
      {/* Target Card - Only show if not hideTarget */}
      {!hideTarget && (
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
      )}

      {/* Actual Card */}
      <div 
        style={{ 
          backgroundColor: '#0EAD69', 
          color: 'white',
          padding: '8px',
          borderRadius: '8px',
          textAlign: 'center',
          fontSize: '12px',
          minWidth: '140px',
          flex: hideTarget ? '0 0 auto' : '1'
        }}
      >
        <div>Actual</div>
        <div style={{ fontWeight: '700', fontSize: '16px' }}>
          {hideTarget ? actualData.count.toLocaleString() : `${actualData.count.toLocaleString()} (${percentage.toFixed(2)}%)`}
        </div>
      </div>

      {/* Pending Card - Only show if not hideTarget */}
      {!hideTarget && (
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
      )}
    </div>
  );
};

export default KPICards;
