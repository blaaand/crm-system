import { useQuery } from 'react-query'
import { clientsService } from '../services/clientsService'
import { requestsService } from '../services/requestsService'
import { useAuthStore } from '../stores/authStore'
import {
  UsersIcon,
  ClipboardDocumentListIcon,
  CurrencyDollarIcon,
  ArrowTrendingUpIcon,
} from '@heroicons/react/24/outline'

export default function Dashboard() {
  const { user } = useAuthStore()

  const { data: clientStats } = useQuery('clientStats', clientsService.getClientStats)
  const { data: requestStats } = useQuery('requestStats', requestsService.getRequestStats)

  const stats = [
    {
      name: 'إجمالي العملاء',
      value: clientStats?.totalClients || 0,
      icon: UsersIcon,
      color: 'bg-blue-500',
    },
    {
      name: 'إجمالي الطلبات',
      value: requestStats?.totalRequests || 0,
      icon: ClipboardDocumentListIcon,
      color: 'bg-green-500',
    },
    {
      name: 'طلبات مكتملة',
      value: requestStats?.requestsByStatus?.find((s: any) => s.status === 'SOLD')?.count || 0,
      icon: CurrencyDollarIcon,
      color: 'bg-yellow-500',
    },
    {
      name: 'طلبات في المتابعة',
      value: requestStats?.requestsByStatus?.find((s: any) => s.status === 'FOLLOW_UP')?.count || 0,
      icon: ArrowTrendingUpIcon,
      color: 'bg-purple-500',
    },
  ]

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">مرحباً، {user?.name}</h1>
        <p className="mt-1 text-sm text-gray-500">
          إليك نظرة عامة على نشاطك اليوم
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        {stats.map((stat) => (
          <div key={stat.name} className="card">
            <div className="card-body">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className={`p-3 rounded-md ${stat.color}`}>
                    <stat.icon className="h-6 w-6 text-white" />
                  </div>
                </div>
                <div className="mr-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      {stat.name}
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {stat.value}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Charts and recent activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent requests */}
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-medium text-gray-900">الطلبات الأخيرة</h3>
          </div>
          <div className="card-body">
            <div className="space-y-4">
              {requestStats?.requestsByStatus?.slice(0, 5).map((status: any) => (
                <div key={status.status} className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-primary-500 rounded-full ml-3"></div>
                    <span className="text-sm text-gray-900">{status.title}</span>
                  </div>
                  <span className="text-sm font-medium text-gray-900">{status.count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Client distribution */}
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-medium text-gray-900">توزيع العملاء</h3>
          </div>
          <div className="card-body">
            <div className="space-y-4">
              {clientStats?.clientsByCity?.slice(0, 5).map((city: any) => (
                <div key={city.city} className="flex items-center justify-between">
                  <span className="text-sm text-gray-900">{city.city}</span>
                  <span className="text-sm font-medium text-gray-900">{city.count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
