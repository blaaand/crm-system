import axios from 'axios'
import toast from 'react-hot-toast'

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api'

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // 30 ثانية - يعطي وقت أطول للـ Backend للرد
})

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => {
    return response
  },
  async (error) => {
    const originalRequest = error.config

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true

      try {
        const refreshToken = localStorage.getItem('refreshToken')
        if (refreshToken) {
          const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
            refreshToken,
          })

          const { accessToken, refreshToken: newRefreshToken } = response.data
          localStorage.setItem('accessToken', accessToken)
          localStorage.setItem('refreshToken', newRefreshToken)

          // Retry the original request
          originalRequest.headers.Authorization = `Bearer ${accessToken}`
          return api(originalRequest)
        }
      } catch (refreshError) {
        // Refresh failed, clear auth and reload
        console.log('Token refresh failed, clearing auth...')
        localStorage.removeItem('accessToken')
        localStorage.removeItem('refreshToken')
        // Clear the auth store
        const { useAuthStore } = await import('../stores/authStore')
        useAuthStore.getState().clearAuth()
        // Reload the page to trigger the login component
        window.location.reload()
        return Promise.reject(refreshError)
      }
    }

    // Handle other errors
    if (error.response?.data?.message) {
      toast.error(error.response.data.message)
    } else if (error.code === 'ECONNREFUSED' || error.code === 'ERR_NETWORK' || error.message === 'Network Error' || error.message?.includes('network')) {
      toast.error('لا يمكن الاتصال بالخادم. تأكد من أن Backend يعمل على المنفذ 3000', {
        duration: 6000,
      })
      console.error('Network Error Details:', {
        code: error.code,
        message: error.message,
        config: error.config,
        baseURL: API_BASE_URL,
      })
    } else if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
      toast.error('انتهت مهلة الاتصال. الخادم يستغرق وقتاً أطول. حاول مرة أخرى', {
        duration: 6000,
      })
    } else if (error.message) {
      toast.error(error.message)
    } else {
      toast.error('حدث خطأ غير متوقع. حاول مرة أخرى')
    }

    return Promise.reject(error)
  }
)

export default api
