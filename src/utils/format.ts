/**
 * Formats duration in seconds into a readable string:
 * - mm:ss (if < 1 hour)
 * - hh:mm:ss (if >= 1 hour)
 */
export const formatDuration = (seconds?: number | null): string => {
  if (seconds === undefined || seconds === null || isNaN(seconds) || seconds === 0) return '--:--';
  
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  
  const paddedS = s.toString().padStart(2, '0');
  
  if (h > 0) {
    const paddedM = m.toString().padStart(2, '0');
    return `${h}:${paddedM}:${paddedS}`;
  }
  
  return `${m}:${paddedS}`;
};
