import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { Request, RequestStatus } from '../types'
import RequestCard from './RequestCard'

interface KanbanColumnProps {
  status: RequestStatus
  title: string
  requests: Request[]
}

const getColumnColor = (status: RequestStatus) => {
  switch (status) {
    case RequestStatus.NOT_ANSWERED:
      return 'bg-gradient-to-br from-red-50 to-red-100 border-red-200'
    case RequestStatus.AWAITING_CLIENT:
      return 'bg-gradient-to-br from-yellow-50 to-yellow-100 border-yellow-200'
    case RequestStatus.FOLLOW_UP:
      return 'bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200'
    case RequestStatus.AWAITING_DOCS:
      return 'bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200'
    case RequestStatus.AWAITING_BANK_REP:
      return 'bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200'
    case RequestStatus.SOLD:
      return 'bg-gradient-to-br from-green-50 to-green-100 border-green-200'
    case RequestStatus.NOT_SOLD:
      return 'bg-gradient-to-br from-gray-50 to-gray-100 border-gray-200'
    default:
      return 'bg-gradient-to-br from-gray-50 to-gray-100 border-gray-200'
  }
}

const getBadgeColor = (status: RequestStatus) => {
  switch (status) {
    case RequestStatus.NOT_ANSWERED:
      return 'bg-red-500 text-white'
    case RequestStatus.AWAITING_CLIENT:
      return 'bg-yellow-500 text-white'
    case RequestStatus.FOLLOW_UP:
      return 'bg-blue-500 text-white'
    case RequestStatus.AWAITING_DOCS:
      return 'bg-orange-500 text-white'
    case RequestStatus.AWAITING_BANK_REP:
      return 'bg-purple-500 text-white'
    case RequestStatus.SOLD:
      return 'bg-green-500 text-white'
    case RequestStatus.NOT_SOLD:
      return 'bg-gray-500 text-white'
    default:
      return 'bg-gray-500 text-white'
  }
}

export default function KanbanColumn({ status, title, requests }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: status,
  })

  return (
    <div 
      ref={setNodeRef}
      className="h-full w-full"
    >
      <div className={`h-full rounded-xl p-4 border-2 transition-all duration-200 ${getColumnColor(status)} ${
        isOver ? 'ring-4 ring-primary-400 ring-opacity-75 scale-[1.02] border-primary-400 shadow-2xl' : ''
      }`}>
        <div className={`flex items-center justify-between mb-4 pb-3 border-b-2 transition-colors duration-200 ${
          isOver ? 'border-primary-400' : 'border-gray-300'
        }`}>
          <h3 className={`text-base font-bold transition-colors duration-200 ${
            isOver ? 'text-primary-700' : 'text-gray-900'
          }`}>{title}</h3>
          <span className={`inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-bold shadow-sm transition-all duration-200 ${
            isOver ? 'scale-110' : ''
          } ${getBadgeColor(status)}`}>
            {requests.length}
          </span>
        </div>
        
        <div
          className={`flex-1 space-y-4 transition-colors duration-200 overflow-y-auto min-h-[200px] ${
            isOver ? 'bg-primary-50 bg-opacity-50 rounded-lg p-3' : ''
          }`}
          style={{ height: 'calc(100vh - 200px)' }}
        >
          <SortableContext
            items={requests.map((request) => request.id)}
            strategy={verticalListSortingStrategy}
          >
            {requests.length === 0 ? (
              <div className={`flex items-center justify-center h-32 text-gray-400 text-sm border-2 border-dashed rounded-lg transition-all duration-200 ${
                isOver ? 'border-primary-400 bg-primary-50 text-primary-700 font-bold scale-105' : 'border-gray-300'
              }`}>
                {isOver ? '⬇️ اترك الكرت هنا' : 'اسحب الطلبات هنا'}
              </div>
            ) : (
              requests.map((request) => (
                <RequestCard key={request.id} request={request} />
              ))
            )}
          </SortableContext>
        </div>
      </div>
    </div>
  )
}
