import { useParams, Link, useNavigate } from 'react-router-dom'
import { useState, useEffect, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import { requestsService } from '../services/requestsService'
import { banksService } from '../services/banksService'
import { formatDateTime, getRelativeTime } from '../utils/dateUtils'
import { RequestStatus, Comment } from '../types'
import { 
  ArrowLeftIcon, 
  ClockIcon,
  UserIcon,
  ChatBubbleLeftIcon,
  ArrowRightIcon,
  BanknotesIcon,
  PhoneIcon,
  EnvelopeIcon,
  PencilIcon,
  BuildingLibraryIcon,
  // CalendarDaysIcon,
  CurrencyDollarIcon,
  LinkIcon,
  XCircleIcon,
  MagnifyingGlassIcon,
  PaperAirplaneIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline'
import { RajhiFinancingCalculator } from '../components/RajhiFinancingCalculator'
import toast from 'react-hot-toast'
import { attachmentsService } from '../services/attachmentsService'
import { generateEradExcel, generateOfferExcel, generateCarHandoverExcel } from '../utils/excelExport'
import { inventoryService } from '../services/inventoryService'
import { useQuery as useInventoryQuery } from 'react-query'
import MoveRequestModal from '../components/MoveRequestModal'

export default function RequestDetails() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [quickCost, setQuickCost] = useState<string>('')
  const [supportPct, setSupportPct] = useState<string>('')
  const [vin, setVin] = useState<string>('')
  const [showInventoryModal, setShowInventoryModal] = useState(false)
  const [linkedCar, setLinkedCar] = useState<Record<string, any> | null>(null)
  const [inventorySearchTerm, setInventorySearchTerm] = useState('')
  const [inventoryFilterColor, setInventoryFilterColor] = useState('')
  const [inventoryFilterStatus, setInventoryFilterStatus] = useState('')
  const [showHandoverModal, setShowHandoverModal] = useState(false)
  const [handoverData, setHandoverData] = useState({
    branch: '',
    warehouse: '',
    clientName: '',
    clientIdNumber: '',
    nationality: '',
    manufacturer: '',
    carType: '',
    carCategory: '',
    plateNumber: '',
  })
  const [commentText, setCommentText] = useState('')
  const [showMoveModal, setShowMoveModal] = useState(false)
  const [targetStatus, setTargetStatus] = useState<RequestStatus | null>(null)

  const installmentSummaryRef = useRef<HTMLDivElement | null>(null)
  const installmentSummaryTextRef = useRef<string>('')

  const handleCopyInstallmentSummary = async () => {
    const generatedText = installmentSummaryTextRef.current?.trim() || ''
    const domText = installmentSummaryRef.current?.innerText?.trim() || ''
    const content = generatedText || domText
    if (!content) {
      toast.error('لا يوجد محتوى لنسخه')
      return
    }

    const fallbackCopy = () => {
      const textarea = document.createElement('textarea')
      textarea.value = content
      textarea.style.position = 'fixed'
      textarea.style.opacity = '0'
      document.body.appendChild(textarea)
      textarea.focus()
      textarea.select()
      const successful = document.execCommand('copy')
      document.body.removeChild(textarea)
      return successful
    }

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(content)
        toast.success('تم نسخ ملخص التقسيط')
        return
      }
      if (fallbackCopy()) {
        toast.success('تم نسخ ملخص التقسيط')
        return
      }
      throw new Error('Clipboard API غير مدعوم')
    } catch (error) {
      if (fallbackCopy()) {
        toast.success('تم نسخ ملخص التقسيط')
      } else {
        toast.error('تعذر نسخ الملخص تلقائيًا، حاول النسخ يدويًا')
      }
    }
  }
  
  const { data: request, isLoading } = useQuery(
    ['request', id],
    () => requestsService.getRequest(id!),
    { enabled: !!id }
  )

  const { data: banksData } = useQuery('banks', banksService.getBanks)

  // Load inventory data
  const { data: inventoryData } = useInventoryQuery(
    'inventory',
    async () => {
      try {
        const result = await inventoryService.getInventory()
        return result
      } catch (error) {
        return { headers: [], data: [] }
      }
    }
  )

  // Initialize VIN from existing customFields, but do not override user typing
  useEffect(() => {
    if (request) {
      const cf = request.customFields ? (typeof request.customFields === 'string' ? JSON.parse(request.customFields) : request.customFields) : {}
      if (vin === '' && cf?.vin) setVin(cf.vin)
      if (cf?.quickCost !== undefined && quickCost === '') setQuickCost(String(cf.quickCost))
      if (cf?.supportPct !== undefined && supportPct === '') setSupportPct(String(cf.supportPct))
      // Load linked car data
      if (cf?.linkedCarItemNumber && inventoryData?.data) {
        const headers = inventoryData.headers || []
        const itemNumberHeader = headers.find(h => h.includes('رقم الصنف') || h.includes('رقم'))
        if (itemNumberHeader) {
          const car = inventoryData.data.find(row => String(row[itemNumberHeader] || '') === String(cf.linkedCarItemNumber))
          if (car) {
            setLinkedCar(car)
          }
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [request, inventoryData])
  const attachmentsQuery = useQuery(
    ['attachments', id],
    () => attachmentsService.getByRequest(id!),
    { enabled: !!id }
  )

  const uploadMutation = useMutation(
    ({ file, title }: { file: File; title?: string }) => attachmentsService.uploadToRequest(id!, file, title),
    {
      onSuccess: () => {
        toast.success('تم رفع المرفق')
        queryClient.invalidateQueries(['attachments', id])
        queryClient.invalidateQueries(['request', id])
      },
      onError: (error: any) => {
        toast.error(error?.response?.data?.message || 'تعذر رفع المرفق')
      },
    }
  )

  const deleteAttachmentMutation = useMutation(
    (attachmentId: string) => attachmentsService.deleteAttachment(attachmentId),
    {
      onSuccess: () => {
        toast.success('تم حذف المرفق')
        queryClient.invalidateQueries(['attachments', id])
        queryClient.invalidateQueries(['request', id])
      },
    }
  )

  // Generic save custom fields (merge into existing customFields)
  const saveCustomFieldsMutation = useMutation(
    async (partial: Record<string, any>) => {
      const cf = request?.customFields ? (typeof request.customFields === 'string' ? JSON.parse(request.customFields) : request.customFields) : {}
      const newCustomFields = { ...cf, ...partial }
      return requestsService.updateRequest(id!, { customFields: JSON.stringify(newCustomFields) })
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['request', id])
      },
    }
  )

  // Save VIN (store in customFields)
  const saveVinMutation = useMutation(
    async (newVin: string) => {
      const cf = request?.customFields ? (typeof request.customFields === 'string' ? JSON.parse(request.customFields) : request.customFields) : {}
      const newCustomFields = { ...cf, vin: newVin }
      return requestsService.updateRequest(id!, { customFields: JSON.stringify(newCustomFields) })
    },
    {
      onSuccess: () => {
        toast.success('تم حفظ رقم الهيكل')
        queryClient.invalidateQueries(['request', id])
      },
      onError: (error: any) => {
        toast.error(error?.response?.data?.message || 'تعذر حفظ رقم الهيكل')
      },
    }
  )

  // Save linked car (store item number in customFields)
  const saveLinkedCarMutation = useMutation(
    async ({ carItemNumber, carData }: { carItemNumber: string, carData: Record<string, any> }) => {
      const cf = request?.customFields ? (typeof request.customFields === 'string' ? JSON.parse(request.customFields) : request.customFields) : {}
      const newCustomFields = { ...cf, linkedCarItemNumber: carItemNumber, linkedCarData: carData }
      return requestsService.updateRequest(id!, { customFields: JSON.stringify(newCustomFields) })
    },
    {
      onSuccess: () => {
        toast.success('تم ربط السيارة بالطلب')
        queryClient.invalidateQueries(['request', id])
        setShowInventoryModal(false)
      },
      onError: (error: any) => {
        toast.error(error?.response?.data?.message || 'تعذر ربط السيارة')
      },
    }
  )

  // Handle car selection from inventory modal
  const handleSelectCar = (car: Record<string, any>) => {
    if (!inventoryData?.headers) return
    const headers = inventoryData.headers
    const itemNumberHeader = headers.find(h => h.includes('رقم الصنف') || h.includes('رقم'))
    if (itemNumberHeader && car[itemNumberHeader]) {
      const itemNumber = String(car[itemNumberHeader])
      saveLinkedCarMutation.mutate({ carItemNumber: itemNumber, carData: car })
      setLinkedCar(car)
      setVin(itemNumber) // Update VIN field with item number
    } else {
      toast.error('لم يتم العثور على رقم الصنف في بيانات السيارة')
    }
  }

  // Auto-save quickCost and supportPct with debounce
  useEffect(() => {
    if (!request) return
    const t = setTimeout(() => {
      const payload: Record<string, any> = {}
      if (quickCost !== '') payload.quickCost = Number(quickCost)
      if (supportPct !== '') payload.supportPct = Number(supportPct)
      if (Object.keys(payload).length > 0) {
        saveCustomFieldsMutation.mutate(payload)
      }
    }, 600)
    return () => clearTimeout(t)
  }, [quickCost, supportPct, request])

  const deleteMutation = useMutation(
    () => requestsService.deleteRequest(id!),
    {
      onSuccess: () => {
        toast.success('تم حذف الطلب بنجاح')
        queryClient.invalidateQueries('kanbanData')
        navigate('/requests')
      },
      onError: (error: any) => {
        toast.error(error?.response?.data?.message || 'تعذر حذف الطلب')
      },
    }
  )

  // Add comment mutation
  const addCommentMutation = useMutation(
    (text: string) => requestsService.addComment(id!, text),
    {
      onSuccess: () => {
        toast.success('تم إضافة التعليق بنجاح')
        setCommentText('')
        queryClient.invalidateQueries(['request', id])
      },
      onError: (error: any) => {
        toast.error(error?.response?.data?.message || 'تعذر إضافة التعليق')
      },
    }
  )

  // Move request mutation
  const moveRequestMutation = useMutation(
    ({ toStatus, comment }: { toStatus: RequestStatus, comment?: string }) => 
      requestsService.moveRequest(id!, { toStatus, comment }),
    {
      onSuccess: () => {
        toast.success('تم نقل الطلب بنجاح')
        setShowMoveModal(false)
        setTargetStatus(null)
        queryClient.invalidateQueries(['request', id])
        queryClient.invalidateQueries('kanbanData')
      },
      onError: (error: any) => {
        toast.error(error?.response?.data?.message || 'تعذر نقل الطلب')
      },
    }
  )

  if (isLoading) {
    return <div className="text-center py-8">جاري التحميل...</div>
  }

  if (!request) {
    return <div className="text-center py-8">الطلب غير موجود</div>
  }

  // Parse custom fields for cash requests
  const customFields = request.customFields 
    ? (typeof request.customFields === 'string' ? JSON.parse(request.customFields) : request.customFields)
    : null

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      'NOT_ANSWERED': 'bg-red-100 text-red-800 border-red-200',
      'AWAITING_CLIENT': 'bg-yellow-100 text-yellow-800 border-yellow-200',
      'FOLLOW_UP': 'bg-blue-100 text-blue-800 border-blue-200',
      'AWAITING_DOCS': 'bg-orange-100 text-orange-800 border-orange-200',
      'AWAITING_BANK_REP': 'bg-purple-100 text-purple-800 border-purple-200',
      'SOLD': 'bg-green-100 text-green-800 border-green-200',
      'NOT_SOLD': 'bg-gray-100 text-gray-800 border-gray-200',
    }
    return colors[status] || 'bg-gray-100 text-gray-800 border-gray-200'
  }

  const getStatusTitle = (status: string) => {
    const titles: Record<string, string> = {
      'NOT_ANSWERED': 'عميل لم يتم الرد',
      'AWAITING_CLIENT': 'بانتظار رد العميل',
      'FOLLOW_UP': 'في المتابعة',
      'AWAITING_DOCS': 'بانتظار الأوراق',
      'AWAITING_BANK_REP': 'بانتظار رد مندوب البنك',
      'SOLD': 'تم البيع',
      'NOT_SOLD': 'لم يتم البيع',
    }
    return titles[status] || status
  }

  // Define status order for the navigation bar
  const statusOrder: RequestStatus[] = [
    RequestStatus.AWAITING_CLIENT,
    RequestStatus.FOLLOW_UP,
    RequestStatus.AWAITING_DOCS,
    RequestStatus.AWAITING_BANK_REP,
    RequestStatus.SOLD,
    RequestStatus.NOT_SOLD,
  ]

  const handleStageClick = (status: RequestStatus) => {
    if (status === request.currentStatus) return
    setTargetStatus(status)
    setShowMoveModal(true)
  }

  const handleMoveRequest = (comment?: string) => {
    if (targetStatus) {
      moveRequestMutation.mutate({ toStatus: targetStatus, comment })
    }
  }

  return (
    <div>
      <div className="mb-6">
        <Link
          to="/requests"
          className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700"
        >
          <ArrowLeftIcon className="h-4 w-4 ml-1" />
          العودة للطلبات
        </Link>
      </div>

      {/* Stage Navigation Bar */}
      {request && (
        <div className="mb-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-end gap-0 overflow-x-auto pb-2" dir="rtl">
              <div className="flex items-center min-w-max">
                {statusOrder.map((status, index) => {
                  const currentStatusIndex = statusOrder.indexOf(request.currentStatus as RequestStatus)
                  const isActive = status === request.currentStatus
                  const isCompleted = currentStatusIndex > index
                  const isClickable = !isActive && !moveRequestMutation.isLoading
                  
                  return (
                    <div key={status} className="flex items-center">
                      {/* Stage Card */}
                      <button
                        onClick={() => isClickable && handleStageClick(status)}
                        disabled={!isClickable}
                        className={`
                          relative flex flex-col items-center justify-center
                          min-w-[160px] max-w-[180px] px-5 py-4 rounded-lg
                          text-sm font-medium transition-all duration-200
                          border-2
                          ${isActive 
                            ? 'bg-blue-50 border-blue-400 text-blue-700 shadow-md hover:bg-blue-100' 
                            : isCompleted
                            ? 'bg-blue-50 border-blue-300 text-blue-600 hover:bg-blue-100 cursor-pointer'
                            : 'bg-gray-50 border-gray-200 text-gray-500 hover:bg-gray-100 hover:border-gray-300 cursor-pointer'
                          }
                          ${!isClickable ? 'cursor-not-allowed opacity-70' : ''}
                          ${isClickable ? 'hover:shadow-lg' : ''}
                        `}
                        title={isActive ? 'المرحلة الحالية' : isCompleted ? 'مرحلة مكتملة - انقر للتغيير' : `انقر لنقل الطلب إلى: ${getStatusTitle(status)}`}
                      >
                        {/* Stage Icon */}
                        <div className={`
                          flex items-center justify-center mb-2
                          ${isActive ? 'text-blue-600' : isCompleted ? 'text-blue-500' : 'text-gray-400'}
                        `}>
                          {isCompleted ? (
                            <CheckCircleIcon className="h-6 w-6" />
                          ) : isActive ? (
                            <div className="h-6 w-6 rounded-full bg-blue-500 flex items-center justify-center">
                              <div className="h-3 w-3 rounded-full bg-white" />
                            </div>
                          ) : (
                            <div className="h-6 w-6 rounded-full border-2 border-gray-300 bg-white" />
                          )}
                        </div>
                        
                        {/* Stage Title */}
                        <span className={`
                          text-center leading-tight px-2
                          ${isActive ? 'font-bold text-blue-700' : isCompleted ? 'font-semibold text-blue-600' : 'font-normal text-gray-500'}
                        `}>
                          {getStatusTitle(status)}
                        </span>
                      </button>
                      
                      {/* Connector Line with Arrow */}
                      {index < statusOrder.length - 1 && (
                        <div className="flex items-center mx-2">
                          {/* Line before arrow */}
                          <div className={`
                            h-0.5 w-16
                            ${isCompleted ? 'bg-blue-400' : 'bg-gray-300'}
                          `} />
                          {/* Arrow */}
                          <div className={`
                            flex items-center justify-center
                            ${isCompleted ? 'text-blue-400' : 'text-gray-300'}
                          `}>
                            <ArrowRightIcon className="h-4 w-4" />
                          </div>
                          {/* Line after arrow */}
                          <div className={`
                            h-0.5 w-16
                            ${isCompleted ? 'bg-blue-400' : 'bg-gray-300'}
                          `} />
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* معلومات الطلب الأساسية */}
          <div className="card">
            <div className="card-header bg-gradient-to-r from-primary-50 to-blue-50">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h1 className="text-2xl font-bold text-gray-900 mb-2">{request.title}</h1>
                  <div className="flex items-center gap-3">
                    <span className={`inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-bold border-2 ${getStatusColor(request.currentStatus)}`}>
                      {getStatusTitle(request.currentStatus)}
                    </span>
                    <span className="inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-bold bg-blue-100 text-blue-800 border-2 border-blue-200">
                      {request.type === 'CASH' ? '💵 كاش' : '💳 تقسيط'}
                    </span>
                    {(() => {
                      const cf = request.customFields ? (typeof request.customFields === 'string' ? JSON.parse(request.customFields) : request.customFields) : {}
                      return cf?.vin ? (
                        <span className="inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-bold bg-gray-100 text-gray-800 border-2 border-gray-200" title="رقم الهيكل">
                          رقم الهيكل: {cf.vin}
                        </span>
                      ) : null
                    })()}
                  </div>
                </div>
                {request.price && (
                  <div className="bg-white rounded-lg px-4 py-3 shadow-sm border-2 border-green-200">
                    <div className="flex items-center gap-2">
                      <BanknotesIcon className="h-6 w-6 text-green-600" />
                      <div>
                        <p className="text-xs text-gray-500">المبلغ</p>
                        <p className="text-xl font-bold text-green-700">
                          {request.price.toLocaleString()} ريال
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className="card-body">
              <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
                <div>
                  <dt className="text-sm font-medium text-gray-500">الحالة الأولية</dt>
                  <dd className="mt-1">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-sm font-medium border ${getStatusColor(request.initialStatus)}`}>
                      {getStatusTitle(request.initialStatus)}
                    </span>
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">تاريخ الإنشاء</dt>
                  <dd className="mt-1 text-sm text-gray-900">{formatDateTime(request.createdAt)}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">آخر تحديث</dt>
                  <dd className="mt-1 text-sm text-gray-900">{formatDateTime(request.updatedAt)}</dd>
                </div>
                {request.assignedTo && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500">المسؤول</dt>
                    <dd className="mt-1 text-sm text-gray-900">{request.assignedTo.name}</dd>
                  </div>
                )}
                <div className="sm:col-span-2">
                  <dt className="text-sm font-medium text-gray-500">تم الإنشاء بواسطة</dt>
                  <dd className="mt-1 text-sm text-gray-900">{request.createdBy?.name}</dd>
                </div>
              </dl>
            </div>
          </div>

          {/* تفاصيل الكاش */}
          {request.type === 'CASH' && customFields && (
            <div className="card">
              <div className="card-header bg-gradient-to-r from-green-50 to-emerald-50">
                <h3 className="text-lg font-medium text-gray-900">💵 تفاصيل الكاش</h3>
              </div>
              <div className="card-body">
                {customFields.carName && (
                  <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-xs text-blue-600 mb-1">السيارة المطلوبة</p>
                    <p className="text-lg font-bold text-blue-900">{customFields.carName}</p>
                  </div>
                )}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 mb-6">
                  <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                    <p className="text-xs text-gray-500 mb-1">سعر السيارة بطاقة 🚗</p>
                    <p className="text-lg font-bold text-gray-900">{(customFields.carPrice || 0).toLocaleString()} ريال</p>
                  </div>
                  
                  <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                    <p className="text-xs text-gray-500 mb-1">سعر اللوح 🔖</p>
                    <p className="text-lg font-bold text-gray-900">{(customFields.platePrice || 0).toLocaleString()} ريال</p>
                  </div>
                  
                  <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                    <p className="text-xs text-gray-500 mb-1">سعر الشحن 🚚</p>
                    <p className="text-lg font-bold text-gray-900">{(customFields.shippingPrice || 0).toLocaleString()} ريال</p>
                  </div>
                  
                  <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                    <p className="text-xs text-gray-500 mb-1">زيادة إضافية ➕</p>
                    <p className="text-lg font-bold text-gray-900">{(customFields.additionalPrice || 0).toLocaleString()} ريال</p>
                  </div>
                </div>

                <div className="space-y-3 border-t-2 border-gray-300 pt-4">
                  <div className="flex justify-between py-2 px-3 bg-gray-50 rounded-lg">
                    <span className="text-sm text-gray-700">الضريبة (15%)</span>
                    <span className="font-bold text-orange-600">{(customFields.tax || 0).toLocaleString()} ريال</span>
                  </div>
                  
                  <div className="flex justify-between py-3 px-3 bg-green-100 rounded-lg border-2 border-green-300">
                    <span className="text-sm font-bold text-green-900">شامل اللوح (بدون ضريبة)</span>
                    <span className="font-bold text-green-700 text-xl">{(customFields.totalWithPlateNoTax || 0).toLocaleString()} ريال</span>
                  </div>
                  
                  <div className="flex justify-between py-3 px-3 bg-blue-100 rounded-lg border-2 border-blue-400 shadow-lg">
                    <span className="text-base font-bold text-blue-900">السعر النهائي (شامل كل شيء)</span>
                    <span className="font-bold text-blue-700 text-2xl">{(customFields.totalWithPlateAndTax || 0).toLocaleString()} ريال</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* تفاصيل التقسيط */}
          {request.type === 'INSTALLMENT' && request.installmentDetails && (
            <div className="space-y-6">
              {/* بيانات التقسيط الأساسية */}
              <div className="card">
                <div className="card-header bg-gradient-to-r from-purple-50 to-blue-50 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CurrencyDollarIcon className="h-5 w-5 text-purple-600" />
                    <h3 className="text-lg font-medium text-gray-900">💳 تفاصيل التقسيط</h3>
                  </div>
                  <Link
                    to={`/requests/${id}/edit`}
                    className="btn-outline btn-sm flex items-center gap-2"
                  >
                    <PencilIcon className="h-4 w-4" />
                    تعديل
                  </Link>
                </div>
                <div className="card-body space-y-6">
                  {/* صف 1: بيانات العميل + الالتزامات */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {/* بيانات العميل الإضافية */}
                    <div className="border-2 border-purple-200 rounded-lg p-4 bg-purple-50">
                      <h4 className="text-sm font-bold text-purple-900 mb-3">📋 بيانات العميل الإضافية</h4>
                      <div className="space-y-3">
                      {request.installmentDetails.carName && (
                          <div>
                            <p className="text-xs text-purple-600 mb-1">السيارة المطلوبة 🚗</p>
                            <p className="text-base font-semibold text-purple-900">{request.installmentDetails.carName}</p>
                        </div>
                      )}
                      
                      {request.installmentDetails.workOrganization && (
                          <div>
                          <p className="text-xs text-purple-600 mb-1">جهة العمل 💼</p>
                            <p className="text-base font-semibold text-purple-900">
                            {request.installmentDetails.workOrganization === 'COMPANY' && 'شركة'}
                            {request.installmentDetails.workOrganization === 'PRIVATE_APPROVED' && 'خاص معتمد'}
                            {request.installmentDetails.workOrganization === 'PRIVATE_UNAPPROVED' && 'خاص غير معتمد'}
                            {request.installmentDetails.workOrganization === 'GOVERNMENT' && 'حكومي'}
                            {request.installmentDetails.workOrganization === 'MILITARY' && 'عسكري'}
                            {request.installmentDetails.workOrganization === 'RETIRED' && 'متقاعد'}
                            {!['COMPANY', 'PRIVATE_APPROVED', 'PRIVATE_UNAPPROVED', 'GOVERNMENT', 'MILITARY', 'RETIRED'].includes(request.installmentDetails.workOrganization) && request.installmentDetails.workOrganization}
                          </p>
                        </div>
                      )}
                      
                      {request.installmentDetails.age && (
                          <div>
                            <p className="text-xs text-purple-600 mb-1">العمر 🎂</p>
                            <p className="text-base font-semibold text-purple-900">{request.installmentDetails.age} سنة</p>
                        </div>
                      )}
                      
                      {request.installmentDetails.salary && (
                          <div>
                            <p className="text-xs text-purple-600 mb-1">مبلغ الراتب 💰</p>
                            <p className="text-base font-semibold text-purple-900">{Number(request.installmentDetails.salary).toLocaleString()} ريال</p>
                        </div>
                      )}

                      {request.installmentDetails.salaryBank && (
                          <div>
                            <p className="text-xs text-purple-600 mb-1">بنك الراتب 🏛️</p>
                            <p className="text-base font-semibold text-purple-900">{request.installmentDetails.salaryBank.name}</p>
                        </div>
                      )}

                      {request.installmentDetails.financingBank && (
                          <div>
                            <p className="text-xs text-purple-600 mb-1">البنك المختار للتمويل 🏦</p>
                            <p className="text-base font-semibold text-purple-900">{request.installmentDetails.financingBank.name}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* الالتزامات */}
                  {(request.installmentDetails.deductionPercentage || 
                    request.installmentDetails.obligation1 || 
                    request.installmentDetails.obligation2 || 
                      request.installmentDetails.visaAmount ||
                      request.installmentDetails.deductedAmount ||
                      request.installmentDetails.finalAmount) && (
                      <div className="border-2 border-orange-200 rounded-lg p-4 bg-orange-50">
                        <h4 className="text-sm font-bold text-orange-900 mb-3">📊 الالتزامات</h4>
                        <div className="space-y-3">
                        {request.installmentDetails.deductionPercentage && (
                            <div>
                              <p className="text-xs text-orange-600 mb-1">نسبة الاستقطاع</p>
                              <p className="text-base font-semibold text-orange-900">{request.installmentDetails.deductionPercentage}%</p>
                          </div>
                        )}

                        {request.installmentDetails.obligation1 && (
                            <div>
                            <p className="text-xs text-orange-600 mb-1">التزام 1</p>
                              <p className="text-base font-semibold text-orange-900">{Number(request.installmentDetails.obligation1).toLocaleString()} ريال</p>
                          </div>
                        )}

                        {request.installmentDetails.obligation2 && (
                            <div>
                            <p className="text-xs text-orange-600 mb-1">التزام 2</p>
                              <p className="text-base font-semibold text-orange-900">{Number(request.installmentDetails.obligation2).toLocaleString()} ريال</p>
                          </div>
                        )}

                        {request.installmentDetails.visaAmount && (
                            <div>
                              <p className="text-xs text-orange-600 mb-1">الفيزا 💳</p>
                              <p className="text-base font-semibold text-orange-900">{Number(request.installmentDetails.visaAmount).toLocaleString()} ريال</p>
                          </div>
                        )}

                        {request.installmentDetails.deductedAmount && (
                            <div>
                              <p className="text-xs text-orange-600 mb-1">المبلغ المستقطع</p>
                              <p className="text-base font-semibold text-orange-900">{Number(request.installmentDetails.deductedAmount).toLocaleString()} ريال</p>
                          </div>
                        )}

                        {request.installmentDetails.finalAmount && (
                            <div>
                              <p className="text-xs text-orange-600 mb-1">المبلغ النهائي بعد الالتزامات</p>
                              <p className="text-base font-semibold text-orange-900">{Number(request.installmentDetails.finalAmount).toLocaleString()} ريال</p>
                          </div>
                        )}
                      </div>
                      
                      {/* المعادلات الحسابية */}
                      {(request.installmentDetails.salary || request.installmentDetails.deductedAmount || request.installmentDetails.finalAmount) && (
                          <div className="mt-4 bg-white rounded-lg p-3 border border-orange-300">
                            <h5 className="text-xs font-bold text-orange-900 mb-2">🧮 المعادلات:</h5>
                            <div className="space-y-1 text-xs text-gray-600">
                            {request.installmentDetails.salary && request.installmentDetails.deductionPercentage && (
                              <div className="flex justify-between items-center">
                                  <span>الراتب × {request.installmentDetails.deductionPercentage}%:</span>
                                  <span className="font-bold text-blue-600">{Number(request.installmentDetails.deductedAmount).toLocaleString()} ريال</span>
                              </div>
                            )}
                            
                            {(request.installmentDetails.obligation1 || request.installmentDetails.obligation2 || request.installmentDetails.visaAmount) && (
                                <div className="flex justify-between items-center border-t pt-1">
                                  <span>إجمالي الالتزامات:</span>
                                  <span className="font-bold text-red-600">
                                    {Math.round(Number(request.installmentDetails.obligation1 || 0) + Number(request.installmentDetails.obligation2 || 0) + Number(request.installmentDetails.visaAmount || 0) * 0.05).toLocaleString()} ريال
                                </span>
                              </div>
                            )}
                            
                              {request.installmentDetails.finalAmount && (
                                <div className="flex justify-between items-center border-t pt-1">
                                  <span>المبلغ المسموح:</span>
                                  <span className="font-bold text-green-700">{Number(request.installmentDetails.finalAmount).toLocaleString()} ريال</span>
                              </div>
                            )}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* صف 2: تفاصيل سعر السيارة + تحليل ايراد سريع */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {/* تفاصيل سعر السيارة */}
                    {(request.installmentDetails.carPrice || 
                      request.installmentDetails.additionalFees || 
                      request.installmentDetails.shipping ||
                      request.installmentDetails.registration ||
                      request.installmentDetails.otherAdditions ||
                      request.installmentDetails.plateNumber) && (
                      <div className="border-2 border-green-200 rounded-lg p-4 bg-green-50">
                        <h4 className="text-sm font-bold text-green-900 mb-3">🚗 تفاصيل سعر السيارة</h4>
                        <div className="space-y-2">
                          {request.installmentDetails.carPrice && (
                            <div className="flex justify-between items-center">
                              <span className="text-xs text-green-700">سعر السيارة الأساسي</span>
                              <span className="text-sm font-semibold text-green-900">{Number(request.installmentDetails.carPrice).toLocaleString()} ريال</span>
                              </div>
                            )}
                          {request.installmentDetails.additionalFees && (
                            <div className="flex justify-between items-center">
                              <span className="text-xs text-green-700">زيادة إضافية</span>
                              <span className="text-sm font-semibold text-green-900">{Number(request.installmentDetails.additionalFees).toLocaleString()} ريال</span>
                          </div>
                          )}
                          {request.installmentDetails.shipping && (
                            <div className="flex justify-between items-center">
                              <span className="text-xs text-green-700">الشحن</span>
                              <span className="text-sm font-semibold text-green-900">{Number(request.installmentDetails.shipping).toLocaleString()} ريال</span>
                        </div>
                      )}
                          {request.installmentDetails.registration && (
                            <div className="flex justify-between items-center">
                              <span className="text-xs text-green-700">التجيير</span>
                              <span className="text-sm font-semibold text-green-900">{Number(request.installmentDetails.registration).toLocaleString()} ريال</span>
                    </div>
                  )}
                          {request.installmentDetails.otherAdditions && (
                            <div className="flex justify-between items-center">
                              <span className="text-xs text-green-700">زيادة أخرى</span>
                              <span className="text-sm font-semibold text-green-900">{Number(request.installmentDetails.otherAdditions).toLocaleString()} ريال</span>
                            </div>
                          )}
                          {request.installmentDetails.plateNumber && (
                            <div className="flex justify-between items-center border-t pt-2">
                              <span className="text-xs text-green-700 font-bold">اللوح</span>
                              <span className="text-sm font-bold text-green-900">{Number(request.installmentDetails.plateNumber).toLocaleString()} ريال</span>
                            </div>
                          )}
                          {(() => {
                            const carPrice = Number(request.installmentDetails.carPrice || 0)
                            const additionalFees = Number(request.installmentDetails.additionalFees || 0)
                            const shipping = Number(request.installmentDetails.shipping || 0)
                            const registration = Number(request.installmentDetails.registration || 0)
                            const otherAdditions = Number(request.installmentDetails.otherAdditions || 0)
                            const plateNumber = Number(request.installmentDetails.plateNumber || 0)
                            const subtotal = carPrice + additionalFees + shipping + registration + otherAdditions
                            const tax = subtotal * 0.15
                            const totalWithTax = subtotal + tax
                            const finalPriceWithTaxAndPlate = totalWithTax + plateNumber
                            const priceWithPlateNoTax = subtotal + plateNumber
                            return (
                              <>
                                <div className="flex justify-between items-center border-t pt-2">
                                  <span className="text-xs text-green-700">الإجمالي بدون ضريبة</span>
                                  <span className="text-sm font-semibold text-green-900">{priceWithPlateNoTax.toLocaleString()} ريال</span>
                                </div>
                                <div className="flex justify-between items-center">
                                  <span className="text-xs text-green-700">الضريبة 15%</span>
                                  <span className="text-sm font-semibold text-green-900">{Math.round(tax).toLocaleString()} ريال</span>
                                </div>
                                <div className="flex justify-between items-center bg-green-100 px-2 py-1 rounded">
                                  <span className="text-xs text-green-900 font-bold">الإجمالي النهائي</span>
                                  <span className="text-sm font-bold text-green-900">{finalPriceWithTaxAndPlate.toLocaleString()} ريال</span>
                                </div>
                              </>
                            )
                          })()}
                        </div>
                      </div>
                    )}

                    {/* تحليل ايراد سريع */}
                    {(() => {
                      const cf = request.customFields ? (typeof request.customFields === 'string' ? JSON.parse(request.customFields) : request.customFields) : {}
                      const quickCost = cf?.quickCost || 0
                      const supportPct = cf?.supportPct || 0
                      const carPrice = Number(request.installmentDetails.carPrice || 0)
                      const additionalFees = Number(request.installmentDetails.additionalFees || 0)
                      const shipping = Number(request.installmentDetails.shipping || 0)
                      const registration = Number(request.installmentDetails.registration || 0)
                      const otherAdditions = Number(request.installmentDetails.otherAdditions || 0)
                      const plateNumber = Number(request.installmentDetails.plateNumber || 0)
                      const priceWithPlateNoTax = carPrice + additionalFees + shipping + registration + otherAdditions + plateNumber
                      const supportAmount = priceWithPlateNoTax * 1.15 * (supportPct / 100)
                      // عمولة البائع: 300 للتقسيط، 200 للكاش
                      const sellerCommission = request.type === 'INSTALLMENT' ? 300 : 200
                      // مصروفات البيع (بدون عمولة البائع)
                      const expensesWithoutCommission = registration + shipping + plateNumber + otherAdditions + supportAmount
                      // مصروفات البيع (شاملة عمولة البائع)
                      const expenses = expensesWithoutCommission + sellerCommission
                      const net = priceWithPlateNoTax - quickCost - expenses
                      const pct = priceWithPlateNoTax > 0 ? (net / priceWithPlateNoTax) * 100 : 0
                      
                      if (priceWithPlateNoTax === 0) return null
                      
                      return (
                        <div className="border-2 border-yellow-300 rounded-lg p-4 bg-yellow-50">
                          <h4 className="text-sm font-bold text-yellow-900 mb-3">💰 تحليل ايراد سريع</h4>
                          <div className="space-y-2">
                            <div className="flex justify-between items-center">
                              <span className="text-xs text-yellow-700">سعر البيع (تلقائي)</span>
                              <span className="text-sm font-semibold text-yellow-900">{Math.round(priceWithPlateNoTax).toLocaleString()} ريال</span>
                      </div>
                            {quickCost > 0 && (
                              <div className="flex justify-between items-center">
                                <span className="text-xs text-yellow-700">سعر التكلفة</span>
                                <span className="text-sm font-semibold text-yellow-900">{Number(quickCost).toLocaleString()} ريال</span>
                    </div>
                            )}
                            <div className="grid grid-cols-2 gap-2">
                              <div className="flex justify-between items-center">
                                <span className="text-[10px] text-yellow-600">مصروفات البيع</span>
                                <span className="text-xs font-semibold text-yellow-800">{Math.round(expensesWithoutCommission).toLocaleString()} ريال</span>
                              </div>
                              <div className="flex justify-between items-center">
                                <span className="text-[10px] text-yellow-600">عمولة البائع</span>
                                <span className="text-xs font-semibold text-yellow-800">{sellerCommission.toLocaleString()} ريال</span>
                              </div>
                            </div>
                            <div className="flex justify-between items-center border-t pt-1">
                              <span className="text-xs text-yellow-700">إجمالي مصروفات البيع</span>
                              <span className="text-sm font-semibold text-yellow-900">{Math.round(expenses).toLocaleString()} ريال</span>
                            </div>
                            {(quickCost > 0 || expenses > 0) && (
                              <>
                                <div className="flex justify-between items-center border-t pt-2">
                                  <span className="text-xs text-yellow-700 font-bold">صافي الايراد (مبلغ)</span>
                                  <span className="text-sm font-bold text-yellow-900">{Math.round(net).toLocaleString()} ريال</span>
                                </div>
                                <div className="flex justify-between items-center bg-yellow-100 px-2 py-1 rounded">
                                  <span className="text-xs text-yellow-900 font-bold">صافي الايراد (نسبة)</span>
                                  <span className="text-sm font-bold text-yellow-900">{pct.toFixed(2)}%</span>
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                      )
                    })()}
                  </div>

                  {/* صف 3: معاملات التمويل */}
                  {(request.installmentDetails.financingBankId || 
                    request.installmentDetails.downPaymentPercentage || 
                    request.installmentDetails.finalPaymentPercentage ||
                    request.installmentDetails.profitMargin ||
                    request.installmentDetails.installmentMonths) && (
                    <div className="border-2 border-indigo-200 rounded-lg p-4 bg-indigo-50">
                      <h4 className="text-sm font-bold text-indigo-900 mb-3">🏦 معاملات التمويل</h4>
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {request.installmentDetails.financingBankId && (
                          <div className="bg-white rounded-lg p-3 border border-indigo-200">
                            <p className="text-xs text-indigo-600 mb-1">البنك المختار للتمويل</p>
                            <p className="text-base font-bold text-indigo-900">
                              {request.installmentDetails?.financingBankId === 'rajhi' 
                                ? 'بنك الراجحي' 
                                : banksData?.find(bank => bank.id === request.installmentDetails?.financingBankId)?.name || 'بنك غير محدد'}
                            </p>
                          </div>
                        )}

                        {request.installmentDetails.downPaymentPercentage && (
                          <div className="bg-white rounded-lg p-3 border border-indigo-200">
                            <p className="text-xs text-indigo-600 mb-1">نسبة الدفعة الأولى</p>
                            <p className="text-base font-bold text-indigo-900">{request.installmentDetails.downPaymentPercentage}%</p>
                          </div>
                        )}

                        {request.installmentDetails.finalPaymentPercentage && (
                          <div className="bg-white rounded-lg p-3 border border-indigo-200">
                            <p className="text-xs text-indigo-600 mb-1">نسبة الدفعة الأخيرة</p>
                            <p className="text-base font-bold text-indigo-900">{request.installmentDetails.finalPaymentPercentage}%</p>
                          </div>
                        )}

                        {request.installmentDetails.profitMargin && (
                          <div className="bg-white rounded-lg p-3 border border-indigo-200">
                            <p className="text-xs text-indigo-600 mb-1">هامش الربح السنوي</p>
                            <p className="text-base font-bold text-indigo-900">{request.installmentDetails.profitMargin}%</p>
                          </div>
                        )}

                        {request.installmentDetails.installmentMonths && (
                          <div className="bg-white rounded-lg p-3 border border-indigo-200">
                            <p className="text-xs text-indigo-600 mb-1">عدد أشهر التقسيط</p>
                            <p className="text-base font-bold text-indigo-900">{request.installmentDetails.installmentMonths} شهر</p>
                          </div>
                        )}

                        {request.installmentDetails.insurancePercentage && (
                          <div className="bg-white rounded-lg p-3 border border-indigo-200">
                            <p className="text-xs text-indigo-600 mb-1">نسبة التأمين</p>
                            <p className="text-base font-bold text-indigo-900">{request.installmentDetails.insurancePercentage}%</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* معادلات التمويل */}
              <div className="card" style={{ display: 'none' }}>
                <div className="card-header bg-gradient-to-r from-purple-50 to-indigo-50">
                  <div className="flex items-center gap-2">
                    <BuildingLibraryIcon className="h-5 w-5 text-purple-600" />
                    <h3 className="text-lg font-medium text-gray-900">🧮 معادلات التمويل</h3>
                  </div>
                </div>
                <div className="card-body">
                  {(() => {
                    // Check if the selected bank is Rajhi
                    const isRajhiBank = request.installmentDetails.financingBank?.name?.toLowerCase().includes('راجحي') || 
                                       request.installmentDetails.financingBank?.name?.toLowerCase().includes('rajhi') ||
                                       request.installmentDetails.financingBankId === 'rajhi'
                    
                    if (isRajhiBank) {
                      return (
                        <RajhiFinancingCalculator 
                          installmentDetails={{
                            carPrice: Number(request.installmentDetails.carPrice) || 0,
                            additionalFees: Number(request.installmentDetails.additionalFees) || 0,
                            shipping: Number(request.installmentDetails.shipping) || 0,
                            registration: Number(request.installmentDetails.registration) || 0,
                            otherAdditions: Number(request.installmentDetails.otherAdditions) || 0,
                            plateNumber: Number(request.installmentDetails.plateNumber) || 0,
                            insurancePercentage: request.installmentDetails.insurancePercentage || 0,
                            financingBankId: request.installmentDetails.financingBankId || '',
                            financingBank: request.installmentDetails.financingBank,
                            downPaymentPercentage: request.installmentDetails.downPaymentPercentage || 0,
                            finalPaymentPercentage: request.installmentDetails.finalPaymentPercentage || 0,
                            profitMargin: request.installmentDetails.profitMargin || 0,
                            installmentMonths: request.installmentDetails.installmentMonths || 60,
                          }}
                        />
                      )
                    } else if (request.installmentDetails.financingBank) {
                      // Calculate financing details for non-Rajhi banks
                      const calculateFinancing = () => {
                        const carPrice = Number(request.installmentDetails?.carPrice) || 0
                        const additionalFees = Number(request.installmentDetails?.additionalFees) || 0
                        const shipping = Number(request.installmentDetails?.shipping) || 0
                        const registration = Number(request.installmentDetails?.registration) || 0
                        const otherAdditions = Number(request.installmentDetails?.otherAdditions) || 0
                        const plateNumber = Number(request.installmentDetails?.plateNumber) || 0
                        const insurancePercentage = (request.installmentDetails?.insurancePercentage || 0) / 100
                        
                        const subtotal = carPrice + additionalFees + shipping + registration + otherAdditions
                        const taxOnSubtotal = subtotal * 0.15
                        const finalPriceWithTaxAndPlate = subtotal + taxOnSubtotal + plateNumber
                        const priceWithPlateNoTax = subtotal + plateNumber
                        
                        const downPaymentPercentage = (request.installmentDetails?.downPaymentPercentage || 0) / 100
                        const finalPaymentPercentage = (request.installmentDetails?.finalPaymentPercentage || 0) / 100
                        const installmentMonths = request.installmentDetails?.installmentMonths || 60
                        const profitMargin = (request.installmentDetails?.profitMargin || 0) / 100
                        
                        const downPayment = downPaymentPercentage * finalPriceWithTaxAndPlate
                        const finalPayment = finalPaymentPercentage * finalPriceWithTaxAndPlate
                        const financingAmount = finalPriceWithTaxAndPlate - downPayment
                        const adminFees = Math.round(Math.min(5000, financingAmount * 0.01) * 1.15)
                        const totalInsurancePerYear = ((financingAmount + adminFees) * insurancePercentage) + profitMargin
                        const monthlyInsurance = totalInsurancePerYear / 12
                        const years = installmentMonths / 12
                        const MarginTotal = (financingAmount + adminFees) * profitMargin * years
                        const monthlyInstallmentWithoutInsurance = (financingAmount + adminFees + MarginTotal - finalPayment) / installmentMonths
                        const monthlyInstallmentWithInsurance = monthlyInstallmentWithoutInsurance + monthlyInsurance
                        const totalAmountPaid = (monthlyInstallmentWithInsurance * installmentMonths) + downPayment + finalPayment + adminFees
                        
                        return {
                          priceWithPlateNoTax,
                          financingAmount,
                          downPayment,
                          adminFees,
                          monthlyInstallmentWithoutInsurance,
                          monthlyInsurance,
                          monthlyInstallment: monthlyInstallmentWithInsurance,
                          finalPayment,
                          totalAmountPaid,
                          installmentMonths
                        }
                      }
                      
                      const financing = calculateFinancing()
                      
                      return (
                        <div className="space-y-4">
                          {/* معلومات البنك */}
                          {request.installmentDetails.financingBank?.notes && (
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                              <h5 className="text-sm font-bold text-blue-900 mb-2">📝 ملاحظات البنك</h5>
                              <p className="text-sm text-blue-800 whitespace-pre-wrap">{request.installmentDetails.financingBank.notes}</p>
                            </div>
                          )}
                          
                          {/* نتائج التمويل */}
                          <div className="mt-4 p-4 bg-white rounded-lg border border-purple-300">
                            <h5 className="text-sm font-bold text-purple-800 mb-3">💳 نتائج التمويل</h5>
                            <div className="grid grid-cols-1 gap-3 text-sm">
                              <div className="grid grid-cols-2 gap-4">
                                <div className="p-2 bg-gray-50 rounded">
                                  <span className="text-gray-600">سعر السيارة (شامل اللوح بدون ضريبة):</span>
                                  <span className="font-bold text-blue-600 block">{financing.priceWithPlateNoTax.toLocaleString()} ريال</span>
                                </div>
                                <div className="p-2 bg-gray-50 rounded">
                                  <span className="text-gray-600">مبلغ التمويل:</span>
                                  <span className="font-bold text-green-600 block">{financing.financingAmount.toLocaleString()} ريال</span>
                                </div>
                              </div>
                              <div className="grid grid-cols-2 gap-4">
                                <div className="p-2 bg-gray-50 rounded">
                                  <span className="text-gray-600">الدفعة الأولى:</span>
                                  <span className="font-bold text-green-600 block">{Math.round(financing.downPayment).toLocaleString()} ريال</span>
                                </div>
                                <div className="p-2 bg-gray-50 rounded">
                                  <span className="text-gray-600">الرسوم الإدارية:</span>
                                  <span className="font-bold text-orange-600 block">{financing.adminFees.toLocaleString()} ريال</span>
                                </div>
                              </div>
                              <div className="grid grid-cols-2 gap-4">
                                <div className="p-2 bg-gray-50 rounded">
                                  <span className="text-gray-600">التأمين الشهري:</span>
                                  <span className="font-bold text-yellow-600 block">{Math.round(financing.monthlyInsurance).toLocaleString()} ريال</span>
                                </div>
                                <div className="p-2 bg-gray-50 rounded">
                                  <span className="text-gray-600">القسط الشهري بدون التأمين:</span>
                                  <span className="font-bold text-purple-600 block">{Math.round(financing.monthlyInstallmentWithoutInsurance).toLocaleString()} ريال</span>
                                </div>
                              </div>
                              <div className="p-3 bg-gradient-to-r from-purple-100 to-blue-100 rounded border-l-4 border-purple-500">
                                <div className="flex justify-between items-center">
                                  <span className="font-bold text-purple-800">القسط الشهري (مع التأمين):</span>
                                  <span className="font-bold text-purple-900 text-lg">
                                    {Math.round(financing.monthlyInstallment).toLocaleString()} ريال
                                  </span>
                                </div>
                              </div>
                              {financing.finalPayment > 0 && (
                                <div className="p-2 bg-blue-50 rounded">
                                  <span className="text-gray-600">الدفعة الأخيرة:</span>
                                  <span className="font-bold text-blue-600 block">{Math.round(financing.finalPayment).toLocaleString()} ريال</span>
                                </div>
                              )}
                              <div className="p-3 bg-gradient-to-r from-green-100 to-emerald-100 rounded border-l-4 border-green-500 mt-2">
                                <div className="text-sm">
                                  <div className="flex justify-between items-center mb-1">
                                    <span className="font-bold text-green-800">إجمالي المبلغ المدفوع:</span>
                                    <span className="font-bold text-green-900 text-lg">
                                      {Math.round(financing.totalAmountPaid).toLocaleString()} ريال
                                    </span>
                                  </div>
                                  <div className="text-xs text-gray-600 mt-2">
                                    * يشمل الدفعة الأولى + الأقساط الشهرية (مع التأمين) + الدفعة الأخيرة + الرسوم الإدارية
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      )
                    } else {
                      return null
                    }
                  })()}
                </div>
              </div>
            </div>
          )}

          {/* تحليل ايراد سريع */}
          {(() => {
            // Compute sale price and expenses based on type
            let sale = 0
            let expenses = 0
            let expensesWithoutCommission = 0
            // عمولة البائع: 300 للتقسيط، 200 للكاش
            const sellerCommission = request.type === 'INSTALLMENT' ? 300 : 200
            if (request.type === 'INSTALLMENT' && request.installmentDetails) {
              const d = request.installmentDetails
              const car = Number(d.carPrice || 0)
              const add = Number(d.additionalFees || 0)
              const ship = Number(d.shipping || 0)
              const reg = Number(d.registration || 0)
              const other = Number(d.otherAdditions || 0)
              const plate = Number(d.plateNumber || 0)
              sale = car + add + ship + reg + other + plate - plate // sale without tax and with plate: subtotal + plate; but we need priceWithPlateNoTax
              const subtotal = car + add + ship + reg + other
              sale = subtotal + plate
              const supportAmount = sale * 1.15 * ((parseFloat(supportPct || '0') || 0) / 100)
              // مصروفات البيع (بدون عمولة البائع)
              expensesWithoutCommission = reg + ship + plate + other + supportAmount
              // مصروفات البيع (شاملة عمولة البائع)
              expenses = expensesWithoutCommission + sellerCommission
            } else if (request.type === 'CASH' && customFields) {
              const cf = customFields
              sale = Number(cf.totalWithPlateNoTax || 0)
              const ship = Number(cf.shippingPrice || 0)
              const plate = Number(cf.platePrice || 0)
              const other = Number(cf.additionalPrice || 0)
              const supportAmount = sale * 1.15 * ((parseFloat(supportPct || '0') || 0) / 100)
              // مصروفات البيع (بدون عمولة البائع)
              expensesWithoutCommission = ship + plate + other + supportAmount
              // مصروفات البيع (شاملة عمولة البائع)
              expenses = expensesWithoutCommission + sellerCommission
            }
            const cost = parseFloat(quickCost || '0') || 0
            const net = sale - cost - expenses
            const pct = sale > 0 ? (net / sale) * 100 : 0
            return (
              <div className="border-2 border-yellow-300 rounded-lg p-4 bg-yellow-50">
                <h4 className="text-sm font-bold text-yellow-900 mb-3">تحليل ايراد سريع</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-semibold text-gray-800 mb-1">سعر البيع (تلقائي)</label>
                    <input className="input bg-gray-100" value={sale ? `${Math.round(sale).toLocaleString()} ريال` : ''} disabled />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-800 mb-1">سعر التكلفة أو شراء السيارة</label>
                    <input className="input" type="number" step="0.01" value={quickCost} onChange={(e)=>setQuickCost(e.target.value)} placeholder="0.00" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-800 mb-1">حسبة الدعم (%)</label>
                    <input className="input" type="number" step="0.01" value={supportPct} onChange={(e)=>setSupportPct(e.target.value)} placeholder="أدخل النسبة" />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">مصروفات البيع</label>
                      <input className="input bg-gray-100 text-sm" value={`${Math.round(expensesWithoutCommission).toLocaleString()} ريال`} disabled />
                      <p className="mt-1 text-[10px] text-gray-500">التجيير + الشحن + اللوح + زيادة أخرى + حسبة الدعم</p>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">عمولة البائع</label>
                      <input className="input bg-gray-100 text-sm" value={`${sellerCommission.toLocaleString()} ريال`} disabled />
                    </div>
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-semibold text-gray-800 mb-1">إجمالي مصروفات البيع (تلقائي)</label>
                    <input className="input bg-gray-100" value={`${Math.round(expenses).toLocaleString()} ريال`} disabled />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-800 mb-1">صافي الايراد (مبلغ)</label>
                    <input className="input bg-gray-100" value={`${Math.round(net).toLocaleString()} ريال`} disabled />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-800 mb-1">صافي الايراد (نسبة)</label>
                    <input className="input bg-gray-100" value={`${pct.toFixed(2)} %`} disabled />
                    <p className="mt-1 text-[11px] text-gray-600">المعادلة: (سعر البيع - سعر التكلفة - مصروفات البيع) ÷ سعر البيع</p>
                  </div>
                </div>
              </div>
            )
          })()}

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

          {/* التعليقات والأحداث */}
          <div className="card">
            <div className="card-header flex items-center gap-2">
              <ClockIcon className="h-5 w-5 text-gray-600" />
              <h3 className="text-lg font-medium text-gray-900">
                التعليقات والأحداث ({((request.comments?.length || 0) + (request.events?.length || 0))})
              </h3>
            </div>
            <div className="card-body">
              {(() => {
                // Combine comments and events and sort by date
                const allItems: Array<{
                  id: string
                  type: 'comment' | 'event'
                  createdAt: string
                  data: any
                }> = []

                // Add comments
                if (request.comments && request.comments.length > 0) {
                  request.comments.forEach((comment: Comment) => {
                    allItems.push({
                      id: comment.id,
                      type: 'comment' as const,
                      createdAt: comment.createdAt,
                      data: comment,
                    })
                  })
                }

                // Add events
                if (request.events && request.events.length > 0) {
                  request.events.forEach((event) => {
                    allItems.push({
                      id: event.id,
                      type: 'event' as const,
                      createdAt: event.createdAt,
                      data: event,
                    })
                  })
                }

                // Sort by date (newest first)
                allItems.sort((a, b) => {
                  return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
                })

                if (allItems.length === 0) {
                  return (
                    <div className="text-center py-8 text-gray-500">
                      لا توجد تعليقات أو أحداث
                    </div>
                  )
                }

                return (
                  <div className="flow-root">
                    <ul className="-mb-8">
                      {allItems.map((item, idx) => (
                        <li key={item.id}>
                          <div className="relative pb-8">
                            {idx !== allItems.length - 1 && (
                              <span
                                className="absolute top-8 right-4 -ml-px h-full w-0.5 bg-gray-300"
                                aria-hidden="true"
                              />
                            )}
                            <div className="relative flex items-start space-x-3">
                              <div className="relative">
                                {item.type === 'comment' ? (
                                  <div className="h-10 w-10 rounded-full flex items-center justify-center ring-4 ring-white bg-green-500">
                                    <ChatBubbleLeftIcon className="h-5 w-5 text-white" />
                                  </div>
                                ) : (
                                  <div className={`h-10 w-10 rounded-full flex items-center justify-center ring-4 ring-white ${
                                    item.data.toStatus === 'SOLD' ? 'bg-green-500' :
                                    item.data.toStatus === 'NOT_SOLD' ? 'bg-gray-500' :
                                    'bg-blue-500'
                                  }`}>
                                    <ArrowRightIcon className="h-5 w-5 text-white" />
                                  </div>
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                {item.type === 'comment' ? (
                                  // Comment display
                                  <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg p-4 border-2 border-green-200 shadow-sm hover:shadow-md transition-shadow">
                                    <div className="flex items-start justify-between mb-2">
                                      <div className="flex items-center gap-2">
                                        <ChatBubbleLeftIcon className="h-4 w-4 text-green-600" />
                                        <p className="text-sm font-bold text-green-900">تعليق</p>
                                      </div>
                                    </div>
                                    <p className="text-sm text-gray-900 font-medium leading-relaxed mb-3">
                                      {item.data.text}
                                    </p>
                                    <div className="flex items-center gap-4 mt-3 pt-3 border-t border-green-200">
                                      <div className="flex items-center gap-2">
                                        <ClockIcon className="h-4 w-4 text-gray-500" />
                                        <span className="text-xs font-medium text-gray-600">
                                          {formatDateTime(item.data.createdAt)}
                                        </span>
                                      </div>
                                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700">
                                        {getRelativeTime(item.data.createdAt)}
                                      </span>
                                    </div>
                                    {item.data.user && (
                                      <div className="mt-2 flex items-center gap-2 text-xs text-gray-500">
                                        <UserIcon className="h-4 w-4" />
                                        <span>بواسطة: {item.data.user.name}</span>
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  // Event display
                                  <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg p-4 border-2 border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                                    <div className="flex items-start justify-between mb-2">
                                      <div>
                                        <p className="text-sm font-bold text-gray-900">
                                          {item.data.fromStatus ? (
                                            <>
                                              من: <span className={`px-2 py-0.5 rounded ${getStatusColor(item.data.fromStatus)}`}>
                                                {getStatusTitle(item.data.fromStatus)}
                                              </span>
                                              {' → '}
                                              إلى: <span className={`px-2 py-0.5 rounded ${getStatusColor(item.data.toStatus)}`}>
                                                {getStatusTitle(item.data.toStatus)}
                                              </span>
                                            </>
                                          ) : (
                                            <>
                                              تم إنشاء الطلب في حالة: <span className={`px-2 py-0.5 rounded ${getStatusColor(item.data.toStatus)}`}>
                                                {getStatusTitle(item.data.toStatus)}
                                              </span>
                                            </>
                                          )}
                                        </p>
                                      </div>
                                    </div>
                                    
                                    {/* الوقت الدقيق والنسبي */}
                                    <div className="flex items-center gap-4 mt-3 pt-3 border-t border-gray-300">
                                      <div className="flex items-center gap-2">
                                        <ClockIcon className="h-4 w-4 text-gray-500" />
                                        <span className="text-xs font-medium text-gray-600">
                                          {formatDateTime(item.data.createdAt)}
                                        </span>
                                      </div>
                                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-bold bg-indigo-100 text-indigo-700">
                                        {getRelativeTime(item.data.createdAt)}
                                      </span>
                                    </div>

                                    {/* التعليق/الـ Feedback */}
                                    {item.data.comment && (
                                      <div className="mt-3 bg-amber-50 border-2 border-amber-300 rounded-lg p-3">
                                        <div className="flex items-start gap-2">
                                          <ChatBubbleLeftIcon className="h-5 w-5 text-amber-600 flex-shrink-0" />
                                          <div>
                                            <p className="text-xs font-bold text-amber-800 mb-1">التعليق:</p>
                                            <p className="text-sm text-amber-900 font-medium leading-relaxed">
                                              {item.data.comment}
                                            </p>
                                          </div>
                                        </div>
                                      </div>
                                    )}

                                    {/* من قام بالتحديث */}
                                    {item.data.changedBy && (
                                      <div className="mt-3 flex items-center gap-2 text-xs text-gray-500">
                                        <UserIcon className="h-4 w-4" />
                                        <span>بواسطة: {item.data.changedBy.name}</span>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                )
              })()}
            </div>
          </div>
        </div>

        {/* الشريط الجانبي */}
        <div className="space-y-6">
          {/* معلومات العميل */}
          <div className="card">
            <div className="card-header bg-gradient-to-r from-blue-50 to-indigo-50">
              <h3 className="text-lg font-medium text-gray-900">معلومات العميل</h3>
            </div>
            <div className="card-body">
              <div className="space-y-4">
                {/* رقم الهيكل */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">رقم الهيكل</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      className="input flex-1"
                      value={vin}
                      onChange={(e)=>setVin(e.target.value)}
                      placeholder="مثال: VXFVLAHX0SZ022210"
                    />
                    <button
                      type="button"
                      onClick={() => setShowInventoryModal(true)}
                      className="p-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg border border-blue-200 transition-colors"
                      title="ربط بسيارة من المخزون"
                    >
                      <LinkIcon className="h-5 w-5" />
                    </button>
                    <button
                      className="btn-primary btn-sm whitespace-nowrap"
                      onClick={() => saveVinMutation.mutate(vin)}
                    >
                      حفظ
                    </button>
                  </div>
                  {linkedCar && inventoryData?.headers && (
                    <p className="mt-1 text-xs text-green-600 flex items-center gap-1">
                      <LinkIcon className="h-4 w-4" />
                      مرتبط بسيارة من المخزون: {(() => {
                        const headers = inventoryData.headers
                        const itemNameHeader = headers.find(h => h.includes('اسم الصنف') || h.includes('الصنف'))
                        return itemNameHeader ? String(linkedCar[itemNameHeader] || '') : 'سيارة'
                      })()}
                    </p>
                  )}
                  <p className="mt-1 text-xs text-gray-500">سيظهر رقم الهيكل أعلى الصفحة بعد الحفظ</p>
                </div>
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <UserIcon className="h-8 w-8 text-primary-600" />
                  <div>
                    <p className="text-xs text-gray-500">الاسم</p>
                    <p className="text-sm font-bold text-gray-900">{request.client?.name}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <PhoneIcon className="h-8 w-8 text-green-600" />
                  <div>
                    <p className="text-xs text-gray-500">الهاتف</p>
                    <p className="text-sm font-bold text-gray-900" dir="ltr">{request.client?.phonePrimary}</p>
                  </div>
                </div>

                {request.client?.email && (
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <EnvelopeIcon className="h-8 w-8 text-blue-600" />
                    <div>
                      <p className="text-xs text-gray-500">البريد الإلكتروني</p>
                      <p className="text-sm font-bold text-gray-900">{request.client.email}</p>
                    </div>
                  </div>
                )}

                {request.client?.city && (
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-xs text-gray-500 mb-1">المدينة</p>
                    <p className="text-sm font-bold text-gray-900">{request.client.city}</p>
                  </div>
                )}

                <Link
                  to={`/clients/${request.client?.id}`}
                  className="btn-primary w-full text-center mt-4"
                >
                  عرض ملف العميل الكامل
                </Link>
                <button
                  className="btn-outline w-full"
                  onClick={async () => {
                    try {
                      // Derive values for the template
                      const isCash = request.type === 'CASH'
                      let priceWithPlateNoTax = 0
                      let plateAmount = 0
                      let shippingAmount = 0
                      let supportPctNum: number | undefined
                      let quickCostNum: number | undefined
                      let vinVal: string | undefined

                      if (isCash && request.customFields) {
                        const cf = typeof request.customFields === 'string' ? JSON.parse(request.customFields) : request.customFields
                        priceWithPlateNoTax = Number(cf?.totalWithPlateNoTax || 0)
                        plateAmount = Number(cf?.platePrice || 0)
                        shippingAmount = Number(cf?.shippingPrice || 0)
                        if (cf?.supportPct !== undefined) supportPctNum = Number(cf.supportPct)
                        if (cf?.quickCost !== undefined) quickCostNum = Number(cf.quickCost)
                        if (cf?.vin) vinVal = String(cf.vin)
                      } else if (request.installmentDetails) {
                        const d = request.installmentDetails
                        const carPrice = Number(d.carPrice || 0)
                        const additionalFees = Number(d.additionalFees || 0)
                        const shipping = Number(d.shipping || 0)
                        const registration = Number(d.registration || 0)
                        const otherAdditions = Number(d.otherAdditions || 0)
                        const plateNumber = Number(d.plateNumber || 0)
                        priceWithPlateNoTax = carPrice + additionalFees + shipping + registration + otherAdditions + plateNumber
                        plateAmount = plateNumber
                        shippingAmount = shipping
                        const cf = request.customFields ? (typeof request.customFields === 'string' ? JSON.parse(request.customFields) : request.customFields) : {}
                        if (cf?.supportPct !== undefined) supportPctNum = Number(cf.supportPct)
                        if (cf?.quickCost !== undefined) quickCostNum = Number(cf.quickCost)
                        if (cf?.vin) vinVal = String(cf.vin)
                      }

                      // عمولة البائع: 300 للتقسيط، 200 للكاش
                      const sellerCommission = isCash ? 200 : 300

                      const blob = await generateEradExcel({
                        requestType: isCash ? 'CASH' : 'INSTALLMENT',
                        priceWithPlateNoTax,
                        plateAmount,
                        shippingAmount,
                        supportPct: (supportPct || supportPct === '0') ? Number(supportPct) : supportPctNum,
                        quickCost: (quickCost || quickCost === '0') ? Number(quickCost) : quickCostNum,
                        vin: vinVal,
                        sellerCommission: sellerCommission,
                      })

                      // Generate filename
                      const fileName = (() => {
                        const title = 'تحليل إيراد'
                        const carName = isCash 
                          ? (request.customFields ? (typeof request.customFields === 'string' ? JSON.parse(request.customFields) : request.customFields)?.carName : '') || ''
                          : (request.installmentDetails?.carName || '')
                        const clientName = request.client?.name || request.client?.phonePrimary || ''
                        const today = new Date().toLocaleDateString('ar-SA', { year: 'numeric', month: '2-digit', day: '2-digit', calendar: 'gregory' }).replace(/\//g, '-')
                        return `${title}_${carName || 'سيارة'}_${clientName}_${today}.xlsx`.replace(/\s+/g, '_')
                      })()

                      const url = URL.createObjectURL(blob)
                      const a = document.createElement('a')
                      a.href = url
                      a.download = fileName
                      document.body.appendChild(a)
                      a.click()
                      a.remove()
                      URL.revokeObjectURL(url)
                    } catch (e: any) {
                      toast.error(e?.message || 'تعذر إنشاء ملف الإيراد')
                    }
                  }}
                >
                  تحميل تحليل إيراد
                </button>
                <button
                  className="btn-outline w-full"
                  onClick={async () => {
                    try {
                      const isCash = request.type === 'CASH'
                      let sale = 0
                      let plateAmount = 0
                      let carName = ''
                      let bankName = ''
                      let vinVal: string | undefined

                      if (isCash && request.customFields) {
                        const cf = typeof request.customFields === 'string' ? JSON.parse(request.customFields) : request.customFields
                        carName = cf?.carName || ''
                        sale = Number(cf?.totalWithPlateNoTax || 0)
                        plateAmount = Number(cf?.platePrice || 0)
                        vinVal = vin || cf?.vin
                      } else if (request.installmentDetails) {
                        const d = request.installmentDetails
                        carName = d.carName || ''
                        const car = Number(d.carPrice || 0)
                        const add = Number(d.additionalFees || 0)
                        const ship = Number(d.shipping || 0)
                        const reg = Number(d.registration || 0)
                        const other = Number(d.otherAdditions || 0)
                        const plate = Number(d.plateNumber || 0)
                        sale = (car + add + ship + reg + other) + plate
                        plateAmount = plate
                        const cf = request.customFields ? (typeof request.customFields === 'string' ? JSON.parse(request.customFields) : request.customFields) : {}
                        vinVal = vin || cf?.vin
                        // bank name (try related entity or banks list)
                        bankName = d.financingBank?.name || (d.financingBankId ? (banksData?.find(b => b.id === d.financingBankId)?.name || '') : '')
                      }

                      // Get linked car data if available
                      let specifications: string | undefined
                      let costColor: string | undefined
                      let model: string | undefined
                      
                      if (linkedCar && inventoryData?.headers) {
                        const headers = inventoryData.headers
                        // Find specifications
                        const specsHeader = headers.find(h => h.includes('الموصفات') || h.includes('المواصفات'))
                        if (specsHeader && linkedCar[specsHeader]) {
                          specifications = String(linkedCar[specsHeader])
                        }
                        // Find cost color
                        const colorHeader = headers.find(h => (h.includes('التكلفة') && h.includes('لون')) || h.includes('التكلفة.اللون'))
                        if (colorHeader && linkedCar[colorHeader]) {
                          costColor = String(linkedCar[colorHeader])
                        }
                        // Find model
                        const modelHeader = headers.find(h => h.includes('الموديل') || h.includes('موديل'))
                        if (modelHeader && linkedCar[modelHeader]) {
                          model = String(linkedCar[modelHeader])
                        }
                      }

                      const blob = await generateOfferExcel({
                        carName: carName || '',
                        bankName: bankName || '',
                        saleNoPlate: Math.max(0, sale - plateAmount),
                        plateAmount: Math.max(0, plateAmount),
                        vin: vinVal || '',
                        specifications,
                        costColor,
                        model,
                      })

                      // Generate filename
                      const fileName = (() => {
                        const title = 'عرض سعر'
                        const carNameStr = carName || ''
                        const clientName = request.client?.name || request.client?.phonePrimary || ''
                        const today = new Date().toLocaleDateString('ar-SA', { year: 'numeric', month: '2-digit', day: '2-digit', calendar: 'gregory' }).replace(/\//g, '-')
                        return `${title}_${carNameStr || 'سيارة'}_${clientName}_${today}.xlsx`.replace(/\s+/g, '_')
                      })()

                      const url = URL.createObjectURL(blob)
                      const a = document.createElement('a')
                      a.href = url
                      a.download = fileName
                      document.body.appendChild(a)
                      a.click()
                      a.remove()
                      URL.revokeObjectURL(url)
                    } catch (e: any) {
                      toast.error(e?.message || 'تعذر إنشاء عرض السعر')
                    }
                  }}
                >
                  تحميل عرض سعر
                </button>
                <button
                  className="btn-outline w-full"
                  onClick={() => {
                    // Load saved handover data if exists
                    const cf = request.customFields ? (typeof request.customFields === 'string' ? JSON.parse(request.customFields) : request.customFields) : {}
                    setHandoverData({
                      branch: cf?.handoverBranch || '',
                      warehouse: cf?.handoverWarehouse || '',
                      clientName: cf?.handoverClientName || request.client?.name || '',
                      clientIdNumber: cf?.handoverClientIdNumber || request.client?.nationalId || '',
                      nationality: cf?.handoverNationality || '',
                      manufacturer: cf?.handoverManufacturer || '',
                      carType: cf?.handoverCarType || '',
                      carCategory: cf?.handoverCarCategory || '',
                      plateNumber: cf?.handoverPlateNumber || '',
                    })
                    setShowHandoverModal(true)
                  }}
                >
                  تحميل سند تسليم سيارة
                </button>
              </div>
            </div>
          </div>

          {/* الإحصائيات */}
          <div className="card">
            <div className="card-header">
              <h3 className="text-lg font-medium text-gray-900">الإحصائيات</h3>
            </div>
            <div className="card-body">
              <div className="space-y-4">
                <div className="flex justify-between items-center p-3 bg-purple-50 rounded-lg border border-purple-200">
                  <span className="text-sm font-medium text-gray-700">عدد التحديثات</span>
                  <span className="text-lg font-bold text-purple-700">
                    {request._count?.events || 0}
                  </span>
                </div>
                <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <span className="text-sm font-medium text-gray-700">التعليقات</span>
                  <span className="text-lg font-bold text-blue-700">
                    {request._count?.comments || 0}
                  </span>
                </div>
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <span className="text-sm font-medium text-gray-700">المرفقات</span>
                  <span className="text-lg font-bold text-gray-700">
                    {request._count?.attachments || 0}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* ملخص التقسيط */}
          {request.type === 'INSTALLMENT' && request.installmentDetails && (() => {
            // Check if selected bank is Rajhi
            const isRajhiBank = request.installmentDetails.financingBank?.name?.toLowerCase().includes('راجحي') || 
                               request.installmentDetails.financingBank?.name?.toLowerCase().includes('rajhi') ||
                               request.installmentDetails.financingBankId === 'rajhi'
            
            // Calculate financing details for Rajhi Bank
            const calculateRajhiFinancing = () => {
              const carPrice = Number(request.installmentDetails?.carPrice) || 0
              const additionalFees = Number(request.installmentDetails?.additionalFees) || 0
              const shipping = Number(request.installmentDetails?.shipping) || 0
              const registration = Number(request.installmentDetails?.registration) || 0
              const otherAdditions = Number(request.installmentDetails?.otherAdditions) || 0
              const plateNumber = Number(request.installmentDetails?.plateNumber) || 0
              const insurancePercentage = (request.installmentDetails?.insurancePercentage || 0) / 100
              
              // سعر السيارة شامل اللوح (بدون ضريبة)
              const subtotal = carPrice + additionalFees + shipping + registration + otherAdditions
              const priceWithPlateNoTax = subtotal + plateNumber
              
              // السعر النهائي شامل الضريبة واللوح
              const taxOnSubtotal = subtotal * 0.15
              const finalPriceWithTaxAndPlate = subtotal + taxOnSubtotal + plateNumber
              
              const downPaymentPercentage = (request.installmentDetails?.downPaymentPercentage || 0) / 100
              const finalPaymentPercentage = (request.installmentDetails?.finalPaymentPercentage || 0) / 100
              const installmentMonths = request.installmentDetails?.installmentMonths || 60
              const profitMargin = (request.installmentDetails?.profitMargin || 0) / 100
              
              // 1. الدفعة الأولى = (نسبة الدفعة الأولى * سعر السيارة)
              const downPayment = downPaymentPercentage * finalPriceWithTaxAndPlate
              
              // 2. مبلغ التمويل = (سعر سيارة شامل الضريبة واللوح - مبلغ الدفعة الأولى)
              const financingAmount = finalPriceWithTaxAndPlate - downPayment
              
              // 3. الرسوم الإدارية = ROUND((MIN(5000; مبلغ التمويل*1%); 0)*1.15
              const adminFees = Math.round(Math.min(5000, financingAmount * 0.01) * 1.15)
              
              // 4. الدفعة الأخيرة = (نسبة الدفعة الأخيرة * سعر السيارة)
              const finalPayment = finalPaymentPercentage * finalPriceWithTaxAndPlate
              
              // 5. التأمين للسنة الواحدة = (نسبة التأمين * 1.15 * سعر سيارة شامل الضريبة واللوح)
              // const annualInsurance = insurancePercentage * 1.15 * finalPriceWithTaxAndPlate
              
              // 6. التأمين على إجمالي سنوات التقسيط (مع انخفاض قيمة السيارة 15% كل سنة)
              let totalInsuranceAllYears = 0
              let currentCarValue = finalPriceWithTaxAndPlate
              const years = Math.ceil(installmentMonths / 12)
              
              for (let year = 1; year <= years; year++) {
                const yearlyInsurance = insurancePercentage * 1.15 * currentCarValue
                totalInsuranceAllYears += yearlyInsurance
                currentCarValue *= 0.85 // انخفاض 15% كل سنة
              }
              
              // 7. التأمين للشهر الواحد = (إجمالي سعر التأمين / عدد أشهر التقسيط)
              const monthlyInsurance = totalInsuranceAllYears / installmentMonths
              
              // 8. إجمالي التأمين = (التأمين للشهر الواحد * عدد أشهر التقسيط)
              const totalInsurance = monthlyInsurance * installmentMonths
              
              // 9. القسط الشهري = PMT(هامش الربح/12; عدد أشهر التقسيط; -مبلغ التمويل; مبلغ الدفعة الأخيرة)
              const calculatePMT = (rate: number, nper: number, pv: number, fv: number = 0, type: number = 0) => {
                if (rate === 0) {
                  return -(pv + fv) / nper
                }
                const pvif = Math.pow(1 + rate, nper)
                const pmt = rate / (pvif - 1) * -(pv * pvif + fv)
                return type ? pmt / (1 + rate) : pmt
              }
              
              const monthlyRate = profitMargin / 12
              const monthlyInstallmentWithoutInsurance = calculatePMT(monthlyRate, installmentMonths, -financingAmount, finalPayment)
              
              // 10. إجمالي القسط الشهري (مع التأمين) = القسط الشهري + التأمين الشهري
              const monthlyInstallmentWithInsurance = Math.abs(monthlyInstallmentWithoutInsurance) + monthlyInsurance
              
              // 11. إجمالي المبلغ المدفوع
              const totalAmountPaid = (monthlyInstallmentWithInsurance * installmentMonths) + downPayment + finalPayment + adminFees
              
              return {
                downPayment,
                finalPayment,
                adminFees,
                monthlyInstallment: monthlyInstallmentWithInsurance,
                monthlyInstallmentWithoutInsurance: Math.abs(monthlyInstallmentWithoutInsurance),
                monthlyInsurance,
                totalInsurance: totalInsurance,
                totalAmountPaid,
                financingAmount,
                installmentMonths,
                carName: request.installmentDetails?.carName || 'سيارة',
                priceWithPlateNoTax,
                finalPriceWithTaxAndPlate,
                isRajhiBank
              }
            }
            
            // Calculate financing details for non-Rajhi banks
            const calculateGeneralFinancing = () => {
              const carPrice = Number(request.installmentDetails?.carPrice) || 0
              const additionalFees = Number(request.installmentDetails?.additionalFees) || 0
              const shipping = Number(request.installmentDetails?.shipping) || 0
              const registration = Number(request.installmentDetails?.registration) || 0
              const otherAdditions = Number(request.installmentDetails?.otherAdditions) || 0
              const plateNumber = Number(request.installmentDetails?.plateNumber) || 0
              const insurancePercentage = (request.installmentDetails?.insurancePercentage || 0) / 100
              
              // سعر السيارة شامل اللوح (بدون ضريبة)
              const subtotal = carPrice + additionalFees + shipping + registration + otherAdditions
              const priceWithPlateNoTax = subtotal + plateNumber
              
              // السعر النهائي شامل الضريبة واللوح
              const taxOnSubtotal = subtotal * 0.15
              const finalPriceWithTaxAndPlate = subtotal + taxOnSubtotal + plateNumber
              
              const downPaymentPercentage = (request.installmentDetails?.downPaymentPercentage || 0) / 100
              const finalPaymentPercentage = (request.installmentDetails?.finalPaymentPercentage || 0) / 100
              const installmentMonths = request.installmentDetails?.installmentMonths || 60
              const profitMargin = (request.installmentDetails?.profitMargin || 0) / 100
              
              // 1. الدفعة الأولى (النسبة × السعر النهائي - الضريبة مدمجة بالفعل)
              const downPayment = downPaymentPercentage * finalPriceWithTaxAndPlate
              
              // 2. الدفعة الأخيرة (النسبة × السعر النهائي - الضريبة مدمجة بالفعل)
              const finalPayment = finalPaymentPercentage * finalPriceWithTaxAndPlate
              
              // 3. مبلغ التمويل = السعر النهائي (شامل الضريبة واللوح) - الدفعة الأولى
              const financingAmount = finalPriceWithTaxAndPlate - downPayment
              
              // 4. الرسوم الإدارية
              const adminFees = Math.round(Math.min(5000, financingAmount * 0.01) * 1.15)
              
              // 5. التأمين للسنة الواحدة = ((مبلغ التمويل + الرسوم الإدارية) × نسبة التأمين) + هامش الربح
              const totalInsurancePerYear = ((financingAmount + adminFees) * insurancePercentage) + profitMargin
              
              // 6. مبلغ التأمين الشهري (نقسم التأمين السنوي على 12)
              const monthlyInsurance = totalInsurancePerYear / 12
              
              // 7. القسط الشهري بدون التأمين
              // المعادلة الثانية (هامش بسيط Murabaha):
              // MarginTotal = (Loan + AdminFees) × MarginAnnual × years
              // PMT_noIns = (Loan + AdminFees + MarginTotal - Balloon) ÷ n
              const years = installmentMonths / 12
              const MarginTotal = (financingAmount + adminFees) * profitMargin * years
              const monthlyInstallmentWithoutInsurance = (financingAmount + adminFees + MarginTotal - finalPayment) / installmentMonths
              
              // 8. القسط الشهري مع التأمين
              const monthlyInstallmentWithInsurance = monthlyInstallmentWithoutInsurance + monthlyInsurance
              
              // 9. إجمالي المبلغ المدفوع طوال فترة التمويل
              const totalAmountPaid = (monthlyInstallmentWithInsurance * installmentMonths) + downPayment + finalPayment + adminFees
              
              return {
                downPayment,
                finalPayment,
                adminFees,
                monthlyInstallment: monthlyInstallmentWithInsurance,
                monthlyInstallmentWithoutInsurance,
                monthlyInsurance,
                totalInsurance: totalInsurancePerYear,
                totalAmountPaid,
                financingAmount,
                installmentMonths,
                carName: request.installmentDetails?.carName || 'سيارة',
                priceWithPlateNoTax,
                finalPriceWithTaxAndPlate,
                isRajhiBank
              }
            }
            
            // Choose the appropriate calculation based on bank
            const calculateFinancing = isRajhiBank ? calculateRajhiFinancing : calculateGeneralFinancing
            
            const financing = calculateFinancing()
            
            if (financing) {
              const summaryLines = [
                'هذه هي الحسبة التقريبية الخاصة بالسيارة، والحسبة النهائية تعتمد على موافقة البنك',
                '',
                `⏳ مدة التقسيط: ${Math.floor(financing.installmentMonths / 12)} سنة (${financing.installmentMonths} شهر)`,
                `🚘 السيارة: ${financing.carName}`,
                financing.downPayment > 0
                  ? `💰 الدفعة الأولى: ${Math.round(financing.downPayment)} ريال`
                  : '💰 الدفعة الأولى: بدون دفعة أولى',
                `🔑 القسط الشهري (مع التأمين): ${Math.round(financing.monthlyInstallment)} ريال`,
                financing.finalPayment > 0
                  ? `📝 الدفعة الأخيرة: ${Math.round(financing.finalPayment)} ريال (مع إمكانية تقسيطها على سنتين)`
                  : '📝 الدفعة الأخيرة: بدون دفعة أخيرة',
                `⚙️ الرسوم الإدارية: ${financing.adminFees} ريال`,
                '',
                '💡 هذه الأسعار تشمل التأمين (الشامل) والضريبة واللوحات ونسبة المرابحة',
                '',
                '🔔 طبعًا هذه أرقام أولية لتوضيح الصورة العامة، والعرض النهائي سيكون بعد صدور الرد من البنك',
              ]
              installmentSummaryTextRef.current = summaryLines.join('\n')
            } else {
              installmentSummaryTextRef.current = ''
            }
            
            // Debug: Log all calculation steps
            if (financing) {
              console.log('📋 ملخص التقسيط - تفاصيل الحساب:', {
                // Input values
                carPrice: Number(request.installmentDetails?.carPrice || 0),
                finalPriceWithTaxAndPlate: financing.finalPriceWithTaxAndPlate,
                downPaymentPercentage: request.installmentDetails?.downPaymentPercentage,
                finalPaymentPercentage: request.installmentDetails?.finalPaymentPercentage,
                profitMargin: request.installmentDetails?.profitMargin,
                insurancePercentage: request.installmentDetails?.insurancePercentage,
                installmentMonths: financing.installmentMonths,
                
                // Calculated values
                downPayment: financing.downPayment,
                finalPayment: financing.finalPayment,
                financingAmount: financing.financingAmount,
                adminFees: financing.adminFees,
                monthlyInsurance: financing.monthlyInsurance,
                monthlyInstallment: financing.monthlyInstallment,
                totalAmountPaid: financing.totalAmountPaid,
              })
            }
            
            // Check if monthly installment exceeds allowed amount
            const showWarning = request.installmentDetails?.deductedAmount && request.installmentDetails?.finalAmount && 
                              financing.monthlyInstallment > request.installmentDetails.finalAmount
            
            return (
              <div className="card bg-gradient-to-br from-amber-50 to-orange-50 border-2 border-amber-200">
                <div className="card-header flex items-center justify-between gap-3">
                  <h3 className="text-lg font-medium text-gray-900">📋 ملخص التقسيط</h3>
                  <button
                    type="button"
                    className="btn-outline btn-sm"
                    onClick={handleCopyInstallmentSummary}
                  >
                    📋 نسخ الملخص
                  </button>
                </div>
                <div className="card-body">
                  {showWarning && (
                    <div className="mb-4 bg-red-50 border-2 border-red-300 rounded-lg p-4">
                      <div className="flex items-start">
                        <div className="flex-shrink-0">
                          <svg className="h-5 w-5 text-red-600" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                          </svg>
                        </div>
                        <div className="mr-3">
                          <h3 className="text-sm font-bold text-red-900">
                            ⚠️ تحذير: القسط الشهري أعلى من المسموح للعميل
                          </h3>
                          <div className="mt-2 text-sm text-red-700">
                            <p className="mb-2">
                              <span className="font-bold">القسط الشهري (مع التأمين):</span> {Math.round(financing.monthlyInstallment).toLocaleString()} ريال
                            </p>
                            <p className="mb-2">
                              <span className="font-bold">المبلغ المسموح للعميل:</span> {request.installmentDetails?.finalAmount?.toLocaleString()} ريال
                            </p>
                            <p className="text-red-800 font-medium">
                              القسط الشهري أعلى من المبلغ المسموح للعميل بعد خصم الالتزامات.
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  <div
                    ref={installmentSummaryRef}
                    className="text-sm text-gray-700 space-y-3 leading-relaxed"
                  >
                    <p className="text-xs text-gray-500 border-b pb-2 mb-3">
                      هذه هي الحسبة التقريبية الخاصة بالسيارة، والحسبة النهائية تعتمد على موافقة البنك
                    </p>
                    
                    <p>⏳ <strong>مدة التقسيط:</strong> {Math.floor(financing.installmentMonths / 12)} سنة ({financing.installmentMonths} شهر)</p>
                    
                    <p>🚘 <strong>السيارة:</strong> {financing.carName}</p>
                    
                    {financing.downPayment > 0 ? (
                      <p>💰 <strong>الدفعة الأولى:</strong> {Math.round(financing.downPayment)} ريال</p>
                    ) : (
                      <p>💰 <strong>الدفعة الأولى:</strong> بدون دفعة أولى</p>
                    )}
                    
                    <p>🔑 <strong>القسط الشهري (مع التأمين):</strong> {Math.round(financing.monthlyInstallment)} ريال</p>
                    
                    {financing.finalPayment > 0 ? (
                      <p>📝 <strong>الدفعة الأخيرة:</strong> {Math.round(financing.finalPayment)} ريال (مع إمكانية تقسيطها على سنتين)</p>
                    ) : (
                      <p>📝 <strong>الدفعة الأخيرة:</strong> بدون دفعة أخيرة</p>
                    )}
                    
                    <p>⚙️ <strong>الرسوم الإدارية:</strong> {financing.adminFees} ريال</p>
                    
                    <p className="text-xs text-gray-600 pt-3 border-t mt-3">
                      💡 هذه الأسعار تشمل التأمين (الشامل) والضريبة واللوحات ونسبة المرابحة
                    </p>
                    
                    <p className="text-xs text-amber-700 font-medium mt-3 bg-amber-100 p-2 rounded">
                      🔔 طبعًا هذه أرقام أولية لتوضيح الصورة العامة، والعرض النهائي سيكون بعد صدور الرد من البنك
                    </p>
                  </div>
                </div>
              </div>
            )
          })()}

          {/* أزرار الإجراءات */}
          <div className="card">
            <div className="card-body">
              <div className="space-y-3">
                <Link
                  to={`/requests/${id}/edit`}
                  className="btn-primary w-full text-center"
                >
                  تعديل الطلب
                </Link>
                <button className="btn-outline w-full">إضافة تعليق</button>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <input
                      id="attachment-input"
                      type="file"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (!file) return
                        const title = prompt('أدخل عنوانًا للمرفق (اختياري): مثل صور هوية العميل') || undefined
                        uploadMutation.mutate({ file, title })
                        e.currentTarget.value = ''
                      }}
                    />
                    <button
                      type="button"
                      className="btn-outline w-full"
                      onClick={() => document.getElementById('attachment-input')?.click()}
                      disabled={uploadMutation.isLoading}
                    >
                      {uploadMutation.isLoading ? 'جاري الرفع...' : 'رفع مرفق'}
                    </button>
                  </div>
                </div>
                <button
                  className="btn-danger w-full"
                  onClick={() => {
                    if (confirm('هل أنت متأكد من حذف هذا الطلب؟ لا يمكن التراجع.')) {
                      deleteMutation.mutate()
                    }
                  }}
                  disabled={deleteMutation.isLoading}
                >
                  {deleteMutation.isLoading ? 'جاري الحذف...' : 'حذف الطلب'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* المرفقات */}
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-medium text-gray-900">المرفقات</h3>
          </div>
          <div className="card-body">
            {!attachmentsQuery.data || attachmentsQuery.data.length === 0 ? (
              <div className="text-sm text-gray-500">لا توجد مرفقات بعد.</div>
            ) : (
              <ul className="divide-y divide-gray-200">
                {attachmentsQuery.data.map((att) => (
                  <li key={att.id} className="py-3 flex items-center justify-between">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {att.filename}
                      </p>
                      <p className="text-xs text-gray-500">
                        مرفوع بواسطة: {att.uploadedBy?.name} • {getRelativeTime(att.uploadedAt)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <a
                        href={`${(import.meta as any).env?.VITE_API_URL || '/api'}/attachments/${att.id}/download`}
                        className="btn-outline btn-sm"
                      >
                        تنزيل
                      </a>
                      <button
                        className="btn-danger btn-sm"
                        onClick={() => {
                          if (confirm('حذف هذا المرفق؟')) {
                            deleteAttachmentMutation.mutate(att.id)
                          }
                        }}
                      >
                        حذف
                      </button>
                    </div>
                  </li>) )}
              </ul>
            )}
          </div>
        </div>
      </div>

      {/* Inventory Modal for Car Linking */}
      {showInventoryModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-xl font-bold text-gray-900">اختر سيارة من المخزون</h3>
              <button
                onClick={() => setShowInventoryModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XCircleIcon className="h-6 w-6" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto flex-1">
              {!inventoryData || !inventoryData.headers || inventoryData.data.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-gray-500">لا توجد بيانات في المخزون</p>
                </div>
              ) : (
                <>
                  {/* Search and Filters */}
                  <div className="mb-6 space-y-4">
                    <div className="flex items-center gap-4">
                      <div className="flex-1 relative">
                        <MagnifyingGlassIcon className="absolute right-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                        <input
                          type="text"
                          placeholder="بحث..."
                          value={inventorySearchTerm}
                          onChange={(e) => setInventorySearchTerm(e.target.value)}
                          className="input pr-10"
                        />
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <select
                        value={inventoryFilterColor}
                        onChange={(e) => setInventoryFilterColor(e.target.value)}
                        className="input"
                      >
                        <option value="">جميع الألوان</option>
                        {Array.from(new Set(inventoryData.data.flatMap(row => 
                          inventoryData.headers.filter(h => h.includes('لون')).map(h => row[h])
                        ))).filter(Boolean).map(color => (
                          <option key={String(color)} value={String(color)}>{String(color)}</option>
                        ))}
                      </select>
                      <select
                        value={inventoryFilterStatus}
                        onChange={(e) => setInventoryFilterStatus(e.target.value)}
                        className="input"
                      >
                        <option value="">جميع الحالات</option>
                        {Array.from(new Set(inventoryData.data.flatMap(row => 
                          inventoryData.headers.filter(h => h.includes('حالة')).map(h => row[h])
                        ))).filter(Boolean).map(status => (
                          <option key={String(status)} value={String(status)}>{String(status)}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Filtered Data */}
                  {(() => {
                    const filteredCars = inventoryData.data.filter((row) => {
                      const text = inventoryData.headers.map(h => String(row[h] ?? '')).join(' ').toLowerCase()
                      const matchesSearch = text.includes(inventorySearchTerm.toLowerCase())
                      const matchesColor = !inventoryFilterColor || inventoryData.headers.some(h => h.includes('لون') && row[h] === inventoryFilterColor)
                      const matchesStatus = !inventoryFilterStatus || inventoryData.headers.some(h => h.includes('حالة') && row[h] === inventoryFilterStatus)
                      return matchesSearch && matchesColor && matchesStatus
                    })

                    if (filteredCars.length === 0) {
                      return (
                        <div className="text-center py-12">
                          <p className="text-gray-500">لا توجد نتائج</p>
                        </div>
                      )
                    }

                    return (
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">اختر</th>
                              {inventoryData.headers.slice(0, 8).map((header) => (
                                <th key={header} className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  {header}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {filteredCars.slice(0, 50).map((car, index) => (
                              <tr key={index} className="hover:bg-gray-50">
                                <td className="px-4 py-3 whitespace-nowrap">
                                  <button
                                    onClick={() => handleSelectCar(car)}
                                    className="btn-primary btn-sm"
                                  >
                                    اختر
                                  </button>
                                </td>
                                {inventoryData.headers.slice(0, 8).map((header) => (
                                  <td key={header} className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                                    {String(car[header] ?? '-')}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        {filteredCars.length > 50 && (
                          <p className="mt-4 text-sm text-gray-500 text-center">
                            عرض أول 50 نتيجة. استخدم البحث والفلترة للعثور على سيارة محددة.
                          </p>
                        )}
                      </div>
                    )
                  })()}
                </>
              )}
            </div>
            <div className="p-6 border-t border-gray-200 flex justify-end">
              <button
                onClick={() => setShowInventoryModal(false)}
                className="btn-outline"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Move Request Modal */}
      {showMoveModal && request && targetStatus && (
        <MoveRequestModal
          isOpen={showMoveModal}
          onClose={() => {
            setShowMoveModal(false)
            setTargetStatus(null)
          }}
          request={request}
          onMove={(comment) => {
            handleMoveRequest(comment)
          }}
          isLoading={moveRequestMutation.isLoading}
          targetStatus={targetStatus}
        />
      )}

      {/* Handover Receipt Modal */}
      {showHandoverModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-xl font-bold text-gray-900">بيانات سند تسليم السيارة</h3>
              <button
                onClick={() => setShowHandoverModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XCircleIcon className="h-6 w-6" />
              </button>
            </div>
            <div className="overflow-y-auto p-6 flex-1">
              <div className="space-y-6">
                {/* بيانات عامة */}
                <div className="border rounded-lg p-4 bg-gray-50">
                  <h4 className="text-lg font-semibold text-gray-900 mb-4">بيانات عامة</h4>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">الفرع (مثال: خريص)</label>
                      <input
                        type="text"
                        className="input w-full"
                        value={handoverData.branch}
                        onChange={(e) => setHandoverData({...handoverData, branch: e.target.value})}
                        placeholder="مثال: خريص"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">المستودع</label>
                      <input
                        type="text"
                        className="input w-full"
                        value={handoverData.warehouse}
                        onChange={(e) => setHandoverData({...handoverData, warehouse: e.target.value})}
                        placeholder="المستودع"
                      />
                    </div>
                  </div>
                </div>

                {/* بيانات العميل */}
                <div className="border rounded-lg p-4 bg-blue-50">
                  <h4 className="text-lg font-semibold text-gray-900 mb-4">بيانات العميل</h4>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">اسم العميل</label>
                      <input
                        type="text"
                        className="input w-full"
                        value={handoverData.clientName}
                        onChange={(e) => setHandoverData({...handoverData, clientName: e.target.value})}
                        placeholder="اسم العميل"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">رقم إثبات العميل</label>
                      <input
                        type="text"
                        className="input w-full"
                        value={handoverData.clientIdNumber}
                        onChange={(e) => setHandoverData({...handoverData, clientIdNumber: e.target.value})}
                        placeholder="رقم إثبات العميل"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">الجنسية</label>
                      <input
                        type="text"
                        className="input w-full"
                        value={handoverData.nationality}
                        onChange={(e) => setHandoverData({...handoverData, nationality: e.target.value})}
                        placeholder="الجنسية"
                      />
                    </div>
                  </div>
                </div>

                {/* بيانات السيارة */}
                <div className="border rounded-lg p-4 bg-green-50">
                  <h4 className="text-lg font-semibold text-gray-900 mb-4">بيانات السيارة</h4>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">شركة التصنيع</label>
                      <input
                        type="text"
                        className="input w-full"
                        value={handoverData.manufacturer}
                        onChange={(e) => setHandoverData({...handoverData, manufacturer: e.target.value})}
                        placeholder="شركة التصنيع"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">نوع السيارة</label>
                      <input
                        type="text"
                        className="input w-full"
                        value={handoverData.carType}
                        onChange={(e) => setHandoverData({...handoverData, carType: e.target.value})}
                        placeholder="نوع السيارة"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">فئة السيارة</label>
                      <input
                        type="text"
                        className="input w-full"
                        value={handoverData.carCategory}
                        onChange={(e) => setHandoverData({...handoverData, carCategory: e.target.value})}
                        placeholder="فئة السيارة"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">رقم اللوحة</label>
                      <input
                        type="text"
                        className="input w-full"
                        value={handoverData.plateNumber}
                        onChange={(e) => setHandoverData({...handoverData, plateNumber: e.target.value})}
                        placeholder="رقم اللوحة"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => setShowHandoverModal(false)}
                className="btn-outline"
              >
                إلغاء
              </button>
              <button
                onClick={async () => {
                  try {
                    // Prepare automatic data
                    const isCash = request.type === 'CASH'
                    let company = 'كاش'
                    if (!isCash && request.installmentDetails) {
                      const d = request.installmentDetails
                      company = d.financingBank?.name || (d.financingBankId ? (banksData?.find(b => b.id === d.financingBankId)?.name || '') : 'تقسيط')
                    }
                    
                    // Get VIN
                    const cf = request.customFields ? (typeof request.customFields === 'string' ? JSON.parse(request.customFields) : request.customFields) : {}
                    const vinVal = vin || cf?.vin
                    
                    // Get linked car data if available
                    let color: string | undefined
                    let model: string | undefined
                    if (linkedCar && inventoryData?.headers) {
                      const headers = inventoryData.headers
                      const colorHeader = headers.find(h => (h.includes('التكلفة') && h.includes('لون')) || h.includes('التكلفة.اللون') || h.includes('اللون'))
                      if (colorHeader && linkedCar[colorHeader]) {
                        color = String(linkedCar[colorHeader])
                      }
                      const modelHeader = headers.find(h => h.includes('الموديل') || h.includes('موديل'))
                      if (modelHeader && linkedCar[modelHeader]) {
                        model = String(linkedCar[modelHeader])
                      }
                    }
                    
                    const blob = await generateCarHandoverExcel({
                      branch: handoverData.branch,
                      warehouse: handoverData.warehouse,
                      company,
                      clientName: handoverData.clientName,
                      clientPhone: request.client?.phonePrimary || '',
                      clientIdNumber: handoverData.clientIdNumber || request.client?.nationalId || '',
                      nationality: handoverData.nationality,
                      manufacturer: handoverData.manufacturer,
                      carType: handoverData.carType,
                      carCategory: handoverData.carCategory,
                      color,
                      model,
                      vin: vinVal,
                      plateNumber: handoverData.plateNumber,
                    })

                    // Generate filename
                    const fileName = (() => {
                      const title = 'سند تسليم سيارة'
                      const carInfo = `${handoverData.manufacturer || ''}_${handoverData.carType || ''}`.trim() || 'سيارة'
                      const clientName = handoverData.clientName || request.client?.phonePrimary || ''
                      const today = new Date().toLocaleDateString('ar-SA', { year: 'numeric', month: '2-digit', day: '2-digit', calendar: 'gregory' }).replace(/\//g, '-')
                      return `${title}_${carInfo}_${clientName}_${today}.xlsx`.replace(/\s+/g, '_')
                    })()

                    // Save handover data to customFields
                    // const currentCf = request.customFields ? (typeof request.customFields === 'string' ? JSON.parse(request.customFields) : request.customFields) : {}
                    const handoverDataToSave = {
                      handoverBranch: handoverData.branch,
                      handoverWarehouse: handoverData.warehouse,
                      handoverClientName: handoverData.clientName,
                      handoverClientIdNumber: handoverData.clientIdNumber,
                      handoverNationality: handoverData.nationality,
                      handoverManufacturer: handoverData.manufacturer,
                      handoverCarType: handoverData.carType,
                      handoverCarCategory: handoverData.carCategory,
                      handoverPlateNumber: handoverData.plateNumber,
                    }
                    // const newCustomFields = { ...currentCf, ...handoverDataToSave }
                    await saveCustomFieldsMutation.mutateAsync(handoverDataToSave)

                    const url = URL.createObjectURL(blob)
                    const a = document.createElement('a')
                    a.href = url
                    a.download = fileName
                    document.body.appendChild(a)
                    a.click()
                    a.remove()
                    URL.revokeObjectURL(url)
                    setShowHandoverModal(false)
                    toast.success('تم تحميل وحفظ بيانات سند تسليم السيارة')
                  } catch (e: any) {
                    toast.error(e?.message || 'تعذر إنشاء سند تسليم السيارة')
                  }
                }}
                className="btn-primary"
              >
                تحميل
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
