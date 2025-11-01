import { useState, useEffect, useMemo } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import toast from 'react-hot-toast'
import { requestsService } from '../services/requestsService'
import { banksService } from '../services/banksService'
import { ArrowLeftIcon, CheckIcon } from '@heroicons/react/24/outline'

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

// Schema for installment details
const installmentSchema = z.object({
  carName: z.string().optional(),
  carPrice: z.string().optional(),
  additionalFees: z.string().optional(),
  shipping: z.string().optional(),
  registration: z.string().optional(),
  otherAdditions: z.string().optional(),
  plateNumber: z.string().optional(),
  workOrganization: z.string().optional(),
  age: z.string().optional(),
  salaryBankId: z.string().optional(),
  salary: z.string().optional(),
  obligationTypes: z.array(z.string()).optional(),
  deductionPercentage: z.string().optional(),
  obligation1: z.string().optional(),
  obligation2: z.string().optional(),
  visaAmount: z.string().optional(),
  insurancePercentage: z.string().optional(),
  hasServiceStop: z.boolean().optional(),
  financingBankId: z.string().optional(),
  downPaymentPercentage: z.string().optional(),
  finalPaymentPercentage: z.string().optional(),
  profitMargin: z.string().optional(),
  installmentMonths: z.string().optional(),
})

const requestSchema = z.object({
  price: z.string().optional(),
}).merge(installmentSchema)

type RequestForm = z.infer<typeof requestSchema>

export default function EditRequest() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const { data: request, isLoading } = useQuery(
    ['request', id],
    () => requestsService.getRequest(id!),
    { enabled: !!id }
  )

  const { data: banksData } = useQuery('banks', banksService.getBanks)

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    control,
    formState: { errors, isSubmitting },
  } = useForm<RequestForm>({
    resolver: zodResolver(requestSchema),
  })

  const watchedValues = watch()

  // Watch form values
  const financingBankId = useWatch({ control, name: 'financingBankId' })
  const salaryBankId = useWatch({ control, name: 'salaryBankId' })
  const workOrganization = useWatch({ control, name: 'workOrganization' })
  const carName = useWatch({ control, name: 'carName' })

  // Fill form with existing data
  useEffect(() => {
    if (request && request.installmentDetails) {
      const details = request.installmentDetails
      setValue('price', request.price?.toString() || '')
      setValue('carName', details.carName || '')
      setValue('carPrice', details.carPrice?.toString() || '')
      setValue('additionalFees', details.additionalFees?.toString() || '')
      setValue('shipping', details.shipping?.toString() || '')
      setValue('registration', details.registration?.toString() || '')
      setValue('otherAdditions', details.otherAdditions?.toString() || '')
      setValue('plateNumber', details.plateNumber?.toString() || '')
      setValue('workOrganization', details.workOrganization || '')
      setValue('age', details.age?.toString() || '')
      setValue('salaryBankId', details.salaryBankId || '')
      setValue('salary', details.salary?.toString() || '')
      setValue('deductionPercentage', details.deductionPercentage?.toString() || '')
      setValue('obligation1', details.obligation1?.toString() || '')
      setValue('obligation2', details.obligation2?.toString() || '')
      setValue('visaAmount', details.visaAmount?.toString() || '')
      setValue('insurancePercentage', details.insurancePercentage?.toString() || '')
      setValue('hasServiceStop', details.hasServiceStop || false)
      setValue('financingBankId', details.financingBankId || '')
      setValue('downPaymentPercentage', details.downPaymentPercentage?.toString() || '')
      setValue('finalPaymentPercentage', details.finalPaymentPercentage?.toString() || '')
      setValue('profitMargin', details.profitMargin?.toString() || '')
      setValue('installmentMonths', details.installmentMonths?.toString() || '60')
    }
  }, [request, setValue])

  // Watch obligationTypes
  const obligationTypes = useWatch({ control, name: 'obligationTypes' })

  // Auto-calculate deduction percentage based on obligation types
  useEffect(() => {
    if (request?.installmentDetails && obligationTypes && obligationTypes.length > 0) {
      let calculatedPercentage = 0
      
      if (obligationTypes.length === 1) {
        // نوع واحد فقط
        if (obligationTypes.includes('شخصي')) {
          calculatedPercentage = 45
        } else if (obligationTypes.includes('عقاري غير مدعوم')) {
          calculatedPercentage = 55
        } else if (obligationTypes.includes('عقاري مدعوم')) {
          calculatedPercentage = 65
        }
      } else {
        // أكثر من نوع
        const hasPersonal = obligationTypes.includes('شخصي')
        const hasSupported = obligationTypes.includes('عقاري مدعوم')
        const hasUnsupported = obligationTypes.includes('عقاري غير مدعوم')
        
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
      
      setValue('deductionPercentage', calculatedPercentage.toString())
    }
  }, [obligationTypes, request?.installmentDetails, setValue])

  // Auto-calculate profit margin
  const autoCalculatedRate = useMemo(() => {
    if (!financingBankId || !salaryBankId || !banksData || !workOrganization) return null
    
    const bank = banksData.find(b => b.id === financingBankId)
    
    if (!bank || !bank.bankRates) return null
    
    // Check if banks match (عميل محول)
    const isTransferred = financingBankId === salaryBankId
    
    // Map workOrganization to employerType (values must match BanksFinancing page)
    const employerTypeMap: {[key: string]: string} = {
      'COMPANY': 'PRIVATE',
      'PRIVATE_APPROVED': 'PRIVATE',
      'PRIVATE_UNAPPROVED': 'PRIVATE_UNACCREDITED',
      'GOVERNMENT': 'GOVERNMENT',
      'MILITARY': 'MILITARY',
      'RETIRED': 'RETIRED',
    }
    
    const employerType = employerTypeMap[workOrganization]
    const clientType = isTransferred ? 'TRANSFERRED' : 'NON_TRANSFERRED'
    
    if (!employerType) return null
    
    const rate = bank.bankRates.find(
      r => r.employerType === employerType && r.clientType === clientType
    )
    
    return rate?.rate || null
  }, [financingBankId, salaryBankId, banksData, workOrganization])

  // Set profit margin when autoCalculatedRate changes
  useEffect(() => {
    if (autoCalculatedRate !== null) {
      setValue('profitMargin', autoCalculatedRate.toString())
    }
  }, [autoCalculatedRate, setValue])

  // Watch additional values for calculations
  const carPrice = useWatch({ control, name: 'carPrice' })
  const additionalFees = useWatch({ control, name: 'additionalFees' })
  const shipping = useWatch({ control, name: 'shipping' })
  const registration = useWatch({ control, name: 'registration' })
  const otherAdditions = useWatch({ control, name: 'otherAdditions' })
  const plateNumber = useWatch({ control, name: 'plateNumber' })
  const insurancePercentage = useWatch({ control, name: 'insurancePercentage' })
  const downPaymentPercentage = useWatch({ control, name: 'downPaymentPercentage' })
  const finalPaymentPercentage = useWatch({ control, name: 'finalPaymentPercentage' })
  const profitMargin = useWatch({ control, name: 'profitMargin' })
  const installmentMonths = useWatch({ control, name: 'installmentMonths' })

  // Check if selected bank is Rajhi
  const selectedFinancingBank = banksData && financingBankId ? banksData.find(b => b.id === financingBankId) : null
  const isRajhiSelected = selectedFinancingBank && (
    selectedFinancingBank.name.toLowerCase().includes('راجحي') || 
    selectedFinancingBank.name.toLowerCase().includes('rajhi') ||
    financingBankId === 'rajhi'
  )

  // Calculate car prices
  const calculateInstallmentCarPrices = useMemo(() => {
    const car = parseFloat(carPrice || '0')
    const additional = parseFloat(additionalFees || '0')
    const ship = parseFloat(shipping || '0')
    const reg = parseFloat(registration || '0')
    const other = parseFloat(otherAdditions || '0')
    const plate = parseFloat(plateNumber || '0')
    
    const subtotal = car + additional + ship + reg + other
    const tax = subtotal * 0.15
    const priceWithPlateNoTax = subtotal + plate
    const finalPriceWithTaxAndPlate = subtotal + tax + plate
    
    return {
      priceWithPlateNoTax,
      finalPriceWithTaxAndPlate
    }
  }, [carPrice, additionalFees, shipping, registration, otherAdditions, plateNumber])

  // Calculate financing for non-Rajhi banks
  const calculateFinancing = useMemo(() => {
    if (!calculateInstallmentCarPrices) return null
    
    const finalPriceWithTaxAndPlate = calculateInstallmentCarPrices.finalPriceWithTaxAndPlate
    
    const downPaymentPercent = parseFloat(downPaymentPercentage || '0') / 100
    const finalPaymentPercent = parseFloat(finalPaymentPercentage || '0') / 100
    const months = parseInt(installmentMonths || '60')
    const profit = parseFloat(profitMargin || '0') / 100
    const insurancePercent = parseFloat(insurancePercentage || '0') / 100
    
    if (profit === 0) return null
    
    const downPayment = downPaymentPercent * finalPriceWithTaxAndPlate
    const finalPayment = finalPaymentPercent * finalPriceWithTaxAndPlate
    const financingAmount = finalPriceWithTaxAndPlate - downPayment
    const adminFees = Math.round(Math.min(5000, financingAmount * 0.01) * 1.15)
    const totalInsurancePerYear = ((financingAmount + adminFees) * insurancePercent) + profit
    const monthlyInsurance = totalInsurancePerYear / 12
    const years = months / 12
    const MarginTotal = (financingAmount + adminFees) * profit * years
    const monthlyInstallmentWithoutInsurance = (financingAmount + adminFees + MarginTotal - finalPayment) / months
    const monthlyInstallmentWithInsurance = monthlyInstallmentWithoutInsurance + monthlyInsurance
    const totalAmountPaid = (monthlyInstallmentWithInsurance * months) + downPayment + finalPayment + adminFees
    
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
      months,
      priceWithPlateNoTax: calculateInstallmentCarPrices.priceWithPlateNoTax,
      finalPriceWithTaxAndPlate
    }
  }, [calculateInstallmentCarPrices, downPaymentPercentage, finalPaymentPercentage, installmentMonths, profitMargin, insurancePercentage])

  // Calculate amounts for installment requests
  const calculateInstallmentAmounts = useMemo(() => {
    const salaryAmount = parseFloat(watchedValues.salary || '0')
    const deductionPercent = parseFloat(watchedValues.deductionPercentage || '0')
    const obl1 = parseFloat(watchedValues.obligation1 || '0')
    const obl2 = parseFloat(watchedValues.obligation2 || '0')
    const visa = parseFloat(watchedValues.visaAmount || '0')

    const deductedAmount = salaryAmount * (deductionPercent / 100)
    const totalObligations = obl1 + obl2 + (visa * 0.05)
    const finalAmount = deductedAmount - totalObligations

    return {
      deductedAmount,
      totalObligations,
      finalAmount
    }
  }, [watchedValues.salary, watchedValues.deductionPercentage, watchedValues.obligation1, watchedValues.obligation2, watchedValues.visaAmount])

  const generalFinancing = !isRajhiSelected && financingBankId ? calculateFinancing : null

  const updateRequestMutation = useMutation(
    (data: any) => requestsService.updateRequest(id!, data),
    {
      onSuccess: () => {
        toast.success('تم تحديث الطلب بنجاح')
        queryClient.invalidateQueries(['request', id])
        navigate(`/requests/${id}`)
      },
      onError: (error: any) => {
        toast.error(error.response?.data?.message || 'حدث خطأ أثناء تحديث الطلب')
      },
    }
  )

  const onSubmit = (data: RequestForm) => {
    const updateData = {
      price: data.price ? parseFloat(data.price) : undefined,
      installmentDetails: request?.type === 'INSTALLMENT' ? {
        carName: data.carName || undefined,
        carPrice: data.carPrice ? parseFloat(data.carPrice) : undefined,
        additionalFees: data.additionalFees ? parseFloat(data.additionalFees) : undefined,
        shipping: data.shipping ? parseFloat(data.shipping) : undefined,
        registration: data.registration ? parseFloat(data.registration) : undefined,
        otherAdditions: data.otherAdditions ? parseFloat(data.otherAdditions) : undefined,
        plateNumber: data.plateNumber ? parseFloat(data.plateNumber) : undefined,
        workOrganization: data.workOrganization || undefined,
        age: data.age ? parseInt(data.age) : undefined,
        salaryBankId: data.salaryBankId || undefined,
        salary: data.salary ? parseFloat(data.salary) : undefined,
        deductionPercentage: data.deductionPercentage ? parseFloat(data.deductionPercentage) : undefined,
        obligation1: data.obligation1 ? parseFloat(data.obligation1) : undefined,
        obligation2: data.obligation2 ? parseFloat(data.obligation2) : undefined,
        visaAmount: data.visaAmount ? parseFloat(data.visaAmount) : undefined,
        insurancePercentage: data.insurancePercentage ? parseFloat(data.insurancePercentage) : undefined,
        hasServiceStop: data.hasServiceStop || false,
        financingBankId: data.financingBankId || undefined,
        downPaymentPercentage: data.downPaymentPercentage ? parseFloat(data.downPaymentPercentage) : undefined,
        finalPaymentPercentage: data.finalPaymentPercentage ? parseFloat(data.finalPaymentPercentage) : undefined,
        profitMargin: data.profitMargin ? parseFloat(data.profitMargin) : undefined,
        installmentMonths: data.installmentMonths ? parseInt(data.installmentMonths) : undefined,
      } : undefined,
    }

    updateRequestMutation.mutate(updateData)
  }

  if (isLoading) {
    return <div className="text-center py-8">جاري التحميل...</div>
  }

  if (!request) {
    return <div className="text-center py-8">الطلب غير موجود</div>
  }

  return (
    <div>
      <div className="mb-6">
        <Link
          to={`/requests/${id}`}
          className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700"
        >
          <ArrowLeftIcon className="h-4 w-4 ml-1" />
          العودة لتفاصيل الطلب
        </Link>
      </div>

      <div className="max-w-4xl mx-auto">
        <div className="card">
          <div className="card-header bg-gradient-to-r from-blue-50 to-indigo-50">
            <h1 className="text-2xl font-bold text-gray-900">تعديل الطلب</h1>
            <p className="text-sm text-gray-600 mt-1">{request.title}</p>
          </div>
          <form onSubmit={handleSubmit(onSubmit)} className="card-body space-y-6">
            {/* المبلغ الإجمالي */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">💰 المبلغ الإجمالي</h3>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    المبلغ (ريال)
                  </label>
                  <input
                    {...register('price')}
                    type="number"
                    step="0.01"
                    className="input"
                    placeholder="0.00"
                  />
                </div>
              </div>
            </div>

            {/* تفاصيل التقسيط */}
            {request.type === 'INSTALLMENT' && (
              <div className="space-y-6">
                {/* تفاصيل سعر السيارة */}
                <div className="border-2 border-green-200 rounded-lg p-4 bg-green-50">
                  <h4 className="text-sm font-bold text-green-900 mb-3">🚗 تفاصيل سعر السيارة</h4>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        سعر السيارة الأساسي 🚙
                      </label>
                      <input
                        {...register('carPrice')}
                        type="number"
                        step="0.01"
                        className="input"
                        placeholder="0.00"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        زيادة إضافية ➕
                      </label>
                      <input
                        {...register('additionalFees')}
                        type="number"
                        step="0.01"
                        className="input"
                        placeholder="0.00"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        الشحن 🚚
                      </label>
                      <input
                        {...register('shipping')}
                        type="number"
                        step="0.01"
                        className="input"
                        placeholder="0.00"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        التجيير 📄
                      </label>
                      <input
                        {...register('registration')}
                        type="number"
                        step="0.01"
                        className="input"
                        placeholder="0.00"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        زيادة أخرى 📈
                      </label>
                      <input
                        {...register('otherAdditions')}
                        type="number"
                        step="0.01"
                        className="input"
                        placeholder="0.00"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        اللوح 🏷️
                      </label>
                      <input
                        {...register('plateNumber')}
                        type="number"
                        step="0.01"
                        className="input"
                        placeholder="0.00"
                      />
                    </div>
                  </div>
                </div>

                {/* تحليل ايراد سريع (لا يتم حفظه) */}
                <div className="border-2 border-yellow-300 rounded-lg p-4 bg-yellow-50">
                  <h4 className="text-sm font-bold text-yellow-900 mb-3">تحليل ايراد سريع</h4>
                  {(() => {
                    const car = parseFloat(watchedValues.carPrice || '0') || 0
                    const add = parseFloat(watchedValues.additionalFees || '0') || 0
                    const ship = parseFloat(watchedValues.shipping || '0') || 0
                    const reg = parseFloat(watchedValues.registration || '0') || 0
                    const other = parseFloat(watchedValues.otherAdditions || '0') || 0
                    const plate = parseFloat(watchedValues.plateNumber || '0') || 0
                    const sale = car + add + ship + reg + other + plate - plate + (car + add + ship + reg + other ? plate : 0)
                    const priceWithPlateNoTax = (car + add + ship + reg + other) + plate
                    const supportPct = parseFloat(((watchedValues as any)?._supportPct || '0')) || 0
                    const supportAmount = priceWithPlateNoTax * 1.15 * (supportPct / 100)
                    const expenses = reg + ship + plate + other + supportAmount
                    const cost = parseFloat(((watchedValues as any)?._quickCost || '0')) || 0
                    const net = priceWithPlateNoTax - cost - expenses
                    const pct = priceWithPlateNoTax > 0 ? (net / priceWithPlateNoTax) * 100 : 0
                    return (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-sm font-semibold text-gray-800 mb-1">سعر البيع (تلقائي)</label>
                          <input className="input bg-gray-100" value={`${Math.round(priceWithPlateNoTax).toLocaleString()} ريال`} disabled />
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-gray-800 mb-1">سعر التكلفة أو شراء السيارة</label>
                          <input className="input" type="number" step="0.01" value={(watchedValues as any)?._quickCost || ''} onChange={(e)=>setValue('_quickCost' as any, e.target.value)} placeholder="0.00" />
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-gray-800 mb-1">حسبة الدعم (%)</label>
                          <input className="input" type="number" step="0.01" value={(watchedValues as any)?._supportPct || ''} onChange={(e)=>setValue('_supportPct' as any, e.target.value)} placeholder="أدخل النسبة" />
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-gray-800 mb-1">مصروفات البيع (تلقائي)</label>
                          <input className="input bg-gray-100" value={`${Math.round(expenses).toLocaleString()} ريال`} disabled />
                          <p className="mt-1 text-[11px] text-gray-600">تشمل: التجيير + الشحن + اللوح + زيادة أخرى + حسبة الدعم</p>
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
                    )
                  })()}
                </div>

                {/* بيانات العميل الإضافية */}
                <div className="border-2 border-blue-200 rounded-lg p-4 bg-blue-50">
                  <h4 className="text-sm font-bold text-blue-900 mb-3">👤 بيانات العميل الإضافية</h4>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        السيارة المطلوبة 🚗
                      </label>
                      <input
                        {...register('carName')}
                        type="text"
                        className="input"
                        placeholder="مثال: تويوتا كامري 2024"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        جهة العمل 💼
                      </label>
                      <select {...register('workOrganization')} className="input">
                        <option value="">-- اختر جهة العمل --</option>
                        {workOrganizationOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        العمر 🎂
                      </label>
                      <input
                        {...register('age')}
                        type="number"
                        min="18"
                        max="100"
                        className="input"
                        placeholder="35"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        مبلغ الراتب 💰
                      </label>
                      <input
                        {...register('salary')}
                        type="number"
                        step="0.01"
                        className="input"
                        placeholder="0.00"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        البنك الذي ينزل عليه الراتب 🏛️
                      </label>
                      <select {...register('salaryBankId')} className="input">
                        <option value="">-- اختر البنك --</option>
                        <option value="rajhi">بنك الراجحي</option>
                        {banksData?.map((bank) => (
                          <option key={bank.id} value={bank.id}>
                            {bank.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        نسبة التأمين (%) 🛡️
                      </label>
                      <input
                        {...register('insurancePercentage')}
                        type="number"
                        step="0.01"
                        min="0"
                        max="100"
                        className="input"
                        placeholder="5.5"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        هل يوجد إيقاف خدمات؟ ❌
                      </label>
                      <div className="flex items-center gap-4 flex-wrap">
                        <label className="flex items-center cursor-pointer">
                          <input
                            {...register('hasServiceStop')}
                            type="radio"
                            value="true"
                            className="form-radio text-blue-600 focus:ring-blue-500"
                          />
                          <span className="mr-2 text-sm">نعم</span>
                        </label>
                        <label className="flex items-center cursor-pointer">
                          <input
                            {...register('hasServiceStop')}
                            type="radio"
                            value="false"
                            className="form-radio text-blue-600 focus:ring-blue-500"
                          />
                          <span className="mr-2 text-sm">لا</span>
                      </label>
                      </div>
                    </div>
                  </div>
                </div>

                {/* ملاحظات البنك */}
                {financingBankId && (() => {
                  const selectedBank = financingBankId === 'rajhi' 
                    ? { name: 'بنك الراجحي', notes: 'بنك الراجحي - له معادلات خاصة للحساب. النسب في صفحة البنوك والتمويل تُستخدم للحساب، لكن المعادلة ثابتة.' }
                    : banksData?.find(b => b.id === financingBankId)
                  
                  const isRajhiBank = selectedBank?.name.toLowerCase().includes('راجحي') || 
                                      selectedBank?.name.toLowerCase().includes('rajhi') ||
                                      financingBankId === 'rajhi'
                  
                  return (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <h5 className="text-sm font-bold text-blue-900 mb-2">📝 ملاحظات البنك المختار للتمويل 🏛️</h5>
                      <p className="text-sm text-blue-800 whitespace-pre-wrap">
                        {selectedBank?.notes ? selectedBank.notes : (isRajhiBank ? 'بنك الراجحي - له معادلات خاصة للحساب. النسب في صفحة البنوك والتمويل تُستخدم للحساب، لكن المعادلة ثابتة.' : 'لا توجد ملاحظات خاصة بهذا البنك')}
                      </p>
                    </div>
                  )
                })()}

                {/* الالتزامات */}
                <div className="border-2 border-orange-200 rounded-lg p-4 bg-orange-50">
                  <h4 className="text-sm font-bold text-orange-900 mb-3">📊 الالتزامات</h4>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        نسبة الاستقطاع (%) 📉
                      </label>
                      <input
                        {...register('deductionPercentage')}
                        type="number"
                        step="0.01"
                        min="0"
                        max="100"
                        className="input"
                        placeholder="33.5"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        التزام 1 💳
                      </label>
                      <input
                        {...register('obligation1')}
                        type="number"
                        step="0.01"
                        className="input"
                        placeholder="0.00"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        التزام 2 💳
                      </label>
                      <input
                        {...register('obligation2')}
                        type="number"
                        step="0.01"
                        className="input"
                        placeholder="0.00"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        الفيزا 💳
                      </label>
                      <input
                        {...register('visaAmount')}
                        type="number"
                        step="0.01"
                        className="input"
                        placeholder="0.00"
                      />
                    </div>
                  </div>
                </div>

                {/* معاملات التمويل */}
                <div className="border-2 border-purple-200 rounded-lg p-4 bg-purple-50">
                  <h4 className="text-sm font-bold text-purple-900 mb-3">🏦 معاملات التمويل</h4>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="sm:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        البنك المختار للتمويل 🏛️
                      </label>
                      <select {...register('financingBankId')} className="input">
                        <option value="">-- اختر البنك --</option>
                        {banksData?.map((bank) => (
                          <option key={bank.id} value={bank.id}>
                            {bank.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        نسبة الدفعة الأولى (%) 💰
                      </label>
                      <input
                        {...register('downPaymentPercentage')}
                        type="number"
                        step="0.01"
                        min="0"
                        max="100"
                        className="input"
                        placeholder="15"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        نسبة الدفعة الأخيرة (%) 🏁
                      </label>
                      <input
                        {...register('finalPaymentPercentage')}
                        type="number"
                        step="0.01"
                        min="0"
                        max="100"
                        className="input"
                        placeholder="10"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        هامش الربح السنوي (%) 📈
                      </label>
                      <input
                        {...register('profitMargin')}
                        type="number"
                        step="0.01"
                        min="0"
                        max="100"
                        className="input"
                        placeholder="7.5"
                      />
                      {autoCalculatedRate !== null ? (
                        <p className="mt-1 text-xs text-green-600">
                          ✓ تم حسابها تلقائياً: {autoCalculatedRate}% (يمكنك تعديلها إذا لزم الأمر)
                        </p>
                      ) : financingBankId && salaryBankId && workOrganization && (
                        <p className="mt-1 text-xs text-gray-500">
                          ℹ️ قم بإدخال النسبة يدوياً أو تأكد من وجود النسبة للبنك وجهة العمل المختارة
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        عدد أشهر التقسيط 📅
                      </label>
                      <select {...register('installmentMonths')} className="input">
                        <option value="12">12 شهر (سنة واحدة)</option>
                        <option value="24">24 شهر (سنتان)</option>
                        <option value="36">36 شهر (3 سنوات)</option>
                        <option value="48">48 شهر (4 سنوات)</option>
                        <option value="60">60 شهر (5 سنوات)</option>
                        <option value="72">72 شهر (6 سنوات)</option>
                        <option value="84">84 شهر (7 سنوات)</option>
                      </select>
                    </div>
                  </div>

                  {/* عرض نتائج التمويل لجميع البنوك (غير الراجحي) */}
                  {generalFinancing && (
                    <div className="mt-4 p-4 bg-white rounded-lg border border-purple-300">
                      <h5 className="text-sm font-bold text-purple-800 mb-3">💳 نتائج تمويل جميع البنوك</h5>
                      <div className="grid grid-cols-1 gap-3 text-sm">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="p-2 bg-gray-50 rounded">
                            <span className="text-gray-600">سعر السيارة (شامل اللوح بدون ضريبة):</span>
                            <span className="font-bold text-blue-600 block">{generalFinancing.priceWithPlateNoTax.toLocaleString()} ريال</span>
                          </div>
                          <div className="p-2 bg-gray-50 rounded">
                            <span className="text-gray-600">مبلغ التمويل:</span>
                            <span className="font-bold text-green-600 block">{generalFinancing.financingAmount.toLocaleString()} ريال</span>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="p-2 bg-gray-50 rounded">
                            <span className="text-gray-600">الدفعة الأولى:</span>
                            <span className="font-bold text-green-600 block">{Math.round(generalFinancing.downPayment).toLocaleString()} ريال</span>
                          </div>
                          <div className="p-2 bg-gray-50 rounded">
                            <span className="text-gray-600">الرسوم الإدارية:</span>
                            <span className="font-bold text-orange-600 block">{generalFinancing.adminFees.toLocaleString()} ريال</span>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="p-2 bg-gray-50 rounded">
                            <span className="text-gray-600">التأمين الشهري:</span>
                            <span className="font-bold text-yellow-600 block">{Math.round(generalFinancing.monthlyInsurance).toLocaleString()} ريال</span>
                          </div>
                          <div className="p-2 bg-gray-50 rounded">
                            <span className="text-gray-600">القسط الشهري بدون التأمين:</span>
                            <span className="font-bold text-purple-600 block">{Math.round(generalFinancing.monthlyInstallmentWithoutInsurance).toLocaleString()} ريال</span>
                          </div>
                        </div>
                        <div className="p-3 bg-gradient-to-r from-purple-100 to-blue-100 rounded border-l-4 border-purple-500">
                          <div className="flex justify-between items-center">
                            <span className="font-bold text-purple-800">القسط الشهري (مع التأمين):</span>
                            <span className="font-bold text-purple-900 text-lg">
                              {Math.round(generalFinancing.monthlyInstallment).toLocaleString()} ريال
                            </span>
                          </div>
                        </div>
                        {generalFinancing.finalPayment > 0 && (
                          <div className="p-2 bg-blue-50 rounded">
                            <span className="text-gray-600">الدفعة الأخيرة:</span>
                            <span className="font-bold text-blue-600 block">{Math.round(generalFinancing.finalPayment).toLocaleString()} ريال</span>
                          </div>
                        )}
                        <div className="p-3 bg-gradient-to-r from-green-100 to-emerald-100 rounded border-l-4 border-green-500 mt-2">
                          <div className="text-sm">
                            <div className="flex justify-between items-center mb-1">
                              <span className="font-bold text-green-800">إجمالي المبلغ المدفوع:</span>
                              <span className="font-bold text-green-900 text-lg">
                                {Math.round(generalFinancing.totalAmountPaid).toLocaleString()} ريال
                              </span>
                            </div>
                            <div className="text-xs text-gray-600 mt-2">
                              * يشمل الدفعة الأولى + الأقساط الشهرية (مع التأمين) + الدفعة الأخيرة + الرسوم الإدارية
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      {/* تحذير إذا كان القسط الشهري أعلى من المسموح */}
                      {(() => {
                        const monthlyInstallment = generalFinancing?.monthlyInstallment || 0
                        const finalAmount = calculateInstallmentAmounts?.finalAmount || 0
                        const showWarning = monthlyInstallment > 0 && finalAmount > 0 && monthlyInstallment > finalAmount
                        
                        return showWarning ? (
                          <div className="mt-4 bg-red-50 border-2 border-red-300 rounded-lg p-4">
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
                                    <span className="font-bold">القسط الشهري (مع التأمين):</span> {Math.round(monthlyInstallment).toLocaleString()} ريال
                                  </p>
                                  <p className="mb-2">
                                    <span className="font-bold">المبلغ المسموح للعميل:</span> {finalAmount.toLocaleString()} ريال
                                  </p>
                                  <p className="text-red-800 font-medium">
                                    القسط الشهري أعلى من المبلغ المسموح للعميل بعد خصم الالتزامات.
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>
                        ) : null
                      })()}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* أزرار الحفظ */}
            <div className="flex justify-end space-x-4 pt-6 border-t">
              <Link
                to={`/requests/${id}`}
                className="btn-outline"
              >
                إلغاء
              </Link>
              <button
                type="submit"
                disabled={isSubmitting}
                className="btn-primary flex items-center gap-2"
              >
                <CheckIcon className="h-4 w-4" />
                {isSubmitting ? 'جاري الحفظ...' : 'حفظ التعديلات'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
