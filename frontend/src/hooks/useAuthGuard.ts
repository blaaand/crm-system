import { useEffect } from 'react'
import { useAuthStore } from '../stores/authStore'

export const useAuthGuard = () => {
  const { isAuthenticated, checkAuth } = useAuthStore()

  useEffect(() => {
    // تحقق من المصادقة عند تحميل أي صفحة
    if (!isAuthenticated) {
      const accessToken = localStorage.getItem('accessToken')
      if (accessToken) {
        checkAuth().catch(() => {
          // Handle silently - auth store will clear tokens
        })
      }
    }
  }, [isAuthenticated, checkAuth])

  return { isAuthenticated }
}
