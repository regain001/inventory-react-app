import client from './axiosClient'
import type { ResponseDto, SalesOrder, SalesOrderPage, SalesOrderQuery, SalesOrderSaveDto } from '../types/saleOrder'

async function getAll(query: SalesOrderQuery): Promise<SalesOrderPage> {
  const response = await client.get<SalesOrderPage>('/sales-orders', { params: query })
  return response.data
}

async function getById(id: number): Promise<SalesOrder> {
  const response = await client.get<ResponseDto<SalesOrder>>(`/sales-orders/${id}`)
  return response.data.data as SalesOrder
}

async function create(dto: SalesOrderSaveDto): Promise<ResponseDto<number>> {
  const response = await client.post<ResponseDto<number>>('/sales-orders', dto)
  return response.data
}

async function update(id: number, dto: SalesOrderSaveDto): Promise<ResponseDto<number>> {
  const response = await client.put<ResponseDto<number>>(`/sales-orders/${id}`, dto)
  return response.data
}

async function remove(id: number): Promise<ResponseDto<null>> {
  const response = await client.delete<ResponseDto<null>>(`/sales-orders/${id}`)
  return response.data
}

async function complete(id: number): Promise<ResponseDto<null>> {
  const response = await client.post<ResponseDto<null>>(`/sales-orders/${id}/complete`)
  return response.data
}

export const saleOrderApi = { getAll, getById, create, update, remove, complete }