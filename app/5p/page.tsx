"use client";
import * as React from "react";
import { useQuery, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import StatusBar from "@/components/charts/StatusBar";
import MonthlyLine from "@/components/charts/MonthlyLine";
import DataTable from "@/components/DataTable";
import type { ColumnDef } from "@tanstack/react-table";
import { parseDate, monthKey } from "@/lib/format";

const qc = new QueryClient();

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

function Content() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["5p"],
    queryFn: async () => {
      const { data, error } = await supabase.from("5p").select("*").limit(5000);
      if (error) throw error;
      return data as Row5P[];
    }
  });

  if (isLoading) return <div>Loadingโ€ฆ</div>;
  if (error) return <div className="text-red-600">Error: {(error as any).message}</div>;

  const rows = data ?? [];

  const statusMap = new Map<string, number>();
  rows.forEach(r => {
    const k = (r.Status ?? "Unknown").trim();
    statusMap.set(k, (statusMap.get(k) ?? 0) + 1);
  });
  const statusData = Array.from(statusMap, ([status, count]) => ({ status, count })).sort((a,b)=>b.count-a.count);

  const monthMap = new Map<string, number>();
  rows.forEach(r => {
    const d = parseDate(r.Date ?? r.Start_Date ?? r.Timestamp ?? "");
    if (!d) return;
    const k = monthKey(d);
    monthMap.set(k, (monthMap.get(k) ?? 0) + 1);
  });
  const monthly = Array.from(monthMap, ([month, value]) => ({ month, value })).sort((a,b)=>a.month.localeCompare(b.month));

  const columns: ColumnDef<Row5P>[] = [
    { header: "Date", accessorKey: "Date" },
    { header: "Project", accessorKey: "Project" },
    { header: "Technician", accessorKey: "Technician_Name" },
    { header: "Company", accessorKey: "Company_Name" },
    { header: "RSM", accessorKey: "RSM" },
    { header: "Type of work", accessorKey: "Type of work" },
    { header: "Status", accessorKey: "Status" },
    { header: "Score", accessorKey: "Score" },
  ];

  return (
    <div className="space-y-8">
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KPI label="เธ—เธฑเนเธเธซเธกเธ”" value={rows.length} />
        <KPI label="เธชเธ–เธฒเธเธฐเธกเธฒเธเธชเธธเธ”" value={statusData[0]?.status ?? "-"} sub={String(statusData[0]?.count ?? 0)} />
        <KPI label="เน€เธ”เธทเธญเธเธฅเนเธฒเธชเธธเธ”" value={monthly.at(-1)?.month ?? "-"} sub={String(monthly.at(-1)?.value ?? 0)} />
        <KPI label="Projects" value={new Set(rows.map(r=>r.Project)).size} />
      </section>

      <section className="grid md:grid-cols-2 gap-6">
        <Card title="เธเธณเธเธงเธเธ•เธฒเธกเธชเธ–เธฒเธเธฐ">
          <StatusBar data={statusData} />
        </Card>
        <Card title="เธเธณเธเธงเธเธฃเธฒเธขเธเธฒเธฃเธฃเธฒเธขเน€เธ”เธทเธญเธ">
          <MonthlyLine data={monthly} />
        </Card>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">เธฃเธฒเธขเธเธฒเธฃ (เธฅเนเธฒเธชเธธเธ”)</h2>
        <DataTable columns={columns} data={rows} />
      </section>
    </div>
  );
}

export default function Page() {
  return (
    <QueryClientProvider client={qc}>
      <Content />
    </QueryClientProvider>
  );
}

function KPI({ label, value, sub }: { label: string; value: React.ReactNode; sub?: string }) {
  return (
    <div className="rounded-2xl border bg-white p-4 shadow-sm">
      <div className="text-sm text-gray-500">{label}</div>
      <div className="text-2xl font-semibold">{value}</div>
      {sub && <div className="text-xs text-gray-500 mt-1">{sub}</div>}
    </div>
  );
}
function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border bg-white p-4 shadow-sm">
      <div className="font-medium mb-2">{title}</div>
      {children}
    </div>
  );
}
