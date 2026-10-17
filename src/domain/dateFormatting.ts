export function formatGermanDateWithWeekday(date: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return ''

  return new Intl.DateTimeFormat('de-DE', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${date}T12:00:00Z`))
}
