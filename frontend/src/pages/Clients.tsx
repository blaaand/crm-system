import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import { Link } from 'react-router-dom'
import { clientsService } from '../services/clientsService'
import { PlusIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline'
import * as XLSX from 'xlsx'
import { DndContext, PointerSensor, useSensor, useSensors, DragEndEvent, useDroppable, useDraggable } from '@dnd-kit/core'

export default function Clients() {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')

  const queryClient = useQueryClient()

  const { data, isLoading, refetch } = useQuery(
    ['clients', { search, page }],
    () => clientsService.getClients({ search, page, limit: 50, sortBy: 'updatedAt', sortOrder: 'desc' as any }),
    {
      keepPreviousData: true,
    }
  )

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  )

  // Determine client buckets
  const clients = data?.clients || []
  const isNotInterested = (notes?: string) => (notes || '').includes('[NOT_INTERESTED]')
  const isAwaitingTagged = (notes?: string) => (notes || '').includes('[AWAITING_CLIENT]')
  const inAwaiting = (c: any) => isAwaitingTagged(c.notes) || ((c._count?.requests || 0) > 0)
  const dateInRange = (d: string) => {
    const t = new Date(d).getTime()
    const fromOk = !fromDate || t >= new Date(fromDate).getTime()
    const toOk = !toDate || t <= new Date(toDate).getTime() + 24*60*60*1000 - 1
    return fromOk && toOk
  }
  const filteredClients = clients.filter(c => dateInRange(c.createdAt) || dateInRange(c.updatedAt))
  const colNotAnswered = filteredClients.filter(c => !isNotInterested(c.notes) && !inAwaiting(c))
  const colAwaiting = filteredClients.filter(c => !isNotInterested(c.notes) && inAwaiting(c))
  const colNotInterested = filteredClients.filter(c => isNotInterested(c.notes))

  const markNotInterestedMutation = useMutation(
    ({ id, reason }: { id: string; reason?: string }) => {
      const client = clients.find(c => c.id === id)
      const baseNotes = client?.notes || ''
      const tagged = baseNotes.includes('[NOT_INTERESTED]') ? baseNotes : `[NOT_INTERESTED] ${baseNotes}`.trim()
      // سجل الحركة باسم الموظف
      const actor = (JSON.parse(localStorage.getItem('auth') || '{}')?.user?.name) || ''
      const finalNotes = reason ? `${tagged} | سبب: ${reason} | بواسطة: ${actor}` : (actor ? `${tagged} | بواسطة: ${actor}` : tagged)
      return clientsService.updateClient(id, { notes: finalNotes })
    },
    {
      onSuccess: () => queryClient.invalidateQueries('clients'),
    }
  )

  const markAwaitingMutation = useMutation(
    ({ id, reason }: { id: string; reason?: string }) => {
      const client = clients.find(c => c.id === id)
      let notes = (client?.notes || '').replace('[NOT_INTERESTED]', '').trim()
      if (!notes.includes('[AWAITING_CLIENT]')) notes = `[AWAITING_CLIENT] ${notes}`.trim()
      const actor = (JSON.parse(localStorage.getItem('auth') || '{}')?.user?.name) || ''
      if (reason) notes = `${notes} | تعليق: ${reason}`
      if (actor) notes = `${notes} | بواسطة: ${actor}`
      return clientsService.updateClient(id, { notes })
    },
    { onSuccess: () => queryClient.invalidateQueries('clients') }
  )

  const markNotAnsweredMutation = useMutation(
    ({ id, reason }: { id: string; reason?: string }) => {
      const client = clients.find(c => c.id === id)
      let notes = (client?.notes || '').replace('[NOT_INTERESTED]', '').replace('[AWAITING_CLIENT]', '').trim()
      const actor = (JSON.parse(localStorage.getItem('auth') || '{}')?.user?.name) || ''
      if (reason) notes = `${notes} | تعليق: ${reason}`
      if (actor) notes = `${notes} | بواسطة: ${actor}`
      return clientsService.updateClient(id, { notes })
    },
    { onSuccess: () => queryClient.invalidateQueries('clients') }
  )

  const [moveModalOpen, setMoveModalOpen] = useState(false)
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null)
  const [targetCol, setTargetCol] = useState<'NOT_ANSWERED' | 'AWAITING_CLIENT' | 'NOT_INTERESTED' | null>(null)
  const [moveComment, setMoveComment] = useState('')

  const handleDragEnd = (e: DragEndEvent) => {
    const { active, over } = e
    if (!over) return
    const clientId = String(active.id)
    const targetCol = String(over.id)
    if (targetCol === 'NOT_INTERESTED' || targetCol === 'AWAITING_CLIENT' || targetCol === 'NOT_ANSWERED') {
      setSelectedClientId(clientId)
      setTargetCol(targetCol as any)
      setMoveComment('')
      setMoveModalOpen(true)
    }
  }

  const DroppableColumn = ({ id, children }: { id: string; children: any }) => {
    const { setNodeRef, isOver } = useDroppable({ id })
    return (
      <div ref={setNodeRef} className={`flex-shrink-0 w-96 ${isOver ? 'ring-4 ring-primary-300 ring-opacity-50' : ''}`}>
        {children}
      </div>
    )
  }

  const ClientCard = ({ client }: { client: any }) => {
    const { attributes, listeners, setNodeRef, transform } = useDraggable({ id: client.id })
    const style: any = { transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined }
    return (
      <div ref={setNodeRef} style={style} {...attributes} {...listeners} id={client.id} className="p-3 border rounded-lg bg-white shadow-sm cursor-grab">
        <div className="flex items-center justify-between">
          <div className="font-bold text-gray-900 truncate">{client.name}</div>
          <span className="text-xs text-gray-500">{new Date(client.updatedAt).toLocaleDateString('ar-SA', { calendar: 'gregory' })}</span>
        </div>
        <div className="text-sm text-gray-700" dir="ltr">{client.phonePrimary}</div>
        <div className="flex justify-end mt-2">
          <Link to={`/clients/${client.id}`} className="text-primary-600 text-xs">عرض التفاصيل</Link>
        </div>
      </div>
    )
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setPage(1)
    refetch()
  }

  return (
    <div>
      <div className="sm:flex sm:items-center mb-8">
        <div className="sm:flex-auto">
          <h1 className="text-2xl font-bold text-gray-900">العملاء</h1>
          <p className="mt-2 text-sm text-gray-700">
            قائمة بجميع العملاء المسجلين في النظام
          </p>
        </div>
        <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
          <Link
            to="/clients/new"
            className="btn-primary"
          >
            <PlusIcon className="h-4 w-4 ml-2" />
            إضافة عميل جديد
          </Link>
        </div>
      </div>

      {/* Search */}
      <div className="mb-6">
        <form onSubmit={handleSearch} className="flex gap-4">
          <div className="flex-1">
            <div className="relative">
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="input pr-10"
                placeholder="البحث في العملاء..."
              />
            </div>
          </div>
          <button type="submit" className="btn-primary">
            بحث
          </button>
        </form>
      </div>

      {/* Clients Kanban */}
      <div className="card">
        {/* Filters + Export */}
        <div className="card-body">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
            <div className="md:col-span-2">
              <div className="relative">
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                  <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
                </div>
                <input type="text" value={search} onChange={(e)=>setSearch(e.target.value)} className="input pr-10" placeholder="🔎 بحث شامل بالاسم/الهاتف..." />
              </div>
            </div>
            <input type="date" className="input" value={fromDate} onChange={(e)=>setFromDate(e.target.value)} />
            <input type="date" className="input" value={toDate} onChange={(e)=>setToDate(e.target.value)} />
          </div>
          <div className="flex gap-2">
            <button className="btn-outline" onClick={()=>refetch()}>تطبيق</button>
            <button
              className="btn-primary"
              onClick={() => {
                const rows = [
                  ['الاسم','الهاتف','الحالة','عدد الطلبات','تاريخ الإنشاء','آخر تحديث','ملاحظات'],
                  ...filteredClients.map(c => [
                    c.name,
                    c.phonePrimary,
                    isNotInterested(c.notes) ? 'غير مهتم' : inAwaiting(c) ? 'بانتظار رد العميل' : 'عميل لم يتم الرد',
                    c._count?.requests || 0,
                    new Date(c.createdAt).toLocaleString('ar-SA', { calendar: 'gregory' }),
                    new Date(c.updatedAt).toLocaleString('ar-SA', { calendar: 'gregory' }),
                    c.notes || ''
                  ])
                ]
                const wb = XLSX.utils.book_new()
                const ws = XLSX.utils.aoa_to_sheet(rows)
                XLSX.utils.book_append_sheet(wb, ws, 'العملاء')
                XLSX.writeFile(wb, `clients_${Date.now()}.xlsx`)
              }}
            >
              ⬇️ تصدير Excel
            </button>
          </div>
        </div>
        <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
          <div className="flex gap-6 overflow-x-auto p-6 bg-gradient-to-br from-gray-50 to-gray-100">
            {[
              { id: 'NOT_ANSWERED', title: 'عميل لم يتم الرد', items: colNotAnswered },
              { id: 'AWAITING_CLIENT', title: 'بانتظار رد العميل', items: colAwaiting },
              { id: 'NOT_INTERESTED', title: 'غير مهتم', items: colNotInterested },
            ].map((col) => (
              <DroppableColumn key={col.id} id={col.id}>
                <div className="rounded-xl p-4 border-2 bg-white">
                  <div className="flex items-center justify-between mb-4 pb-2 border-b">
                    <h3 className="text-base font-bold text-gray-900">{col.title}</h3>
                    <span className="px-2 py-1 rounded bg-gray-100 text-gray-700 text-xs font-bold">{col.items.length}</span>
                  </div>
                  <div className="space-y-3">
                    {isLoading ? (
                      <div className="text-center text-gray-500">جاري التحميل...</div>
                    ) : col.items.length === 0 ? (
                      <div className="h-24 flex items-center justify-center text-gray-400 text-sm border-2 border-dashed rounded-lg">لا يوجد عناصر</div>
                    ) : (
                      col.items.map((client) => (
                        <ClientCard key={client.id} client={client} />
                      ))
                    )}
                  </div>
                </div>
              </DroppableColumn>
            ))}
          </div>
        </DndContext>
      </div>

      {/* Move with comment modal */}
      {moveModalOpen && selectedClientId && targetCol && (
        <div className="fixed inset-0 z-50">
          <div className="fixed inset-0 bg-black/40" onClick={() => setMoveModalOpen(false)} />
          <div className="fixed inset-0 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-5">
              <h3 className="text-lg font-bold text-gray-900 mb-3">نقل العميل إلى: {targetCol === 'NOT_ANSWERED' ? 'عميل لم يتم الرد' : targetCol === 'AWAITING_CLIENT' ? 'بانتظار رد العميل' : 'غير مهتم'}</h3>
              <label className="block text-sm font-medium text-gray-700 mb-2">تعليق (اختياري)</label>
              <textarea className="input" rows={3} value={moveComment} onChange={(e)=>setMoveComment(e.target.value)} placeholder="أضف تعليقًا حول النقل..." />
              <div className="flex justify-end gap-2 mt-4">
                <button className="btn-outline" onClick={() => setMoveModalOpen(false)}>إلغاء</button>
                <button className="btn-primary" onClick={() => {
                  if (targetCol === 'NOT_INTERESTED') {
                    markNotInterestedMutation.mutate({ id: selectedClientId, reason: moveComment || undefined })
                  } else if (targetCol === 'AWAITING_CLIENT') {
                    markAwaitingMutation.mutate({ id: selectedClientId, reason: moveComment || undefined })
                  } else {
                    markNotAnsweredMutation.mutate({ id: selectedClientId, reason: moveComment || undefined })
                  }
                  setMoveModalOpen(false)
                }}>نقل</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
