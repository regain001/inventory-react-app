export interface Customer {
  active: boolean
  address: string | null
  createdAt: string
  customerId: number
  customerName: string
  customerType: string
  phone: string | null
  updatedAt: string
}

export interface CustomerPage {
  fetchedRecords: number
  limit: number
  records: Customer[]
  start: number
  totalRecords: number
}

export interface CustomerQuery {
  start?: number
  limit?: number
  keyword?: string
  status?: boolean
}

export interface CustomerSaveDto {
  id: number | null
  customerName: string
  phone: string
  address: string
  customerType: string
  active: boolean
}