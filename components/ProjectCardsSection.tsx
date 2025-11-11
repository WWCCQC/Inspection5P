'use client';

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';

interface ProjectCardsSectionProps {
  variant?: 'inline' | 'full';
}

const ProjectCardsSection = ({ variant = 'full' }: ProjectCardsSectionProps) => {
  // Query to get all unique Type of work values from database (these are the real project types)
  const { data: projectsFromDatabase = [] } = useQuery({
    queryKey: ['typeOfWorksFromDB'],
    queryFn: async () => {
      let allData: any[] = [];
      let from = 0;
      const pageSize = 1000;
      
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
      
      // Get unique Type of work values from database
      const typeOfWorks = new Set();
      allData.forEach(item => {
        const typeOfWork = item['Type of work'];
        if (typeOfWork) {
          typeOfWorks.add(typeOfWork);
        }
      });
      
      return Array.from(typeOfWorks).sort();
    },
  });

  const inlineProjects = [
    'Civil-Tower Audit/Strengthen',
    'Civil-Site Preparation',
    'Civil-Site Dismantle',
    'Civil-AC Improvement',
    'Civil-Tower Re-Build',
    'Civil-Tower New Build',
    'OFC_Mobile-Install',
    'OFC_Mobile-Decom',
    'OFC_Online (FTTX)',
    'TE-Decom',
    'TE-Retain',
    'TE-Relocation',
    'TE-DC Power',
    'TE-Other',
  ];

  const fullProjects = [
    'Civil-Tower Audit/Strengthen',
    'Civil-Site Preparation',
    'Civil-Site Dismantle',
    'Civil-AC Improvement',
    'Civil-Tower Re-Build',
    'Civil-Tower New Build',
    'OFC_Mobile-Install',
    'OFC_Mobile-Decom',
    'OFC_Online (FTTX)',
    'TE-Decom',
    'TE-Retain',
    'TE-Relocation',
    'TE-DC Power',
    'TE-Other',
  ];

  // Use database values if available, otherwise use predefined list
  const projects = (projectsFromDatabase.length > 0 ? projectsFromDatabase : (variant === 'inline' ? inlineProjects : fullProjects)) as string[];

  // Query to get counts for each project type from 5p table
  const { data: projectCounts = {} } = useQuery({
    queryKey: ['projectCardCounts', projects],
    queryFn: async () => {
      let allData: any[] = [];
      let from = 0;
      const pageSize = 1000;
      
      // วนลูปดึงข้อมูลทั้งหมดจากตาราง 5p
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
      
      // สร้าง object เก็บจำนวน unique Technician_Name สำหรับแต่ละ Type of work
      const counts: Record<string, number> = {};
      
      projects.forEach(projectName => {
        const uniqueTechs = new Set();
        
        allData.forEach(item => {
          const typeOfWork = item['Type of work'];
          if (typeOfWork === projectName && item.Technician_Name) {
            uniqueTechs.add(item.Technician_Name);
          }
        });
        
        counts[projectName] = uniqueTechs.size;
      });
      
      return counts;
    },
  });

  const gridTemplate = variant === 'inline' 
    ? 'repeat(6, 1fr)' 
    : 'repeat(auto-fill, minmax(180px, 1fr))';

  return (
    <div style={{ marginTop: variant === 'inline' ? '0px' : '0px' }}>
      {/* Debug info - remove after fixing */}
      {variant === 'inline' && (
        <div style={{ fontSize: '11px', color: '#999', marginBottom: '4px' }}>
          Debug: {Object.values(projectCounts as Record<string, number>).reduce((a, b) => a + b, 0)} total technicians
        </div>
      )}
      <div style={{ display: 'grid', gridTemplateColumns: gridTemplate, gap: '8px' }}>
        {projects.map((project) => (
          <div
            key={project}
            style={{
              backgroundColor: '#b2ebf2',
              padding: '8px 6px',
              borderRadius: '4px',
              textAlign: 'center',
              fontSize: '11px',
              fontWeight: '500',
              color: '#333',
              border: '1px solid #80deea',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#80deea';
              e.currentTarget.style.boxShadow = '0 2px 6px rgba(0, 0, 0, 0.15)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#b2ebf2';
              e.currentTarget.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.1)';
            }}
          >
            <div style={{ marginBottom: '4px' }}>{project}</div>
            <div style={{ fontSize: '16px', fontWeight: '700', color: '#0EAD69' }}>
              {(projectCounts as Record<string, number>)[project] || 0}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ProjectCardsSection;
