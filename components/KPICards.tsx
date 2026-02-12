'use client';

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';

interface Technician {
  workgroup_status: string;
  depot_code: string;
  tech_id: string;
}

interface TargetData {
  total: number;
  heads: number;
  grandTotalTarget: number;
}

interface ActualData {
  count: number;
}

interface KPICardsProps {
  project?: string;
  hideTarget?: boolean;
}

const KPICards = ({ project = 'Track C', hideTarget = false }: KPICardsProps) => {
  const { data: targetData = { total: 0, heads: 0, grandTotalTarget: 0 } } = useQuery({
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
          .select('workgroup_status, depot_code, tech_id')
          .range(from, from + pageSize - 1);

        if (error) throw new Error(error.message);

        if (!data || data.length === 0) break;

        allData = [...allData, ...data];

        if (data.length < pageSize) break;

        from += pageSize;
      }

      // Depot codes ที่ต้องแยกออก
      const excludedDepotCodes = ['PTT1-38', 'WW-BM-0093', 'WW-CR-1309'];

      // กรองเฉพาะช่างที่มี "หัวหน้า" และไม่อยู่ใน excluded list
      const filteredTechnicians = (allData as any[]).filter(item => {
        const hasHeadTitle = (item.workgroup_status || '').includes('หัวหน้า');
        const isNotExcluded = !excludedDepotCodes.includes(item.depot_code);
        return hasHeadTitle && isNotExcluded;
      });

      const teamCount = filteredTechnicians.length;

      // คำนวณ Grand Total Target โดยจัดกลุ่มตาม depot_code
      const depotGroups = new Map<string, Set<string>>();

      filteredTechnicians.forEach(tech => {
        const depotCode = tech.depot_code || '';
        if (!depotGroups.has(depotCode)) {
          depotGroups.set(depotCode, new Set());
        }
        depotGroups.get(depotCode)!.add(tech.tech_id);
      });

      // คำนวณ Target ของแต่ละ depot และรวมกัน
      let grandTotalTarget = 0;
      depotGroups.forEach((techIds) => {
        const count = techIds.size;
        const target = Math.ceil(count * 0.2);
        grandTotalTarget += target;
      });

      return {
        total: teamCount,
        heads: teamCount,
        grandTotalTarget: grandTotalTarget
      };
    },
  });

  const { data: actualData = { count: 0 } } = useQuery({
    queryKey: ['actualCount', project],
    queryFn: async () => {
      // ดึงข้อมูล Technician_Code และ Date จากตาราง 5p (ตรงกับกราฟ Inspection RBM by month)
      let allData: any[] = [];
      let from = 0;
      const pageSize = 1000;

      // วนลูปดึงข้อมูลทั้งหมด
      while (true) {
        const { data, error } = await supabase
          .from('5p')
          .select('Technician_Code, Date')
          .eq('Project', project)
          .range(from, from + pageSize - 1);

        if (error) throw new Error(error.message);

        if (!data || data.length === 0) break;

        allData = [...allData, ...data];

        if (data.length < pageSize) break;

        from += pageSize;
      }

      // นับจำนวน unique (Date + Technician_Code) — ตรงกับกราฟ Inspection RBM by month
      const uniquePairs = new Set();
      allData.forEach((item) => {
        if (item.Technician_Code && item.Date) {
          const dateObj = new Date(item.Date);
          const day = String(dateObj.getDate()).padStart(2, '0');
          const month = String(dateObj.getMonth() + 1).padStart(2, '0');
          const year = dateObj.getFullYear();
          const uniqueKey = `${year}-${month}-${day}|${item.Technician_Code}`;
          uniquePairs.add(uniqueKey);
        }
      });

      return {
        count: uniquePairs.size
      };
    },
  });

  // ใช้ Target จาก Grand Total ของแต่ละ depot (รวมกันแล้ว)
  const target = targetData.grandTotalTarget;

  // คำนวณเปอร์เซ็นต์ของ Actual
  const percentage = target > 0
    ? Math.round((actualData.count / target) * 100)
    : 0;

  // คำนวณ Pending = Target - Actual
  const pending = Math.max(0, target - actualData.count);

  // คำนวณเปอร์เซ็นต์ของ Pending
  const pendingPercentage = target > 0
    ? Math.round((pending / target) * 100)
    : 0;

  return (
    <div style={{ display: hideTarget ? 'contents' : 'grid', gridTemplateColumns: hideTarget ? undefined : 'repeat(4, 1fr)', gap: hideTarget ? undefined : '8px' }}>
      {/* Technician Team Card - Only show if not hideTarget */}
      {!hideTarget && (
        <div
          style={{
            backgroundColor: '#5c6bc0',
            color: 'white',
            padding: '8px',
            borderRadius: '8px',
            textAlign: 'center',
            fontSize: '12px'
          }}
        >
          <div>Technician Team</div>
          <div style={{ fontWeight: '700', fontSize: '16px' }}>
            {targetData.total.toLocaleString()}
          </div>
        </div>
      )}

      {/* Target Card (20% of Technician Team) - Only show if not hideTarget */}
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
            {target.toLocaleString()}
          </div>
        </div>
      )}

      {/* Actual Card */}
      <div
        style={{
          backgroundColor: '#0EAD69',
          color: 'white',
          padding: hideTarget ? '16px 12px' : '8px',
          borderRadius: '8px',
          textAlign: 'center',
          fontSize: hideTarget ? '18px' : '12px',
          fontWeight: hideTarget ? '600' : 'normal',
          cursor: hideTarget ? 'pointer' : 'default',
          transition: hideTarget ? 'all 0.2s ease' : 'none',
          boxShadow: hideTarget ? '0 2px 4px rgba(0, 0, 0, 0.1)' : 'none',
          border: hideTarget ? '1px solid #0c8f59' : 'none',
        }}
        onMouseEnter={hideTarget ? (e) => {
          e.currentTarget.style.backgroundColor = '#0c8f59';
          e.currentTarget.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.15)';
        } : undefined}
        onMouseLeave={hideTarget ? (e) => {
          e.currentTarget.style.backgroundColor = '#0EAD69';
          e.currentTarget.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.1)';
        } : undefined}
      >
        <div style={{ marginBottom: hideTarget ? '8px' : '0', fontSize: hideTarget ? '20px' : '12px' }}>Actual</div>
        <div style={{ fontWeight: '700', fontSize: hideTarget ? '24px' : '16px' }}>
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
