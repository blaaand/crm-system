import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import {
  CollisionDetection,
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  closestCenter,
  pointerWithin,
  rectIntersection,
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

const collisionDetectionStrategy: CollisionDetection = (args) => {
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

export default function KanbanBoard() {
  const [activeRequest, setActiveRequest] = useState<Request | null>(null)
  const [moveModalOpen, setMoveModalOpen] = useState(false)
  const [selectedRequest, setSelectedRequest] = useState<Request | null>(null)
  const [targetStatus, setTargetStatus] = useState<RequestStatus | null>(null)
  const [currentOverStatus, setCurrentOverStatus] = useState<RequestStatus | null>(null)
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
        setTargetStatus(null)
      },
    }
  )

  const findRequestById = (id: string): Request | null => {
    if (!kanbanData) return null
    for (const column of kanbanData) {
      const request = column.requests.find((r) => r.id === id)
      if (request) return request
    }
    return null
  }

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
    if (selectedRequest && targetStatus) {
      moveRequestMutation.mutate({
        id: selectedRequest.id,
        toStatus: targetStatus,
        comment,
      })
    }
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
        collisionDetection={collisionDetectionStrategy}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
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
