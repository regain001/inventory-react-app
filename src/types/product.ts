export interface Product {
  active: boolean
  categoryId: number
  createdAt: string
  minStockLevel: number
  packQuantity: number
  packUnit: string
  price: number
  productCategoryName: string
  productId: number
  productName: string
  sku: string
  updatedAt: string
}

export interface ProductPage {
  fetchedRecords: number
  limit: number
  records: Product[]
  start: number
  totalRecords: number
}

export interface ProductQuery {
  start?: number
  limit?: number
  keyword?: string
  categoryId?: number
  active?: boolean
  minPrice?: number
  maxPrice?: number
}

export interface ProductSaveDto {
  id: number | null
  sku: string
  productName: string
  categoryId: number
  price: number
  packQuantity: number
  packUnit: string
  minStockLevel: number
  active: boolean
}