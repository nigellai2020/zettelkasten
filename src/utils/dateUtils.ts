// Common date formatting utility
export function toDateString(date: Date | number | string | null | undefined): string {
  if (!date) return '';
  let d: Date;
  if (date instanceof Date) {
    d = date;
  } else if (typeof date === 'number') {
    d = new Date(date);
  } else if (typeof date === 'string') {
    const num = Number(date);
    if (!isNaN(num) && date.trim() !== '') {
      d = new Date(num);
    } else {
      d = new Date(date);
    }
  } else {
    return '';
  }
  if (isNaN(d.getTime())) return '';

  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}
