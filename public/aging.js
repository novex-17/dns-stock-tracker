// Clamp month ends: one month before March 31 is February 28 (or 29).
export function monthCutoff(auditDate, months) {
  const [year, month, day] = auditDate.split('-').map(Number);
  const target = new Date(Date.UTC(year, month - 1 - months, 1));
  const last = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
  target.setUTCDate(Math.min(day, last));
  return target.toISOString().slice(0, 10);
}
