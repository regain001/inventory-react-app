import axios, { AxiosError } from 'axios'
import type { ApiResponse } from '../types/api'

export const API_BASE_URL: string =
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? 'http://localhost:8086/api'

const client = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
})

function extractErrorMessages(body: unknown): string[] {
  if (!body || typeof body !== 'object') return []
  const record = body as {
    message?: unknown
    errors?: unknown
    detail?: unknown
    title?: unknown
    invalid_params?: unknown
  }
  const messages: string[] = []

  const pushString = (value: unknown) => {
    if (typeof value === 'string' && value.trim()) messages.push(value.trim())
  }
  const collect = (value: unknown) => {
    if (Array.isArray(value)) {
      for (const item of value) collect(item)
    } else if (typeof value === 'string') {
      pushString(value)
    } else if (value && typeof value === 'object') {
      const entry = value as {
        message?: unknown
        defaultMessage?: unknown
        field?: unknown
        detail?: unknown
      }
      if (entry.field !== undefined && typeof entry.field === 'string') {
        const fieldMessage =
          entry.message ?? entry.defaultMessage ?? entry.detail
        if (typeof fieldMessage === 'string' && fieldMessage.trim()) {
          messages.push(`${entry.field}: ${fieldMessage.trim()}`)
        }
      } else {
        const values = Object.values(value)
        if (values.length > 0) {
          for (const item of values) collect(item)
        }
        collect(entry.message)
        collect(entry.defaultMessage)
        collect(entry.detail)
      }
    }
  }

  collect(record.message)
  collect(record.errors)
  collect(record.invalid_params)
  collect(record.detail)
  collect(record.title)
  return [...new Set(messages)]
}

function buildError(body: unknown, fallback: string): Error {
  const messages = extractErrorMessages(body)
  return new Error(messages.length > 0 ? messages.join('\n') : fallback)
}

client.interceptors.response.use(
  (response) => {
    const body = response.data as (ApiResponse<unknown> & { status?: number | null }) | undefined
    if (body && typeof body === 'object' && 'success' in body && body.success === false) {
      const bodyStatus = typeof body.status === 'number' ? body.status : 0
      if (response.status >= 400 || bodyStatus >= 400) {
        return Promise.reject(buildError(body, 'Request failed'))
      }
    }
    return response
  },
  (error: AxiosError<unknown>) => {
    if (error.response) {
      return Promise.reject(buildError(error.response.data, `Request failed (${error.response.status})`))
    }
    return Promise.reject(
      new Error(error.code === 'ECONNABORTED' ? 'Request timed out' : error.message || 'Network error'),
    )
  },
)

export default client