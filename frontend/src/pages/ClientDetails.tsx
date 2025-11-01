import { useParams, Link, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import { clientsService } from '../services/clientsService'
import { requestsService } from '../services/requestsService'
import { ArrowLeftIcon, PlusIcon } from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'
import * as XLSX from 'xlsx'

export default function ClientDetails() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  
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

  return (
    <div>
      <div className="mb-6">
        <Link
          to="/clients"
          className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700"
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
                <div className="sm:col-span-2">
                  <dt className="text-sm font-medium text-gray-500">تاريخ الإنشاء</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {new Date(client.createdAt).toLocaleDateString('ar-SA', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                      calendar: 'gregory'
                    })}
                  </dd>
                </div>
              </dl>
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
                    .map((request) => (
                    <Link
                      key={request.id}
                      to={`/requests/${request.id}`}
                      className="block border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
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
                      <div className="mt-2 text-xs text-gray-400">
                        {new Date(request.createdAt).toLocaleDateString('ar-SA', { calendar: 'gregory' })}
                      </div>
                    </Link>
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

          <div className="mt-6">
            <Link
              to={`/clients/${id}/edit`}
              className="btn-outline w-full text-center"
            >
              تعديل بيانات العميل
            </Link>
            <button
              className="btn-danger w-full mt-3"
              onClick={handleDeleteClient}
              disabled={deleteMutation.isLoading}
            >
              {deleteMutation.isLoading ? 'جاري الحذف...' : 'حذف العميل'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
