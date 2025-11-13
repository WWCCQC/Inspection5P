"use client";
import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import type { ColumnDef } from "@tanstack/react-table";
import * as XLSX from 'xlsx';
import TechniciansTeamTable from "@/components/TechniciansTeamTable";
import TechnicianRankingTable from "@/components/TechnicianRankingTable";

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

// Component สำหรับแสดงตาราง
function DataTableComponent({ data }: { data: Row5P[] }) {
  const [searchTerm, setSearchTerm] = React.useState("");
  const [currentPage, setCurrentPage] = React.useState(1);
  const [companyCodeFilter, setCompanyCodeFilter] = React.useState("");
  const [companyNameFilter, setCompanyNameFilter] = React.useState("");
  const [rsmFilter, setRsmFilter] = React.useState("");
  const [scoreFilter, setScoreFilter] = React.useState("");
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
    
    // Filter for Track C only
    filtered = filtered.filter(row => row.Project === 'Track C');
    
    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(row =>
        Object.values(row || {}).some(value =>
          value?.toString().toLowerCase().includes(searchTerm.toLowerCase())
        )
      );
    }
    
    // Company Code filter
    if (companyCodeFilter) {
      filtered = filtered.filter(row => row.Company_Code === companyCodeFilter);
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
    
    // Sort by Date descending (newest first), then by Technician_Code, then by Code ascending
    filtered.sort((a, b) => {
      const dateA = a.Date ? new Date(a.Date).getTime() : 0;
      const dateB = b.Date ? new Date(b.Date).getTime() : 0;
      
      // First sort by date (descending - newest first)
      if (dateB !== dateA) {
        return dateB - dateA;
      }
      
      // If dates are equal, sort by Technician_Code (ascending)
      const techCodeA = a.Technician_Code || '';
      const techCodeB = b.Technician_Code || '';
      
      if (techCodeA !== techCodeB) {
        return techCodeA.localeCompare(techCodeB, undefined, { numeric: true, sensitivity: 'base' });
      }
      
      // If Technician_Code is also equal, sort by Code (ascending)
      const codeA = a.Code || '';
      const codeB = b.Code || '';
      
      // Natural sort for codes like 1.1, 1.2, 2.1, etc.
      return codeA.localeCompare(codeB, undefined, { numeric: true, sensitivity: 'base' });
    });
    
    return filtered;
  }, [rows, searchTerm, companyCodeFilter, companyNameFilter, rsmFilter, scoreFilter]);

  // Pagination
  const totalPages = Math.ceil(filteredRows.length / rowsPerPage);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const paginatedRows = filteredRows.slice(startIndex, startIndex + rowsPerPage);

  // Get unique values for filters
  const uniqueCompanyCodes = React.useMemo(() => {
    return Array.from(new Set(rows.map(row => row?.Company_Code).filter(Boolean)));
  }, [rows]);
  
  const uniqueCompanyNames = React.useMemo(() => {
    return Array.from(new Set(rows.map(row => row?.Company_Name).filter(Boolean)));
  }, [rows]);
  
  const uniqueRSMs = React.useMemo(() => {
    return Array.from(new Set(rows.map(row => row?.RSM).filter(Boolean)));
  }, [rows]);

  const uniqueScores = React.useMemo(() => {
    return Array.from(new Set(rows.map(row => row?.Score).filter(Boolean)));
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
    { header: "P", key: "P" },
    { header: "Code", key: "Code" },
    { header: "Item", key: "Item" },
    { header: "Score", key: "Score" },
  ];

  return (
    <div style={{ marginTop: '40px' }}>
      {/* 5P Technician Ranking Table */}
      <TechnicianRankingTable project="Track C" />

      {/* Divider */}
      <div style={{ height: '3px', backgroundColor: '#5c6bc0', margin: '24px 0' }}></div>

      {/* Technicians Team Table */}
      <TechniciansTeamTable project="Track C" />

      {/* Divider */}
      <div style={{ height: '3px', backgroundColor: '#5c6bc0', margin: '24px 0' }}></div>

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

          {/* Company Code Filter */}
          <select
            value={companyCodeFilter}
            onChange={(e) => setCompanyCodeFilter(e.target.value)}
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
            <option value="">Company Code</option>
            {uniqueCompanyCodes.map(code => (
              <option key={code} value={code}>{code}</option>
            ))}
          </select>

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
    queryKey: ["5p-track-c"],
    queryFn: async () => {
      let allData: Row5P[] = [];
      let page = 0;
      const pageSize = 1000;
      let hasMore = true;

      // Fetch all data with pagination for Track C
      while (hasMore) {
        const { data: pageData, error } = await supabase
          .from("5p")
          .select("*")
          .eq("Project", "Track C")
          .range(page * pageSize, (page + 1) * pageSize - 1);

        if (error) throw error;

        if (!pageData || pageData.length === 0) {
          hasMore = false;
        } else {
          allData = [...allData, ...(pageData as Row5P[])];
          page++;
        }
      }

      console.log('Total fetched Track C data:', allData.length);
      return allData;
    }
  });

  if (isLoading) return <div className="flex justify-center items-center h-64">Loading…</div>;
  if (error) return <div className="text-red-600">Error: {(error as any).message}</div>;

  return <DataTableComponent data={data || []} />;
}

export default function TrackCPage() {
  return <Content />;
}
