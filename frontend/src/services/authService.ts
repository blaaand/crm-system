import api from './api'
import { LoginRequest, LoginResponse, User } from '../types'

export const authService = {
  async login(credentials: LoginRequest): Promise<LoginResponse> {
    const response = await api.post('/auth/login', credentials)
    return response.data
  },

  async register(userData: {
    name: string
    email: string
    password: string
    phone?: string
  }): Promise<LoginResponse> {
    const response = await api.post('/auth/register', userData)
    return response.data
  },

  async refreshToken(refreshToken: string): Promise<LoginResponse> {
    const response = await api.post('/auth/refresh', { refreshToken })
    return response.data
  },

  async logout(): Promise<void> {
    await api.post('/auth/logout')
  },

  async getProfile(): Promise<{ user: User }> {
    const response = await api.get('/auth/profile')
    return response.data
  },

  async changePassword(data: {
    currentPassword: string
    newPassword: string
  }): Promise<{ message: string }> {
    const response = await api.post('/auth/change-password', data)
    return response.data
  },

  async adminCreateUser(data: { name: string; phone: string; email?: string; password: string; role: 'ADMIN' | 'MANAGER' | 'AGENT' }): Promise<{ user: any }> {
    const response = await api.post('/admin/users', data)
    return response.data
  },

  async adminListUsers(): Promise<{ users: any[] }> {
    const response = await api.get('/admin/users')
    return response.data
  },

  async adminUpdateUser(id: string, data: { role?: 'ADMIN' | 'MANAGER' | 'AGENT'; active?: boolean }): Promise<{ user: any }> {
    const response = await api.patch(`/admin/users/${id}`, data)
    return response.data
  },

  async adminDeleteUser(id: string): Promise<{ message: string }> {
    const response = await api.delete(`/admin/users/${id}`)
    return response.data
  },
}
