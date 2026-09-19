import client from './axiosClient'
import type { ApiResponse } from '../types/api'
import type { Category, CategorySaveDto } from '../types/category'

async function getAll(): Promise<Category[]> {
  const response = await client.get<ApiResponse<Category[]>>('/product-categories')
  return response.data.data
}

async function getById(id: number): Promise<Category> {
  const response = await client.get<ApiResponse<Category>>(`/product-categories/${id}`)
  return response.data.data
}

async function save(dto: CategorySaveDto): Promise<Category> {
  const response = await client.post<ApiResponse<Category>>('/product-categories', dto)
  return response.data.data
}

async function remove(id: number): Promise<void> {
  await client.post(`/product-categories/${id}`)
}

export const categoryApi = { getAll, getById, save, remove }