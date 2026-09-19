export interface PurchaseOrderLine {
  id: number
  perlineTotalAmount: number | null
  productCode: string | null
  productId: number
  productName: string | null
  quantity: number
  unitPrice: number
}

export interface PurchaseOrder {
  createdAt: string
  createdBy: number
  documentNumber: string
  note: string | null
  overallStatus: string | null
  perlines: PurchaseOrderLine[]
  poNumber: string
  purchaseOrderId: number
  totalAmount: number
  totalQuantity: number
  transactionDate: string
}

export interface PurchaseOrderPage {
  fetchedRecords: number
  limit: number
  records: PurchaseOrder[]
  start: number
  totalRecords: number
}

export interface PurchaseOrderQuery {
  start?: number
  limit?: number
  keyword?: string
  overallStatus?: string
  fromDate?: string
  toDate?: string
}

export interface PurchaseOrderLineDto {
  productId: number
  quantity: number
  unitPrice: number
}

export interface PurchaseOrderSaveDto {
  purchaseOrderId: number | null
  poNumber: string
  transactionDate: string
  note: string | null
  overallStatus: string
  lines: PurchaseOrderLineDto[]
}