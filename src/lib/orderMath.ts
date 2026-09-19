import type { DiscountMode } from '../types/saleOrder'

export function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100
}

export function round4(value: number): number {
  return Math.round((value + Number.EPSILON) * 10000) / 10000
}

export const formatMoney = (value: number | null | undefined): string => {
  if (value === null || value === undefined) return '—'
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

export const formatPercent = (value: number | null | undefined): string => {
  if (value === null || value === undefined) return '—'
  return String(round4(value))
}

export interface DiscountInput {
  mode: DiscountMode
  value: number
}

export interface DiscountResult {
  discountAmount: number | null
  discountPercentage: number | null
}

export function discountFromMode(mode: DiscountMode, value: number, subtotal: number): DiscountResult {
  const none = { discountAmount: null, discountPercentage: null }
  if (mode === 'none' || value <= 0) return none
  if (mode === 'amount') {
    return { discountAmount: round2(value), discountPercentage: null }
  }
  if (mode === 'percentage') {
    const clamped = Math.min(100, Math.max(0, value))
    return { discountAmount: round2((subtotal * clamped) / 100), discountPercentage: clamped }
  }
  return none
}

export function lineDiscountResult(basePrice: number, mode: DiscountMode, value: number): DiscountResult {
  if (mode === 'amount' && value > 0) {
    return { discountAmount: round2(value), discountPercentage: null }
  }
  if (mode === 'percentage' && value > 0) {
    const clamped = Math.min(100, Math.max(0, value))
    return { discountAmount: round2((basePrice * clamped) / 100), discountPercentage: clamped }
  }
  return { discountAmount: null, discountPercentage: null }
}

export interface LineTotals {
  basePrice: number
  quantity: number
  discountAmount: number | null
  discountPercentage: number | null
  unitPrice: number
  extendedPrice: number
  netAmount: number
}

export function computeLineTotals(
  basePrice: number,
  quantity: number,
  mode: DiscountMode,
  value: number,
): LineTotals {
  const { discountAmount, discountPercentage } = lineDiscountResult(basePrice, mode, value)
  const d = discountAmount ?? 0
  return {
    basePrice,
    quantity,
    discountAmount,
    discountPercentage,
    unitPrice: round2(basePrice - d),
    extendedPrice: round2(basePrice * quantity),
    netAmount: round2((basePrice - d) * quantity),
  }
}

export interface OrderTotals {
  totalQuantity: number
  subtotal: number
  discountAmount: number | null
  discountPercentage: number | null
  totalAmount: number
}

export function computeOrderTotals(
  lines: LineTotals[],
  mode: DiscountMode,
  value: number,
): OrderTotals {
  const subtotal = round2(lines.reduce((sum, line) => sum + line.netAmount, 0))
  const totalQuantity = lines.reduce((sum, line) => sum + line.quantity, 0)
  const discount = discountFromMode(mode, value, subtotal)
  const d = discount.discountAmount ?? 0
  return {
    totalQuantity,
    subtotal,
    discountAmount: discount.discountAmount,
    discountPercentage: discount.discountPercentage,
    totalAmount: round2(subtotal - d),
  }
}

export function modeFromDto(
  discountAmount: number | null,
  discountPercentage: number | null,
): DiscountInput {
  if (discountPercentage !== null && discountPercentage > 0) {
    return { mode: 'percentage', value: discountPercentage }
  }
  if (discountAmount !== null && discountAmount > 0) {
    return { mode: 'amount', value: discountAmount }
  }
  return { mode: 'none', value: 0 }
}