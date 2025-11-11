'use client';

import { usePathname } from 'next/navigation';
import DailyInspectionChart from './DailyInspectionChart';
import RSMInspectionChart from './RSMInspectionChart';
import AverageScoreChart from './AverageScoreChart';

const ChartsSection = () => {
  const pathname = usePathname();

  // Only show charts on Track C page
  if (pathname !== '/track-c') {
    return null;
  }

  return (
    <div style={{ marginTop: '20px', marginBottom: '60px' }}>
      {/* First Row - Two Charts + Average Score Chart */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginBottom: '20px' }}>
        {/* Daily Inspection Chart */}
        <DailyInspectionChart />

        {/* RSM Inspection Chart */}
        <RSMInspectionChart />

        {/* Average Score Chart */}
        <AverageScoreChart />
      </div>

      {/* Second Row - Other Charts if needed */}
    </div>
  );
};

export default ChartsSection;
