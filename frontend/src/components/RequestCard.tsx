import { useDraggable } from '@dnd-kit/core'
import { useNavigate } from 'react-router-dom'
import { Request, RequestType } from '../types'
import { getRelativeTime, formatDate } from '../utils/dateUtils'
import {
  PaperClipIcon,
  ChatBubbleLeftIcon,
  CalendarIcon,
  UserIcon,
  ClockIcon,
  BanknotesIcon,
} from '@heroicons/react/24/outline'

interface RequestCardProps {
  request: Request
  isDragging?: boolean
}

export default function RequestCard({ request, isDragging }: RequestCardProps) {
  const navigate = useNavigate()
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    isDragging: isDraggableDragging,
  } = useDraggable({ 
    id: request.id,
    data: {
      type: 'request-card',
      request: request,
      containerId: request.currentStatus, // Store the current status (column) for easy access
    }
  })

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
  } : undefined

  const getTypeColor = (type: RequestType) => {
    switch (type) {
      case RequestType.CASH:
        return 'bg-emerald-100 text-emerald-800 border-emerald-200'
      case RequestType.INSTALLMENT:
        return 'bg-blue-100 text-blue-800 border-blue-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getTypeText = (type: RequestType) => {
    switch (type) {
      case RequestType.CASH:
        return '💵 كاش'
      case RequestType.INSTALLMENT:
        return '💳 تقسيط'
      default:
        return '❓ غير محدد'
    }
  }

  // Get the latest event comment (feedback)
  const latestEvent = request.events && request.events.length > 0 
    ? request.events[request.events.length - 1] 
    : null

  // Parse custom fields for cash requests
  const customFields = request.customFields 
    ? (typeof request.customFields === 'string' ? JSON.parse(request.customFields) : request.customFields)
    : null

  const handleCardClick = (e: React.MouseEvent) => {
    // Don't navigate if clicking on drag handles
    if (e.target === e.currentTarget || (e.target as HTMLElement).closest('.card-content')) {
      navigate(`/requests/${request.id}`)
    }
  }

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      onClick={handleCardClick}
      className={`bg-white rounded-xl shadow-md border-2 border-gray-200 p-5 cursor-move hover:shadow-xl hover:border-primary-300 transition-all duration-200 ${
        isDragging || isDraggableDragging ? 'opacity-50 scale-105 rotate-3' : ''
      }`}
      style={style}
    >
      <div className="card-content space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-base font-bold text-gray-900 flex-1 leading-snug line-clamp-2">
            {request.title}
          </h3>
          <span className={`inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-bold border ${getTypeColor(request.type)} whitespace-nowrap`}>
            {getTypeText(request.type)}
          </span>
        </div>

        {/* Client Info */}
        <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg p-3 space-y-2">
          <div className="flex items-center text-sm font-medium text-gray-900">
            <UserIcon className="h-5 w-5 ml-2 text-primary-600" />
            <span className="truncate">{request.client?.name}</span>
          </div>

          <div className="flex items-center text-sm text-gray-700">
            <span className="ml-2 text-lg">📱</span>
            <span dir="ltr" className="font-mono">{request.client?.phonePrimary}</span>
          </div>
        </div>

        {/* Price */}
        {request.type === RequestType.CASH && customFields ? (
          <div className="space-y-2">
            {customFields.carName && (
              <div className="flex items-center justify-between bg-blue-50 rounded-lg p-2 border border-blue-200">
                <div className="text-xs text-blue-700 font-medium">السيارة المطلوبة</div>
                <div className="text-sm font-bold text-blue-900">{customFields.carName}</div>
              </div>
            )}
            {/* السعر شامل اللوح بدون ضريبة */}
            <div className="flex items-center justify-between bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-3 border-2 border-green-300">
              <div className="flex items-center gap-2">
                <BanknotesIcon className="h-5 w-5 text-green-600" />
                <span className="text-xs font-medium text-green-800">شامل اللوح (بدون ضريبة)</span>
              </div>
              <span className="text-base font-bold text-green-700">
                {(customFields.totalWithPlateNoTax || 0).toLocaleString()} ريال
              </span>
            </div>
            
            {/* السعر الإجمالي شامل كل شيء */}
            <div className="flex items-center justify-between bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-3 border-2 border-blue-300 shadow-md">
              <div className="flex items-center gap-2">
                <BanknotesIcon className="h-5 w-5 text-blue-600" />
                <span className="text-xs font-bold text-blue-800">السعر النهائي</span>
              </div>
              <span className="text-lg font-bold text-blue-700">
                {(customFields.totalWithPlateAndTax || 0).toLocaleString()} ريال
              </span>
            </div>
          </div>
        ) : request.price ? (
          <div className="flex items-center justify-center bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-3 border border-green-200">
            <BanknotesIcon className="h-5 w-5 ml-2 text-green-600" />
            <span className="text-lg font-bold text-green-700">
              {request.price.toLocaleString()} ريال
            </span>
          </div>
        ) : null}

        {/* Latest Feedback */}
        {latestEvent?.comment && (
          <div className="bg-amber-50 border-2 border-amber-300 rounded-lg p-3 shadow-sm">
            <div className="flex items-start gap-2">
              <ChatBubbleLeftIcon className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-xs font-bold text-amber-800">آخر تحديث</p>
                  <span className="text-xs font-medium text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                    {getRelativeTime(latestEvent.createdAt)}
                  </span>
                </div>
                <p className="text-sm text-amber-900 line-clamp-3 leading-relaxed font-medium">
                  {latestEvent.comment}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Meta Information */}
        <div className="space-y-2">
          {/* Last Update Time */}
          {latestEvent && (
            <div className="flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg p-2 border border-indigo-200">
              <ClockIcon className="h-4 w-4 text-indigo-600" />
              <span className="text-xs font-bold text-indigo-700">
                آخر تحديث: {getRelativeTime(latestEvent.createdAt)}
              </span>
            </div>
          )}
          
          <div className="flex items-center justify-between pt-2 border-t border-gray-200">
            <div className="flex items-center text-xs text-gray-500">
              <CalendarIcon className="h-4 w-4 ml-1" />
              <span>{formatDate(request.createdAt)}</span>
            </div>
            
            <div className="flex items-center gap-3">
              {(request._count?.attachments ?? 0) > 0 && (
                <div className="flex items-center gap-1 px-2 py-1 bg-gray-100 rounded-md">
                  <PaperClipIcon className="h-3.5 w-3.5 text-gray-600" />
                  <span className="text-xs font-medium text-gray-700">{request._count?.attachments}</span>
                </div>
              )}
              
              {(request._count?.comments ?? 0) > 0 && (
                <div className="flex items-center gap-1 px-2 py-1 bg-blue-100 rounded-md">
                  <ChatBubbleLeftIcon className="h-3.5 w-3.5 text-blue-600" />
                  <span className="text-xs font-medium text-blue-700">{request._count?.comments}</span>
                </div>
              )}

              {(request._count?.events ?? 0) > 0 && (
                <div className="flex items-center gap-1 px-2 py-1 bg-purple-100 rounded-md">
                  <ClockIcon className="h-3.5 w-3.5 text-purple-600" />
                  <span className="text-xs font-medium text-purple-700">{request._count?.events}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Assigned To */}
        {request.assignedTo && (
          <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
            <span className="text-xs text-gray-500">المسؤول:</span>
            <span className="text-xs font-medium text-gray-700 bg-gray-100 px-2 py-1 rounded">
              {request.assignedTo.name}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
