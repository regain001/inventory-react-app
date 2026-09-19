export interface Category {
  productCategoryId: number
  categoryName: string
  description: string | null
  active: boolean
  createdAt: string
  updatedAt: string
}

export interface CategorySaveDto {
  id: number | null
  categoryName: string
  description: string | null
  active: boolean
}