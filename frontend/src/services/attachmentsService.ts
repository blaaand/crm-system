import api from './api'
import { Attachment } from '../types'

export const attachmentsService = {
  async uploadToRequest(requestId: string, file: File, title?: string): Promise<Attachment> {
    const form = new FormData()
    form.append('file', file)
    form.append('requestId', requestId)
    if (title) form.append('title', title)
    const response = await api.post('/attachments/upload', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return response.data
  },

  async getByRequest(requestId: string): Promise<Attachment[]> {
    const response = await api.get(`/attachments/request/${requestId}`)
    return response.data
  },

  async deleteAttachment(id: string): Promise<{ message: string }> {
    const response = await api.delete(`/attachments/${id}`)
    return response.data
  },
}


