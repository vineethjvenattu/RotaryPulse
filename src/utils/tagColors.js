export const getTagColor = (tag) => {
  if (!tag) return { bg: '#e2e8f0', text: '#475569' };
  
  let hash = 0;
  for (let i = 0; i < tag.length; i++) {
    hash = tag.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  // A pleasant palette of background and matching text colors
  const palette = [
    { bg: '#dbeafe', text: '#1e40af' }, // Blue
    { bg: '#dcfce7', text: '#166534' }, // Green
    { bg: '#fef3c7', text: '#92400e' }, // Yellow
    { bg: '#fee2e2', text: '#991b1b' }, // Red
    { bg: '#f3e8ff', text: '#6b21a8' }, // Purple
    { bg: '#ffedd5', text: '#9a3412' }, // Orange
    { bg: '#cffafe', text: '#155e75' }, // Cyan
    { bg: '#fce7f3', text: '#9d174d' }, // Pink
    { bg: '#e0e7ff', text: '#3730a3' }, // Indigo
    { bg: '#ecfccb', text: '#3f6212' }, // Lime
  ];

  const index = Math.abs(hash) % palette.length;
  return palette[index];
};
