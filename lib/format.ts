export const parseDate = (s?: string | null) => {
  if (!s) return null;
  const d = new Date(s);
  return isNaN(+d) ? null : d;
};

export const monthKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
