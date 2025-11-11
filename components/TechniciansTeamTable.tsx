'use client';

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';
import React from 'react';

type Technician = {
  tech_id: string;
  provider: string | null;
  rsm: string | null;
  depot_code: string | null;
  depot_name: string | null;
  workgroup_status: string | null;
};

type GroupedRow = {
  provider: string | null;
  rsm: string | null;
  depot_code: string;
  depot_name: string | null;
  count: number;
};

const TechniciansTeamTable = () => {
  const { data, isLoading, error } = useQuery({
    queryKey: ['technicians-team'],
    queryFn: async () => {
      let allData: Technician[] = [];
      let page = 0;
      const pageSize = 1000;
      let hasMore = true;

      // Fetch all data with pagination
      while (hasMore) {
        const { data: techData, error } = await supabase
          .from('technicians')
          .select('tech_id, provider, rsm, depot_code, depot_name, workgroup_status')
          .range(page * pageSize, (page + 1) * pageSize - 1);

        if (error) {
          console.error('Supabase error:', error);
          throw error;
        }

        if (!techData || techData.length === 0) {
          hasMore = false;
        } else {
          allData = [...allData, ...(techData as Technician[])];
          page++;
        }
      }

      console.log('Total fetched technicians data:', allData.length);

      // Filter for workgroup_status containing "หัวหน้า" and exclude depot codes
      const excludedDepotCodes = ['PTT1-38', 'WW-BM-0093', 'WW-CR-1309'];
      const filtered = allData
        .filter(item => item.workgroup_status && item.workgroup_status.includes('หัวหน้า'))
        .filter(item => !excludedDepotCodes.includes(item.depot_code || ''));
      
      console.log('Filtered data:', filtered.length, 'records');
      return filtered;
    },
  });

  // Group by depot_code and count unique tech_id
  const groupedData: GroupedRow[] = React.useMemo(() => {
    if (!data || data.length === 0) return [];

    const groups = new Map<string, GroupedRow>();

    data.forEach((tech) => {
      const key = tech.depot_code || '';
      if (!groups.has(key)) {
        // Count unique tech_id for this depot_code
        const techIdsForDepot = data
          .filter((t) => t.depot_code === key)
          .map((t) => t.tech_id);
        
        groups.set(key, {
          provider: tech.provider,
          rsm: tech.rsm,
          depot_code: tech.depot_code || '-',
          depot_name: tech.depot_name,
          count: new Set(techIdsForDepot).size,
        });
      }
    });

    // Sort by rsm from low to high, then by depot_code alphanumerically
    return Array.from(groups.values()).sort((a, b) => {
      const rsmA = a.rsm ? parseInt(a.rsm.replace(/[^\d]/g, ''), 10) : 0;
      const rsmB = b.rsm ? parseInt(b.rsm.replace(/[^\d]/g, ''), 10) : 0;
      
      if (rsmA !== rsmB) {
        return rsmA - rsmB;
      }
      
      // If rsm is the same, sort by depot_code using natural sort
      const depotA = a.depot_code || '';
      const depotB = b.depot_code || '';
      
      // Natural sort comparison
      return depotA.localeCompare(depotB, 'en', { numeric: true });
    });
  }, [data]);

  if (isLoading) return <div className="text-center py-4">Loading…</div>;
  if (error) {
    console.error('Query error:', error);
    return <div className="text-red-600 py-4">Error loading data: {(error as any)?.message}</div>;
  }

  const columns = [
    { header: 'Provider', key: 'provider' as const },
    { header: 'RSM', key: 'rsm' as const },
    { header: 'Depot Code', key: 'depot_code' as const },
    { header: 'Depot Name', key: 'depot_name' as const },
    { header: 'Technician Team (Total)', key: 'count' as const },
  ];

  return (
    <div className="bg-white rounded-lg border shadow-sm overflow-hidden mb-6">
      <div className="p-4">
        <h3 className="text-lg font-semibold mb-4">Technicians Team</h3>
      </div>
      <div className="overflow-x-auto">
        <table style={{ width: '100%', fontSize: '14px', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              {columns.map((column, index) => (
                <th
                  key={index}
                  style={{
                    padding: '6px 8px',
                    textAlign: 'left',
                    fontWeight: '600',
                    color: '#333',
                    whiteSpace: 'nowrap',
                    border: '1px solid #ddd',
                    background: '#f7f7f7',
                  }}
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {groupedData.map((row, rowIndex) => (
              <tr key={rowIndex}>
                {columns.map((column, colIndex) => (
                  <td
                    key={colIndex}
                    style={{
                      padding: '6px 8px',
                      color: '#333',
                      whiteSpace: 'nowrap',
                      border: '1px solid #eee',
                    }}
                  >
                    {row[column.key] || '-'}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="px-4 py-3 border-t bg-gray-50 text-sm text-gray-700">
        รวม {groupedData.length} ทีม
      </div>
    </div>
  );
};

export default TechniciansTeamTable;
