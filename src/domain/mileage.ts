export function isValidKilometers(kilometers: number | null): kilometers is number {
  return (
    kilometers !== null &&
    Number.isSafeInteger(kilometers) &&
    kilometers > 0
  )
}

export function calculateMileageAmountMinor(
  kilometers: number,
  ratePerKilometerMinor: number,
): number | null {
  if (
    !isValidKilometers(kilometers) ||
    !Number.isSafeInteger(ratePerKilometerMinor) ||
    ratePerKilometerMinor <= 0
  ) {
    return null
  }

  const amountMinor = Math.round(kilometers * ratePerKilometerMinor)
  return Number.isSafeInteger(amountMinor) ? amountMinor : null
}
