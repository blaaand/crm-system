import api from './api'

export const inventoryService = {
  async getInventory(): Promise<{ headers: string[]; data: Record<string, any>[]; uploadedBy?: string; updatedAt?: string }> {
    const response = await api.get('/inventory')
    return response.data
  },

  async saveInventory(headers: string[], data: Record<string, any>[]): Promise<{ message: string; inventory?: { uploadedBy: string; updatedAt: string } }> {
    const response = await api.post('/inventory', { headers, data })
    return response.data
  },

  async clearInventory(): Promise<{ message: string }> {
    const response = await api.delete('/inventory')
    return response.data
  },
}

