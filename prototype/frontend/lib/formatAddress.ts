/** Truncate hex address for UI: 0xFABB0ac9...5651694a */
export function formatShortAddress(
  address: string,
  startChars = 10,
  endChars = 8
): string {
  if (!address) return ''
  const a = address.trim()
  if (a.length <= startChars + endChars + 3) return a
  return `${a.slice(0, startChars)}...${a.slice(-endChars)}`
}
