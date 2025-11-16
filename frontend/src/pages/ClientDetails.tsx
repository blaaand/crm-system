import { useParams, Link, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import { clientsService } from '../services/clientsService'
import { requestsService } from '../services/requestsService'
import { formatDateTime, getRelativeTime } from '../utils/dateUtils'
import { Comment, UserRole } from '../types'
import { 
  ArrowLeftIcon, 
  PlusIcon, 
  ChatBubbleLeftIcon,
  ClockIcon,
  UserIcon,
  PaperAirplaneIcon,
} from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'
import * as XLSX from 'xlsx'
import { useAuthStore } from '../stores/authStore'

export default function ClientDetails() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [commentText, setCommentText] = useState('')
  const { user } = useAuthStore()
  
  const { data: client, isLoading } = useQuery(
    ['client', id],
    () => clientsService.getClient(id!),
    { enabled: !!id }
  )

  const { data: requestsData } = useQuery(
    ['client-requests', id],
    () => requestsService.getRequests({ clientId: id, limit: 100 }),
    { enabled: !!id }
  )

  const deleteMutation = useMutation(
    (clientId: string) => clientsService.deleteClient(clientId),
    {
      onSuccess: () => {
        toast.success('تم حذف العميل بنجاح')
        queryClient.invalidateQueries('clients')
        navigate('/clients')
      },
      onError: (error: any) => {
        toast.error(error?.response?.data?.message || 'تعذر حذف العميل')
      },
    }
  )

  // Add comment mutation
  const addCommentMutation = useMutation(
    (text: string) => clientsService.addComment(id!, text),
    {
      onSuccess: () => {
        toast.success('تم إضافة التعليق بنجاح')
        setCommentText('')
        queryClient.invalidateQueries(['client', id])
      },
      onError: (error: any) => {
        toast.error(error?.response?.data?.message || 'تعذر إضافة التعليق')
      },
    }
  )

  const handleDeleteClient = async () => {
    if (!id) return
    const confirmed = confirm('هل أنت متأكد من حذف هذا العميل؟ لا يمكن التراجع.')
    if (!confirmed) return

    try {
      await deleteMutation.mutateAsync(id)
    } catch (err: any) {
      const serverMsg = err?.response?.data?.message || ''
      // If backend blocks due to existing requests, offer cascading delete
      if (
        serverMsg.includes('يمتلك طلبات') ||
        err?.response?.status === 400 ||
        err?.response?.status === 409 ||
        err?.response?.status === 500
      ) {
        const cascade = confirm('هذا العميل لديه طلبات. هل ترغب بحذف جميع الطلبات المرتبطة به ثم حذف العميل؟')
        if (!cascade) return

        try {
          // Fetch all client requests and delete them
          const requestsResp = await requestsService.getRequests({ clientId: id, limit: 1000 })
          const requests = requestsResp.requests || []
          for (const req of requests) {
            await requestsService.deleteRequest(req.id)
          }
          // Retry deleting client
          await deleteMutation.mutateAsync(id)
        } catch (innerErr: any) {
          toast.error(innerErr?.response?.data?.message || 'تعذر إكمال الحذف المتسلسل')
        }
      }
    }
  }

  if (isLoading) {
    return <div className="text-center py-8">جاري التحميل...</div>
  }

  if (!client) {
    return <div className="text-center py-8">العميل غير موجود</div>
  }

  const requests = requestsData?.requests || []

  const canEditOrDelete =
    !!user &&
    (user.role === UserRole.ADMIN ||
      user.role === UserRole.MANAGER ||
      user.id === client.createdById)

  return (
    <div>
      <div className="mb-6 flex justify-between items-center">
        <Link
          to="/clients"
          className="btn-outline inline-flex items-center text-sm"
        >
          <ArrowLeftIcon className="h-4 w-4 ml-1" />
          العودة للعملاء
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* معلومات العميل */}
          <div className="card">
            <div className="card-header">
              <h1 className="text-xl font-bold text-gray-900">{client.name}</h1>
            </div>
            <div className="card-body">
              <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
                <div>
                  <dt className="text-sm font-medium text-gray-500">الهاتف الأساسي</dt>
                  <dd className="mt-1 text-sm text-gray-900">{client.phonePrimary}</dd>
                </div>
                {client.phoneSecondary && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500">الهاتف الثانوي</dt>
                    <dd className="mt-1 text-sm text-gray-900">{client.phoneSecondary}</dd>
                  </div>
                )}
                {client.nationalId && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500">رقم الهوية</dt>
                    <dd className="mt-1 text-sm text-gray-900">{client.nationalId}</dd>
                  </div>
                )}
                {client.email && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500">البريد الإلكتروني</dt>
                    <dd className="mt-1 text-sm text-gray-900">{client.email}</dd>
                  </div>
                )}
                {client.city && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500">المدينة</dt>
                    <dd className="mt-1 text-sm text-gray-900">{client.city}</dd>
                  </div>
                )}
                {client.source && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500">المصدر</dt>
                    <dd className="mt-1 text-sm text-gray-900">{client.source}</dd>
                  </div>
                )}
                {client.address && (
                  <div className="sm:col-span-2">
                    <dt className="text-sm font-medium text-gray-500">العنوان</dt>
                    <dd className="mt-1 text-sm text-gray-900">{client.address}</dd>
                  </div>
                )}
                {client.notes && (
                  <div className="sm:col-span-2">
                    <dt className="text-sm font-medium text-gray-500">ملاحظات</dt>
                    <dd className="mt-1 text-sm text-gray-900">{client.notes}</dd>
                  </div>
                )}
                <div>
                  <dt className="text-sm font-medium text-gray-500">تاريخ الإنشاء</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {formatDateTime(client.createdAt)}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">آخر تحديث</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {formatDateTime(client.updatedAt)}
                    <span className="mr-2 text-xs text-gray-500">({getRelativeTime(client.updatedAt)})</span>
                  </dd>
                </div>
                {client.createdBy && (
                  <div className="sm:col-span-2">
                    <dt className="text-sm font-medium text-gray-500">تم الإنشاء بواسطة</dt>
                    <dd className="mt-1 text-sm text-gray-900">{client.createdBy.name}</dd>
                  </div>
                )}
              </dl>
            </div>
          </div>

          {/* إضافة تعليق */}
          <div className="card">
            <div className="card-header bg-gradient-to-r from-green-50 to-emerald-50">
              <h3 className="text-lg font-medium text-gray-900 flex items-center gap-2">
                <ChatBubbleLeftIcon className="h-5 w-5 text-green-600" />
                إضافة تعليق
              </h3>
            </div>
            <div className="card-body">
              <div className="space-y-4">
                <div>
                  <textarea
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    placeholder="اكتب تعليقك هنا..."
                    rows={3}
                    className="input w-full"
                  />
                </div>
                <div className="flex justify-end">
                  <button
                    onClick={() => {
                      if (commentText.trim()) {
                        addCommentMutation.mutate(commentText.trim())
                      } else {
                        toast.error('يرجى إدخال نص التعليق')
                      }
                    }}
                    disabled={addCommentMutation.isLoading || !commentText.trim()}
                    className="btn-primary flex items-center gap-2"
                  >
                    <PaperAirplaneIcon className="h-4 w-4" />
                    {addCommentMutation.isLoading ? 'جاري الإضافة...' : 'إضافة التعليق'}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* التعليقات */}
          <div className="card">
            <div className="card-header flex items-center gap-2">
              <ChatBubbleLeftIcon className="h-5 w-5 text-gray-600" />
              <h3 className="text-lg font-medium text-gray-900">
                التعليقات ({client.comments?.length || 0})
              </h3>
            </div>
            <div className="card-body">
              {!client.comments || client.comments.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  لا توجد تعليقات
                </div>
              ) : (
                <div className="flow-root">
                  <ul className="-mb-8">
                    {client.comments.map((comment: Comment, idx: number) => (
                      <li key={comment.id}>
                        <div className="relative pb-8">
                          {idx !== client.comments!.length - 1 && (
                            <span
                              className="absolute top-8 right-4 -ml-px h-full w-0.5 bg-gray-300"
                              aria-hidden="true"
                            />
                          )}
                          <div className="relative flex items-start space-x-3">
                            <div className="relative">
                              <div className="h-10 w-10 rounded-full flex items-center justify-center ring-4 ring-white bg-green-500">
                                <ChatBubbleLeftIcon className="h-5 w-5 text-white" />
                              </div>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg p-4 border-2 border-green-200 shadow-sm hover:shadow-md transition-shadow">
                                <p className="text-sm text-gray-900 font-medium leading-relaxed mb-3">
                                  {comment.text}
                                </p>
                                <div className="flex items-center gap-4 mt-3 pt-3 border-t border-green-200">
                                  <div className="flex items-center gap-2">
                                    <ClockIcon className="h-4 w-4 text-gray-500" />
                                    <span className="text-xs font-medium text-gray-600">
                                      {formatDateTime(comment.createdAt)}
                                    </span>
                                  </div>
                                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700">
                                    {getRelativeTime(comment.createdAt)}
                                  </span>
                                </div>
                                {comment.user && (
                                  <div className="mt-2 flex items-center gap-2 text-xs text-gray-500">
                                    <UserIcon className="h-4 w-4" />
                                    <span>بواسطة: {comment.user.name}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>

          {/* الطلبات */}
          <div className="card">
            <div className="card-header flex justify-between items-center">
              <h3 className="text-lg font-medium text-gray-900">
                الطلبات ({requests.length})
              </h3>
              <div className="flex items-center gap-2">
                <button
                  className="btn-outline text-sm"
                  onClick={() => {
                    const sorted = [...requests].sort((a:any, b:any) => {
                      const ua = new Date(a.updatedAt).getTime()
                      const ub = new Date(b.updatedAt).getTime()
                      if (ub !== ua) return ub - ua
                      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
                    })
                    const rows = [
                      ['المعرف','العنوان','النوع','الحالة','السعر','تاريخ الإنشاء','آخر تحديث'],
                      ...sorted.map(r => [
                        r.id,
                        r.title,
                        r.type,
                        r.currentStatus,
                        r.price ?? '',
                        new Date(r.createdAt).toLocaleString('ar-SA', { calendar: 'gregory' }),
                        new Date(r.updatedAt).toLocaleString('ar-SA', { calendar: 'gregory' }),
                      ])
                    ]
                    const wb = XLSX.utils.book_new()
                    const ws = XLSX.utils.aoa_to_sheet(rows)
                    XLSX.utils.book_append_sheet(wb, ws, 'طلبات العميل')
                    XLSX.writeFile(wb, `client_${client?.name || id}_requests_${Date.now()}.xlsx`)
                  }}
                >⬇️ تصدير Excel</button>
                <Link
                  to={`/requests/new?clientId=${id}`}
                  className="btn-primary inline-flex items-center text-sm"
                >
                  <PlusIcon className="h-4 w-4 ml-1" />
                  إضافة طلب
                </Link>
              </div>
            </div>
            <div className="card-body">
              {requests.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  لا توجد طلبات لهذا العميل
                </div>
              ) : (
                <div className="space-y-4">
                  {[...requests]
                    .sort((a:any, b:any) => {
                      const ua = new Date(a.updatedAt).getTime()
                      const ub = new Date(b.updatedAt).getTime()
                      if (ub !== ua) return ub - ua
                      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
                    })
                    .map((request: any) => (
                    <div
                      key={request.id}
                      className="block border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
                    >
                      <Link
                        to={`/requests/${request.id}`}
                        className="block"
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="text-sm font-medium text-gray-900">
                              {request.title}
                            </h4>
                            <p className="mt-1 text-sm text-gray-500">
                              {request.type === 'CASH' ? 'كاش' : request.type === 'INSTALLMENT' ? 'تقسيط' : 'غير محدد'}
                            </p>
                          </div>
                          <div className="text-left">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary-100 text-primary-800">
                              {request.currentStatus}
                            </span>
                            {request.price && (
                              <p className="mt-1 text-sm font-medium text-gray-900">
                                {request.price.toLocaleString()} ريال
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="mt-2 flex items-center justify-between">
                          <div className="text-xs text-gray-400">
                            {new Date(request.createdAt).toLocaleDateString('ar-SA', { calendar: 'gregory' })}
                          </div>
                          {request.createdBy && (
                            <div className="text-xs text-gray-500 flex items-center gap-1">
                              <UserIcon className="h-3 w-3" />
                              <span>أنشأه: {request.createdBy.name}</span>
                            </div>
                          )}
                        </div>
                      </Link>
                      <div className="mt-2 pt-2 border-t border-gray-200 flex justify-end">
                        <button
                          onClick={async (e) => {
                            e.preventDefault()
                            if (confirm('هل أنت متأكد من حذف هذا الطلب؟')) {
                              try {
                                await requestsService.deleteRequest(request.id)
                                toast.success('تم حذف الطلب بنجاح')
                                queryClient.invalidateQueries(['client-requests', id])
                                queryClient.invalidateQueries(['client', id])
                              } catch (error: any) {
                                toast.error(error?.response?.data?.message || 'تعذر حذف الطلب')
                              }
                            }
                          }}
                          className="text-xs text-red-600 hover:text-red-800"
                        >
                          حذف الطلب
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* الإحصائيات */}
        <div>
          <div className="card">
            <div className="card-header">
              <h3 className="text-lg font-medium text-gray-900">الإحصائيات</h3>
            </div>
            <div className="card-body">
              <div className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">عدد الطلبات</span>
                  <span className="text-sm font-medium text-gray-900">
                    {requests.length}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">المرفقات</span>
                  <span className="text-sm font-medium text-gray-900">
                    {client._count?.attachments || 0}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">التعليقات</span>
                  <span className="text-sm font-medium text-gray-900">
                    {client._count?.comments || 0}
                  </span>
                </div>
                <div className="pt-4 border-t border-gray-200">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">الطلبات المكتملة</span>
                    <span className="text-sm font-medium text-green-600">
                      {requests.filter(r => r.currentStatus === 'SOLD').length}
                    </span>
                  </div>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">الطلبات غير المكتملة</span>
                  <span className="text-sm font-medium text-red-600">
                    {requests.filter(r => r.currentStatus === 'NOT_SOLD').length}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">قيد المتابعة</span>
                  <span className="text-sm font-medium text-blue-600">
                    {requests.filter(r => !['SOLD', 'NOT_SOLD'].includes(r.currentStatus)).length}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 space-y-3">
            {canEditOrDelete && (
              <Link
                to={`/clients/${id}/edit`}
                className="btn-outline w-full text-center"
              >
                تعديل بيانات العميل
              </Link>
            )}
            {canEditOrDelete && (
              <button
                className="btn-danger w-full"
                onClick={handleDeleteClient}
                disabled={deleteMutation.isLoading}
              >
                {deleteMutation.isLoading ? 'جاري الحذف...' : 'حذف العميل'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
