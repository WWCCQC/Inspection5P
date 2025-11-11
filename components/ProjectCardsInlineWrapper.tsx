'use client';

import { usePathname } from 'next/navigation';
import ProjectCardsSection from '@/components/ProjectCardsSection';

export default function ProjectCardsInlineWrapper() {
  const pathname = usePathname();
  
  // Only show on Track Rollout page
  if (pathname !== '/track-rollout') {
    return null;
  }

  return (
    <div style={{ marginTop: '16px' }}>
      <ProjectCardsSection variant="inline" />
    </div>
  );
}
