'use client';

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';
import * as XLSX from 'xlsx';
import React from 'react';

type FivePData = {
  Code: string | null;
  Item: string | null;
  P: string | null;
  Score: string | null;
};

type WorstCodeRow = {
  rank: number;
  code: string;
  item: string;
  p: string;
  total_check: number;
  critical_count: number;
  avg_score: number;
  percent_critical: number;
};

type WorstCodeSummaryTableProps = {
  project?: string;
};

const WorstCodeSummaryTable = ({ project }: WorstCodeSummaryTableProps = {}) => {
  const { data, isLoading, error } = useQuery({
    queryKey: ['worst-code-summary', project],
    queryFn: async () => {
      let allData: FivePData[] = [];
      let page = 0;
      const pageSize = 1000;
      let hasMore = true;

      // Fetch all data with pagination
      while (hasMore) {
        let query = supabase
          .from('5p')
          .select('Code, Item, P, Score')
          .range(page * pageSize, (page + 1) * pageSize - 1);

        // Filter by project if specified
        if (project) {
          query = query.eq('Project', project);
        }

        const { data: fivePData, error } = await query;

        if (error) {
          console.error('Supabase error:', error);
          throw error;
        }

        if (!fivePData || fivePData.length === 0) {
          hasMore = false;
        } else {
          allData = [...allData, ...(fivePData as FivePData[])];
          page++;
        }
      }

      console.log('Total fetched 5p data for worst code:', allData.length);

      return allData;
    },
  });

  // Calculate worst code summary
  const worstCodeData: WorstCodeRow[] = React.useMemo(() => {
    if (!data || data.length === 0) return [];

    // Group by Code
    const codeMap = new Map<string, {
      item: string;
      p: string;
      scores: number[];
    }>();

    data.forEach(item => {
      const code = item.Code || '-';
      const scoreStr = (item.Score || '').toString().trim().toUpperCase();
      
      // Skip invalid scores (null, empty, or "NA")
      if (!scoreStr || scoreStr === '' || scoreStr === 'NA') {
        return;
      }

      const scoreValue = parseFloat(item.Score || '0');
      const score = isNaN(scoreValue) ? 0 : scoreValue;

      // Only include valid scores (0, 1, 2, 3, 4, 5)
      if (score < 0 || score > 5) {
        return;
      }

      if (!codeMap.has(code)) {
        codeMap.set(code, {
          item: item.Item || '-',
          p: item.P || '-',
          scores: [],
        });
      }

      const codeData = codeMap.get(code)!;
      codeData.scores.push(score);
    });

    // Calculate metrics for each code
    const summary: WorstCodeRow[] = [];

    codeMap.forEach((codeData, code) => {
      const total_check = codeData.scores.length;
      const critical_count = codeData.scores.filter(s => s <= 1).length;
      const total_score = codeData.scores.reduce((sum, s) => sum + s, 0);
      const avg_score = total_check > 0 ? total_score / total_check : 0;
      const percent_critical = total_check > 0 ? (critical_count / total_check) * 100 : 0;

      summary.push({
        rank: 0, // Will be assigned after sorting
        code,
        item: codeData.item,
        p: codeData.p,
        total_check,
        critical_count,
        avg_score,
        percent_critical,
      });
    });

    // Sort by %Critical descending, then by avg_score ascending
    summary.sort((a, b) => {
      if (b.percent_critical !== a.percent_critical) {
        return b.percent_critical - a.percent_critical;
      }
      return a.avg_score - b.avg_score;
    });

    // Assign ranks and take top 10
    const top10 = summary.slice(0, 10);
    top10.forEach((item, index) => {
      item.rank = index + 1;
    });

    return top10;
  }, [data]);

  // Export to Excel
  const exportToExcel = () => {
    const dataForExport = worstCodeData.map(row => ({
      'Rank': row.rank,
      'Code': row.code,
      'Item': row.item,
      'P': row.p,
      'Total_Check': row.total_check,
      'Critical_Count (≤1)': row.critical_count,
      'Avg_Score': row.avg_score.toFixed(2),
      '%Critical': row.percent_critical.toFixed(1) + '%',
    }));

    const ws = XLSX.utils.json_to_sheet(dataForExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '5P Worst Code Summary');
    XLSX.writeFile(wb, `5p-worst-code-summary-${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  if (isLoading) return <div className="text-center py-4">Loading…</div>;
  if (error) {
    console.error('Query error:', error);
    return <div className="text-red-600 py-4">Error loading data: {(error as any)?.message}</div>;
  }

  // Function to get gradient color based on %Low
  const getGradientColor = (percentLow: number): string => {
    const percent = Math.max(0, Math.min(100, percentLow));
    
    if (percent < 30) {
      // Green to Yellow: 0-30%
      const ratio = percent / 30;
      const r = Math.round(10 + (251 - 10) * ratio);
      const g = Math.round(126 + (192 - 126) * ratio);
      const b = Math.round(7 + (45 - 7) * ratio);
      return `rgb(${r}, ${g}, ${b})`;
    } else if (percent < 60) {
      // Yellow to Orange: 30-60%
      const ratio = (percent - 30) / 30;
      const r = Math.round(251 + (255 - 251) * ratio);
      const g = Math.round(192 - (192 - 140) * ratio);
      const b = Math.round(45 - (45 - 30) * ratio);
      return `rgb(${r}, ${g}, ${b})`;
    } else {
      // Orange to Red: 60-100%
      const ratio = (percent - 60) / 40;
      const r = Math.round(255 - (255 - 208) * ratio);
      const g = Math.round(140 - (140 - 23) * ratio);
      const b = Math.round(30 - (30 - 22) * ratio);
      return `rgb(${r}, ${g}, ${b})`;
    }
  };

  const columns = [
    { header: 'Rank', key: 'rank' as const },
    { header: 'Code', key: 'code' as const },
    { header: 'Item', key: 'item' as const },
    { header: 'P', key: 'p' as const },
    { header: 'Total Check', key: 'total_check' as const },
    { header: 'Critical Count (≤1)', key: 'critical_count' as const },
    { header: 'Avg Score', key: 'avg_score' as const },
    { header: '%Critical', key: 'percent_critical' as const },
  ];

  return (
    <div className="bg-white rounded-lg border shadow-sm overflow-hidden" style={{ height: '100%' }}>
      {/* Header */}
      <div 
        style={{
          padding: '12px 16px',
          backgroundColor: '#5c6bc0',
          width: '100%',
        }}
      >
        <h3 style={{
          margin: 0,
          fontSize: '16px',
          fontWeight: '600',
          color: 'white',
        }}>
          5P Worst Code Summary (Top 10)
        </h3>
      </div>

      <div className="overflow-x-auto">
        <table style={{ width: '100%', fontSize: '12px', borderCollapse: 'collapse' }}>
          <colgroup>
            <col style={{ width: '5%' }} /> {/* Rank */}
            <col style={{ width: '8%' }} /> {/* Code */}
            <col style={{ width: '30%' }} /> {/* Item */}
            <col style={{ width: '18%' }} /> {/* P */}
            <col style={{ width: '10%' }} /> {/* Total Check */}
            <col style={{ width: '12%' }} /> {/* Critical Count */}
            <col style={{ width: '9%' }} /> {/* Avg Score */}
            <col style={{ width: '8%' }} /> {/* %Critical */}
          </colgroup>
          <thead>
            <tr>
              {columns.map((column, index) => (
                <th
                  key={index}
                  style={{
                    padding: '8px 6px',
                    textAlign: column.key === 'rank' ? 'center' : (column.key === 'total_check' || column.key === 'critical_count' || column.key === 'avg_score' || column.key === 'percent_critical') ? 'right' : 'left',
                    fontWeight: '600',
                    fontSize: '12px',
                    color: '#333',
                    border: '1px solid #ddd',
                    background: '#f7f7f7',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {worstCodeData.map((row, rowIndex) => {
              return (
                <tr key={rowIndex}>
                  {columns.map((column, colIndex) => {
                    let cellValue = '-';
                    let bgColor = 'transparent';
                    let textColor = '#333';
                    let textAlign: 'left' | 'right' | 'center' = 'left';

                    if (column.key === 'rank') {
                      cellValue = row.rank.toString();
                      textAlign = 'center';
                    } else if (column.key === 'percent_critical') {
                      cellValue = `${row.percent_critical.toFixed(1)}%`;
                      bgColor = getGradientColor(row.percent_critical);
                      textColor = 'white';
                      textAlign = 'right';
                    } else if (column.key === 'avg_score') {
                      cellValue = row.avg_score.toFixed(2);
                      textAlign = 'right';
                    } else if (column.key === 'total_check' || column.key === 'critical_count') {
                      cellValue = row[column.key].toLocaleString('en-US');
                      textAlign = 'right';
                    } else {
                      cellValue = (row[column.key] ?? '-').toString();
                    }

                    return (
                      <td
                        key={colIndex}
                        style={{
                          padding: '8px 6px',
                          color: textColor,
                          whiteSpace: column.key === 'item' ? 'normal' : 'nowrap',
                          border: '1px solid #eee',
                          backgroundColor: bgColor,
                          textAlign,
                          fontSize: '12px',
                          fontWeight: column.key === 'percent_critical' ? '600' : '400',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          wordBreak: column.key === 'item' ? 'break-word' : 'normal',
                        }}
                        title={cellValue}
                      >
                        {cellValue}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default WorstCodeSummaryTable;
