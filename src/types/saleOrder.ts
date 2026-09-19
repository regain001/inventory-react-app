export const SALE_ORDER_TYPES = ['SALE', 'RETURN'] as const
export type SalesOrderType = (typeof SALE_ORDER_TYPES)[number]

export type DiscountMode = 'none' | 'amount' | 'percentage'

export interface SalesOrderLineSaveDto {
  productId: number
  quantity: number
  discountAmount?: number | null
  discountPercentage?: number | null
}

export interface SalesOrderSaveDto {
  reference?: string | null
  orderDate: string
  customerId: number
  customerType: string
  orderType: SalesOrderType
  originalSalesOrderId?: number | null
  discountAmount?: number | null
  discountPercentage?: number | null
  note?: string | null
  deliveryAddress?: string | null
  contactPersonMobileNumber?: string | null
  lines: SalesOrderLineSaveDto[]
}

export interface SalesOrderPerline {
  id: number
  productId: number
  productCode: string
  productName: string
  quantity: number
  unitOfMeasure: string | null
  basePrice: number
  discountAmount: number | null
  discountPercentage: number | null
  unitPrice: number
  extendedPrice: number
  netAmount: number
}

export interface SalesOrder {
  salesOrderId: number
  documentNumber: string
  reference: string | null
  orderDate: string
  customerId: number
  customerType: string
  orderType: SalesOrderType
  originalSalesOrderId: number | null
  totalQuantity: number
  discountAmount: number | null
  discountPercentage: number | null
  totalAmount: number
  overallStatus: 'Pending' | 'Completed'
  note: string | null
  deliveryAddress: string | null
  contactPersonMobileNumber: string | null
  createdBy: number
  createdAt: string
  perlines: SalesOrderPerline[]
}

export interface SalesOrderPage {
  totalRecords: number
  fetchedRecords: number
  start: number
  limit: number
  records: SalesOrder[]
}

export interface SalesOrderQuery {
  start?: number
  limit?: number
  keyword?: string
  overallStatus?: 'Pending' | 'Completed'
  orderType?: string
  customerId?: number
  fromDate?: string
  toDate?: string
}

export interface ResponseDto<T = unknown> {
  message: string | null
  data: T | null
}