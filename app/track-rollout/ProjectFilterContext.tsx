'use client';

import React, { createContext, useContext, useState } from 'react';

type ProjectType = 'All' | 'Civil' | 'OFC' | 'TE';

interface ProjectFilterContextType {
  selectedProject: ProjectType;
  setSelectedProject: (project: ProjectType) => void;
}

const ProjectFilterContext = createContext<ProjectFilterContextType | undefined>(undefined);

export function ProjectFilterProvider({ children }: { children: React.ReactNode }) {
  const [selectedProject, setSelectedProject] = useState<ProjectType>('All');

  return (
    <ProjectFilterContext.Provider value={{ selectedProject, setSelectedProject }}>
      {children}
    </ProjectFilterContext.Provider>
  );
}

export function useProjectFilter() {
  const context = useContext(ProjectFilterContext);
  if (context === undefined) {
    throw new Error('useProjectFilter must be used within a ProjectFilterProvider');
  }
  return context;
}
