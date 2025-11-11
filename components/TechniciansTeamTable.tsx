'use client';

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';
import React from 'react';

type Technician = {
  tech_id: string;
  provider: string | null;
  RSM: string | null;
  depot_code: string | null;
  depot_name: string | null;
  workgroup_status: string | null;
};

const TechniciansTeamTable = () => {
  const { data, isLoading, error } = useQuery({
    queryKey: ['technicians-team'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('technicians')
        .select('tech_id, provider, RSM, depot_code, depot_name, workgroup_status')
        .eq('workgroup_status', 'หัวหน้า');

      if (error) throw error;

      // Filter out excluded depot codes
      const excludedDepotCodes = ['PTT1-38', 'WW-BM-0093', 'WW-CR-1309'];
      return (data as Technician[]).filter(
        (item) => !excludedDepotCodes.includes(item.depot_code || '')
      );
    },
  });

  if (isLoading) return <div className="text-center py-4">Loading…</div>;
  if (error) return <div className="text-red-600 py-4">Error loading data</div>;

  // Group by depot_code and count unique tech_id
  const groupedData = React.useMemo(() => {
    if (!data) return [];

    const groups = new Map<
      string,
      {
        provider: string | null;
        RSM: string | null;
        depot_code: string;
        depot_name: string | null;
        count: number;
      }
    >();

    data.forEach((tech) => {
      const key = tech.depot_code || '';
      if (!groups.has(key)) {
        groups.set(key, {
          provider: tech.provider,
          RSM: tech.RSM,
          depot_code: tech.depot_code || '-',
          depot_name: tech.depot_name,
          count: 0,
        });
      }
      // Count unique tech_id per depot_code
      const group = groups.get(key)!;
      const techIds = data
        .filter((t) => t.depot_code === key)
        .map((t) => t.tech_id);
      group.count = new Set(techIds).size;
    });

    return Array.from(groups.values());
  }, [data]);

  const columns = [
    { header: 'Provider', key: 'provider' },
    { header: 'RSM', key: 'RSM' },
    { header: 'Depot Code', key: 'depot_code' },
    { header: 'Depot Name', key: 'depot_name' },
    { header: 'Technician Team (Total)', key: 'count' },
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
                    {row[column.key as keyof typeof row] || '-'}
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
