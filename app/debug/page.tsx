'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

interface Technician {
  id: number;
  workgroup_status: string;
}

export default function DebugPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // ดึงข้อมูลทั้งหมดจากตาราง technicians
        const { data: allData, error, count } = await supabase
          .from('technicians')
          .select('id, workgroup_status', { count: 'exact' });

        if (error) {
          console.error('เกิดข้อผิดพลาด:', error);
          setData({ error: error.message });
          return;
        }

        // นับจำนวนที่มี "หัวหน้า"
        const withHeadCount = (allData as Technician[])?.filter(item =>
          (item.workgroup_status || '').includes('หัวหน้า')
        ).length || 0;

        // ดึงตัวอย่าง workgroup_status ที่เก็บไว้
        const samples = (allData as Technician[])?.slice(0, 10).map(t => t.workgroup_status) || [];

        setData({
          totalCount: count,
          withHeadCount,
          samples,
          message: `ทั้งหมด ${count} รายการ, มี "หัวหน้า" ${withHeadCount} รายการ`
        });
      } catch (err) {
        console.error('เกิดข้อผิดพลาด:', err);
        setData({ error: String(err) });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) return <div style={{ padding: '20px' }}>กำลังโหลดข้อมูล...</div>;

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial' }}>
      <h1>ตรวจสอบข้อมูล Technicians</h1>
      <pre style={{ backgroundColor: '#f0f0f0', padding: '10px', borderRadius: '5px' }}>
        {JSON.stringify(data, null, 2)}
      </pre>
    </div>
  );
}
