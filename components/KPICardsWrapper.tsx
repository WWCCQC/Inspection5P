'use client';

import { usePathname } from 'next/navigation';
import KPICards from './KPICards';
import ProjectCardsInlineWrapper from './ProjectCardsInlineWrapper';

const KPICardsWrapper = () => {
  const pathname = usePathname();
  const isTrackRollout = pathname === '/track-rollout';

  // For Track Rollout: wrap KPI Cards and Project Cards in flex container
  if (isTrackRollout) {
    return (
      <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
        {/* KPI Cards */}
        <div style={{ flex: '0 0 auto' }}>
          <KPICards project="Track Rollout" hideTarget={true} />
        </div>
        
        {/* Project Cards Inline - only on Track Rollout */}
        <div style={{ flex: '1 1 auto' }}>
          <ProjectCardsInlineWrapper />
        </div>
      </div>
    );
  }

  // For Track C: just show KPI Cards normally (3 columns)
  return <KPICards project="Track C" hideTarget={false} />;
};

export default KPICardsWrapper;
