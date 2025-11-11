'use client';

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';
import * as XLSX from 'xlsx';
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
  actual: number;
  pending: number;
};

const TechniciansTeamTable = () => {
  const [providerFilter, setProviderFilter] = React.useState('');
  const [rsmFilter, setRsmFilter] = React.useState('');
  const [depotCodeFilter, setDepotCodeFilter] = React.useState('');
  const [depotNameFilter, setDepotNameFilter] = React.useState('');

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
      
      // Also fetch 5p data to get Actual count
      let allFiveP: any[] = [];
      let fivePPage = 0;
      let fivePHasMore = true;
      
      while (fivePHasMore) {
        const { data: fivePData, error: fivePError } = await supabase
          .from('5p')
          .select('Technician_Code, Date')
          .range(fivePPage * pageSize, (fivePPage + 1) * pageSize - 1);

        if (fivePError) {
          console.error('Supabase 5p error:', fivePError);
        }

        if (!fivePData || fivePData.length === 0) {
          fivePHasMore = false;
        } else {
          allFiveP = [...allFiveP, ...fivePData];
          fivePPage++;
        }
      }
      
      console.log('Total fetched 5p data:', allFiveP.length);

      return { technicians: filtered, fiveP: allFiveP };
    },
  });

  // Group by depot_code and count unique tech_id
  const groupedData: GroupedRow[] = React.useMemo(() => {
    if (!data || !data.technicians || data.technicians.length === 0) return [];

    const groups = new Map<string, GroupedRow>();

    data.technicians.forEach((tech) => {
      const key = tech.depot_code || '';
      if (!groups.has(key)) {
        // Count unique tech_id for this depot_code
        const techIdsForDepot = data.technicians
          .filter((t) => t.depot_code === key)
          .map((t) => t.tech_id);
        
        // Count actual inspections (unique Technician_Code, Date pairs for this depot)
        const actualCount = new Set(
          data.fiveP
            .filter(item => {
              const techIds = data.technicians
                .filter(t => t.depot_code === key)
                .map(t => t.tech_id);
              return techIds.includes(item.Technician_Code);
            })
            .map(item => `${item.Technician_Code}-${item.Date}`)
        ).size;
        
        const targetCount = new Set(techIdsForDepot).size;
        const pendingCount = targetCount - actualCount;
        
        groups.set(key, {
          provider: tech.provider,
          rsm: tech.rsm,
          depot_code: tech.depot_code || '-',
          depot_name: tech.depot_name,
          count: targetCount,
          actual: actualCount,
          pending: pendingCount,
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

  // Filter grouped data based on filter values
  const filteredGroupedData: GroupedRow[] = React.useMemo(() => {
    return groupedData.filter(row => {
      if (providerFilter && row.provider !== providerFilter) return false;
      if (rsmFilter && row.rsm !== rsmFilter) return false;
      if (depotCodeFilter && row.depot_code !== depotCodeFilter) return false;
      if (depotNameFilter && row.depot_name !== depotNameFilter) return false;
      return true;
    });
  }, [groupedData, providerFilter, rsmFilter, depotCodeFilter, depotNameFilter]);

  // Get unique values for filters
  const uniqueProviders = React.useMemo(() => {
    return Array.from(new Set(groupedData.map(row => row.provider).filter(Boolean)));
  }, [groupedData]);

  const uniqueRsms = React.useMemo(() => {
    return Array.from(new Set(groupedData.map(row => row.rsm).filter(Boolean)));
  }, [groupedData]);

  const uniqueDepotCodes = React.useMemo(() => {
    return Array.from(new Set(groupedData.map(row => row.depot_code).filter(Boolean)));
  }, [groupedData]);

  const uniqueDepotNames = React.useMemo(() => {
    return Array.from(new Set(groupedData.map(row => row.depot_name).filter(Boolean)));
  }, [groupedData]);

  // Export to Excel
  const exportToExcel = () => {
    // Transform data to include calculated columns
    const dataForExport = filteredGroupedData.map(row => ({
      'Provider': row.provider || '-',
      'RSM': row.rsm || '-',
      'Depot Code': row.depot_code,
      'Depot Name': row.depot_name || '-',
      'Technician Team (Total)': row.count,
      'Actual': row.actual,
      '%Actual': row.count > 0 ? ((row.actual / row.count) * 100).toFixed(2) + '%' : '0.00%',
      'Pending': row.pending,
      '%Pending': row.count > 0 ? ((row.pending / row.count) * 100).toFixed(2) + '%' : '0.00%',
    }));

    const ws = XLSX.utils.json_to_sheet(dataForExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Technicians Team');
    XLSX.writeFile(wb, `technicians-team-${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  // Clear filters
  const clearFilters = () => {
    setProviderFilter('');
    setRsmFilter('');
    setDepotCodeFilter('');
    setDepotNameFilter('');
  };

  if (isLoading) return <div className="text-center py-4">Loading…</div>;
  if (error) {
    console.error('Query error:', error);
    return <div className="text-red-600 py-4">Error loading data: {(error as any)?.message}</div>;
  }

  // Function to get gradient color based on percentage
  const getGradientColor = (percentage: number, type: 'actual' | 'pending'): string => {
    // Ensure percentage is between 0 and 100
    const percent = Math.max(0, Math.min(100, percentage));
    
    if (type === 'actual') {
      // Red (#D01716) -> Yellow (#FBC02D) -> Green (#0A7E07)
      if (percent < 50) {
        // Red to Yellow: 0-50%
        const ratio = percent / 50;
        const r = Math.round(208 - (208 - 251) * ratio);
        const g = Math.round(23 - (23 - 192) * ratio);
        const b = Math.round(22 - (22 - 45) * ratio);
        return `rgb(${r}, ${g}, ${b})`;
      } else {
        // Yellow to Green: 50-100%
        const ratio = (percent - 50) / 50;
        const r = Math.round(251 - (251 - 10) * ratio);
        const g = Math.round(192 - (192 - 126) * ratio);
        const b = Math.round(45 - (45 - 7) * ratio);
        return `rgb(${r}, ${g}, ${b})`;
      }
    } else {
      // Green (#0A7E07) -> Yellow (#FBC02D) -> Red (#D01716)
      if (percent < 50) {
        // Green to Yellow: 0-50%
        const ratio = percent / 50;
        const r = Math.round(10 + (251 - 10) * ratio);
        const g = Math.round(126 + (192 - 126) * ratio);
        const b = Math.round(7 + (45 - 7) * ratio);
        return `rgb(${r}, ${g}, ${b})`;
      } else {
        // Yellow to Red: 50-100%
        const ratio = (percent - 50) / 50;
        const r = Math.round(251 + (208 - 251) * ratio);
        const g = Math.round(192 - (192 - 23) * ratio);
        const b = Math.round(45 - (45 - 22) * ratio);
        return `rgb(${r}, ${g}, ${b})`;
      }
    }
  };

  const columns = [
    { header: 'Provider', key: 'provider' as const },
    { header: 'RSM', key: 'rsm' as const },
    { header: 'Depot Code', key: 'depot_code' as const },
    { header: 'Depot Name', key: 'depot_name' as const },
    { header: 'Technician Team (Total)', key: 'count' as const },
    { header: 'Actual', key: 'actual' as const },
    { header: '%Actual', key: 'percentActual' as const },
    { header: 'Pending', key: 'pending' as const },
    { header: '%Pending', key: 'percentPending' as const },
  ];

  return (
    <div className="bg-white rounded-lg border shadow-sm overflow-hidden mb-6">
      {/* Header with Filter */}
      <div 
        style={{
          padding: '12px 16px',
          backgroundColor: '#5c6bc0',
          width: '100%',
          display: 'flex',
          gap: '12px',
          alignItems: 'center',
          flexWrap: 'wrap',
        }}
      >
        <h3 style={{
          margin: 0,
          fontSize: '16px',
          fontWeight: '600',
          color: 'white',
          minWidth: 'fit-content',
        }}>
          Technicians Team
        </h3>

        {/* Provider Filter */}
        <select
          value={providerFilter}
          onChange={(e) => setProviderFilter(e.target.value)}
          style={{
            padding: '6px 10px',
            fontSize: '13px',
            border: '1px solid #ccc',
            borderRadius: '4px',
            outline: 'none',
            cursor: 'pointer',
            backgroundColor: 'white',
            color: '#333',
          }}
        >
          <option value="">Provider</option>
          {uniqueProviders.sort().map(provider => (
            <option key={provider} value={provider || ''}>{provider || '-'}</option>
          ))}
        </select>

        {/* RSM Filter */}
        <select
          value={rsmFilter}
          onChange={(e) => setRsmFilter(e.target.value)}
          style={{
            padding: '6px 10px',
            fontSize: '13px',
            border: '1px solid #ccc',
            borderRadius: '4px',
            outline: 'none',
            cursor: 'pointer',
            backgroundColor: 'white',
            color: '#333',
          }}
        >
          <option value="">RSM</option>
          {uniqueRsms.sort().map(rsm => (
            <option key={rsm} value={rsm || ''}>{rsm || '-'}</option>
          ))}
        </select>

        {/* Depot Code Filter */}
        <select
          value={depotCodeFilter}
          onChange={(e) => setDepotCodeFilter(e.target.value)}
          style={{
            padding: '6px 10px',
            fontSize: '13px',
            border: '1px solid #ccc',
            borderRadius: '4px',
            outline: 'none',
            cursor: 'pointer',
            backgroundColor: 'white',
            color: '#333',
          }}
        >
          <option value="">Depot Code</option>
          {uniqueDepotCodes.sort((a, b) => a.localeCompare(b, 'en', { numeric: true })).map(code => (
            <option key={code} value={code || ''}>{code || '-'}</option>
          ))}
        </select>

        {/* Depot Name Filter */}
        <select
          value={depotNameFilter}
          onChange={(e) => setDepotNameFilter(e.target.value)}
          style={{
            padding: '6px 10px',
            fontSize: '13px',
            border: '1px solid #ccc',
            borderRadius: '4px',
            outline: 'none',
            cursor: 'pointer',
            backgroundColor: 'white',
            color: '#333',
          }}
        >
          <option value="">Depot Name</option>
          {uniqueDepotNames.sort().map(name => (
            <option key={name} value={name || ''}>{name || '-'}</option>
          ))}
        </select>

        {/* Clear Button */}
        <button
          onClick={clearFilters}
          style={{
            padding: '6px 12px',
            backgroundColor: '#6c757d',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            fontSize: '13px',
            fontWeight: '500',
            cursor: 'pointer',
            transition: 'background-color 0.2s ease',
            whiteSpace: 'nowrap',
          }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#5a6268'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#6c757d'}
        >
          การล้างค่า
        </button>

        {/* Export Button */}
        <button
          onClick={exportToExcel}
          style={{
            marginLeft: 'auto',
            padding: '6px 12px',
            backgroundColor: '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            fontSize: '13px',
            fontWeight: '600',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            transition: 'background-color 0.2s ease',
            whiteSpace: 'nowrap',
          }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#2563eb'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#3b82f6'}
        >
          📊 Export Excel
        </button>
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
            {filteredGroupedData.map((row, rowIndex) => {
              const percentActual = row.count > 0 ? ((row.actual / row.count) * 100).toFixed(2) : '0.00';
              const percentPending = row.count > 0 ? ((row.pending / row.count) * 100).toFixed(2) : '0.00';
              const percentActualNum = parseFloat(percentActual);
              const percentPendingNum = parseFloat(percentPending);
              
              return (
                <tr key={rowIndex}>
                  {columns.map((column, colIndex) => {
                    let cellValue = '-';
                    let bgColor = 'transparent';
                    let textColor = '#333';
                    
                    if (column.key === 'percentActual') {
                      cellValue = `${percentActual}%`;
                      bgColor = getGradientColor(percentActualNum, 'actual');
                      textColor = 'white';
                    } else if (column.key === 'percentPending') {
                      cellValue = `${percentPending}%`;
                      bgColor = getGradientColor(percentPendingNum, 'pending');
                      textColor = 'white';
                    } else {
                      cellValue = (row[column.key as keyof GroupedRow] ?? '-').toString();
                    }
                    
                    return (
                      <td
                        key={colIndex}
                        style={{
                          padding: '6px 8px',
                          color: textColor,
                          whiteSpace: 'nowrap',
                          border: '1px solid #eee',
                          backgroundColor: bgColor,
                          textAlign: column.key.includes('percent') || column.key.includes('count') || column.key.includes('actual') || column.key.includes('pending') ? 'right' : 'left',
                          fontWeight: column.key.includes('percent') ? '600' : '400',
                        }}
                      >
                        {cellValue}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr style={{ backgroundColor: '#f0f0f0', fontWeight: '600' }}>
              {columns.map((column, colIndex) => {
                let cellValue = '-';
                
                if (column.key === 'provider') {
                  cellValue = 'Grand Total';
                } else if (column.key === 'count') {
                  cellValue = filteredGroupedData.reduce((sum, row) => sum + row.count, 0).toString();
                } else if (column.key === 'actual') {
                  cellValue = filteredGroupedData.reduce((sum, row) => sum + row.actual, 0).toString();
                } else if (column.key === 'pending') {
                  cellValue = filteredGroupedData.reduce((sum, row) => sum + row.pending, 0).toString();
                } else if (column.key === 'percentActual') {
                  const totalCount = filteredGroupedData.reduce((sum, row) => sum + row.count, 0);
                  const totalActual = filteredGroupedData.reduce((sum, row) => sum + row.actual, 0);
                  const percent = totalCount > 0 ? ((totalActual / totalCount) * 100).toFixed(2) : '0.00';
                  cellValue = `${percent}%`;
                } else if (column.key === 'percentPending') {
                  const totalCount = filteredGroupedData.reduce((sum, row) => sum + row.count, 0);
                  const totalPending = filteredGroupedData.reduce((sum, row) => sum + row.pending, 0);
                  const percent = totalCount > 0 ? ((totalPending / totalCount) * 100).toFixed(2) : '0.00';
                  cellValue = `${percent}%`;
                }
                
                return (
                  <td
                    key={colIndex}
                    style={{
                      padding: '6px 8px',
                      color: '#333',
                      whiteSpace: 'nowrap',
                      border: '1px solid #ddd',
                      backgroundColor: '#f0f0f0',
                      textAlign: column.key.includes('percent') || column.key.includes('count') || column.key.includes('actual') || column.key.includes('pending') ? 'right' : 'left',
                      fontWeight: '600',
                    }}
                  >
                    {cellValue}
                  </td>
                );
              })}
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
};

export default TechniciansTeamTable;
