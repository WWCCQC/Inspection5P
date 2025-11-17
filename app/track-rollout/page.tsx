"use client";
import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import type { ColumnDef } from "@tanstack/react-table";
import * as XLSX from 'xlsx';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell, LabelList } from 'recharts';

type Row5P = {
  id: number;
  Timestamp: string | null;
  Date: string | null;
  Inspector_Name: string | null;
  Project: string | null;
  Technician_Code: string | null;
  Technician_Name: string | null;
  Company_Code: string | null;
  Company_Name: string | null;
  RSM: string | null;
  ["Site_ID/SOS_No."]: string | null;
  Province: string | null;
  ["Type of work"]: string | null;
  P: string | null;
  Code: string | null;
  Item: string | null;
  Score: string | null;
  ScoreDetail: string | null;
  Problem: string | null;
  Solutions: string | null;
  Start_Date: string | null;
  End_Date: string | null;
  Status: string | null;
};

type FivePData = {
  Technician_Code: string | null;
  Technician_Name: string | null;
  Company_Name: string | null;
  RSM: string | null;
  P: string | null;
  Score: string | null;
  Date: string | null;
  Code?: string | null;
  Item?: string | null;
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

type WorstCodeChartData = {
  code: string;
  item: string;
  percentCritical: number;
};

// Component สำหรับแสดงตาราง
function DataTableComponent({ data }: { data: Row5P[] }) {
  const [searchTerm, setSearchTerm] = React.useState("");
  const [currentPage, setCurrentPage] = React.useState(1);
  const [companyNameFilter, setCompanyNameFilter] = React.useState("");
  const [rsmFilter, setRsmFilter] = React.useState("");
  const [scoreFilter, setScoreFilter] = React.useState("");
  const [siteIdFilter, setSiteIdFilter] = React.useState("");
  const [provinceFilter, setProvinceFilter] = React.useState("");
  const [typeOfWorkFilter, setTypeOfWorkFilter] = React.useState("");
  const [searchBorderColor, setSearchBorderColor] = React.useState("#e5e7eb");

  const rows = data;
  
  const rowsPerPage = 50;

  // ฟังก์ชันแปลงรูปแบบ Date เป็น DD/MM/YYYY (ค.ศ.)
  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    try {
      const date = new Date(dateString);
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      return `${day}/${month}/${year}`;
    } catch {
      return dateString;
    }
  };

  // Filter และ search ข้อมูล
  const filteredRows = React.useMemo(() => {
    let filtered = [...rows];
    
    // Filter for Track Rollout only
    filtered = filtered.filter(row => row.Project === 'Track Rollout');
    
    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(row =>
        Object.values(row || {}).some(value =>
          value?.toString().toLowerCase().includes(searchTerm.toLowerCase())
        )
      );
    }
    
    // Company Name filter
    if (companyNameFilter) {
      filtered = filtered.filter(row => row.Company_Name === companyNameFilter);
    }
    
    // RSM filter  
    if (rsmFilter) {
      filtered = filtered.filter(row => row.RSM === rsmFilter);
    }

    // Score filter
    if (scoreFilter) {
      filtered = filtered.filter(row => row.Score === scoreFilter);
    }
    
    // Site_ID/SOS_No. filter
    if (siteIdFilter) {
      filtered = filtered.filter(row => row["Site_ID/SOS_No."] === siteIdFilter);
    }
    
    // Province filter
    if (provinceFilter) {
      filtered = filtered.filter(row => row.Province === provinceFilter);
    }
    
    // Type of work filter
    if (typeOfWorkFilter) {
      filtered = filtered.filter(row => row["Type of work"] === typeOfWorkFilter);
    }
    
    // Sort by Date (newest first), then Technician_Name, then Code
    filtered.sort((a, b) => {
      // 1. Sort by Date (newest first - descending order)
      const dateA = a.Date ? new Date(a.Date).getTime() : 0;
      const dateB = b.Date ? new Date(b.Date).getTime() : 0;
      if (dateB !== dateA) {
        return dateB - dateA;
      }
      
      // 2. Sort by Technician_Name (alphabetically)
      const techA = (a.Technician_Name || '').toLowerCase();
      const techB = (b.Technician_Name || '').toLowerCase();
      if (techA !== techB) {
        return techA.localeCompare(techB);
      }
      
      // 3. Sort by Code (1.1, 1.2, 1.3, 2.1, 2.2, 2.3)
      const codeA = a.Code || '';
      const codeB = b.Code || '';
      
      // Parse code as numbers (e.g., "1.1" -> [1, 1], "2.11" -> [2, 11])
      const parseCode = (code: string) => {
        const parts = code.split('.').map(part => parseInt(part) || 0);
        return parts;
      };
      
      const partsA = parseCode(codeA);
      const partsB = parseCode(codeB);
      
      // Compare each part
      for (let i = 0; i < Math.max(partsA.length, partsB.length); i++) {
        const partA = partsA[i] || 0;
        const partB = partsB[i] || 0;
        if (partA !== partB) {
          return partA - partB;
        }
      }
      
      return 0;
    });
    
    return filtered;
  }, [rows, searchTerm, companyNameFilter, rsmFilter, scoreFilter, siteIdFilter, provinceFilter, typeOfWorkFilter]);

  // Pagination
  const totalPages = Math.ceil(filteredRows.length / rowsPerPage);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const paginatedRows = filteredRows.slice(startIndex, startIndex + rowsPerPage);

  // Get unique values for filters
  const uniqueCompanyNames = React.useMemo(() => {
    const trackRolloutRows = rows.filter(row => row.Project === 'Track Rollout');
    return Array.from(new Set(trackRolloutRows.map(row => row?.Company_Name).filter(Boolean)));
  }, [rows]);
  
  const uniqueRSMs = React.useMemo(() => {
    const trackRolloutRows = rows.filter(row => row.Project === 'Track Rollout');
    return Array.from(new Set(trackRolloutRows.map(row => row?.RSM).filter(Boolean)));
  }, [rows]);

  const uniqueScores = React.useMemo(() => {
    const trackRolloutRows = rows.filter(row => row.Project === 'Track Rollout');
    return Array.from(new Set(trackRolloutRows.map(row => row?.Score).filter(Boolean)));
  }, [rows]);

  const uniqueSiteIds = React.useMemo(() => {
    const trackRolloutRows = rows.filter(row => row.Project === 'Track Rollout');
    return Array.from(new Set(trackRolloutRows.map(row => row?.["Site_ID/SOS_No."]).filter(Boolean)));
  }, [rows]);

  const uniqueProvinces = React.useMemo(() => {
    const trackRolloutRows = rows.filter(row => row.Project === 'Track Rollout');
    return Array.from(new Set(trackRolloutRows.map(row => row?.Province).filter(Boolean)));
  }, [rows]);

  const uniqueTypeOfWorks = React.useMemo(() => {
    const trackRolloutRows = rows.filter(row => row.Project === 'Track Rollout');
    return Array.from(new Set(trackRolloutRows.map(row => row?.["Type of work"]).filter(Boolean)));
  }, [rows]);

  // Export to Excel function
  const exportToExcel = () => {
    const ws = XLSX.utils.json_to_sheet(filteredRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "5P Data");
    XLSX.writeFile(wb, `5p-data-${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const columns = [
    { header: "Date", key: "Date" },
    { header: "Inspector", key: "Inspector_Name" },
    { header: "Project", key: "Project" },
    { header: "Technician Code", key: "Technician_Code" },
    { header: "Technician Name", key: "Technician_Name" },
    { header: "Company Code", key: "Company_Code" },
    { header: "Company Name", key: "Company_Name" },
    { header: "RSM", key: "RSM" },
    { header: "Site_ID/SOS_No.", key: "Site_ID/SOS_No." },
    { header: "Province", key: "Province" },
    { header: "Type of work", key: "Type of work" },
    { header: "P", key: "P" },
    { header: "Code", key: "Code" },
    { header: "Item", key: "Item" },
    { header: "Score", key: "Score" },
  ];

  return (
    <div className="space-y-6" style={{ marginTop: '40px' }}>
      {/* Table Section */}
      <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
        {/* 5P Survey Header with Filters */}
        <div 
          style={{
            padding: '12px 16px',
            backgroundColor: '#5c6bc0',
            color: 'white',
            fontWeight: '600',
            fontSize: '16px',
            width: '100%',
            display: 'flex',
            gap: '12px',
            alignItems: 'center',
            flexWrap: 'wrap'
          }}
        >
          <span style={{ minWidth: '80px' }}>5P Survey</span>
          
          {/* Search Input */}
          <input
            type="text"
            placeholder="ค้นหาอะไรก็ได้ในตารางนี้"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onFocus={() => setSearchBorderColor("#3b82f6")}
            onBlur={() => setSearchBorderColor("#e5e7eb")}
            style={{
              flex: 1,
              minWidth: '250px',
              padding: '8px 12px',
              fontSize: '14px',
              border: `2px solid ${searchBorderColor}`,
              borderRadius: '6px',
              outline: 'none',
              transition: 'border-color 0.2s ease'
            }}
          />

          {/* Company Name Filter */}
          <select
            value={companyNameFilter}
            onChange={(e) => setCompanyNameFilter(e.target.value)}
            style={{
              padding: '8px 12px',
              fontSize: '14px',
              border: '1px solid #ccc',
              borderRadius: '6px',
              outline: 'none',
              cursor: 'pointer',
              backgroundColor: 'white',
              color: '#333'
            }}
          >
            <option value="">Company Name</option>
            {uniqueCompanyNames.map(name => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>

          {/* RSM Filter */}
          <select
            value={rsmFilter}
            onChange={(e) => setRsmFilter(e.target.value)}
            style={{
              padding: '8px 12px',
              fontSize: '14px',
              border: '1px solid #ccc',
              borderRadius: '6px',
              outline: 'none',
              cursor: 'pointer',
              backgroundColor: 'white',
              color: '#333'
            }}
          >
            <option value="">RSM</option>
            {uniqueRSMs.map(rsm => (
              <option key={rsm} value={rsm}>{rsm}</option>
            ))}
          </select>

          {/* Score Filter */}
          <select
            value={scoreFilter}
            onChange={(e) => setScoreFilter(e.target.value)}
            style={{
              padding: '8px 12px',
              fontSize: '14px',
              border: '1px solid #ccc',
              borderRadius: '6px',
              outline: 'none',
              cursor: 'pointer',
              backgroundColor: 'white',
              color: '#333'
            }}
          >
            <option value="">Score</option>
            {uniqueScores.map(score => (
              <option key={score} value={score}>{score}</option>
            ))}
          </select>

          {/* Site_ID/SOS_No. Filter */}
          <select
            value={siteIdFilter}
            onChange={(e) => setSiteIdFilter(e.target.value)}
            style={{
              padding: '8px 12px',
              fontSize: '14px',
              border: '1px solid #ccc',
              borderRadius: '6px',
              outline: 'none',
              cursor: 'pointer',
              backgroundColor: 'white',
              color: '#333'
            }}
          >
            <option value="">Site_ID/SOS_No.</option>
            {uniqueSiteIds.map(siteId => (
              <option key={siteId} value={siteId}>{siteId}</option>
            ))}
          </select>

          {/* Province Filter */}
          <select
            value={provinceFilter}
            onChange={(e) => setProvinceFilter(e.target.value)}
            style={{
              padding: '8px 12px',
              fontSize: '14px',
              border: '1px solid #ccc',
              borderRadius: '6px',
              outline: 'none',
              cursor: 'pointer',
              backgroundColor: 'white',
              color: '#333'
            }}
          >
            <option value="">Province</option>
            {uniqueProvinces.map(province => (
              <option key={province} value={province}>{province}</option>
            ))}
          </select>

          {/* Type of work Filter */}
          <select
            value={typeOfWorkFilter}
            onChange={(e) => setTypeOfWorkFilter(e.target.value)}
            style={{
              padding: '8px 12px',
              fontSize: '14px',
              border: '1px solid #ccc',
              borderRadius: '6px',
              outline: 'none',
              cursor: 'pointer',
              backgroundColor: 'white',
              color: '#333'
            }}
          >
            <option value="">Type of work</option>
            {uniqueTypeOfWorks.map(typeOfWork => (
              <option key={typeOfWork} value={typeOfWork}>{typeOfWork}</option>
            ))}
          </select>

          {/* Export Button */}
          <button
            onClick={exportToExcel}
            style={{
              marginLeft: 'auto',
              padding: '8px 16px',
              backgroundColor: '#2563eb',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'background-color 0.2s ease',
              whiteSpace: 'nowrap',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#1d4ed8'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#2563eb'}
          >
            📊 Export
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
                      width: column.key === 'Item' ? '300px' : 'auto',
                      maxWidth: column.key === 'Item' ? '300px' : 'none',
                      overflow: column.key === 'Item' ? 'hidden' : 'visible',
                      textOverflow: column.key === 'Item' ? 'ellipsis' : 'clip'
                    }}
                  >
                    {column.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paginatedRows.map((row, rowIndex) => (
                <tr key={row.id || rowIndex}>
                  {columns.map((column, colIndex) => (
                    <td 
                      key={colIndex} 
                      style={{ 
                        padding: '6px 8px',
                        color: '#333',
                        whiteSpace: 'nowrap',
                        border: '1px solid #eee',
                        width: column.key === 'Item' ? '300px' : 'auto',
                        maxWidth: column.key === 'Item' ? '300px' : 'none',
                        overflow: column.key === 'Item' ? 'hidden' : 'visible',
                        textOverflow: column.key === 'Item' ? 'ellipsis' : 'clip'
                      }}
                    >
                      {column.key === 'Date' 
                        ? formatDate(row[column.key as keyof Row5P] as string)
                        : column.key === 'Project'
                        ? 'Track Rollout'
                        : (row[column.key as keyof Row5P] || '-')
                      }
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="px-4 py-3 border-t bg-gray-50 flex items-center justify-between">
          <div className="text-sm text-gray-700">
            แสดง {startIndex + 1}-{Math.min(startIndex + rowsPerPage, filteredRows.length)} จาก {filteredRows.length} รายการ
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1 text-sm border rounded-md hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              ก่อนหน้า
            </button>
            
            <span className="text-sm">
              หน้า {currentPage} จาก {totalPages}
            </span>
            
            <button
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1 text-sm border rounded-md hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              ถัดไป
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Content() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["5p", "Track Rollout"],
    queryFn: async () => {
      // Fetch ALL Track Rollout data without limit
      let allData: Row5P[] = [];
      let from = 0;
      const pageSize = 1000;
      
      while (true) {
        const { data, error } = await supabase
          .from("5p")
          .select("*")
          .eq("Project", "Track Rollout")
          .range(from, from + pageSize - 1);
          
        if (error) throw error;
        
        if (!data || data.length === 0) break;
        
        allData = [...allData, ...data];
        
        if (data.length < pageSize) break;
        
        from += pageSize;
      }
      
      return allData as Row5P[];
    }
  });

  if (isLoading) return <div className="flex justify-center items-center h-64">Loading…</div>;
  if (error) return <div className="text-red-600">Error: {(error as any).message}</div>;

  return (
    <div>
      {/* Track Rollout-5P Technician Ranking (Top 10) */}
      <TechnicianRankingTableRollout />

      {/* Divider */}
      <div style={{ height: '3px', backgroundColor: '#5c6bc0', margin: '24px 0' }}></div>

      {/* Track Rollout-5P Technician Ranking (Bottom 10) */}
      <TechnicianRankingBottomTableRollout />

      {/* Divider */}
      <div style={{ height: '3px', backgroundColor: '#5c6bc0', margin: '24px 0' }}></div>

      {/* Track Rollout-5P Worst Code Summary Table & Chart (70% - 30%) */}
      <div style={{ display: 'flex', gap: '16px', marginBottom: '24px' }}>
        <div style={{ flex: '0 0 70%' }}>
          <WorstCodeSummaryTableRollout />
        </div>
        {/* Vertical Divider */}
        <div style={{ width: '1px', backgroundColor: '#d1d5db', flexShrink: 0 }}></div>
        <div style={{ flex: '1' }}>
          <WorstCodeChartRollout />
        </div>
      </div>

      {/* Divider */}
      <div style={{ height: '3px', backgroundColor: '#5c6bc0', margin: '24px 0' }}></div>

      {/* Main Data Table */}
      <DataTableComponent data={data || []} />
    </div>
  );
}

// Component สำหรับแสดง Technician Ranking (Bottom 10) - Track Rollout only
function TechnicianRankingBottomTableRollout() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['technician-ranking-bottom-rollout'],
    queryFn: async () => {
      let allData: FivePData[] = [];
      let page = 0;
      const pageSize = 1000;
      let hasMore = true;

      while (hasMore) {
        const { data: fivePData, error } = await supabase
          .from('5p')
          .select('Technician_Code, Technician_Name, Company_Name, RSM, P, Score, Date')
          .eq('Project', 'Track Rollout')
          .range(page * pageSize, (page + 1) * pageSize - 1);

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

    // Group by Technician_Name instead of Technician_Code
    const technicianMap = new Map<string, {
      technician_code: string;
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
      const techName = item.Technician_Name || '-';
      const scoreValue = parseFloat(item.Score || '0');
      const score = isNaN(scoreValue) ? 0 : scoreValue;
      const p = item.P || '';
      const date = item.Date || '';

      if (!technicianMap.has(techName)) {
        technicianMap.set(techName, {
          technician_code: item.Technician_Code || '-',
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

      const techData = technicianMap.get(techName)!;
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

    technicianMap.forEach((techData, techName) => {
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
        technician_code: techData.technician_code,
        technician_name: techName,
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

    rankings.sort((a, b) => a.percent_score - b.percent_score || a.total_score - b.total_score);

    rankings.forEach((item, index) => {
      item.rank = index + 1;
    });

    return rankings;
  }, [data]);

  const bottom10Data = React.useMemo(() => {
    return rankingData.slice(0, 10);
  }, [rankingData]);

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
        <div style={{ padding: '12px 16px', backgroundColor: '#5c6bc0', width: '100%' }}>
          <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '600', color: 'white' }}>
            Track Rollout-5P Technician Ranking (Bottom 10)
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
        <div style={{ padding: '12px 16px', backgroundColor: '#5c6bc0', width: '100%' }}>
          <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '600', color: 'white' }}>
            Track Rollout-5P Technician Ranking (Bottom 10)
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
      <div style={{ padding: '12px 16px', backgroundColor: '#5c6bc0', width: '100%' }}>
        <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '600', color: 'white' }}>
          Track Rollout-5P Technician Ranking (Bottom 10)
        </h3>
      </div>

      <div className="overflow-x-auto">
        <table style={{ width: '100%', fontSize: '13px', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
          <colgroup>
            <col style={{ width: '50px' }} />
            <col style={{ width: '130px' }} />
            <col style={{ width: '150px' }} />
            <col style={{ width: '100px' }} />
            <col style={{ width: '80px' }} />
            <col style={{ width: '80px' }} />
            <col style={{ width: '80px' }} />
            <col style={{ width: '80px' }} />
            <col style={{ width: '70px' }} />
            <col style={{ width: '130px' }} />
            <col style={{ width: '90px' }} />
            <col style={{ width: '70px' }} />
            <col style={{ width: '70px' }} />
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
            {bottom10Data.map((row, rowIndex) => {
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
}

// Component สำหรับ Worst Code Summary (Top 10) - Track Rollout only  
function WorstCodeSummaryTableRollout() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['worst-code-summary-rollout'],
    queryFn: async () => {
      let allData: FivePData[] = [];
      let page = 0;
      const pageSize = 1000;
      let hasMore = true;

      while (hasMore) {
        const { data: fivePData, error } = await supabase
          .from('5p')
          .select('Code, Item, P, Score')
          .eq('Project', 'Track Rollout')
          .range(page * pageSize, (page + 1) * pageSize - 1);

        if (error) {
          console.error('Supabase error:', error);
          throw error;
        }

        if (!fivePData || fivePData.length === 0) {
          hasMore = false;
        } else {
          allData = [...allData, ...(fivePData as any[])];
          page++;
        }
      }

      return allData;
    },
  });

  const worstCodeData: WorstCodeRow[] = React.useMemo(() => {
    if (!data || data.length === 0) return [];

    const codeMap = new Map<string, {
      item: string;
      p: string;
      scores: number[];
    }>();

    data.forEach(item => {
      const code = item.Code || '-';
      const scoreStr = (item.Score || '').toString().trim().toUpperCase();
      
      if (!scoreStr || scoreStr === '' || scoreStr === 'NA') {
        return;
      }

      const scoreValue = parseFloat(item.Score || '0');
      const score = isNaN(scoreValue) ? 0 : scoreValue;

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

    const summary: WorstCodeRow[] = [];

    codeMap.forEach((codeData, code) => {
      const total_check = codeData.scores.length;
      const critical_count = codeData.scores.filter(s => s <= 1).length;
      const total_score = codeData.scores.reduce((sum, s) => sum + s, 0);
      const avg_score = total_check > 0 ? total_score / total_check : 0;
      const percent_critical = total_check > 0 ? (critical_count / total_check) * 100 : 0;

      summary.push({
        rank: 0,
        code,
        item: codeData.item,
        p: codeData.p,
        total_check,
        critical_count,
        avg_score,
        percent_critical,
      });
    });

    summary.sort((a, b) => {
      if (b.percent_critical !== a.percent_critical) {
        return b.percent_critical - a.percent_critical;
      }
      return a.avg_score - b.avg_score;
    });

    const top10 = summary.slice(0, 10);
    top10.forEach((item, index) => {
      item.rank = index + 1;
    });

    return top10;
  }, [data]);

  const columns = [
    { header: 'Rank', key: 'rank' as const },
    { header: 'Code', key: 'code' as const },
    { header: 'Item', key: 'item' as const },
    { header: 'P', key: 'p' as const },
    { header: 'Total_Check', key: 'total_check' as const },
    { header: 'Critical_Count', key: 'critical_count' as const },
    { header: 'Avg_Score', key: 'avg_score' as const },
    { header: '%Critical', key: 'percent_critical' as const },
  ];

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg border shadow-sm overflow-hidden mb-6">
        <div style={{ padding: '12px 16px', backgroundColor: '#5c6bc0', width: '100%' }}>
          <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '600', color: 'white' }}>
            Track Rollout-5P Worst Code Summary (Top 10)
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
        <div style={{ padding: '12px 16px', backgroundColor: '#5c6bc0', width: '100%' }}>
          <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '600', color: 'white' }}>
            Track Rollout-5P Worst Code Summary (Top 10)
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
      <div style={{ padding: '12px 16px', backgroundColor: '#5c6bc0', width: '100%' }}>
        <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '600', color: 'white' }}>
          Track Rollout-5P Worst Code Summary (Top 10)
        </h3>
      </div>

      <div className="overflow-x-auto">
        <table style={{ width: '100%', fontSize: '13px', borderCollapse: 'collapse' }}>
          <colgroup>
            <col style={{ width: '5%' }} />
            <col style={{ width: '8%' }} />
            <col style={{ width: '30%' }} />
            <col style={{ width: '18%' }} />
            <col style={{ width: '10%' }} />
            <col style={{ width: '12%' }} />
            <col style={{ width: '9%' }} />
            <col style={{ width: '8%' }} />
          </colgroup>
          <thead>
            <tr>
              {columns.map((column, index) => (
                <th
                  key={index}
                  style={{
                    padding: '8px',
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
            {worstCodeData.map((row, rowIndex) => (
              <tr key={rowIndex}>
                {columns.map((column, colIndex) => {
                  let cellValue = '-';
                  let textAlign: 'left' | 'right' | 'center' = 'left';
                  let cellStyle: React.CSSProperties = {
                    padding: '8px',
                    border: '1px solid #eee',
                    textAlign,
                  };

                  if (column.key === 'rank') {
                    cellValue = row.rank.toString();
                    textAlign = 'center';
                    cellStyle.textAlign = 'center';
                  } else if (column.key === 'item') {
                    cellValue = (row[column.key] ?? '-').toString();
                    cellStyle.whiteSpace = 'normal';
                    cellStyle.wordBreak = 'break-word';
                  } else if (column.key === 'avg_score') {
                    cellValue = row.avg_score.toFixed(2);
                    textAlign = 'right';
                    cellStyle.textAlign = 'right';
                    cellStyle.whiteSpace = 'nowrap';
                  } else if (column.key === 'percent_critical') {
                    cellValue = `${row.percent_critical.toFixed(2)}%`;
                    textAlign = 'right';
                    cellStyle.textAlign = 'right';
                    cellStyle.whiteSpace = 'nowrap';
                  } else if (column.key === 'total_check' || column.key === 'critical_count') {
                    cellValue = row[column.key].toLocaleString('en-US');
                    textAlign = 'right';
                    cellStyle.textAlign = 'right';
                    cellStyle.whiteSpace = 'nowrap';
                  } else {
                    cellValue = (row[column.key] ?? '-').toString();
                    cellStyle.whiteSpace = 'nowrap';
                  }

                  return (
                    <td
                      key={colIndex}
                      style={cellStyle}
                    >
                      {cellValue}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Component สำหรับ Worst Code Chart - Track Rollout only
function WorstCodeChartRollout() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['worst-code-chart-rollout'],
    queryFn: async () => {
      let allData: any[] = [];
      let page = 0;
      const pageSize = 1000;
      let hasMore = true;

      while (hasMore) {
        const { data: fivePData, error } = await supabase
          .from('5p')
          .select('Code, Item, P, Score')
          .eq('Project', 'Track Rollout')
          .range(page * pageSize, (page + 1) * pageSize - 1);

        if (error) {
          console.error('Supabase error:', error);
          throw error;
        }

        if (!fivePData || fivePData.length === 0) {
          hasMore = false;
        } else {
          allData = [...allData, ...fivePData];
          page++;
        }
      }

      return allData;
    },
  });

  const chartData: WorstCodeChartData[] = React.useMemo(() => {
    if (!data || data.length === 0) return [];

    const codeMap = new Map<string, {
      item: string;
      scores: number[];
    }>();

    data.forEach((item: any) => {
      const code = item.Code || '-';
      const scoreStr = (item.Score || '').toString().trim().toUpperCase();
      
      if (!scoreStr || scoreStr === '' || scoreStr === 'NA') {
        return;
      }

      const scoreValue = parseFloat(item.Score || '0');
      const score = isNaN(scoreValue) ? 0 : scoreValue;

      if (score < 0 || score > 5) {
        return;
      }

      if (!codeMap.has(code)) {
        codeMap.set(code, {
          item: item.Item || '-',
          scores: [],
        });
      }

      const codeData = codeMap.get(code)!;
      codeData.scores.push(score);
    });

    const summary: Array<{
      code: string;
      item: string;
      percentCritical: number;
      avgScore: number;
    }> = [];

    codeMap.forEach((codeData, code) => {
      const totalCheck = codeData.scores.length;
      const criticalCount = codeData.scores.filter(s => s <= 1).length;
      const totalScore = codeData.scores.reduce((sum, s) => sum + s, 0);
      const avgScore = totalCheck > 0 ? totalScore / totalCheck : 0;
      const percentCritical = totalCheck > 0 ? (criticalCount / totalCheck) * 100 : 0;

      summary.push({
        code,
        item: codeData.item,
        percentCritical,
        avgScore,
      });
    });

    summary.sort((a, b) => {
      if (b.percentCritical !== a.percentCritical) {
        return b.percentCritical - a.percentCritical;
      }
      return a.avgScore - b.avgScore;
    });

    const top10 = summary.slice(0, 10);
    return top10.map(item => ({
      code: item.code,
      item: item.item,
      percentCritical: parseFloat(item.percentCritical.toFixed(1)),
    }));
  }, [data]);

  if (isLoading) return <div className="text-center py-4">Loading chart…</div>;
  if (error) return <div className="text-red-600 py-4">Error loading chart data</div>;
  if (chartData.length === 0) return <div className="text-center py-4">No data available</div>;

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div style={{
          backgroundColor: 'white',
          padding: '10px',
          border: '1px solid #ccc',
          borderRadius: '4px',
        }}>
          <p style={{ margin: 0, fontWeight: 'bold' }}>{payload[0].payload.code}</p>
          <p style={{ margin: '4px 0 0 0', fontSize: '12px' }}>{payload[0].payload.item}</p>
          <p style={{ margin: '4px 0 0 0', color: '#d90429', fontWeight: 'bold' }}>
            {payload[0].value.toFixed(1)}%
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white rounded-lg border shadow-sm overflow-hidden" style={{ height: '100%' }}>
      <div style={{
        padding: '12px 16px',
        backgroundColor: '#5c6bc0',
        color: 'white',
        fontWeight: '600',
        fontSize: '16px',
      }}>
        Track Rollout-5P Worst Code Chart
      </div>
      <div style={{ padding: '16px' }}>
        <ResponsiveContainer width="100%" height={600}>
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{ top: 5, right: 60, left: 20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" domain={[0, 100]} label={{ value: '%Critical', position: 'insideBottom', offset: -5 }} />
            <YAxis 
              type="category" 
              dataKey="code" 
              width={100}
              tick={{ fontSize: 12 }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="percentCritical" radius={[0, 4, 4, 0]}>
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill="#d90429" />
              ))}
              <LabelList 
                dataKey="percentCritical" 
                position="right" 
                formatter={(value: number) => `${value.toFixed(1)}%`}
                style={{ fontSize: '12px', fontWeight: 'bold' }}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// Component สำหรับแสดง Technician Ranking (Top 10) - Track Rollout only
function TechnicianRankingTableRollout() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['technician-ranking-rollout'],
    queryFn: async () => {
      let allData: FivePData[] = [];
      let page = 0;
      const pageSize = 1000;
      let hasMore = true;

      // Fetch all data with pagination
      while (hasMore) {
        const { data: fivePData, error } = await supabase
          .from('5p')
          .select('Technician_Code, Technician_Name, Company_Name, RSM, P, Score, Date')
          .eq('Project', 'Track Rollout')
          .range(page * pageSize, (page + 1) * pageSize - 1);

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

  // Calculate ranking data
  const rankingData: TechnicianRankingRow[] = React.useMemo(() => {
    if (!data || data.length === 0) return [];

    // Group by Technician_Name instead of Technician_Code
    const technicianMap = new Map<string, {
      technician_code: string;
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
      const techName = item.Technician_Name || '-';
      const scoreValue = parseFloat(item.Score || '0');
      const score = isNaN(scoreValue) ? 0 : scoreValue;
      const p = item.P || '';
      const date = item.Date || '';

      if (!technicianMap.has(techName)) {
        technicianMap.set(techName, {
          technician_code: item.Technician_Code || '-',
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

      const techData = technicianMap.get(techName)!;
      techData.scores.push(score);
      techData.dates.push(date);

      // Categorize by P
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

    // Calculate ranking for each technician
    const rankings: TechnicianRankingRow[] = [];
    const maxScorePerItem = 3; // คะแนนเต็มต่อข้อ

    technicianMap.forEach((techData, techName) => {
      const total_score = techData.scores.reduce((sum, score) => sum + (isNaN(score) ? 0 : score), 0);
      const total_items = techData.scores.length;
      const max_score = total_items * maxScorePerItem;
      const percent_score = max_score > 0 ? (total_score / max_score) * 100 : 0;

      const people = techData.people_scores.reduce((sum, score) => sum + (isNaN(score) ? 0 : score), 0);
      const planning_procedure = techData.planning_scores.reduce((sum, score) => sum + (isNaN(score) ? 0 : score), 0);
      const ppe_tools = techData.ppe_scores.reduce((sum, score) => sum + (isNaN(score) ? 0 : score), 0);
      const place = techData.place_scores.reduce((sum, score) => sum + (isNaN(score) ? 0 : score), 0);
      const pause = techData.pause_scores.reduce((sum, score) => sum + (isNaN(score) ? 0 : score), 0);

      // Find last inspection date
      const last_inspection_date = techData.dates
        .filter(d => d)
        .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0] || '-';

      rankings.push({
        rank: 0,
        technician_code: techData.technician_code,
        technician_name: techName,
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

    // Sort by percent_score descending
    rankings.sort((a, b) => b.percent_score - a.percent_score || b.total_score - a.total_score);

    // Assign ranks
    rankings.forEach((item, index) => {
      item.rank = index + 1;
    });

    return rankings;
  }, [data]);

  // Show top 10 only
  const top10Data = React.useMemo(() => {
    return rankingData.slice(0, 10);
  }, [rankingData]);

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
            Track Rollout-5P Technician Ranking (Top 10)
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
            Track Rollout-5P Technician Ranking (Top 10)
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
          Track Rollout-5P Technician Ranking (Top 10)
        </h3>
      </div>

      <div className="overflow-x-auto">
        <table style={{ width: '100%', fontSize: '13px', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
          <colgroup>
            <col style={{ width: '50px' }} />
            <col style={{ width: '130px' }} />
            <col style={{ width: '150px' }} />
            <col style={{ width: '100px' }} />
            <col style={{ width: '80px' }} />
            <col style={{ width: '80px' }} />
            <col style={{ width: '80px' }} />
            <col style={{ width: '80px' }} />
            <col style={{ width: '70px' }} />
            <col style={{ width: '130px' }} />
            <col style={{ width: '90px' }} />
            <col style={{ width: '70px' }} />
            <col style={{ width: '70px' }} />
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
            {top10Data.map((row, rowIndex) => {
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
}

export default function TrackRolloutPage() {
  return <Content />;
}
