'use client';

import { usePathname } from 'next/navigation';
import KPICards from './KPICards';
import ProjectCardsInlineWrapper from './ProjectCardsInlineWrapper';

const KPICardsWrapper = () => {
  const pathname = usePathname();
  const isTrackRollout = pathname === '/track-rollout';

  // For Track Rollout: show KPI Cards and Project Cards in Grid (4 columns)
  if (isTrackRollout) {
    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', width: '100%' }}>
        {/* Actual Card */}
        <div>
          <KPICards project="Track Rollout" hideTarget={true} />
        </div>

        {/* Project Cards (Civil, OFC, TE) - spread across 3 columns */}
        <ProjectCardsInlineWrapper />
      </div>
    );
  }

  // For Track C: cards are handled by ScoreCards component
  if (pathname === '/track-c') {
    return null;
  }

  // Default: show KPI Cards normally
  return <KPICards project="Track C" hideTarget={true} />;
};

export default KPICardsWrapper;
