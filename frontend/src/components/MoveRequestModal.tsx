import { useState } from 'react'
import { Dialog } from '@headlessui/react'
import { XMarkIcon } from '@heroicons/react/24/outline'
import { Request } from '../types'

interface MoveRequestModalProps {
  isOpen: boolean
  onClose: () => void
  request: Request | null
  onMove: (comment?: string) => void
  isLoading: boolean
  targetStatus?: string
}

const statusTitles: Record<string, string> = {
  'NOT_ANSWERED': 'عميل لم يتم الرد',
  'AWAITING_CLIENT': 'بانتظار رد العميل',
  'FOLLOW_UP': 'في المتابعة',
  'AWAITING_DOCS': 'بانتظار الأوراق',
  'AWAITING_BANK_REP': 'بانتظار رد مندوب البنك',
  'SOLD': 'تم البيع',
  'NOT_SOLD': 'لم يتم البيع',
}

export default function MoveRequestModal({
  isOpen,
  onClose,
  request,
  onMove,
  isLoading,
  targetStatus,
}: MoveRequestModalProps) {
  const [comment, setComment] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onMove(comment)
    setComment('')
  }

  const handleClose = () => {
    setComment('')
    onClose()
  }

  if (!request) return null

  return (
    <Dialog open={isOpen} onClose={handleClose} className="relative z-50">
      <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />
      
      <div className="fixed inset-0 z-10 overflow-y-auto">
        <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
          <Dialog.Panel className="relative transform overflow-hidden rounded-lg bg-white px-4 pb-4 pt-5 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg sm:p-6">
            <div className="absolute left-0 top-0 hidden pl-4 pt-4 sm:block">
              <button
                type="button"
                className="rounded-md bg-white text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
                onClick={handleClose}
              >
                <span className="sr-only">إغلاق</span>
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
            
            <div className="sm:flex sm:items-start">
              <div className="mt-3 text-center sm:ml-4 sm:mt-0 sm:text-left w-full">
                <Dialog.Title as="h3" className="text-lg font-medium leading-6 text-gray-900">
                  نقل الطلب
                </Dialog.Title>
                
                <div className="mt-4">
                  <div className="bg-gray-50 rounded-lg p-4 mb-4">
                    <h4 className="text-sm font-medium text-gray-900 mb-2">
                      {request.title}
                    </h4>
                    <p className="text-sm text-gray-600">
                      العميل: {request.client?.name}
                    </p>
                    <p className="text-sm text-gray-600">
                      الهاتف: {request.client?.phonePrimary}
                    </p>
                    {targetStatus && (
                      <div className="mt-3 pt-3 border-t border-gray-200">
                        <p className="text-sm font-bold text-gray-900">
                          نقل إلى: <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded">
                            {statusTitles[targetStatus] || targetStatus}
                          </span>
                        </p>
                      </div>
                    )}
                  </div>

                  <form onSubmit={handleSubmit}>
                    <div className="mb-4">
                      <label htmlFor="comment" className="block text-sm font-medium text-gray-700 mb-2">
                        تعليق (اختياري)
                      </label>
                      <textarea
                        id="comment"
                        rows={3}
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        className="input"
                        placeholder="أضف تعليقاً حول نقل الطلب..."
                      />
                    </div>

                    <div className="flex justify-end space-x-3">
                      <button
                        type="button"
                        onClick={handleClose}
                        className="btn-outline"
                        disabled={isLoading}
                      >
                        إلغاء
                      </button>
                      <button
                        type="submit"
                        className="btn-primary"
                        disabled={isLoading}
                      >
                        {isLoading ? 'جاري النقل...' : 'نقل الطلب'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          </Dialog.Panel>
        </div>
      </div>
    </Dialog>
  )
}
