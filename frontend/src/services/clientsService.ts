import api from './api'
import {
  BulkClientEntry,
  BulkCreateClientsResponse,
  Client,
  CreateClientRequest,
  Pagination,
} from '../types'

export interface ClientsQuery {
  search?: string
  city?: string
  page?: number
  limit?: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

export interface ClientsResponse {
  clients: Client[]
  pagination: Pagination
}

export const clientsService = {
  async getClients(query: ClientsQuery = {}): Promise<ClientsResponse> {
    const response = await api.get('/clients', { params: query })
    return response.data
  },

  async getClient(id: string): Promise<Client> {
    const response = await api.get(`/clients/${id}`)
    return response.data
  },

  async createClient(data: CreateClientRequest): Promise<Client> {
    const response = await api.post('/clients', data)
    return response.data
  },

  async updateClient(id: string, data: Partial<CreateClientRequest>): Promise<Client> {
    const response = await api.patch(`/clients/${id}`, data)
    return response.data
  },

  async deleteClient(id: string): Promise<{ message: string }> {
    const response = await api.delete(`/clients/${id}`)
    return response.data
  },

  async getClientStats(): Promise<any> {
    const response = await api.get('/clients/stats')
    return response.data
  },

  async bulkCreate(data: { entries: BulkClientEntry[] }): Promise<BulkCreateClientsResponse> {
    const response = await api.post('/clients/bulk', data)
    return response.data
  },

  async addComment(clientId: string, text: string): Promise<any> {
    const response = await api.post(`/clients/${clientId}/comments`, { text })
    return response.data
  },
}
