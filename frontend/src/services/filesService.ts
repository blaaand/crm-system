import api from './api'

export interface SystemFile {
  id: string
  name: string
  filename: string
  fileType: 'excel' | 'pdf' | 'image'
  storagePath?: string
  mimeType?: string
  uploadedById: string
  uploadedBy?: {
    id: string
    name: string
    email: string
  }
  createdAt: string
  updatedAt: string
}

export const filesService = {
  async getFiles(): Promise<SystemFile[]> {
    const response = await api.get('/files')
    return response.data
  },

  async saveFile(file: File, name: string, fileType: 'excel' | 'pdf' | 'image'): Promise<SystemFile> {
    const form = new FormData()
    form.append('file', file)
    form.append('name', name)
    form.append('fileType', fileType)
    const response = await api.post('/files/save', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return response.data
  },

  async downloadFile(id: string): Promise<Blob> {
    const response = await api.get(`/files/${id}/download`, {
      responseType: 'blob',
    })
    return response.data
  },

  async deleteFile(id: string): Promise<{ message: string }> {
    const response = await api.delete(`/files/${id}`)
    return response.data
  },
}

