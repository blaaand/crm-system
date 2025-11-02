import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
// import {
//   SortableContext,
//   verticalListSortingStrategy,
// } from '@dnd-kit/sortable'
import { requestsService } from '../services/requestsService'
import { Request, RequestStatus } from '../types'
import KanbanColumn from '../components/KanbanColumn'
import RequestCard from '../components/RequestCard'
import MoveRequestModal from '../components/MoveRequestModal'

const statusOrder: RequestStatus[] = [
  RequestStatus.AWAITING_CLIENT,
  RequestStatus.FOLLOW_UP,
  RequestStatus.AWAITING_DOCS,
  RequestStatus.AWAITING_BANK_REP,
  RequestStatus.SOLD,
  RequestStatus.NOT_SOLD,
]

export default function KanbanBoard() {
  const [activeRequest, setActiveRequest] = useState<Request | null>(null)
  const [moveModalOpen, setMoveModalOpen] = useState(false)
  const [selectedRequest, setSelectedRequest] = useState<Request | null>(null)
  const [targetStatus, setTargetStatus] = useState<RequestStatus | null>(null)
  const queryClient = useQueryClient()

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  )

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
    const overData: any = over.data?.current
    const containerId = overData?.sortable?.containerId || (over.id as string)
    const newStatus = containerId as RequestStatus

    if (request && request.currentStatus !== newStatus) {
      setSelectedRequest(request)
      setTargetStatus(newStatus)
      setMoveModalOpen(true)
    }
  }

  const handleMoveRequest = (comment?: string) => {
    if (selectedRequest && targetStatus) {
      moveRequestMutation.mutate({
        id: selectedRequest.id,
        toStatus: targetStatus,
        comment,
      })
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

  // const findStatusByRequestId = (id: string): RequestStatus | null => {
  //   if (!kanbanData) return null
  //   for (const column of kanbanData) {
  //     const request = column.requests.find((r) => r.id === id)
  //     if (request) return column.status
  //   }
  //   return null
  // }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">جاري تحميل لوحة Kanban...</div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex-shrink-0 py-6 border-b border-gray-200 bg-white">
        <h1 className="text-2xl font-bold text-gray-900">لوحة Kanban</h1>
        <p className="mt-1 text-sm text-gray-500">
          إدارة الطلبات عبر السحب والإفلات
        </p>
      </div>

      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
          <div className="flex-1 flex gap-4 overflow-x-auto p-6 bg-gray-50">
          {statusOrder.map((status) => {
            const column = kanbanData?.find((col) => col.status === status)
            if (!column) return null

            return (
              <div key={status} className="flex-shrink-0 w-96">
                <KanbanColumn
                  status={status}
                  title={column.title}
                  requests={column.requests}
                />
              </div>
            )
          })}
        </div>

        <DragOverlay>
          {activeRequest ? (
            <RequestCard request={activeRequest} isDragging />
          ) : null}
        </DragOverlay>
      </DndContext>

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
