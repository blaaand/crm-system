import { useMemo, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import { authService } from '../services/authService'
import { UserRole } from '../types'
import { useAuthStore } from '../stores/authStore'
import { UsersIcon, PlusIcon, XMarkIcon } from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'

type RawRole = 'ADMIN' | 'MANAGER' | 'AGENT' | 'VIEWER'

interface Employee {
  id: string
  name: string
  email?: string
  phone?: string
  role: RawRole
  active: boolean
  assistantId?: string | null
}

export default function Team() {
  const { user } = useAuthStore()
  const queryClient = useQueryClient()
  const [selectedManagerId, setSelectedManagerId] = useState<string | null>(null)

  const { data, isLoading } = useQuery(['team-employees'], authService.getTeamEmployees)

  const employees: Employee[] = data?.employees || []

  const managers = useMemo(() => employees.filter((u) => u.role === 'MANAGER'), [employees])

  const agents = useMemo(() => employees.filter((u) => u.role === 'AGENT'), [employees])

  const activeManagerId = useMemo(() => {
    if (selectedManagerId) return selectedManagerId
    if (user?.role === UserRole.MANAGER) return user.id
    return managers[0]?.id || null
  }, [selectedManagerId, user, managers])

  const activeManager = managers.find((m) => m.id === activeManagerId) || null

  const teamMembers = useMemo(
    () => (activeManagerId ? agents.filter((a) => a.assistantId === activeManagerId) : []),
    [agents, activeManagerId]
  )

  const availableAgents = useMemo(
    () => agents.filter((a) => !a.assistantId || a.assistantId === activeManagerId),
    [agents, activeManagerId]
  )

  const updateAssistantMutation = useMutation(
    ({ agentId, assistantId }: { agentId: string; assistantId: string | null }) =>
      authService.adminUpdateUser(agentId, { assistantId }),
    {
      onSuccess: () => {
        toast.success('تم تحديث الفريق بنجاح')
        queryClient.invalidateQueries(['team-employees'])
      },
      onError: (error: any) => {
        toast.error(error?.response?.data?.message || 'حدث خطأ أثناء تحديث الفريق')
      },
    }
  )

  if (!user) {
    return null
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <UsersIcon className="h-6 w-6 text-primary-500" />
            إدارة الفريق
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            ربط الموظفين العاديين بالموظفين المساعدين لعرض عملائهم وطلباتهم معًا
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-gray-500">جاري تحميل بيانات الفريق...</div>
      ) : managers.length === 0 ? (
        <div className="text-center py-12 text-gray-500">لا يوجد موظفون مساعدين حتى الآن</div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-3">
          {/* قائمة المساعدين */}
          <div className="card lg:col-span-1">
            <div className="card-header">
              <h2 className="text-lg font-semibold text-gray-900">الموظفون المساعدون</h2>
            </div>
            <div className="card-body divide-y divide-gray-100">
              {managers.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setSelectedManagerId(m.id)}
                  className={`w-full text-right px-3 py-2 rounded-lg mb-1 flex flex-col items-start border ${
                    m.id === activeManagerId
                      ? 'border-primary-500 bg-primary-50'
                      : 'border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <span className="text-sm font-medium text-gray-900">{m.name}</span>
                  <span className="text-xs text-gray-500">{m.phone || m.email}</span>
                </button>
              ))}
            </div>
          </div>

          {/* تفاصيل الفريق */}
          <div className="card lg:col-span-2">
            <div className="card-header flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  الفريق التابع لـ {activeManager?.name || '—'}
                </h2>
                <p className="text-xs text-gray-500 mt-1">
                  الموظفون العاديون الذين سيتم احتساب عملائهم وطلباتهم ضمن هذا المساعد
                </p>
              </div>
            </div>
            <div className="card-body space-y-6">
              {/* أعضاء الفريق */}
              <div>
                <h3 className="text-sm font-semibold text-gray-800 mb-2">أعضاء الفريق الحاليون</h3>
                {teamMembers.length === 0 ? (
                  <p className="text-sm text-gray-500">لا يوجد موظفون مرتبطون بهذا المساعد بعد</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {teamMembers.map((member) => (
                      <div
                        key={member.id}
                        className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary-50 text-primary-700 border border-primary-200 text-xs"
                      >
                        <span>{member.name}</span>
                        <button
                          type="button"
                          onClick={() =>
                            updateAssistantMutation.mutate({ agentId: member.id, assistantId: null })
                          }
                          className="text-primary-500 hover:text-primary-700"
                        >
                          <XMarkIcon className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* إضافة موظفين */}
              <div>
                <h3 className="text-sm font-semibold text-gray-800 mb-2">إضافة موظف إلى الفريق</h3>
                {availableAgents.length === 0 ? (
                  <p className="text-sm text-gray-500">لا يوجد موظفون متاحون للإضافة</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {availableAgents.map((agent) => (
                      <button
                        key={agent.id}
                        type="button"
                        onClick={() =>
                          activeManagerId &&
                          updateAssistantMutation.mutate({
                            agentId: agent.id,
                            assistantId: activeManagerId,
                          })
                        }
                        className="inline-flex items-center gap-1 px-3 py-1 rounded-full border border-gray-200 text-xs text-gray-700 hover:bg-gray-50"
                      >
                        <PlusIcon className="h-3 w-3" />
                        <span>{agent.name}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}


