"use client";
import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import type { ColumnDef } from "@tanstack/react-table";
import * as XLSX from 'xlsx';
import AverageScoreChart from "@/components/AverageScoreChart";

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
  const [rsmFilter, setRsmFilter] = React.useState("");
  const [scoreFilter, setScoreFilter] = React.useState("");
  const [searchBorderColor, setSearchBorderColor] = React.useState("#e5e7eb");

  const rows = data;
  
  const rowsPerPage = 60;

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
    
    // RSM filter  
    if (rsmFilter) {
      filtered = filtered.filter(row => row.RSM === rsmFilter);
    }

    // Score filter
    if (scoreFilter) {
      filtered = filtered.filter(row => row.Score === scoreFilter);
    }
    
    return filtered;
  }, [rows, searchTerm, companyCodeFilter, rsmFilter, scoreFilter]);

  // Pagination
  const totalPages = Math.ceil(filteredRows.length / rowsPerPage);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const paginatedRows = filteredRows.slice(startIndex, startIndex + rowsPerPage);

  // Get unique values for filters
  const uniqueCompanyCodes = React.useMemo(() => {
    return Array.from(new Set(rows.map(row => row?.Company_Code).filter(Boolean)));
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
    <div className="space-y-6" style={{ marginTop: '40px' }}>
      {/* Search and Filter Section */}
      <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
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
            minWidth: '300px',
            padding: '12px 16px',
            fontSize: '16px',
            border: `2px solid ${searchBorderColor}`,
            borderRadius: '8px',
            outline: 'none',
            transition: 'border-color 0.2s ease'
          }}
        />

        {/* Company Code Filter */}
        <select
          value={companyCodeFilter}
          onChange={(e) => setCompanyCodeFilter(e.target.value)}
          style={{
            padding: '12px 16px',
            fontSize: '16px',
            border: '2px solid #e5e7eb',
            borderRadius: '8px',
            outline: 'none',
            cursor: 'pointer'
          }}
        >
          <option value="">Company Code</option>
          {uniqueCompanyCodes.map(code => (
            <option key={code} value={code}>{code}</option>
          ))}
        </select>

        {/* RSM Filter */}
        <select
          value={rsmFilter}
          onChange={(e) => setRsmFilter(e.target.value)}
          style={{
            padding: '12px 16px',
            fontSize: '16px',
            border: '2px solid #e5e7eb',
            borderRadius: '8px',
            outline: 'none',
            cursor: 'pointer'
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
            padding: '12px 16px',
            fontSize: '16px',
            border: '2px solid #e5e7eb',
            borderRadius: '8px',
            outline: 'none',
            cursor: 'pointer'
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
            padding: '12px 20px',
            backgroundColor: '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '16px',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'background-color 0.2s ease',
            whiteSpace: 'nowrap',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#2563eb'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#3b82f6'}
        >
          📊 Export Excel
        </button>
      </div>
      
      {/* Table Section */}
      <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
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
    queryKey: ["5p"],
    queryFn: async () => {
      const { data, error } = await supabase.from("5p").select("*").limit(5000);
      if (error) throw error;
      return data as Row5P[];
    }
  });

  if (isLoading) return <div className="flex justify-center items-center h-64">Loading…</div>;
  if (error) return <div className="text-red-600">Error: {(error as any).message}</div>;

  return <DataTableComponent data={data || []} />;
}

export default function TrackCPage() {
  return <Content />;
}
