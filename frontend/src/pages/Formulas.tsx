import { useState, useEffect } from 'react'
import { CalculatorIcon, XMarkIcon, TrashIcon } from '@heroicons/react/24/outline'
import banksService from '../services/banksService'
import { useQuery } from 'react-query'

// أنواع جهة العمل
const workOrganizationOptions = [
  { value: 'PRIVATE_APPROVED', label: 'خاص معتمد' },
  { value: 'PRIVATE_UNAPPROVED', label: 'خاص غير معتمد' },
  { value: 'COMPANY', label: 'شركة' },
  { value: 'GOVERNMENT', label: 'حكومي' },
  { value: 'MILITARY', label: 'عسكري' },
  { value: 'RETIRED', label: 'متقاعد' },
]

// أنواع الالتزامات
const obligationTypeOptions = [
  { id: 'عقاري مدعوم', label: 'عقاري مدعوم' },
  { id: 'عقاري غير مدعوم', label: 'عقاري غير مدعوم' },
  { id: 'شخصي', label: 'شخصي' },
]

type CalculatorType = 'CASH' | 'COMMITMENTS' | 'TAX_REMOVAL' | null

interface CalculatorState {
  type: CalculatorType
  // Cash fields
  cashCarPrice: string
  cashPlatePrice: string
  cashShippingPrice: string
  cashAdditionalPrice: string
  // Commitments fields
  commitmentsSalary: string
  commitmentsSalaryBankId: string
  commitmentsWorkOrganization: string
  commitmentsAge: string
  commitmentsObligationTypes: string[]
  commitmentsDeductionPercentage: string
  commitmentsObligation1: string
  commitmentsObligation2: string
  commitmentsVisaAmount: string
  // Tax removal
  taxRemovalPrice: string
}

export default function Formulas() {
  const [isCalculatorOpen, setIsCalculatorOpen] = useState(false)
  const [calculatorType, setCalculatorType] = useState<CalculatorType>(null)
  const [calculatorState, setCalculatorState] = useState<CalculatorState>({
    type: null,
    cashCarPrice: '',
    cashPlatePrice: '',
    cashShippingPrice: '',
    cashAdditionalPrice: '',
    commitmentsSalary: '',
    commitmentsSalaryBankId: '',
    commitmentsWorkOrganization: '',
    commitmentsAge: '',
    commitmentsObligationTypes: [],
    commitmentsDeductionPercentage: '',
    commitmentsObligation1: '',
    commitmentsObligation2: '',
    commitmentsVisaAmount: '',
    taxRemovalPrice: '',
  })

  const { data: banksData } = useQuery('banks', banksService.getBanks)

  // Calculate cash prices
  const calculateCashPrices = () => {
    const car = parseFloat(calculatorState.cashCarPrice || '0')
    const plate = parseFloat(calculatorState.cashPlatePrice || '0')
    const shipping = parseFloat(calculatorState.cashShippingPrice || '0')
    const additional = parseFloat(calculatorState.cashAdditionalPrice || '0')

    const priceWithoutTax = car + shipping + additional
    const tax = priceWithoutTax * 0.15
    const totalWithTax = priceWithoutTax + tax
    const totalWithPlateNoTax = priceWithoutTax + plate
    const totalWithPlateAndTax = totalWithTax + plate

    return {
      priceWithoutTax,
      tax,
      totalWithTax,
      totalWithPlateNoTax,
      totalWithPlateAndTax,
    }
  }

  // Calculate commitments amounts
  const calculateCommitmentsAmounts = () => {
    const salaryAmount = parseFloat(calculatorState.commitmentsSalary || '0')
    const deductionPercent = parseFloat(calculatorState.commitmentsDeductionPercentage || '0')
    const obl1 = parseFloat(calculatorState.commitmentsObligation1 || '0')
    const obl2 = parseFloat(calculatorState.commitmentsObligation2 || '0')
    const visa = parseFloat(calculatorState.commitmentsVisaAmount || '0')

    const deductedAmount = salaryAmount * (deductionPercent / 100)
    const totalObligations = obl1 + obl2 + (visa * 0.05)
    const finalAmount = deductedAmount - totalObligations

    return {
      deductedAmount,
      finalAmount,
      totalObligations
    }
  }

  // Calculate tax removal
  const calculateTaxRemoval = () => {
    const price = parseFloat(calculatorState.taxRemovalPrice || '0')
    const priceWithoutTax = price / 1.15
    const taxAmount = price - priceWithoutTax

    return {
      originalPrice: price,
      priceWithoutTax,
      taxAmount,
    }
  }

  // Auto-calculate deduction percentage based on obligation types
  useEffect(() => {
    if (calculatorType === 'COMMITMENTS' && calculatorState.commitmentsObligationTypes.length > 0) {
      let calculatedPercentage = 0
      
      if (calculatorState.commitmentsObligationTypes.length === 1) {
        if (calculatorState.commitmentsObligationTypes.includes('شخصي')) {
          calculatedPercentage = 45
        } else if (calculatorState.commitmentsObligationTypes.includes('عقاري غير مدعوم')) {
          calculatedPercentage = 55
        } else if (calculatorState.commitmentsObligationTypes.includes('عقاري مدعوم')) {
          calculatedPercentage = 65
        }
      } else {
        const hasPersonal = calculatorState.commitmentsObligationTypes.includes('شخصي')
        const hasSupported = calculatorState.commitmentsObligationTypes.includes('عقاري مدعوم')
        const hasUnsupported = calculatorState.commitmentsObligationTypes.includes('عقاري غير مدعوم')
        
        if (hasSupported && hasPersonal) {
          calculatedPercentage = 65
        } else if (hasSupported && hasUnsupported) {
          calculatedPercentage = 65
        } else if (hasUnsupported && hasPersonal) {
          calculatedPercentage = 55
        } else if (hasUnsupported) {
          calculatedPercentage = 55
        } else if (hasSupported) {
          calculatedPercentage = 65
        }
      }
      
      setCalculatorState(prev => ({
        ...prev,
        commitmentsDeductionPercentage: calculatedPercentage.toString()
      }))
    }
  }, [calculatorState.commitmentsObligationTypes, calculatorType])

  const handleObligationTypeChange = (type: string, checked: boolean) => {
    const currentTypes = calculatorState.commitmentsObligationTypes || []
    if (checked) {
      setCalculatorState(prev => ({
        ...prev,
        commitmentsObligationTypes: [...currentTypes, type]
      }))
    } else {
      setCalculatorState(prev => ({
        ...prev,
        commitmentsObligationTypes: currentTypes.filter(t => t !== type)
      }))
    }
  }

  const clearCalculator = () => {
    setCalculatorState({
      type: calculatorType,
      cashCarPrice: '',
      cashPlatePrice: '',
      cashShippingPrice: '',
      cashAdditionalPrice: '',
      commitmentsSalary: '',
      commitmentsSalaryBankId: '',
      commitmentsWorkOrganization: '',
      commitmentsAge: '',
      commitmentsObligationTypes: [],
      commitmentsDeductionPercentage: '',
      commitmentsObligation1: '',
      commitmentsObligation2: '',
      commitmentsVisaAmount: '',
      taxRemovalPrice: '',
    })
  }

  const cashPrices = calculatorType === 'CASH' ? calculateCashPrices() : null
  const commitmentsAmounts = calculatorType === 'COMMITMENTS' ? calculateCommitmentsAmounts() : null
  const taxRemoval = calculatorType === 'TAX_REMOVAL' ? calculateTaxRemoval() : null

  return (
    <div className="relative">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-8">المعادلات</h1>
        
        {/* 3 sections in a row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* حسبة السيارة كاش */}
          <div className="border-2 border-blue-200 rounded-lg p-4 bg-blue-50">
            <h3 className="text-lg font-bold text-blue-900 mb-4">حسبة السيارة كاش</h3>
            <div className="space-y-3 text-sm text-gray-700">
              <p>• سعر السيارة + الشحن + الزيادة</p>
              <p>• حساب الضريبة 15%</p>
              <p>• السعر شامل اللوح (بدون ضريبة)</p>
              <p>• السعر الإجمالي (شامل كل شيء)</p>
            </div>
            <button
              onClick={() => {
                setCalculatorType('CASH')
                setIsCalculatorOpen(true)
              }}
              className="mt-4 w-full btn-primary"
            >
              فتح الحاسبة
            </button>
          </div>

          {/* حسبة الالتزامات */}
          <div className="border-2 border-orange-200 rounded-lg p-4 bg-orange-50">
            <h3 className="text-lg font-bold text-orange-900 mb-4">حسبة الالتزامات</h3>
            <div className="space-y-3 text-sm text-gray-700">
              <p>• راتب العميل</p>
              <p>• نوع الالتزام ونسبة الاستقطاع</p>
              <p>• حساب الالتزامات (التزام 1 + التزام 2 + الفيزا × 0.05)</p>
              <p>• المبلغ المستقطع بعد خصم الالتزامات</p>
            </div>
            <button
              onClick={() => {
                setCalculatorType('COMMITMENTS')
                setIsCalculatorOpen(true)
              }}
              className="mt-4 w-full btn-primary"
            >
              فتح الحاسبة
            </button>
          </div>

          {/* إزالة الضريبة من سعر السيارة */}
          <div className="border-2 border-green-200 rounded-lg p-4 bg-green-50">
            <h3 className="text-lg font-bold text-green-900 mb-4">إزالة الضريبة من سعر السيارة</h3>
            <div className="space-y-3 text-sm text-gray-700">
              <p>• إدخال السعر شامل الضريبة</p>
              <p>• قسمة القيمة على 1.15</p>
              <p>• عرض السعر بدون ضريبة</p>
              <p>• عرض مبلغ الضريبة</p>
            </div>
            <button
              onClick={() => {
                setCalculatorType('TAX_REMOVAL')
                setIsCalculatorOpen(true)
              }}
              className="mt-4 w-full btn-primary"
            >
              فتح الحاسبة
            </button>
          </div>
        </div>
      </div>

      {/* Floating Calculator Button */}
      <button
        onClick={() => setIsCalculatorOpen(!isCalculatorOpen)}
        className="fixed bottom-6 left-6 z-50 w-14 h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg flex items-center justify-center transition-all duration-300 hover:scale-110"
        aria-label="فتح الحاسبة"
      >
        <CalculatorIcon className="h-6 w-6" />
      </button>

      {/* Calculator Window (Facebook-like chat) */}
      {isCalculatorOpen && (
        <div className="fixed bottom-24 left-6 z-50 w-96 bg-white rounded-lg shadow-2xl border border-gray-200 flex flex-col max-h-[600px]">
          {/* Header */}
          <div className="bg-blue-600 text-white px-4 py-3 rounded-t-lg flex items-center justify-between">
            <h3 className="font-bold text-lg">الحاسبة</h3>
            <button
              onClick={() => {
                setIsCalculatorOpen(false)
                setCalculatorType(null)
              }}
              className="text-white hover:text-gray-200"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4">
            {!calculatorType ? (
              <div className="space-y-3">
                <p className="text-sm text-gray-600 mb-4">اختر نوع الحساب:</p>
                <button
                  onClick={() => setCalculatorType('CASH')}
                  className="w-full text-right p-3 bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-200 transition-colors"
                >
                  <div className="font-bold text-blue-900">حسبة السيارة كاش</div>
                  <div className="text-sm text-gray-600 mt-1">حساب السعر الكاش مع الضريبة واللوح</div>
                </button>
                <button
                  onClick={() => setCalculatorType('COMMITMENTS')}
                  className="w-full text-right p-3 bg-orange-50 hover:bg-orange-100 rounded-lg border border-orange-200 transition-colors"
                >
                  <div className="font-bold text-orange-900">حسبة الالتزامات</div>
                  <div className="text-sm text-gray-600 mt-1">حساب الالتزامات بناءً على الراتب</div>
                </button>
                <button
                  onClick={() => setCalculatorType('TAX_REMOVAL')}
                  className="w-full text-right p-3 bg-green-50 hover:bg-green-100 rounded-lg border border-green-200 transition-colors"
                >
                  <div className="font-bold text-green-900">إزالة الضريبة</div>
                  <div className="text-sm text-gray-600 mt-1">إزالة الضريبة من السعر (قسمة على 1.15)</div>
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Clear Button */}
                <div className="flex justify-between items-center">
                  <h4 className="font-bold text-gray-900">
                    {calculatorType === 'CASH' && 'حسبة السيارة كاش'}
                    {calculatorType === 'COMMITMENTS' && 'حسبة الالتزامات'}
                    {calculatorType === 'TAX_REMOVAL' && 'إزالة الضريبة'}
                  </h4>
                  <button
                    onClick={clearCalculator}
                    className="flex items-center gap-1 text-sm text-red-600 hover:text-red-700"
                  >
                    <TrashIcon className="h-4 w-4" />
                    مسح
                  </button>
                </div>

                {/* Cash Calculator */}
                {calculatorType === 'CASH' && (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">سعر السيارة بطاقة</label>
                      <input
                        type="number"
                        step="0.01"
                        value={calculatorState.cashCarPrice}
                        onChange={(e) => setCalculatorState(prev => ({ ...prev, cashCarPrice: e.target.value }))}
                        className="input"
                        placeholder="0.00"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">سعر اللوح</label>
                      <input
                        type="number"
                        step="0.01"
                        value={calculatorState.cashPlatePrice}
                        onChange={(e) => setCalculatorState(prev => ({ ...prev, cashPlatePrice: e.target.value }))}
                        className="input"
                        placeholder="0.00"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">سعر الشحن</label>
                      <input
                        type="number"
                        step="0.01"
                        value={calculatorState.cashShippingPrice}
                        onChange={(e) => setCalculatorState(prev => ({ ...prev, cashShippingPrice: e.target.value }))}
                        className="input"
                        placeholder="0.00"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">زيادة إضافية</label>
                      <input
                        type="number"
                        step="0.01"
                        value={calculatorState.cashAdditionalPrice}
                        onChange={(e) => setCalculatorState(prev => ({ ...prev, cashAdditionalPrice: e.target.value }))}
                        className="input"
                        placeholder="0.00"
                      />
                    </div>

                    {cashPrices && (cashPrices.priceWithoutTax > 0 || cashPrices.totalWithPlateNoTax > 0) && (
                      <div className="mt-4 bg-white rounded-lg p-3 border-2 border-blue-300 space-y-2 text-sm">
                        <div className="flex justify-between py-1 border-b border-gray-200">
                          <span className="text-gray-700">سعر السيارة + الشحن + الزيادة:</span>
                          <span className="font-bold">{cashPrices.priceWithoutTax.toLocaleString()} ريال</span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-gray-200">
                          <span className="text-gray-700">الضريبة (15%):</span>
                          <span className="font-bold text-orange-600">{cashPrices.tax.toLocaleString()} ريال</span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-gray-200 bg-green-50 px-2 rounded">
                          <span className="text-gray-700 font-medium">السعر شامل اللوح (بدون ضريبة):</span>
                          <span className="font-bold text-green-700">{cashPrices.totalWithPlateNoTax.toLocaleString()} ريال</span>
                        </div>
                        <div className="flex justify-between py-1 bg-blue-100 px-2 rounded">
                          <span className="text-gray-900 font-bold">السعر الإجمالي (شامل كل شيء):</span>
                          <span className="font-bold text-blue-700 text-lg">{cashPrices.totalWithPlateAndTax.toLocaleString()} ريال</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Commitments Calculator */}
                {calculatorType === 'COMMITMENTS' && (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">راتب العميل</label>
                      <input
                        type="number"
                        step="0.01"
                        value={calculatorState.commitmentsSalary}
                        onChange={(e) => setCalculatorState(prev => ({ ...prev, commitmentsSalary: e.target.value }))}
                        className="input"
                        placeholder="0.00"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">البنك الذي ينزل عليه الراتب</label>
                      <select
                        value={calculatorState.commitmentsSalaryBankId}
                        onChange={(e) => setCalculatorState(prev => ({ ...prev, commitmentsSalaryBankId: e.target.value }))}
                        className="input"
                      >
                        <option value="">اختر البنك</option>
                        {banksData?.map((bank) => (
                          <option key={bank.id} value={bank.id}>{bank.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">جهة العمل</label>
                      <select
                        value={calculatorState.commitmentsWorkOrganization}
                        onChange={(e) => setCalculatorState(prev => ({ ...prev, commitmentsWorkOrganization: e.target.value }))}
                        className="input"
                      >
                        <option value="">اختر جهة العمل</option>
                        {workOrganizationOptions.map((option) => (
                          <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">العمر</label>
                      <input
                        type="number"
                        value={calculatorState.commitmentsAge}
                        onChange={(e) => setCalculatorState(prev => ({ ...prev, commitmentsAge: e.target.value }))}
                        className="input"
                        placeholder="مثال: 35"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">نوع الالتزام (يمكن اختيار أكثر من خيار)</label>
                      <div className="flex gap-4 flex-wrap">
                        {obligationTypeOptions.map((option) => (
                          <label key={option.id} className="flex items-center">
                            <input
                              type="checkbox"
                              checked={calculatorState.commitmentsObligationTypes?.includes(option.id) || false}
                              onChange={(e) => handleObligationTypeChange(option.id, e.target.checked)}
                              className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                            />
                            <span className="mr-2 text-sm text-gray-700">{option.label}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">نسبة الاستقطاع (%)</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        max="100"
                        value={calculatorState.commitmentsDeductionPercentage}
                        onChange={(e) => setCalculatorState(prev => ({ ...prev, commitmentsDeductionPercentage: e.target.value }))}
                        className="input"
                        placeholder="مثال: 33.5"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">التزام 1</label>
                      <input
                        type="number"
                        step="0.01"
                        value={calculatorState.commitmentsObligation1}
                        onChange={(e) => setCalculatorState(prev => ({ ...prev, commitmentsObligation1: e.target.value }))}
                        className="input"
                        placeholder="0.00"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">التزام 2</label>
                      <input
                        type="number"
                        step="0.01"
                        value={calculatorState.commitmentsObligation2}
                        onChange={(e) => setCalculatorState(prev => ({ ...prev, commitmentsObligation2: e.target.value }))}
                        className="input"
                        placeholder="0.00"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">الفيزا</label>
                      <input
                        type="number"
                        step="0.01"
                        value={calculatorState.commitmentsVisaAmount}
                        onChange={(e) => setCalculatorState(prev => ({ ...prev, commitmentsVisaAmount: e.target.value }))}
                        className="input"
                        placeholder="0.00"
                      />
                    </div>

                    {commitmentsAmounts && (commitmentsAmounts.deductedAmount > 0 || commitmentsAmounts.finalAmount !== 0) && (
                      <div className="mt-4 bg-white rounded-lg p-3 border-2 border-orange-300">
                        <h5 className="text-sm font-bold text-orange-900 mb-3">الحسابات التلقائية:</h5>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between py-1 border-b border-gray-200">
                            <span className="text-gray-700">المبلغ المستقطع (الراتب × النسبة):</span>
                            <span className="font-bold text-blue-600">{commitmentsAmounts.deductedAmount.toLocaleString()} ريال</span>
                          </div>
                          <div className="flex justify-between py-1 border-b border-gray-200">
                            <span className="text-gray-700">إجمالي الالتزامات + (الفيزا × 0.05):</span>
                            <span className="font-bold text-red-600">{commitmentsAmounts.totalObligations.toLocaleString()} ريال</span>
                          </div>
                          <div className="flex justify-between py-1 bg-green-100 px-2 rounded">
                            <span className="text-gray-900 font-bold">المبلغ المستقطع بعد خصم الالتزامات:</span>
                            <span className="font-bold text-green-700 text-lg">{commitmentsAmounts.finalAmount.toLocaleString()} ريال</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Tax Removal Calculator */}
                {calculatorType === 'TAX_REMOVAL' && (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">السعر شامل الضريبة</label>
                      <input
                        type="number"
                        step="0.01"
                        value={calculatorState.taxRemovalPrice}
                        onChange={(e) => setCalculatorState(prev => ({ ...prev, taxRemovalPrice: e.target.value }))}
                        className="input"
                        placeholder="مثال: 100000"
                      />
                    </div>

                    {taxRemoval && taxRemoval.originalPrice > 0 && (
                      <div className="mt-4 bg-white rounded-lg p-3 border-2 border-green-300">
                        <h5 className="text-sm font-bold text-green-900 mb-3">النتائج:</h5>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between py-1 border-b border-gray-200">
                            <span className="text-gray-700">السعر الأصلي (شامل الضريبة):</span>
                            <span className="font-bold">{taxRemoval.originalPrice.toLocaleString()} ريال</span>
                          </div>
                          <div className="flex justify-between py-1 border-b border-gray-200">
                            <span className="text-gray-700">مبلغ الضريبة:</span>
                            <span className="font-bold text-orange-600">{taxRemoval.taxAmount.toLocaleString()} ريال</span>
                          </div>
                          <div className="flex justify-between py-1 bg-green-100 px-2 rounded">
                            <span className="text-gray-900 font-bold">السعر بدون ضريبة:</span>
                            <span className="font-bold text-green-700 text-lg">{taxRemoval.priceWithoutTax.toLocaleString()} ريال</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Back button */}
                <button
                  onClick={() => setCalculatorType(null)}
                  className="w-full mt-4 btn-outline"
                >
                  العودة للخيارات
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
