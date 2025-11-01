import { ReactNode, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'
import { useAuthGuard } from '../hooks/useAuthGuard'
import {
  HomeIcon,
  UsersIcon,
  ClipboardDocumentListIcon,
  ViewColumnsIcon,
  CogIcon,
  CalculatorIcon,
  DocumentTextIcon,
  UserCircleIcon,
  Bars3Icon,
  XMarkIcon,
  BanknotesIcon,
  CubeIcon,
  FolderIcon,
} from '@heroicons/react/24/outline'

interface LayoutProps {
  children: ReactNode
}

const navigation = [
  { name: 'لوحة التحكم', href: '/dashboard', icon: HomeIcon },
  { name: 'العملاء', href: '/clients', icon: UsersIcon },
  { name: 'الطلبات', href: '/requests', icon: ClipboardDocumentListIcon },
  { name: 'المخزون', href: '/inventory', icon: CubeIcon },
  { name: 'البنوك والتمويل', href: '/banks-financing', icon: BanknotesIcon },
  { name: 'الملفات', href: '/files', icon: FolderIcon },
  { name: 'الإدارة', href: '/admin', icon: CogIcon },
  { name: 'المعادلات', href: '/formulas', icon: CalculatorIcon },
  { name: 'سجل النشاط', href: '/audit', icon: DocumentTextIcon },
]

export default function Layout({ children }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { user, logout, hasAnyRole } = useAuthStore()
  const location = useLocation()
  
  // تحقق من المصادقة عند كل تنقل
  useAuthGuard()

  const filteredNavigation = navigation.filter((item) => {
    // Admin-only sections
    if (item.href === '/admin' || item.href === '/formulas' || item.href === '/audit') {
      return hasAnyRole(['ADMIN'])
    }
    // Files page is visible to all roles (upload permission handled in page)
    // Inventory and Banks should be visible to all roles (AGENT read-only handled in page)
    return true
  })

  return (
    <div className="h-screen flex overflow-hidden bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Mobile sidebar */}
      <div className={`fixed inset-0 flex z-40 md:hidden ${sidebarOpen ? '' : 'hidden'}`}>
        <div className="fixed inset-0 bg-black bg-opacity-60" onClick={() => setSidebarOpen(false)} />
        <div className="relative flex-1 flex flex-col max-w-xs w-full bg-gradient-to-b from-dark-200 to-dark-100 shadow-2xl">
          <div className="absolute top-0 right-0 -mr-12 pt-2">
            <button
              type="button"
              className="ml-1 flex items-center justify-center h-10 w-10 rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary-500"
              onClick={() => setSidebarOpen(false)}
            >
              <XMarkIcon className="h-6 w-6 text-white" />
            </button>
          </div>
          <div className="flex-1 h-0 pt-5 pb-4 overflow-y-auto">
            <div className="flex-shrink-0 flex items-center px-4 pb-6 border-b border-primary-500/30">
              <div className="flex items-center gap-3">
                {/* شعار الشركة */}
                <div className="w-14 h-14 bg-gradient-to-br from-primary-600 via-primary-500 to-primary-400 rounded-xl flex items-center justify-center shadow-xl border border-primary-400/30">
                  <div className="text-2xl font-bold text-dark-200">رمز</div>
                </div>
                <div>
                  <h1 className="text-base font-bold text-primary-500 leading-tight">شركة رمز الإختيار</h1>
                  <p className="text-xs text-silver-500">Ramz Elkhtear Co.</p>
                </div>
              </div>
            </div>
            <nav className="mt-6 px-2 space-y-1">
              {filteredNavigation.map((item) => {
                const isActive = location.pathname === item.href
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    onClick={() => setSidebarOpen(false)}
                    className={`${
                      isActive
                        ? 'bg-gradient-to-r from-primary-500/20 to-primary-600/20 text-primary-400 shadow-lg border-r-3 border-primary-400'
                        : 'text-gray-400 hover:bg-dark-100/50 hover:text-primary-400 transition-all duration-200'
                    } group flex items-center px-4 py-3 text-base font-medium rounded-lg transition-all duration-200`}
                  >
                    <item.icon
                      className={`${
                        isActive ? 'text-primary-400' : 'text-gray-500 group-hover:text-primary-400'
                      } ml-4 flex-shrink-0 h-6 w-6 transition-colors`}
                    />
                    {item.name}
                  </Link>
                )
              })}
            </nav>
          </div>
          <div className="flex-shrink-0 flex border-t border-primary-500/30 p-4 bg-dark-200/50">
            <div className="flex items-center w-full">
              <div className="flex-shrink-0">
                <div className="h-11 w-11 rounded-full bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center shadow-xl border border-primary-400/30">
                  <UserCircleIcon className="h-7 w-7 text-dark-200" />
                </div>
              </div>
              <div className="mr-3 flex-1 min-w-0">
                <p className="text-sm font-semibold text-primary-500 truncate">
                  {user?.name}
                </p>
                <p className="text-xs text-silver-400 truncate">
                  {user?.role}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Desktop sidebar */}
      <div className="hidden md:flex md:flex-shrink-0">
        <div className="flex flex-col w-56 lg:w-64">
          <div className="flex flex-col h-0 flex-1 bg-gradient-to-b from-dark-200 to-dark-100 shadow-2xl">
            <div className="flex-1 flex flex-col pt-8 pb-4 overflow-y-auto">
              <div className="flex-shrink-0 flex items-center px-4 lg:px-6 pb-4 lg:pb-6 border-b border-primary-500/30">
                <div className="flex items-center gap-2 lg:gap-3">
                  {/* شعار الشركة */}
                  <div className="w-12 h-12 lg:w-14 lg:h-14 bg-gradient-to-br from-primary-600 via-primary-500 to-primary-400 rounded-xl flex items-center justify-center shadow-xl border border-primary-400/30">
                    <div className="text-xl lg:text-2xl font-bold text-dark-200">رمز</div>
                  </div>
                  <div className="hidden lg:block">
                    <h1 className="text-base lg:text-lg font-bold text-primary-500 leading-tight">شركة رمز الإختيار</h1>
                    <p className="text-xs text-silver-500">Ramz Elkhtear Co.</p>
                  </div>
                </div>
              </div>
              <nav className="mt-4 lg:mt-6 px-2 lg:px-3 space-y-1 lg:space-y-2">
                {filteredNavigation.map((item) => {
                  const isActive = location.pathname === item.href
                  return (
                    <Link
                      key={item.name}
                      to={item.href}
                      className={`${
                        isActive
                          ? 'bg-gradient-to-r from-primary-500/20 to-primary-600/20 text-primary-400 shadow-lg border-r-4 border-primary-400'
                          : 'text-gray-400 hover:bg-dark-100/50 hover:text-primary-400 transition-all duration-200'
                      } group flex items-center px-3 lg:px-4 py-2 lg:py-3 text-xs lg:text-sm font-medium rounded-xl transition-all duration-200`}
                    >
                      <item.icon
                        className={`${
                          isActive ? 'text-primary-400' : 'text-gray-500 group-hover:text-primary-400'
                        } ml-2 lg:ml-3 flex-shrink-0 h-5 w-5 lg:h-6 lg:w-6 transition-colors`}
                      />
                      <span className="truncate">{item.name}</span>
                    </Link>
                  )
                })}
              </nav>
            </div>
            <div className="flex-shrink-0 flex border-t border-primary-500/30 p-5 bg-dark-200/50">
              <div className="flex items-center w-full">
                <div className="flex-shrink-0">
                  <div className="h-12 w-12 rounded-full bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center shadow-xl border border-primary-400/30">
                    <UserCircleIcon className="h-7 w-7 text-dark-200" />
                  </div>
                </div>
                <div className="mr-3 flex-1 min-w-0">
                  <p className="text-sm font-semibold text-primary-500 truncate">
                    {user?.name}
                  </p>
                  <p className="text-xs text-silver-400 truncate">
                    {user?.role}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex flex-col w-0 flex-1 overflow-hidden bg-gradient-to-br from-white to-gray-50">
        <div className="md:hidden pl-1 pt-1 sm:pl-3 sm:pt-3">
          <button
            type="button"
            className="-ml-0.5 -mt-0.5 h-12 w-12 inline-flex items-center justify-center rounded-xl text-gray-500 hover:text-primary-600 bg-white hover:bg-primary-50 shadow-md focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary-500 transition-all"
            onClick={() => setSidebarOpen(true)}
          >
            <Bars3Icon className="h-6 w-6" />
          </button>
        </div>
        <main className="flex-1 relative overflow-y-auto focus:outline-none">
          <div className="h-full">
            <div className="h-full px-4 sm:px-6 lg:px-8 py-6">
              {children}
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
