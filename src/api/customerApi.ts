import client from './axiosClient'
import type { ApiResponse } from '../types/api'
import type { Customer, CustomerPage, CustomerQuery, CustomerSaveDto } from '../types/customer'

async function getAll(query: CustomerQuery): Promise<CustomerPage> {
  const response = await client.get<ApiResponse<CustomerPage>>('/customers', { params: query })
  return response.data.data
}

async function getById(id: number): Promise<Customer> {
  const response = await client.get<ApiResponse<Customer>>(`/customers/${id}`)
  return response.data.data
}

async function save(dto: CustomerSaveDto): Promise<Customer> {
  const response = await client.post<ApiResponse<Customer>>('/customers', dto)
  return response.data.data
}

async function remove(id: number): Promise<void> {
  await client.delete(`/customers/${id}`)
}

export const customerApi = { getAll, getById, save, remove }