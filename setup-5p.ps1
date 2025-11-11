# ===========================
# Setup 5P Dashboard (Next.js + Supabase) on Windows
# Target folder: D:\WWW\Safety\5P
# ===========================

# --- 0) CONFIG ---
$ROOT = "D:\WWW\Safety\5P"
$SUPABASE_URL = "https://YOUR-PROJECT.supabase.co"     # <-- ใส่ของจริง
$SUPABASE_ANON = "YOUR_ANON_KEY"                       # <-- ใส่ของจริง

# --- 1) เตรียมโฟลเดอร์ ---
if (!(Test-Path $ROOT)) {
  New-Item -ItemType Directory -Path $ROOT | Out-Null
}

Set-Location $ROOT

# --- 2) เช็ก Node/NPM ---
try {
  node -v | Out-Null
  npm -v | Out-Null
} catch {
  Write-Host "กรุณาติดตั้ง Node.js ก่อน (https://nodejs.org/) แล้วรันใหม่" -ForegroundColor Red
  exit 1
}

# --- 3) ถ้ายังไม่มีโปรเจกต์ Next.js ให้สร้าง (พร้อม Tailwind) ---
$pkgJson = Join-Path $ROOT "package.json"
if (!(Test-Path $pkgJson)) {
  npx create-next-app@latest . --ts --eslint --tailwind --src-dir=false --app --use-npm --no-git --import-alias="@/*" --yes
}

# --- 4) ติดตั้งแพ็กเกจที่ต้องใช้ Dashboard ---
npm i @supabase/supabase-js @tanstack/react-query @tanstack/react-table recharts zod

# --- 5) เขียนไฟล์ .env.local ---
@"
NEXT_PUBLIC_SUPABASE_URL=$SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=$SUPABASE_ANON
"@ | Set-Content -Encoding UTF8 ".env.local"

# --- 6) lib/supabaseClient.ts ---
New-Item -ItemType Directory -Force -Path ".\lib" | Out-Null
@"
import { createClient } from "@supabase/supabase-js";

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);
"@ | Set-Content -Encoding UTF8 ".\lib\supabaseClient.ts"

# --- 7) lib/format.ts ---
@"
export const parseDate = (s?: string | null) => {
  if (!s) return null;
  const d = new Date(s);
  return isNaN(+d) ? null : d;
};
export const monthKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;
"@ | Set-Content -Encoding UTF8 ".\lib\format.ts"

# --- 8) components/charts ---
New-Item -ItemType Directory -Force -Path ".\components\charts" | Out-Null

# StatusBar.tsx
@"
"use client";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LabelList } from "recharts";

export default function StatusBar({ data }: { data: Array<{ status: string; count: number }> }) {
  return (
    <div className="h-80">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="status" />
          <YAxis allowDecimals={false} />
          <Tooltip />
          <Legend />
          <Bar dataKey="count" name="จำนวน">
            <LabelList dataKey="count" position="top" />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
"@ | Set-Content -Encoding UTF8 ".\components\charts\StatusBar.tsx"

# MonthlyLine.tsx
@"
"use client";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LabelList } from "recharts";

export default function MonthlyLine({ data }: { data: Array<{ month: string; value: number }> }) {
  return (
    <div className="h-80">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="month" />
          <YAxis allowDecimals={false} />
          <Tooltip />
          <Line dataKey="value" name="จำนวนรายการ">
            <LabelList dataKey="value" position="top" />
          </Line>
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
"@ | Set-Content -Encoding UTF8 ".\components\charts\MonthlyLine.tsx"

# --- 9) components/DataTable.tsx ---
New-Item -ItemType Directory -Force -Path ".\components" | Out-Null
@"
"use client";
import * as React from "react";
import { useReactTable, ColumnDef, getCoreRowModel, flexRender } from "@tanstack/react-table";

export default function DataTable<T>({ columns, data }: { columns: ColumnDef<T, any>[]; data: T[] }) {
  const table = useReactTable({ data, columns, getCoreRowModel: getCoreRowModel() });
  return (
    <div className="overflow-auto rounded-2xl border bg-white">
      <table className="min-w-full text-sm">
        <thead className="bg-gray-50">
          {table.getHeaderGroups().map(hg => (
            <tr key={hg.id}>
              {hg.headers.map(h => (
                <th key={h.id} className="px-3 py-2 text-left font-semibold text-gray-700">
                  {h.isPlaceholder ? null : flexRender(h.column.columnDef.header, h.getContext())}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.map(r => (
            <tr key={r.id} className="border-t">
              {r.getVisibleCells().map(c => (
                <td key={c.id} className="px-3 py-2">
                  {flexRender(c.column.columnDef.cell, c.getContext())}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
"@ | Set-Content -Encoding UTF8 ".\components\DataTable.tsx"

# --- 10) app/layout.tsx (แทนที่แบบเรียบง่าย) ---
New-Item -ItemType Directory -Force -Path ".\app\5p" | Out-Null
@"
export const metadata = { title: "5p Dashboard" };
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th">
      <body className="min-h-dvh antialiased">
        <header className="sticky top-0 z-10 bg-white border-b">
          <div className="mx-auto max-w-7xl px-6 py-3 flex items-center justify-between">
            <h1 className="font-semibold">5p Dashboard</h1>
            <nav className="text-sm text-gray-600">Supabase • Next.js</nav>
          </div>
        </header>
        <main className="mx-auto max-w-7xl px-6 py-6">{children}</main>
      </body>
    </html>
  );
}
"@ | Set-Content -Encoding UTF8 ".\app\layout.tsx"

# --- 11) app/5p/page.tsx ---
@"
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

  if (isLoading) return <div>Loading…</div>;
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
        <KPI label="ทั้งหมด" value={rows.length} />
        <KPI label="สถานะมากสุด" value={statusData[0]?.status ?? "-"} sub={String(statusData[0]?.count ?? 0)} />
        <KPI label="เดือนล่าสุด" value={monthly.at(-1)?.month ?? "-"} sub={String(monthly.at(-1)?.value ?? 0)} />
        <KPI label="Projects" value={new Set(rows.map(r=>r.Project)).size} />
      </section>

      <section className="grid md:grid-cols-2 gap-6">
        <Card title="จำนวนตามสถานะ">
          <StatusBar data={statusData} />
        </Card>
        <Card title="จำนวนรายการรายเดือน">
          <MonthlyLine data={monthly} />
        </Card>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">รายการ (ล่าสุด)</h2>
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
"@ | Set-Content -Encoding UTF8 ".\app\5p\page.tsx"

# --- 12) styles (tailwind อยู่แล้วจาก create-next-app) ---
# เพิ่มความเรียบใน globals.css (ไม่ลบของเดิม แค่เติม)
$g = Get-Content ".\app\globals.css" -Raw
if ($g -notmatch "color-scheme") {
  @"
:root { color-scheme: light; }
body { @apply bg-gray-50 text-gray-900; }
"@ | Add-Content ".\app\globals.css"
}

Write-Host "`n✅ เสร็จสิ้น! เปิดใช้งานด้วย:" -ForegroundColor Green
Write-Host "   cd `"$ROOT`""
Write-Host "   npm run dev"
Write-Host "แล้วเข้า http://localhost:3000/5p" -ForegroundColor Yellow
