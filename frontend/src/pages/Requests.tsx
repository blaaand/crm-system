import { useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import { Link } from 'react-router-dom'
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
  rectIntersection,
  pointerWithin,
  CollisionDetection,
} from '@dnd-kit/core'
import { requestsService } from '../services/requestsService'
import { Request, RequestStatus } from '../types'
import KanbanColumn from '../components/KanbanColumn'
import RequestCard from '../components/RequestCard'
import MoveRequestModal from '../components/MoveRequestModal'
import { PlusIcon, ViewColumnsIcon, ListBulletIcon, MagnifyingGlassIcon, ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline'
import * as XLSX from 'xlsx'

const statusOrder: RequestStatus[] = [
  RequestStatus.AWAITING_CLIENT,
  RequestStatus.FOLLOW_UP,
  RequestStatus.AWAITING_DOCS,
  RequestStatus.AWAITING_BANK_REP,
  RequestStatus.SOLD,
  RequestStatus.NOT_SOLD,
]

export default function Requests() {
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban')
  const [globalSearch, setGlobalSearch] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [activeRequest, setActiveRequest] = useState<Request | null>(null)
  const [moveModalOpen, setMoveModalOpen] = useState(false)
  const [selectedRequest, setSelectedRequest] = useState<Request | null>(null)
  const [targetStatus, setTargetStatus] = useState<RequestStatus | null>(null)
  const queryClient = useQueryClient()
  const kanbanScrollRef = useRef<HTMLDivElement>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  )

  // Improved collision detection - prefers pointerWithin, then rectIntersection, then closestCenter
  const collisionDetection: CollisionDetection = (args) => {
    // First, try pointerWithin - if pointer is within a droppable, use it
    const pointerCollisions = pointerWithin(args)
    if (pointerCollisions.length > 0) {
      return pointerCollisions
    }

    // Second, try rectIntersection - if rectangles intersect, use it
    const rectCollisions = rectIntersection(args)
    if (rectCollisions.length > 0) {
      return rectCollisions
    }

    // Finally, use closestCenter as fallback
    return closestCenter(args)
  }

  const { data: kanbanData, isLoading } = useQuery(
    'kanbanData',
    requestsService.getKanbanData
  )

  const moveRequestMutation = useMutation(
    ({ id, toStatus, comment }: { id: string; toStatus: RequestStatus; comment?: string }) =>
      requestsService.moveRequest(id, { toStatus, comment }),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('kanbanData')
        setMoveModalOpen(false)
        setSelectedRequest(null)
        setTargetStatus(null)
      },
    }
  )

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event
    const request = findRequestById(active.id as string)
    setActiveRequest(request)
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    setActiveRequest(null)

    if (!over) return

    const request = findRequestById(active.id as string)
    if (!request) return

    // Determine the target status
    let newStatus: RequestStatus | null = null

    // If over.id is a RequestStatus (column), use it directly
    if (statusOrder.includes(over.id as RequestStatus)) {
      newStatus = over.id as RequestStatus
    } else {
      // If dropped over a card, try to get its containerId (column id)
      const overData: any = over.data?.current
      if (overData?.sortable?.containerId) {
        newStatus = overData.sortable.containerId as RequestStatus
      } else if (statusOrder.includes(over.id as RequestStatus)) {
        newStatus = over.id as RequestStatus
      }
    }

    // If we have a valid new status and it's different from current, show modal
    if (newStatus && request.currentStatus !== newStatus) {
      setSelectedRequest(request)
      setTargetStatus(newStatus)
      setMoveModalOpen(true)
    }
  }

  const handleMoveRequest = (comment?: string) => {
    // Deprecated: moves now happen immediately on drop without modal/conditions
    if (selectedRequest && targetStatus) {
      moveRequestMutation.mutate({ id: selectedRequest.id, toStatus: targetStatus, comment })
    }
  }

  const findRequestById = (id: string): Request | null => {
    if (!kanbanData) return null
    for (const column of kanbanData) {
      const request = column.requests.find((r) => r.id === id)
      if (request) return request
    }
    return null
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">جاري التحميل...</div>
      </div>
    )
  }

  // filters
  const filterReq = (r: any) => {
    const tCreated = new Date(r.createdAt).getTime()
    const inDate = (!fromDate || tCreated >= new Date(fromDate).getTime()) && (!toDate || tCreated <= new Date(toDate).getTime() + 24*60*60*1000 - 1)
    if (!inDate) return false
    if (!globalSearch) return true
    const text = [r.title, r.client?.name, r.client?.phonePrimary, r.assignedTo?.name, r.installmentDetails?.financingBank?.name, r.price]?.map(x=>String(x||'')).join(' ').toLowerCase()
    return text.includes(globalSearch.toLowerCase())
  }

  return (
    <div className={viewMode === 'kanban' ? '-mx-8 -mt-6' : ''}>
      <div className={`sm:flex sm:items-center ${viewMode === 'kanban' ? 'px-8 pt-6 pb-4 bg-white border-b border-gray-200' : 'mb-8'}`}>
        <div className="sm:flex-auto">
          <h1 className="text-2xl font-bold text-gray-900">الطلبات</h1>
          <p className="mt-2 text-sm text-gray-700">
            إدارة وتتبع جميع الطلبات في النظام
          </p>
        </div>
        <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none flex gap-2 items-center">
          <div className="hidden md:block">
            <div className="relative">
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
              </div>
              <input className="input pr-10" placeholder="🔎 بحث شامل..." value={globalSearch} onChange={(e)=>setGlobalSearch(e.target.value)} />
            </div>
          </div>
          <input type="date" className="input" value={fromDate} onChange={(e)=>setFromDate(e.target.value)} />
          <input type="date" className="input" value={toDate} onChange={(e)=>setToDate(e.target.value)} />
          <button
            className="btn-outline"
            onClick={() => queryClient.invalidateQueries('kanbanData')}
          >تطبيق</button>
          <button
            className="btn-primary"
            onClick={async () => {
              const baseList = (kanbanData||[]).flatMap(c=>c.requests).filter(filterReq)
              // Fetch full details for each request to include events/comments/details
              const detailed = await Promise.all(
                baseList.map(async (r) => {
                  try {
                    const full = await requestsService.getRequest(r.id)
                    return full
                  } catch {
                    return r
                  }
                })
              )

              const header = [
                'المعرف',
                'العنوان',
                'اسم العميل',
                'هاتف العميل',
                'الحالة الحالية',
                'نوع الطلب',
                'سعر البيع',
                'تاريخ الإنشاء',
                'آخر تحديث',
                'تفاصيل العميل',
                'تفاصيل كاش/تقسيط',
                'الأحداث (التحركات)',
                'التعليقات',
              ]

              const rows: any[] = [header]

              for (const r of detailed) {
                const clientDetails = r.client ? `${r.client.name || ''} | ${r.client.phonePrimary || ''}` : ''
                const typeDetails = r.type === 'INSTALLMENT' && r.installmentDetails
                  ? `بنك: ${r.installmentDetails.financingBank?.name || ''} | أشهر: ${r.installmentDetails.installmentMonths || ''}`
                  : r.type === 'CASH'
                    ? `اسم السيارة: ${r.customFields?.carName || ''}`
                    : ''

                const eventsText = (r.events || []).map((e:any) => {
                  const who = e.changedBy?.name || ''
                  const when = new Date(e.createdAt).toLocaleString('ar-SA', { calendar: 'gregory' })
                  const from = e.fromStatus || ''
                  const to = e.toStatus || ''
                  const cm = e.comment ? ` | تعليق: ${e.comment}` : ''
                  return `${when} | ${who} | ${from} → ${to}${cm}`
                }).join('\n')

                const commentsText = ((r as any).comments || []).map((c:any) => {
                  const who = c.author?.name || ''
                  const when = new Date(c.createdAt).toLocaleString('ar-SA', { calendar: 'gregory' })
                  return `${when} | ${who}: ${c.content || ''}`
                }).join('\n')

                rows.push([
                  r.id,
                  r.title,
                  r.client?.name || '',
                  r.client?.phonePrimary || '',
                  r.currentStatus,
                  r.type,
                  r.price ?? '',
                  new Date(r.createdAt).toLocaleString('ar-SA', { calendar: 'gregory' }),
                  new Date(r.updatedAt).toLocaleString('ar-SA', { calendar: 'gregory' }),
                  clientDetails,
                  typeDetails,
                  eventsText,
                  commentsText,
                ])
              }

              const wb = XLSX.utils.book_new()
              const ws = XLSX.utils.aoa_to_sheet(rows)
              XLSX.utils.book_append_sheet(wb, ws, 'الطلبات')
              XLSX.writeFile(wb, `requests_${Date.now()}.xlsx`)
            }}
          >⬇️ تصدير Excel</button>
          <div className="flex rounded-md shadow-sm">
            <button
              onClick={() => setViewMode('kanban')}
              className={`px-4 py-2 text-sm font-medium rounded-r-md border ${
                viewMode === 'kanban'
                  ? 'bg-primary-600 text-white border-primary-600'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
            >
              <ViewColumnsIcon className="h-4 w-4 inline ml-1" />
              Kanban
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-4 py-2 text-sm font-medium rounded-l-md border ${
                viewMode === 'list'
                  ? 'bg-primary-600 text-white border-primary-600'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
            >
              <ListBulletIcon className="h-4 w-4 inline ml-1" />
              قائمة
            </button>
          </div>
          <Link
            to="/requests/new"
            className="btn-primary inline-flex items-center"
          >
            <PlusIcon className="h-4 w-4 ml-2" />
            إضافة طلب جديد
          </Link>
        </div>
      </div>

      {viewMode === 'kanban' ? (
        <div className="relative">
          <button
            onClick={() => {
              kanbanScrollRef.current?.scrollBy({ left: -400, behavior: 'smooth' })
            }}
            className="absolute left-4 top-1/2 transform -translate-y-1/2 z-10 bg-white rounded-full p-2 shadow-lg border border-gray-300 hover:bg-gray-50 transition-all"
            aria-label="Scroll left"
          >
            <ChevronLeftIcon className="h-6 w-6 text-gray-700" />
          </button>
          <button
            onClick={() => {
              kanbanScrollRef.current?.scrollBy({ left: 400, behavior: 'smooth' })
            }}
            className="absolute right-4 top-1/2 transform -translate-y-1/2 z-10 bg-white rounded-full p-2 shadow-lg border border-gray-300 hover:bg-gray-50 transition-all"
            aria-label="Scroll right"
          >
            <ChevronRightIcon className="h-6 w-6 text-gray-700" />
          </button>
          <DndContext
            sensors={sensors}
            collisionDetection={collisionDetection}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <div ref={kanbanScrollRef} className="flex gap-6 overflow-x-auto pb-8 pt-6 px-8 bg-gradient-to-br from-gray-50 to-gray-100 min-h-screen">
              {statusOrder.map((status) => {
                const column = kanbanData?.find((col) => col.status === status)
                if (!column) return null

                return (
                  <div key={status} className="flex-shrink-0 w-96">
                    <KanbanColumn
                      status={status}
                      title={column.title}
                      requests={column.requests.filter(filterReq)}
                    />
                  </div>
                )
              })}
            </div>

            <DragOverlay>
              {activeRequest ? (
                <div className="rotate-6 scale-110">
                  <RequestCard request={activeRequest} isDragging />
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
        </div>
      ) : (
        <div className="card">
          <div className="overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    الطلب
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    العميل
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    النوع
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    الحالة
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    المبلغ
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    تاريخ الإنشاء
                  </th>
                  <th className="relative px-6 py-3">
                    <span className="sr-only">الإجراءات</span>
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {kanbanData?.flatMap((column) => column.requests).length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-4 text-center text-gray-500">
                      لا توجد طلبات
                    </td>
                  </tr>
                ) : (
                  kanbanData?.flatMap((column) => column.requests).map((request) => (
                    <tr key={request.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {request.title}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {request.client?.name}
                        </div>
                        <div className="text-sm text-gray-500">
                          {request.client?.phonePrimary}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="badge-primary">
                          {request.type === 'CASH' ? 'كاش' : request.type === 'INSTALLMENT' ? 'تقسيط' : 'غير محدد'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="badge-gray">
                          {statusOrder.find(s => s === request.currentStatus) ? 
                            kanbanData?.find(c => c.status === request.currentStatus)?.title || request.currentStatus
                            : request.currentStatus}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {request.price ? `${request.price.toLocaleString()} ريال` : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(request.createdAt).toLocaleDateString('ar-SA', { calendar: 'gregory' })}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <Link
                          to={`/requests/${request.id}`}
                          className="text-primary-600 hover:text-primary-900"
                        >
                          عرض التفاصيل
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <MoveRequestModal
        isOpen={moveModalOpen}
        onClose={() => {
          setMoveModalOpen(false)
          setSelectedRequest(null)
          setTargetStatus(null)
        }}
        request={selectedRequest}
        onMove={handleMoveRequest}
        isLoading={moveRequestMutation.isLoading}
      />
    </div>
  )
}
