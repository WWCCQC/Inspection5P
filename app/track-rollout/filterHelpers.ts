// Helper function to filter data by project type (Civil, OFC, TE)
export function filterByProjectType<T extends { 'Type of work'?: string | null }>(
  data: T[],
  projectType: 'All' | 'Civil' | 'OFC' | 'TE'
): T[] {
  if (projectType === 'All') {
    return data;
  }
  
  return data.filter(item => {
    const typeOfWork = item['Type of work'];
    if (!typeOfWork) return false;
    return typeOfWork.startsWith(projectType);
  });
}
