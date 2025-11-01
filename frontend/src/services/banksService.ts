import api from './api'

export interface EmployerType {
  id: string
  name: string
  nameEn: string
}

export interface BankRate {
  id: string
  bankId: string
  employerType: string
  clientType: 'TRANSFERRED' | 'NON_TRANSFERRED'
  rate: number
}

export interface Bank {
  id: string
  name: string
  code?: string
  notes?: string
  bankRates: BankRate[]
  createdAt: string
}

export interface CreateBankRequest {
  name: string
  code?: string
  notes?: string
}

export interface UpdateBankRequest {
  name?: string
  code?: string
  notes?: string
}

export interface UpdateBankRateRequest {
  bankId: string
  employerType: string
  clientType: 'TRANSFERRED' | 'NON_TRANSFERRED'
  rate: number
}

export const banksService = {
  // Get all banks with their rates
  getBanks: async (): Promise<Bank[]> => {
    const response = await api.get('/admin/banks')
    return response.data
  },

  // Get a specific bank
  getBank: async (id: string): Promise<Bank> => {
    const response = await api.get(`/admin/banks/${id}`)
    return response.data
  },

  // Create a new bank
  createBank: async (data: CreateBankRequest): Promise<Bank> => {
    const response = await api.post('/admin/banks', data)
    return response.data
  },

  // Update bank information
  updateBank: async (id: string, data: Partial<UpdateBankRequest>): Promise<Bank> => {
    const response = await api.patch(`/admin/banks/${id}`, data)
    return response.data
  },

  // Delete a bank
  deleteBank: async (id: string): Promise<void> => {
    await api.delete(`/admin/banks/${id}`)
  },

  // Update or create a bank rate
  updateBankRate: async (data: UpdateBankRateRequest): Promise<BankRate> => {
    const response = await api.post('/admin/bank-rates', data)
    return response.data
  },

  // Get rates for a specific bank
  getBankRates: async (bankId: string): Promise<BankRate[]> => {
    const response = await api.get(`/admin/bank-rates/bank/${bankId}`)
    return response.data
  },

  // Delete a bank rate
  deleteBankRate: async (bankId: string, employerType: string, clientType: string): Promise<void> => {
    await api.delete(`/admin/bank-rates`, {
      params: { bankId, employerType, clientType }
    })
  }
}

export default banksService