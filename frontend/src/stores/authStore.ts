import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { User, UserRole } from '../types'
import { authService } from '../services/authService'
import toast from 'react-hot-toast'

interface AuthState {
  user: User | null
  accessToken: string | null
  refreshToken: string | null
  isAuthenticated: boolean
  isLoading: boolean
}

interface AuthActions {
  login: (identifier: string, password: string) => Promise<void>
  register: (userData: {
    name: string
    email: string
    password: string
    phone?: string
  }) => Promise<void>
  logout: () => void
  setUser: (user: User) => void
  setTokens: (accessToken: string, refreshToken: string) => void
  clearAuth: () => void
  checkAuth: () => Promise<void>
  hasRole: (role: UserRole) => boolean
  hasAnyRole: (roles: UserRole[]) => boolean
}

type AuthStore = AuthState & AuthActions

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      // State
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: false,

      // Actions
      login: async (identifier: string, password: string) => {
        set({ isLoading: true })
        try {
          const isEmail = identifier.includes('@')
          const response = await authService.login(isEmail ? { email: identifier, password } : { phone: identifier, password })
          set({
            user: response.user,
            accessToken: response.accessToken,
            refreshToken: response.refreshToken,
            isAuthenticated: true,
            isLoading: false,
          })
          localStorage.setItem('accessToken', response.accessToken)
          localStorage.setItem('refreshToken', response.refreshToken)
          toast.success('تم تسجيل الدخول بنجاح')
        } catch (error) {
          set({ isLoading: false })
          throw error
        }
      },

      register: async (userData) => {
        set({ isLoading: true })
        try {
          const response = await authService.register(userData)
          set({
            user: response.user,
            accessToken: response.accessToken,
            refreshToken: response.refreshToken,
            isAuthenticated: true,
            isLoading: false,
          })
          localStorage.setItem('accessToken', response.accessToken)
          localStorage.setItem('refreshToken', response.refreshToken)
          toast.success('تم إنشاء الحساب بنجاح')
        } catch (error) {
          set({ isLoading: false })
          throw error
        }
      },

      logout: () => {
        authService.logout().catch(() => {
          // Ignore logout errors
        })
        get().clearAuth()
        toast.success('تم تسجيل الخروج بنجاح')
      },

      setUser: (user: User) => {
        set({ user })
      },

      setTokens: (accessToken: string, refreshToken: string) => {
        set({ accessToken, refreshToken })
        localStorage.setItem('accessToken', accessToken)
        localStorage.setItem('refreshToken', refreshToken)
      },

      clearAuth: () => {
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
        })
        localStorage.removeItem('accessToken')
        localStorage.removeItem('refreshToken')
      },

      checkAuth: async () => {
        // أولاً تحقق من localStorage إذا لم يكن هناك token في الـ store
        let { accessToken } = get()
        if (!accessToken) {
          accessToken = localStorage.getItem('accessToken')
          if (accessToken) {
            const refreshToken = localStorage.getItem('refreshToken')
            if (refreshToken) {
              set({ accessToken, refreshToken })
            }
          }
        }

        if (!accessToken) {
          get().clearAuth()
          return
        }

        try {
          const response = await authService.getProfile()
          set({ user: response.user, isAuthenticated: true })
        } catch (error) {
          get().clearAuth()
        }
      },

      hasRole: (role: UserRole) => {
        const { user } = get()
        return user?.role === role
      },

      hasAnyRole: (roles: UserRole[]) => {
        const { user } = get()
        return user ? roles.includes(user.role) : false
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
      }),
      // عند تحميل البيانات من localStorage، تحقق من صحة tokens
      onRehydrateStorage: () => (state) => {
        if (state?.accessToken && state?.refreshToken) {
          // تحديث localStorage للتأكد من التزامن
          localStorage.setItem('accessToken', state.accessToken)
          localStorage.setItem('refreshToken', state.refreshToken)
        }
      },
    }
  )
)
