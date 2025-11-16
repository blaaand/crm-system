import { useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import { Link } from 'react-router-dom'
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
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
import { Request, RequestStatus, RequestType, UserRole } from '../types'
import KanbanColumn from '../components/KanbanColumn'
import RequestCard from '../components/RequestCard'
import MoveRequestModal from '../components/MoveRequestModal'
import { PlusIcon, ViewColumnsIcon, ListBulletIcon, MagnifyingGlassIcon, ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline'
import * as XLSX from 'xlsx'
import { useAuthStore } from '../stores/authStore'
import { authService } from '../services/authService'

const statusOrder: RequestStatus[] = [
  RequestStatus.AWAITING_CLIENT,
  RequestStatus.FOLLOW_UP,
  RequestStatus.AWAITING_DOCS,
  RequestStatus.AWAITING_BANK_REP,
  RequestStatus.SOLD,
  RequestStatus.NOT_SOLD,
]

const getStatusTitle = (status: RequestStatus): string => {
  const titles: Record<string, string> = {
    [RequestStatus.NOT_ANSWERED]: 'عميل لم يتم الرد',
    [RequestStatus.AWAITING_CLIENT]: 'بانتظار رد العميل',
    [RequestStatus.FOLLOW_UP]: 'في المتابعة',
    [RequestStatus.AWAITING_DOCS]: 'بانتظار الأوراق',
    [RequestStatus.AWAITING_BANK_REP]: 'بانتظار رد مندوب البنك',
    [RequestStatus.SOLD]: 'تم البيع',
    [RequestStatus.NOT_SOLD]: 'لم يتم البيع',
  }
  return titles[status] || status
}

const getTypeTitle = (type: RequestType): string => {
  switch (type) {
    case RequestType.CASH:
      return 'كاش'
    case RequestType.INSTALLMENT:
      return 'تقسيط'
    default:
      return 'غير محدد'
  }
}

const workOrganizationLabelMap: Record<string, string> = {
  PRIVATE_APPROVED: 'خاص معتمد',
  PRIVATE_UNAPPROVED: 'خاص غير معتمد',
  COMPANY: 'شركة',
  GOVERNMENT: 'حكومي',
  MILITARY: 'عسكري',
  RETIRED: 'متقاعد',
}

export default function Requests() {
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban')
  const [globalSearch, setGlobalSearch] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [exportModalOpen, setExportModalOpen] = useState(false)
  const [exportFromDate, setExportFromDate] = useState('')
  const [exportToDate, setExportToDate] = useState('')
  const [activeRequest, setActiveRequest] = useState<Request | null>(null)
  const [moveModalOpen, setMoveModalOpen] = useState(false)
  const [selectedRequest, setSelectedRequest] = useState<Request | null>(null)
  const [targetStatus, setTargetStatus] = useState<RequestStatus | null>(null)
  const [currentOverStatus, setCurrentOverStatus] = useState<RequestStatus | null>(null)
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | 'ALL'>('ALL')
  const { user } = useAuthStore()
  const queryClient = useQueryClient()
  const kanbanScrollRef = useRef<HTMLDivElement>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  )

  // Improved collision detection - prioritize columns, map cards to columns
  const collisionDetection: CollisionDetection = (args) => {
    // Get all collisions using pointerWithin first (most accurate)
    const pointerCollisions = pointerWithin(args)
    
    // Convert droppableContainers array to a map for easy lookup
    const containersMap = new Map()
    args.droppableContainers.forEach(container => {
      containersMap.set(container.id, container)
    })
    
    if (pointerCollisions.length > 0) {
      // Priority 1: Check if any collision is directly with a column
      for (const collision of pointerCollisions) {
        const container = containersMap.get(collision.id)
        if (container?.data?.current?.type === 'column') {
          return [collision]
        }
      }
      // Priority 2: If collision is with a card, get its column
      for (const collision of pointerCollisions) {
        const container = containersMap.get(collision.id)
        const containerId = container?.data?.current?.containerId
        if (containerId && containersMap.has(containerId)) {
          const columnContainer = containersMap.get(containerId)
          if (columnContainer) {
            return [{ id: containerId, data: columnContainer.data }]
          }
        }
      }
      return pointerCollisions
    }

    // Fallback to rectIntersection
    const rectCollisions = rectIntersection(args)
    if (rectCollisions.length > 0) {
      // Priority 1: Check if any collision is directly with a column
      for (const collision of rectCollisions) {
        const container = containersMap.get(collision.id)
        if (container?.data?.current?.type === 'column') {
          return [collision]
        }
      }
      // Priority 2: If collision is with a card, get its column
      for (const collision of rectCollisions) {
        const container = containersMap.get(collision.id)
        const containerId = container?.data?.current?.containerId
        if (containerId && containersMap.has(containerId)) {
          const columnContainer = containersMap.get(containerId)
          if (columnContainer) {
            return [{ id: containerId, data: columnContainer.data }]
          }
        }
      }
      return rectCollisions
    }

    // Final fallback
    return closestCenter(args)
  }

  const { data: kanbanData, isLoading } = useQuery(
    'kanbanData',
    requestsService.getKanbanData
  )

  // Employees available for filtering (admin/manager only)
  const { data: employeesData } = useQuery(
    ['team-employees-for-requests'],
    authService.getTeamEmployees,
    {
      enabled: !!user && (user.role === UserRole.ADMIN || user.role === UserRole.MANAGER),
    }
  )

  const employees = employeesData?.employees || []

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
    setCurrentOverStatus(null)
  }

  const handleDragOver = (event: DragOverEvent) => {
    const { over } = event
    if (!over) {
      setCurrentOverStatus(null)
      return
    }

    // Get data from the element being dragged over
    const overData: any = over.data?.current

    // Determine the current status being dragged over
    let status: RequestStatus | null = null

    // Priority 1: If over a column directly
    if (overData?.type === 'column' && overData?.status) {
      status = overData.status as RequestStatus
    }
    // Priority 2: If over.id is a RequestStatus (column)
    else if (statusOrder.includes(over.id as RequestStatus)) {
      status = over.id as RequestStatus
    }
    // Priority 3: If over a card, get its containerId
    else if (overData?.type === 'request-card' && overData?.containerId) {
      status = overData.containerId as RequestStatus
    }
    // Priority 4: Try to find the request and get its status
    else {
      const targetRequest = findRequestById(over.id as string)
      if (targetRequest) {
        status = targetRequest.currentStatus
      }
    }

    setCurrentOverStatus(status)
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    setActiveRequest(null)

    if (!over) {
      setCurrentOverStatus(null)
      return
    }

    const request = findRequestById(active.id as string)
    if (!request) {
      setCurrentOverStatus(null)
      return
    }

    // Determine the target status - use currentOverStatus if available, otherwise try to determine from over
    let newStatus: RequestStatus | null = currentOverStatus

    // If currentOverStatus is not set, try to determine from over
    if (!newStatus) {
      const overData: any = over.data?.current

      // Priority 1: If dropped directly on a column
      if (overData?.type === 'column' && overData?.status) {
        newStatus = overData.status as RequestStatus
      }
      // Priority 2: If over.id is a RequestStatus (column), use it directly
      else if (statusOrder.includes(over.id as RequestStatus)) {
        newStatus = over.id as RequestStatus
      }
      // Priority 3: If dropped over a card, get its containerId
      else if (overData?.type === 'request-card' && overData?.containerId) {
        newStatus = overData.containerId as RequestStatus
      }
      // Priority 4: Try to get containerId from sortable data
      else if (overData?.sortable?.containerId) {
        newStatus = overData.sortable.containerId as RequestStatus
      }
      // Priority 5: Search for the request in kanbanData to find its column
      else {
        const targetRequest = findRequestById(over.id as string)
        if (targetRequest) {
          newStatus = targetRequest.currentStatus
        }
      }
    }

    setCurrentOverStatus(null)

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
    const inDate =
      (!fromDate || tCreated >= new Date(fromDate).getTime()) &&
      (!toDate || tCreated <= new Date(toDate).getTime() + 24 * 60 * 60 * 1000 - 1)
    if (!inDate) return false

    // Filter by selected employee (admin/manager only)
    if (selectedEmployeeId !== 'ALL') {
      if (r.createdById !== selectedEmployeeId && r.assignedToId !== selectedEmployeeId) {
        return false
      }
    }

    if (!globalSearch) return true
    const text = [
      r.title,
      r.client?.name,
      r.client?.phonePrimary,
      r.client?.city,
      r.assignedTo?.name,
      r.installmentDetails?.financingBank?.name,
      r.price,
    ]
      ?.map((x) => String(x || ''))
      .join(' ')
      .toLowerCase()
    return text.includes(globalSearch.toLowerCase())
  }

  const filterReqForExport = (r: any) => {
    const tCreated = new Date(r.createdAt).getTime()
    const inDate =
      (!exportFromDate || tCreated >= new Date(exportFromDate).getTime()) &&
      (!exportToDate || tCreated <= new Date(exportToDate).getTime() + 24 * 60 * 60 * 1000 - 1)

    if (!inDate) return false

    if (selectedEmployeeId !== 'ALL') {
      if (r.createdById !== selectedEmployeeId && r.assignedToId !== selectedEmployeeId) {
        return false
      }
    }

    return inDate
  }

  const handlePreset = (preset: 'all' | 'thisMonth' | 'lastMonth') => {
    const today = new Date()
    if (preset === 'all') {
      setExportFromDate('')
      setExportToDate('')
    } else if (preset === 'thisMonth') {
      const start = new Date(today.getFullYear(), today.getMonth(), 1)
      const end = new Date(today.getFullYear(), today.getMonth() + 1, 0)
      setExportFromDate(start.toISOString().slice(0, 10))
      setExportToDate(end.toISOString().slice(0, 10))
    } else if (preset === 'lastMonth') {
      const start = new Date(today.getFullYear(), today.getMonth() - 1, 1)
      const end = new Date(today.getFullYear(), today.getMonth(), 0)
      setExportFromDate(start.toISOString().slice(0, 10))
      setExportToDate(end.toISOString().slice(0, 10))
    }
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
          {(user?.role === UserRole.ADMIN || user?.role === UserRole.MANAGER) && (
            <select
              className="input text-sm max-w-xs"
              value={selectedEmployeeId}
              onChange={(e) => setSelectedEmployeeId(e.target.value as any)}
            >
              <option value="ALL">كل الطلبات المسموح بها</option>
              {employees.map((emp: any) => (
                <option key={emp.id} value={emp.id}>
                  {emp.name} {emp.role === 'MANAGER' || emp.role === UserRole.MANAGER ? '(مساعد)' : ''}
                </option>
              ))}
            </select>
          )}
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
            onClick={() => setExportModalOpen(true)}
          >
            ⬇️ تصدير Excel
          </button>
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

      {/* نافذة اختيار فترة تصدير الإكسل */}
      {exportModalOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-lg shadow-xl max-w-xl w-full p-6 space-y-4">
            <h2 className="text-lg font-bold text-gray-900 mb-2">تصفية تقرير الإكسل حسب الفترة</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  من تاريخ (تاريخ إنشاء الطلب)
                </label>
                <input
                  type="date"
                  className="input"
                  value={exportFromDate}
                  onChange={(e) => setExportFromDate(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  إلى تاريخ (تاريخ إنشاء الطلب)
                </label>
                <input
                  type="date"
                  className="input"
                  value={exportToDate}
                  onChange={(e) => setExportToDate(e.target.value)}
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-2 mt-2">
              <button
                type="button"
                className="btn-outline text-xs"
                onClick={() => handlePreset('all')}
              >
                كل الفترات
              </button>
              <button
                type="button"
                className="btn-outline text-xs"
                onClick={() => handlePreset('thisMonth')}
              >
                هذا الشهر
              </button>
              <button
                type="button"
                className="btn-outline text-xs"
                onClick={() => handlePreset('lastMonth')}
              >
                الشهر الماضي
              </button>
            </div>

            <div className="mt-4 flex justify-end gap-3">
              <button
                type="button"
                className="btn-outline"
                onClick={() => setExportModalOpen(false)}
              >
                إغلاق
              </button>
              <button
                type="button"
                className="btn-primary"
                onClick={async () => {
                  const baseList = (kanbanData || [])
                    .flatMap((c) => c.requests)
                    .filter(filterReqForExport)

                  const detailed: Request[] = await Promise.all(
                    baseList.map(async (r) => {
                      try {
                        const full = await requestsService.getRequest(r.id)
                        return full as Request
                      } catch {
                        return r as Request
                      }
                    })
                  )

                  // احسب الحد الأقصى لعدد الأحداث (حركات الحالة) عبر جميع الطلبات
                  const maxEvents = detailed.reduce(
                    (max, r) => Math.max(max, r.events?.length || 0),
                    0
                  )

                  // رؤوس الأعمدة الأساسية
                  const header: string[] = [
                    'المعرف',
                    'العنوان',
                    'اسم العميل',
                    'هاتف العميل',
                    'المدينة',
                    'الحالة الحالية',
                    'نوع الطلب',
                    'سعر البيع (شامل كل شيء)',
                    'إجمالي التقسيط',
                    'تاريخ الإنشاء',
                    'آخر تحديث',
                    'آخر حالة',
                    'تفاصيل العميل',
                  ]

                  // رؤوس خاصة بالتقسيط والكاش والتفاصيل الإضافية
                  const installmentHeaders = [
                    '🚗 اسم السيارة',
                    '🚗 سعر السيارة الأساسي',
                    '🚗 زيادة إضافية',
                    '🚗 الشحن',
                    '🚗 التجيير',
                    '🚗 زيادة أخرى',
                    '🚗 اللوح',
                    '📋 جهة العمل',
                    '📋 العمر',
                    '📋 البنك الذي ينزل عليه الراتب',
                    '📋 مبلغ الراتب',
                    '📋 نسبة التأمين (%)',
                    '📋 هل يوجد إيقاف خدمات',
                    '📊 أنواع الالتزامات',
                    '📊 نسبة الاستقطاع (%)',
                    '📊 التزام 1',
                    '📊 التزام 2',
                    '📊 مبلغ الفيزا',
                    '📊 المبلغ المستقطع',
                    '📊 إجمالي الالتزامات',
                    '📊 المبلغ المسموح',
                    '🏦 بنك التمويل',
                    '🏦 نسبة الدفعة الأولى (%)',
                    '🏦 نسبة الدفعة الأخيرة (%)',
                    '🏦 هامش الربح السنوي (%)',
                    '🏦 عدد أشهر التقسيط',
                    '💰 سعر التكلفة (تحليل الإيراد)',
                    '💰 نسبة الدعم (%)',
                  ]

                  const financingHeaders = [
                    '💳 سعر السيارة (بدون ضريبة + مع اللوح)',
                    '💳 مبلغ التمويل',
                    '💳 الدفعة الأولى',
                    '💳 الرسوم الإدارية',
                    '💳 التأمين الشهري',
                    '💳 القسط الشهري بدون التأمين',
                    '💳 القسط الشهري مع التأمين',
                    '💳 الدفعة الأخيرة',
                    '💳 إجمالي المبلغ المدفوع',
                  ]

                  header.push(...installmentHeaders, ...financingHeaders)

                  // أعمدة الحركات: حالة i / تاريخ النقل i / تعليق i
                  for (let i = 1; i <= maxEvents; i++) {
                    header.push(`حالة ${i}`, `تاريخ النقل ${i}`, `التعليق ${i}`)
                  }

                  const rows: any[] = [header]

                  for (const r of detailed) {
                    const clientDetails = r.client
                      ? `${r.client.name || ''} | ${r.client.phonePrimary || ''}`
                      : ''

                    // حساب سعر البيع
                    let salePrice = r.price ?? null
                    let quickCost: number | null = null
                    let supportPct: number | null = null

                    if (r.type === RequestType.CASH && r.customFields) {
                      const cf = r.customFields
                      salePrice =
                        cf.totalWithPlateAndTax !== undefined
                          ? Number(cf.totalWithPlateAndTax)
                          : salePrice
                      quickCost =
                        typeof cf.quickCost === 'number'
                          ? cf.quickCost
                          : cf.quickCost
                          ? Number(cf.quickCost)
                          : null
                      supportPct =
                        typeof cf.supportPct === 'number'
                          ? cf.supportPct
                          : cf.supportPct
                          ? Number(cf.supportPct)
                          : null
                    } else if (r.type === RequestType.INSTALLMENT && r.installmentDetails) {
                      const d = r.installmentDetails
                      const car = Number(d.carPrice ?? 0)
                      const add = Number(d.additionalFees ?? 0)
                      const ship = Number(d.shipping ?? 0)
                      const reg = Number(d.registration ?? 0)
                      const other = Number(d.otherAdditions ?? 0)
                      const plate = Number(d.plateNumber ?? 0)
                      const subtotal = car + add + ship + reg + other
                      const tax = subtotal * 0.15
                      salePrice = subtotal + tax + plate
                    }

                    // حساب إجمالي التقسيط (تقريبي بناء على نفس منطق صفحة التفاصيل)
                    let totalInstallment: number | '' = ''
                    if (r.type === RequestType.INSTALLMENT && r.installmentDetails) {
                      const d = r.installmentDetails
                      const car = Number(d.carPrice ?? 0)
                      const add = Number(d.additionalFees ?? 0)
                      const ship = Number(d.shipping ?? 0)
                      const reg = Number(d.registration ?? 0)
                      const other = Number(d.otherAdditions ?? 0)
                      const plate = Number(d.plateNumber ?? 0)
                      const subtotal = car + add + ship + reg + other
                      const taxOnSubtotal = subtotal * 0.15
                      const finalPriceWithTaxAndPlate = subtotal + taxOnSubtotal + plate

                      const downPct = (d.downPaymentPercentage || 0) / 100
                      const finalPct = (d.finalPaymentPercentage || 0) / 100
                      const months = d.installmentMonths || 60
                      const profitMargin = (d.profitMargin || 0) / 100
                      const insurancePct = (d.insurancePercentage || 0) / 100

                      const downPayment = downPct * finalPriceWithTaxAndPlate
                      const finalPayment = finalPct * finalPriceWithTaxAndPlate
                      const financingAmount = finalPriceWithTaxAndPlate - downPayment
                      const adminFees = Math.round(
                        Math.min(5000, financingAmount * 0.01) * 1.15
                      )
                      const totalInsurancePerYear =
                        (financingAmount + adminFees) * insurancePct + profitMargin
                      const monthlyInsurance = totalInsurancePerYear / 12
                      const years = months / 12
                      const marginTotal =
                        (financingAmount + adminFees) * profitMargin * years
                      const monthlyInstallmentWithoutInsurance =
                        (financingAmount + adminFees + marginTotal - finalPayment) / months
                      const monthlyInstallmentWithInsurance =
                        monthlyInstallmentWithoutInsurance + monthlyInsurance
                      totalInstallment =
                        monthlyInstallmentWithInsurance * months +
                        downPayment +
                        finalPayment +
                        adminFees
                    }

                    // آخر حالة (قبل الحالية)
                    let lastStatus: string = getStatusTitle(r.initialStatus)
                    if (r.events && r.events.length > 0) {
                      const sortedEvents = [...r.events].sort(
                        (a, b) =>
                          new Date(a.createdAt).getTime() -
                          new Date(b.createdAt).getTime()
                      )
                      const eventToCurrent = sortedEvents.find(
                        (e) => e.toStatus === r.currentStatus
                      )
                      if (eventToCurrent?.fromStatus) {
                        lastStatus = getStatusTitle(eventToCurrent.fromStatus)
                      } else {
                        const lastEvent = sortedEvents[sortedEvents.length - 1]
                        if (lastEvent.fromStatus) {
                          lastStatus = getStatusTitle(lastEvent.fromStatus)
                        }
                      }
                    }

                    const baseRow: any[] = [
                      r.id,
                      r.title,
                      r.client?.name || '',
                      r.client?.phonePrimary || '',
                      r.client?.city || '',
                      getStatusTitle(r.currentStatus),
                      getTypeTitle(r.type as RequestType),
                      salePrice ?? '',
                      totalInstallment === '' ? '' : Math.round(totalInstallment),
                      new Date(r.createdAt).toLocaleString('ar-SA', {
                        calendar: 'gregory',
                      }),
                      new Date(r.updatedAt).toLocaleString('ar-SA', {
                        calendar: 'gregory',
                      }),
                      lastStatus,
                      clientDetails,
                    ]

                    const d = r.installmentDetails
                    const obligationTypesSafe = Array.isArray(d?.obligationTypes)
                      ? d!.obligationTypes
                      : []

                    const installmentRow = [
                      d?.carName || '',
                      d?.carPrice ?? '',
                      d?.additionalFees ?? '',
                      d?.shipping ?? '',
                      d?.registration ?? '',
                      d?.otherAdditions ?? '',
                      d?.plateNumber ?? '',
                      d?.workOrganization
                        ? workOrganizationLabelMap[d.workOrganization] ||
                          d.workOrganization
                        : '',
                      d?.age ?? '',
                      d?.salaryBank?.name || '',
                      d?.salary ?? '',
                      d?.insurancePercentage ?? '',
                      d?.hasServiceStop ? 'نعم' : 'لا',
                      obligationTypesSafe.join(', '),
                      d?.deductionPercentage ?? '',
                      d?.obligation1 ?? '',
                      d?.obligation2 ?? '',
                      d?.visaAmount ?? '',
                      d?.deductedAmount ?? '',
                      d
                        ? Number(d.obligation1 ?? 0) +
                          Number(d.obligation2 ?? 0) +
                          Number(d.visaAmount ?? 0) * 0.05
                        : '',
                      d?.finalAmount ?? '',
                      d?.financingBank?.name ||
                        (d?.financingBankId === 'rajhi' ? 'بنك الراجحي' : ''),
                      d?.downPaymentPercentage ?? '',
                      d?.finalPaymentPercentage ?? '',
                      d?.profitMargin ?? '',
                      d?.installmentMonths ?? '',
                      quickCost ?? '',
                      supportPct ?? '',
                    ]

                    // إعادة استخدام حساب التمويل العام للحصول على نفس النتائج
                    let financingRow: any[] = Array(financingHeaders.length).fill('')
                    if (r.type === RequestType.INSTALLMENT && d) {
                      const car = Number(d.carPrice ?? 0)
                      const add = Number(d.additionalFees ?? 0)
                      const ship = Number(d.shipping ?? 0)
                      const reg = Number(d.registration ?? 0)
                      const other = Number(d.otherAdditions ?? 0)
                      const plate = Number(d.plateNumber ?? 0)
                      const subtotal = car + add + ship + reg + other
                      const taxOnSubtotal = subtotal * 0.15
                      const finalPriceWithTaxAndPlate = subtotal + taxOnSubtotal + plate
                      const priceWithPlateNoTax = subtotal + plate

                      const downPct = (d.downPaymentPercentage || 0) / 100
                      const finalPct = (d.finalPaymentPercentage || 0) / 100
                      const months = d.installmentMonths || 60
                      const profitMargin = (d.profitMargin || 0) / 100
                      const insurancePct = (d.insurancePercentage || 0) / 100

                      const downPayment = downPct * finalPriceWithTaxAndPlate
                      const finalPayment = finalPct * finalPriceWithTaxAndPlate
                      const financingAmount = finalPriceWithTaxAndPlate - downPayment
                      const adminFees = Math.round(
                        Math.min(5000, financingAmount * 0.01) * 1.15
                      )
                      const totalInsurancePerYear =
                        (financingAmount + adminFees) * insurancePct + profitMargin
                      const monthlyInsurance = totalInsurancePerYear / 12
                      const years = months / 12
                      const marginTotal =
                        (financingAmount + adminFees) * profitMargin * years
                      const monthlyInstallmentWithoutInsurance =
                        (financingAmount + adminFees + marginTotal - finalPayment) / months
                      const monthlyInstallmentWithInsurance =
                        monthlyInstallmentWithoutInsurance + monthlyInsurance
                      const totalAmountPaid =
                        monthlyInstallmentWithInsurance * months +
                        downPayment +
                        finalPayment +
                        adminFees

                      financingRow = [
                        Math.round(priceWithPlateNoTax),
                        Math.round(financingAmount),
                        Math.round(downPayment),
                        Math.round(adminFees),
                        Math.round(monthlyInsurance),
                        Math.round(monthlyInstallmentWithoutInsurance),
                        Math.round(monthlyInstallmentWithInsurance),
                        Math.round(finalPayment),
                        Math.round(totalAmountPaid),
                      ]
                    }

                    // أعمدة الحركات (events)
                    const eventCells: any[] = []
                    const eventsSorted = (r.events || []).sort(
                      (a, b) =>
                        new Date(a.createdAt).getTime() -
                        new Date(b.createdAt).getTime()
                    )
                    for (let i = 0; i < maxEvents; i++) {
                      const ev = eventsSorted[i]
                      if (ev) {
                        eventCells.push(
                          getStatusTitle(ev.toStatus),
                          new Date(ev.createdAt).toLocaleString('ar-SA', {
                            calendar: 'gregory',
                          }),
                          ev.comment || ''
                        )
                      } else {
                        eventCells.push('', '', '')
                      }
                    }

                    rows.push([...baseRow, ...installmentRow, ...financingRow, ...eventCells])
                  }

                  const wb = XLSX.utils.book_new()
                  const ws = XLSX.utils.aoa_to_sheet(rows)
                  XLSX.utils.book_append_sheet(wb, ws, 'الطلبات')
                  XLSX.writeFile(wb, `requests_${Date.now()}.xlsx`)

                  setExportModalOpen(false)
                }}
              >
                تصدير
              </button>
            </div>
          </div>
        </div>
      )}

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
            onDragOver={handleDragOver}
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
