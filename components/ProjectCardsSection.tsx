'use client';

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';

interface ProjectCardsSectionProps {
  variant?: 'inline' | 'full';
}

const ProjectCardsSection = ({ variant = 'full' }: ProjectCardsSectionProps) => {
  const projects = ['Civil', 'OFC', 'TE'];

  // Query to get counts for each project type from 5p table
  const { data: projectCounts = {} } = useQuery({
    queryKey: ['projectCardCounts'],
    queryFn: async () => {
      let allData: any[] = [];
      let from = 0;
      const pageSize = 1000;
      
      // ดึงข้อมูลทั้งหมดจากตาราง 5p
      while (true) {
        const { data, error } = await supabase
          .from('5p')
          .select('*')
          .eq('Project', 'Track Rollout')
          .range(from, from + pageSize - 1);
        
        if (error) throw new Error(error.message);
        
        if (!data || data.length === 0) break;
        
        allData = [...allData, ...data];
        
        if (data.length < pageSize) break;
        
        from += pageSize;
      }
      
      // จัดกลุ่มตาม Civil, OFC, TE - นับ unique ตามชื่อช่าง + วันที่
      const civilTechs = new Set();
      const ofcTechs = new Set();
      const teTechs = new Set();
      
      allData.forEach(item => {
        const typeOfWork = item['Type of work'];
        const techName = item.Technician_Name;
        const date = item.Date;
        
        if (typeOfWork && techName && date) {
          // สร้าง unique key จากชื่อช่าง + วันที่
          const uniqueKey = `${techName}_${date}`;
          
          if (typeOfWork.startsWith('Civil')) {
            civilTechs.add(uniqueKey);
          } else if (typeOfWork.startsWith('OFC')) {
            ofcTechs.add(uniqueKey);
          } else if (typeOfWork.startsWith('TE')) {
            teTechs.add(uniqueKey);
          }
        }
      });
      
      const civilCount = civilTechs.size;
      const ofcCount = ofcTechs.size;
      const teCount = teTechs.size;
      const totalCount = civilCount + ofcCount + teCount;
      
      return {
        'Civil': {
          count: civilCount,
          percentage: totalCount > 0 ? Math.round((civilCount / totalCount) * 100) : 0
        },
        'OFC': {
          count: ofcCount,
          percentage: totalCount > 0 ? Math.round((ofcCount / totalCount) * 100) : 0
        },
        'TE': {
          count: teCount,
          percentage: totalCount > 0 ? Math.round((teCount / totalCount) * 100) : 0
        }
      };
    },
  });

  return (
    <>
      {projects.map((project) => (
        <div
          key={project}
          style={{
            backgroundColor: '#b2ebf2',
            padding: '16px 12px',
            borderRadius: '8px',
            textAlign: 'center',
            fontSize: '18px',
            fontWeight: '600',
            color: '#333',
            border: '1px solid #80deea',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#80deea';
            e.currentTarget.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.15)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '#b2ebf2';
            e.currentTarget.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.1)';
          }}
        >
          <div style={{ marginBottom: '8px', fontSize: '20px' }}>{project}</div>
          <div style={{ fontSize: '24px', fontWeight: '700', color: '#0EAD69' }}>
            {(projectCounts as Record<string, { count: number; percentage: number }>)[project]?.count || 0} ({(projectCounts as Record<string, { count: number; percentage: number }>)[project]?.percentage || 0}%)
          </div>
        </div>
      ))}
    </>
  );
};

export default ProjectCardsSection;
