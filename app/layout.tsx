import Navbar from '@/components/Navbar';
import ChartsSection from '@/components/ChartsSection';
import KPICards from '@/components/KPICards';
import { QueryProvider } from './providers';

export const metadata = { title: "5P Dashboard" };
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th">
      <body className="min-h-dvh antialiased">
        <QueryProvider>
          <Navbar />
        <header className="bg-white border-b">
          <div className="mx-auto max-w-7xl px-6 py-3">
            <div className="flex items-center justify-between mb-3">
              <h1 className="font-semibold">5P Dashboard</h1>
            </div>
            
            {/* KPI Cards ใน Header */}
            <KPICards />

            {/* Charts Section - only on Track C */}
            <ChartsSection />
          </div>
        </header>
        <main className="mx-auto max-w-7xl px-6 py-6">{children}</main>
        </QueryProvider>
      </body>
    </html>
  );
}
