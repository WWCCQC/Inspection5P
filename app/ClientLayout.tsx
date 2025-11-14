'use client';

import { usePathname } from 'next/navigation';
import Navbar from '@/components/Navbar';
import ChartsSection from '@/components/ChartsSection';
import KPICardsWrapper from '@/components/KPICardsWrapper';

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  
  // ถ้าอยู่หน้า login ไม่ต้องแสดง Navbar และ Header
  if (pathname === '/login') {
    return <>{children}</>;
  }

  // หน้าอื่นๆ แสดงแบบปกติ
  return (
    <>
      <Navbar />
      <header className="bg-white border-b">
        <div className="mx-auto max-w-7xl px-6 py-3">
          {/* KPI Cards and Project Cards - layout handled by KPICardsWrapper */}
          <KPICardsWrapper />

          {/* Charts Section - only on Track C */}
          <ChartsSection />
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-6 py-6">{children}</main>
    </>
  );
}
