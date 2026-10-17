export function euroNumberToMinorUnits(value: number | null): number | null {
  if (value === null || !Number.isFinite(value)) return null

  const match = /^(\d+)(?:\.(\d{1,2}))?$/.exec(String(value))
  if (!match) return null

  const [, eurosText, centsText = ''] = match
  const minorUnits = BigInt(eurosText) * 100n + BigInt(centsText.padEnd(2, '0'))

  return minorUnits <= BigInt(Number.MAX_SAFE_INTEGER)
    ? Number(minorUnits)
    : null
}

export function formatEuroCurrency(amountMinor: number): string {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
  }).format(amountMinor / 100)
}
