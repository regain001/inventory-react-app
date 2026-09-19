export interface ApiResponse<T> {
  status: number
  message: string
  data: T
  debugHint: string | null
  errors: unknown
  success: boolean
}