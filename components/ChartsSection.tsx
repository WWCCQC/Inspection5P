'use client';

import { usePathname } from 'next/navigation';
import DailyInspectionChart from './DailyInspectionChart';
import RSMInspectionChart from './RSMInspectionChart';
import AverageScoreChart from './AverageScoreChart';

const ChartsSection = () => {
  const pathname = usePathname();

  // Show charts only on Track C page
  if (pathname !== '/track-c') {
    return null;
  }

  // Determine which project based on pathname
  const project = 'Track C';

  return (
    <div style={{ marginTop: '20px', marginBottom: '60px' }}>
      {/* First Row - Three Charts */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginBottom: '20px' }}>
        {/* Daily Inspection Chart */}
        <DailyInspectionChart project={project} />

        {/* RSM Inspection Chart */}
        <RSMInspectionChart project={project} />

        {/* Average Score Chart */}
        <AverageScoreChart project={project} />
      </div>

      {/* Second Row - Other Charts if needed */}
    </div>
  );
};

export default ChartsSection;
