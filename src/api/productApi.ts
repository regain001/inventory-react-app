import client from './axiosClient'
import type { ApiResponse } from '../types/api'
import type { Product, ProductPage, ProductQuery, ProductSaveDto } from '../types/product'

async function getAll(query: ProductQuery): Promise<ProductPage> {
  const response = await client.get<ApiResponse<ProductPage>>('/products', { params: query })
  return response.data.data
}

async function getById(id: number): Promise<Product> {
  const response = await client.get<ApiResponse<Product>>(`/products/${id}`)
  return response.data.data
}

async function save(dto: ProductSaveDto): Promise<Product> {
  const response = await client.post<ApiResponse<Product>>('/products', dto)
  return response.data.data
}

async function updateStatus(id: number, active: boolean): Promise<void> {
  await client.patch(`/products/${id}/status`, { active })
}

async function remove(id: number): Promise<void> {
  await client.delete(`/products/${id}`)
}

export const productApi = { getAll, getById, save, updateStatus, remove }