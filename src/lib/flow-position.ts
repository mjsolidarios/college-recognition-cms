export function isValidFlowPosition(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0
}

export const FLOW_POSITION_SNAP_INCREMENT = 4

export function snapFlowPosition(value: number, increment = FLOW_POSITION_SNAP_INCREMENT): number {
  if (!Number.isFinite(value)) {
    return 0
  }
  const safeIncrement = increment > 0 ? increment : 1
  return Math.max(0, Math.round(value / safeIncrement) * safeIncrement)
}

export function normalizeFlowPosition(value: unknown): number | undefined {
  return isValidFlowPosition(value) ? Math.round(value) : undefined
}
