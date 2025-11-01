import api from './api'
import { Request, CreateRequestRequest, MoveRequestRequest, KanbanColumn, Pagination } from '../types'

export interface RequestsQuery {
  search?: string
  status?: string
  type?: string
  clientId?: string
  assignedToId?: string
  page?: number
  limit?: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

export interface RequestsResponse {
  requests: Request[]
  pagination: Pagination
}

export const requestsService = {
  async getRequests(query: RequestsQuery = {}): Promise<RequestsResponse> {
    const response = await api.get('/requests', { params: query })
    return response.data
  },

  async getRequest(id: string): Promise<Request> {
    const response = await api.get(`/requests/${id}`)
    return response.data
  },

  async createRequest(data: CreateRequestRequest): Promise<Request> {
    const response = await api.post('/requests', data)
    return response.data
  },

  async updateRequest(id: string, data: Partial<CreateRequestRequest>): Promise<Request> {
    const response = await api.patch(`/requests/${id}`, data)
    return response.data
  },

  async moveRequest(id: string, data: MoveRequestRequest): Promise<Request> {
    const response = await api.post(`/requests/${id}/move`, data)
    return response.data
  },

  async deleteRequest(id: string): Promise<{ message: string }> {
    const response = await api.delete(`/requests/${id}`)
    return response.data
  },

  async getKanbanData(): Promise<KanbanColumn[]> {
    const response = await api.get('/requests/kanban')
    return response.data
  },

  async getRequestStats(): Promise<any> {
    const response = await api.get('/requests/stats')
    return response.data
  },
}
