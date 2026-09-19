import client from './axiosClient'
import type { ApiResponse } from '../types/api'
import type {
  PurchaseOrder,
  PurchaseOrderPage,
  PurchaseOrderQuery,
  PurchaseOrderSaveDto,
} from '../types/purchaseOrder'

async function getAll(query: PurchaseOrderQuery): Promise<PurchaseOrderPage> {
  const response = await client.get<PurchaseOrderPage>('/purchase-orders', { params: query })
  return response.data
}

async function getById(id: number): Promise<PurchaseOrder> {
  const response = await client.get<ApiResponse<PurchaseOrder>>(`/purchase-orders/${id}`)
  return response.data.data
}

async function save(dto: PurchaseOrderSaveDto): Promise<PurchaseOrder> {
  const response = await client.post<ApiResponse<PurchaseOrder>>('/purchase-orders', dto)
  return response.data.data
}

async function remove(id: number): Promise<void> {
  await client.delete(`/purchase-orders/${id}`)
}

export const purchaseOrderApi = { getAll, getById, save, remove }