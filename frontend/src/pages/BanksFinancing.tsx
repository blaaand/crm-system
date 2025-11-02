import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import { PlusIcon, BanknotesIcon, /* PencilIcon, */ TrashIcon, CheckIcon } from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'
import banksService, { Bank, /* BankRate, */ EmployerType } from '../services/banksService'
import { useAuthStore } from '../stores/authStore'
import { UserRole } from '../types'

// Employment types
const employerTypes: EmployerType[] = [
  { id: 'PRIVATE', name: 'خاص معتمد', nameEn: 'Private' },
  { id: 'PRIVATE_UNACCREDITED', name: 'خاص غير معتمد', nameEn: 'Private Unaccredited' },
  { id: 'GOVERNMENT', name: 'حكومي', nameEn: 'Government' },
  { id: 'MILITARY', name: 'عسكري', nameEn: 'Military' },
  { id: 'RETIRED', name: 'متقاعد', nameEn: 'Retired' },
]

const clientTypes = [
  { id: 'TRANSFERRED', name: 'عميل محول', description: 'راتبه ينزل على البنك' },
  { id: 'NON_TRANSFERRED', name: 'عميل غير محول', description: 'راتبه ينزل على بنك آخر' },
]


export default function BanksFinancing() {
  const { hasAnyRole } = useAuthStore()
  const canEdit = hasAnyRole([UserRole.ADMIN, UserRole.MANAGER])
  const [selectedBank, setSelectedBank] = useState<Bank | null>(null)
  const [showAddBank, setShowAddBank] = useState(false)
  const [newBankData, setNewBankData] = useState({ name: '', code: '', notes: '' })
  const [rates, setRates] = useState<{[key: string]: number}>({})
  const [notes, setNotes] = useState('')
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const queryClient = useQueryClient()

  // Queries
  const { data: banks = [], isLoading } = useQuery('banks', banksService.getBanks)

  // Mutations
  const createBankMutation = useMutation(banksService.createBank, {
    onSuccess: () => {
      queryClient.invalidateQueries('banks')
      setShowAddBank(false)
      setNewBankData({ name: '', code: '', notes: '' })
      toast.success('تم إضافة البنك بنجاح')
    },
    onError: () => {
      toast.error('حدث خطأ في إضافة البنك')
    }
  })

  // const updateRateMutation = useMutation(banksService.updateBankRate, {
  //   onSuccess: () => {
  //     queryClient.invalidateQueries('banks')
  //     toast.success('تم تحديث النسبة بنجاح')
  //   },
  //   onError: () => {
  //     toast.error('حدث خطأ في تحديث النسبة')
  //   }
  // })

  const deleteBankMutation = useMutation(banksService.deleteBank, {
    onSuccess: () => {
      queryClient.invalidateQueries('banks')
      setSelectedBank(null)
      toast.success('تم حذف البنك بنجاح')
    }
  })

  const handleAddBank = () => {
    if (!canEdit) return
    if (!newBankData.name.trim()) {
      toast.error('يرجى إدخال اسم البنك')
      return
    }
    createBankMutation.mutate(newBankData)
  }

  const handleRateChange = (employerType: string, clientType: string, rate: number) => {
    const key = `${employerType}-${clientType}`
    setRates(prev => ({
      ...prev,
      [key]: rate
    }))
    setHasUnsavedChanges(true)
  }

  const handleSaveRates = () => {
    if (!canEdit) return
    if (!selectedBank) return

    const ratesToSave = Object.entries(rates).map(([key, rate]) => {
      const [employerType, clientType] = key.split('-')
      return {
        bankId: selectedBank.id,
        employerType,
        clientType: clientType as 'TRANSFERRED' | 'NON_TRANSFERRED',
        rate
      }
    })

    // Save all rates and notes
    Promise.all([
      ...ratesToSave.map(rateData => banksService.updateBankRate(rateData)),
      banksService.updateBank(selectedBank.id, { notes })
    ]).then(() => {
      queryClient.invalidateQueries('banks')
      setHasUnsavedChanges(false)
      setRates({})
      toast.success('تم حفظ جميع النسب والملاحظات بنجاح')
    }).catch(() => {
      toast.error('حدث خطأ في حفظ النسب')
    })
  }

  const handleNotesChange = (newNotes: string) => {
    setNotes(newNotes)
    setHasUnsavedChanges(true)
  }

  const handleBankSelect = (bank: Bank) => {
    if (hasUnsavedChanges) {
      const confirm = window.confirm('لديك تغييرات غير محفوظة. هل تريد المتابعة؟')
      if (!confirm) return
    }
    
    setSelectedBank(bank)
    setRates({})
    setNotes(bank.notes || '')
    setHasUnsavedChanges(false)
  }

  const getRateValue = (employerType: string, clientType: string): number => {
    const key = `${employerType}-${clientType}`
    
    // إذا كان هناك تغيير محلي، استخدمه
    if (rates[key] !== undefined) {
      return rates[key]
    }
    
    // وإلا استخدم القيمة من قاعدة البيانات
    if (!selectedBank) return 0
    
    const rate = selectedBank.bankRates?.find(r => 
      r.employerType === employerType && r.clientType === clientType
    )
    return rate?.rate || 0
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">جاري تحميل البنوك...</div>
      </div>
    )
  }

  return (
    <div className="h-full w-full">
      {/* Header */}
      <div className="flex-shrink-0 py-6 border-b border-gray-200 bg-white rounded-lg shadow-sm mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">البنوك وشركات التمويل</h1>
            <p className="mt-1 text-sm text-gray-500">
              إدارة البنوك ونسب التمويل حسب جهة العمل ونوع العميل
            </p>
          </div>
          <button
            onClick={() => canEdit && setShowAddBank(true)}
            className={`btn btn-primary ${!canEdit ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <PlusIcon className="h-5 w-5 ml-2" />
            إضافة بنك جديد
          </button>
        </div>
      </div>

      <div className="flex gap-6 h-full">
        {/* Banks List */}
        <div className="w-1/3">
          <div className="card h-full">
            <div className="card-header">
              <h3 className="text-lg font-medium text-gray-900 flex items-center">
                <BanknotesIcon className="h-5 w-5 ml-2" />
                قائمة البنوك
              </h3>
            </div>
            <div className="card-body overflow-y-auto">
              {banks.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  لا توجد بنوك مضافة
                </div>
              ) : (
                <div className="space-y-2">
                  {banks.map((bank) => (
                    <div
                      key={bank.id}
                      className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                        selectedBank?.id === bank.id
                          ? 'border-primary-500 bg-primary-50'
                          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                      onClick={() => handleBankSelect(bank)}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium text-gray-900">{bank.name}</h4>
                          {bank.code && (
                            <p className="text-sm text-gray-500">كود: {bank.code}</p>
                          )}
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            if (canEdit) deleteBankMutation.mutate(bank.id)
                          }}
                          className={`text-red-600 hover:text-red-800 ${!canEdit ? 'opacity-50 cursor-not-allowed' : ''}`}
                          disabled={!canEdit}
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Bank Rates Configuration */}
        <div className="flex-1">
          {selectedBank ? (
            <div className="card h-full">
              <div className="card-header">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">
                      إعداد نسب التمويل - {selectedBank.name}
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">
                      تحديد النسب المئوية لكل جهة عمل ونوع عميل
                    </p>
                  </div>
                  {hasUnsavedChanges && (
                    <button
                      onClick={handleSaveRates}
                      className={`btn btn-primary ${!canEdit ? 'opacity-50 cursor-not-allowed' : ''}`}
                      disabled={!canEdit}
                    >
                      <CheckIcon className="h-5 w-5 ml-2" />
                      حفظ النسب
                    </button>
                  )}
                </div>
                {hasUnsavedChanges && (
                  <div className="mt-2 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                    <p className="text-sm text-yellow-800">
                      ⚠️ لديك تغييرات غير محفوظة. لا تنس الضغط على "حفظ النسب"
                    </p>
                  </div>
                )}
              </div>
              <div className="card-body overflow-y-auto">
                {clientTypes.map((clientType) => (
                  <div key={clientType.id} className="mb-8">
                    <div className="bg-gradient-to-r from-primary-50 to-primary-100 p-4 rounded-lg mb-4">
                      <h4 className="text-lg font-semibold text-gray-900">{clientType.name}</h4>
                      <p className="text-sm text-gray-600">{clientType.description}</p>
                    </div>

                    <div className="grid gap-4">
                      {employerTypes.map((employer) => (
                        <div
                          key={`${clientType.id}-${employer.id}`}
                          className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-lg hover:shadow-sm transition-shadow"
                        >
                          <div className="flex items-center">
                            <div className="w-3 h-3 bg-primary-500 rounded-full ml-3"></div>
                            <span className="font-medium text-gray-900">{employer.name}</span>
                          </div>
                          <div className="flex items-center">
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              max="100"
                              value={getRateValue(employer.id, clientType.id)}
                              onChange={(e) => {
                                const value = parseFloat(e.target.value) || 0
                                handleRateChange(employer.id, clientType.id, value)
                              }}
                              className="w-24 px-3 py-2 text-center border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                              disabled={!canEdit}
                              placeholder="0.00"
                            />
                            <span className="mr-2 text-gray-500">%</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {/* Bank Notes Section */}
              <div className="mt-8 border-t pt-6">
                <h5 className="text-lg font-semibold text-gray-900 mb-4">📝 ملاحظات البنك</h5>
                <textarea
                  value={notes}
                  onChange={(e) => handleNotesChange(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 resize-none"
                  rows={4}
                  placeholder="أدخل ملاحظات خاصة بالبنك (اختياري)..."
                  disabled={!canEdit}
                />
                <p className="mt-2 text-sm text-gray-500">
                  هذه الملاحظات ستظهر عند اختيار هذا البنك في إنشاء طلب جديد
                </p>
              </div>
            </div>
          ) : (
            <div className="card h-full flex items-center justify-center">
              <div className="text-center text-gray-500">
                <BanknotesIcon className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <p>اختر بنكاً من القائمة لإعداد النسب</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Add Bank Modal */}
      {showAddBank && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full m-4">
            <div className="p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">إضافة بنك جديد</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    اسم البنك *
                  </label>
                  <input
                    type="text"
                    value={newBankData.name}
                    onChange={(e) => setNewBankData({ ...newBankData, name: e.target.value })}
                    className="input w-full"
                    placeholder="مثال: البنك الأهلي السعودي"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    كود البنك (اختياري)
                  </label>
                  <input
                    type="text"
                    value={newBankData.code}
                    onChange={(e) => setNewBankData({ ...newBankData, code: e.target.value })}
                    className="input w-full"
                    placeholder="مثال: NCB"
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={handleAddBank}
                  disabled={createBankMutation.isLoading || !canEdit}
                  className={`btn btn-primary flex-1 ${!canEdit ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {createBankMutation.isLoading ? 'جاري الإضافة...' : 'إضافة البنك'}
                </button>
                <button
                  onClick={() => {
                    setShowAddBank(false)
                    setNewBankData({ name: '', code: '', notes: '' })
                  }}
                  className="btn btn-outline flex-1"
                >
                  إلغاء
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
