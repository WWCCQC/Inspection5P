'use client';

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';
import * as XLSX from 'xlsx';
import React from 'react';

type FivePData = {
  Technician_Code: string | null;
  Technician_Name: string | null;
  Company_Name: string | null;
  RSM: string | null;
  P: string | null;
  Score: string | null;
  Date: string | null;
};

type TechnicianRankingRow = {
  rank: number;
  technician_code: string;
  technician_name: string;
  company_name: string;
  rsm: string;
  total_score: number;
  max_score: number;
  percent_score: number;
  people: number;
  planning_procedure: number;
  ppe_tools: number;
  place: number;
  pause: number;
  total_items: number;
  last_inspection_date: string;
};

type TechnicianRankingBottomTableProps = {
  project?: string;
};

const TechnicianRankingBottomTable = ({ project }: TechnicianRankingBottomTableProps = {}) => {
  const { data, isLoading, error } = useQuery({
    queryKey: ['technician-ranking-bottom', project],
    queryFn: async () => {
      let allData: FivePData[] = [];
      let page = 0;
      const pageSize = 1000;
      let hasMore = true;

      while (hasMore) {
        let query = supabase
          .from('5p')
          .select('Technician_Code, Technician_Name, Company_Name, RSM, P, Score, Date')
          .range(page * pageSize, (page + 1) * pageSize - 1);

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

      return allData;
    },
  });

  const rankingData: TechnicianRankingRow[] = React.useMemo(() => {
    if (!data || data.length === 0) return [];

    const technicianMap = new Map<string, {
      technician_name: string;
      company_name: string;
      rsm: string;
      scores: number[];
      people_scores: number[];
      planning_scores: number[];
      ppe_scores: number[];
      place_scores: number[];
      pause_scores: number[];
      dates: string[];
    }>();

    data.forEach(item => {
      const techCode = item.Technician_Code || '-';
      const scoreValue = parseFloat(item.Score || '0');
      const score = isNaN(scoreValue) ? 0 : scoreValue;
      const p = item.P || '';
      const date = item.Date || '';

      if (!technicianMap.has(techCode)) {
        technicianMap.set(techCode, {
          technician_name: item.Technician_Name || '-',
          company_name: item.Company_Name || '-',
          rsm: item.RSM || '-',
          scores: [],
          people_scores: [],
          planning_scores: [],
          ppe_scores: [],
          place_scores: [],
          pause_scores: [],
          dates: [],
        });
      }

      const techData = technicianMap.get(techCode)!;
      techData.scores.push(score);
      techData.dates.push(date);

      if (p === 'People') {
        techData.people_scores.push(score);
      } else if (p === 'Planning & Procedure') {
        techData.planning_scores.push(score);
      } else if (p === 'PPE & Tools') {
        techData.ppe_scores.push(score);
      } else if (p === 'Place') {
        techData.place_scores.push(score);
      } else if (p === 'Pause') {
        techData.pause_scores.push(score);
      }
    });

    const rankings: TechnicianRankingRow[] = [];
    const maxScorePerItem = 3;

    technicianMap.forEach((techData, techCode) => {
      const total_score = techData.scores.reduce((sum, score) => sum + (isNaN(score) ? 0 : score), 0);
      const total_items = techData.scores.length;
      const max_score = total_items * maxScorePerItem;
      const percent_score = max_score > 0 ? (total_score / max_score) * 100 : 0;

      const people = techData.people_scores.reduce((sum, score) => sum + (isNaN(score) ? 0 : score), 0);
      const planning_procedure = techData.planning_scores.reduce((sum, score) => sum + (isNaN(score) ? 0 : score), 0);
      const ppe_tools = techData.ppe_scores.reduce((sum, score) => sum + (isNaN(score) ? 0 : score), 0);
      const place = techData.place_scores.reduce((sum, score) => sum + (isNaN(score) ? 0 : score), 0);
      const pause = techData.pause_scores.reduce((sum, score) => sum + (isNaN(score) ? 0 : score), 0);

      const sortedDates = techData.dates
        .filter(d => d)
        .sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
      const last_inspection_date = sortedDates[0] || '-';

      rankings.push({
        rank: 0,
        technician_code: techCode,
        technician_name: techData.technician_name,
        company_name: techData.company_name,
        rsm: techData.rsm,
        total_score,
        max_score,
        percent_score,
        people,
        planning_procedure,
        ppe_tools,
        place,
        pause,
        total_items,
        last_inspection_date,
      });
    });

    // Sort by percent_score ASCENDING (น้อยที่สุดก่อน) and take bottom 10
    const sortedRankings = rankings.sort((a, b) => a.percent_score - b.percent_score).slice(0, 10);

    // Add rank
    sortedRankings.forEach((item, index) => {
      item.rank = index + 1;
    });

    return sortedRankings;
  }, [data]);

  const exportToExcel = () => {
    const ws = XLSX.utils.json_to_sheet(
      rankingData.map(row => ({
        'Rank': row.rank,
        'Technician_Code': row.technician_code,
        'Technician_Name': row.technician_name,
        'Company_Name': row.company_name,
        'RSM': row.rsm,
        'Max_Score': row.max_score,
        'Total_Score': row.total_score,
        '%Score': row.percent_score.toFixed(2),
        'Total_Items': row.total_items,
        'People': row.people,
        'Planning & Procedure': row.planning_procedure,
        'PPE & Tools': row.ppe_tools,
        'Place': row.place,
        'Pause': row.pause,
      }))
    );

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '5P Ranking Bottom 10');
    XLSX.writeFile(wb, '5P_Technician_Ranking_Bottom10.xlsx');
  };

  // Function to get gradient color based on percentage
  const getGradientColor = (percentage: number): string => {
    const percent = Math.max(0, Math.min(100, percentage));
    
    if (percent >= 95) {
      const ratio = (percent - 95) / 5;
      const r = Math.round(50 - (50 - 10) * ratio);
      const g = Math.round(150 - (150 - 126) * ratio);
      const b = Math.round(7);
      return `rgb(${r}, ${g}, ${b})`;
    } else if (percent >= 93) {
      const ratio = (percent - 93) / 2;
      const r = Math.round(251 - (251 - 50) * ratio);
      const g = Math.round(192 - (192 - 150) * ratio);
      const b = Math.round(45 - (45 - 7) * ratio);
      return `rgb(${r}, ${g}, ${b})`;
    } else if (percent >= 90) {
      const ratio = (percent - 90) / 3;
      const r = Math.round(255 - (255 - 251) * ratio);
      const g = Math.round(140 - (140 - 192) * ratio);
      const b = Math.round(30 - (30 - 45) * ratio);
      return `rgb(${r}, ${g}, ${b})`;
    } else {
      const ratio = percent / 90;
      const r = Math.round(208 - (208 - 255) * ratio);
      const g = Math.round(23 - (23 - 140) * ratio);
      const b = Math.round(22 - (22 - 30) * ratio);
      return `rgb(${r}, ${g}, ${b})`;
    }
  };

  const columns = [
    { header: 'Rank', key: 'rank' as const },
    { header: 'Technician_Code', key: 'technician_code' as const },
    { header: 'Technician_Name', key: 'technician_name' as const },
    { header: 'Company_Name', key: 'company_name' as const },
    { header: 'RSM', key: 'rsm' as const },
    { header: 'Max_Score', key: 'max_score' as const },
    { header: 'Total_Score', key: 'total_score' as const },
    { header: '%Score', key: 'percent_score' as const },
    { header: 'Total_Items', key: 'total_items' as const },
    { header: 'People', key: 'people' as const },
    { header: 'Planning & Procedure', key: 'planning_procedure' as const },
    { header: 'PPE & Tools', key: 'ppe_tools' as const },
    { header: 'Place', key: 'place' as const },
    { header: 'Pause', key: 'pause' as const },
  ];

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg border shadow-sm overflow-hidden mb-6">
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
            5P Technician Ranking (Bottom 10)
          </h3>
        </div>
        <div className="flex items-center justify-center py-12">
          <div className="text-gray-500">Loading...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg border shadow-sm overflow-hidden mb-6">
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
            5P Technician Ranking (Bottom 10)
          </h3>
        </div>
        <div className="flex items-center justify-center py-12">
          <div className="text-red-500">Error loading data</div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border shadow-sm overflow-hidden mb-6">
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
          5P Technician Ranking (Bottom 10)
        </h3>
      </div>

      <div className="overflow-x-auto">
        <table style={{ width: '100%', fontSize: '13px', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
          <colgroup>
            <col style={{ width: '50px' }} /> {/* Rank */}
            <col style={{ width: '90px' }} /> {/* Technician_Code */}
            <col style={{ width: '130px' }} /> {/* Technician_Name */}
            <col style={{ width: '150px' }} /> {/* Company_Name */}
            <col style={{ width: '100px' }} /> {/* RSM */}
            <col style={{ width: '80px' }} /> {/* Max_Score */}
            <col style={{ width: '80px' }} /> {/* Total_Score */}
            <col style={{ width: '80px' }} /> {/* %Score */}
            <col style={{ width: '80px' }} /> {/* Total_Items */}
            <col style={{ width: '70px' }} /> {/* People */}
            <col style={{ width: '130px' }} /> {/* Planning & Procedure */}
            <col style={{ width: '90px' }} /> {/* PPE & Tools */}
            <col style={{ width: '70px' }} /> {/* Place */}
            <col style={{ width: '70px' }} /> {/* Pause */}
          </colgroup>
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
            {rankingData.map((row, rowIndex) => {
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
                    } else if (column.key === 'percent_score') {
                      const percentValue = isNaN(row.percent_score) ? 0 : row.percent_score;
                      cellValue = `${percentValue.toFixed(2)}%`;
                      bgColor = getGradientColor(percentValue);
                      textColor = 'white';
                      textAlign = 'right';
                    } else if (column.key === 'total_score' || column.key === 'max_score' || 
                               column.key === 'people' || column.key === 'planning_procedure' || 
                               column.key === 'ppe_tools' || column.key === 'place' || 
                               column.key === 'pause' || column.key === 'total_items') {
                      const numValue = isNaN(row[column.key]) ? 0 : row[column.key];
                      cellValue = numValue.toLocaleString('en-US');
                      textAlign = 'right';
                    } else {
                      cellValue = (row[column.key] ?? '-').toString();
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
                          textAlign,
                          fontWeight: column.key === 'percent_score' ? '600' : '400',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
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

export default TechnicianRankingBottomTable;
