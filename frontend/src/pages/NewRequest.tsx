import { useState, useEffect, useMemo, useRef } from 'react'
import { useNavigate, Link, useSearchParams } from 'react-router-dom'
import { useMutation, useQuery } from 'react-query'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { requestsService } from '../services/requestsService'
import { clientsService } from '../services/clientsService'
import banksService from '../services/banksService'
import { RequestType, RequestStatus } from '../types'
import { ArrowLeftIcon } from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'

const requestSchema = z.object({
  clientId: z.string().min(1, 'يجب اختيار العميل'),
  requestType: z.enum(['CASH', 'INSTALLMENT']),
  price: z.string().optional(),
  // حقول الكاش
  carPrice: z.string().optional(),
  platePrice: z.string().optional(),
  shippingPrice: z.string().optional(),
  additionalPrice: z.string().optional(),
  // حقول التقسيط
  carName: z.string().optional(),
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
  hasServiceStop: z.union([z.boolean(), z.string()]).optional(),
  financingBankId: z.string().optional(),
  downPaymentPercentage: z.string().optional(),
  finalPaymentPercentage: z.string().optional(),
  profitMargin: z.string().optional(),
  installmentMonths: z.string().optional(),
})

type RequestForm = z.infer<typeof requestSchema>

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

export default function NewRequest() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const preselectedClientId = searchParams.get('clientId')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [clientSearch, setClientSearch] = useState('')

  const {
    register,
    handleSubmit,
    setValue,
    control,
    formState: { errors },
  } = useForm<RequestForm>({
    resolver: zodResolver(requestSchema),
    defaultValues: {
      requestType: 'CASH',
      clientId: preselectedClientId || '',
      obligationTypes: [],
      hasServiceStop: false,
      carName: '',
      workOrganization: '',
      carPrice: '',
      additionalFees: '',
      shipping: '',
      registration: '',
      otherAdditions: '',
      plateNumber: '',
      age: '',
      salaryBankId: '',
      salary: '',
      deductionPercentage: '',
      obligation1: '',
      obligation2: '',
      visaAmount: '',
      insurancePercentage: '',
      financingBankId: '',
      downPaymentPercentage: '',
      finalPaymentPercentage: '',
      profitMargin: '',
      installmentMonths: '',
    },
  })

  // Watch form values
  const watchedValues = useWatch({ control })
  const { 
    requestType, 
    carPrice, 
    platePrice, 
    shippingPrice, 
    additionalPrice,
    // carName,
    // additionalFees,
    // registration,
    // otherAdditions,
    salary,
    salaryBankId,
    financingBankId,
    workOrganization,
    deductionPercentage,
    obligation1,
    obligation2,
    visaAmount,
    obligationTypes
  } = watchedValues

  // Auto-calculate deduction percentage based on obligation types
  useEffect(() => {
    if (requestType === 'INSTALLMENT' && obligationTypes && obligationTypes.length > 0) {
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
  }, [obligationTypes, requestType, setValue])

  // Set defaults when switching to INSTALLMENT: registration = 70, deductionPercentage = 45 (if empty)
  useEffect(() => {
    if (requestType === 'INSTALLMENT') {
      if (!watchedValues.registration || watchedValues.registration === '') {
        setValue('registration', '70')
      }
      if (!watchedValues.deductionPercentage || watchedValues.deductionPercentage === '') {
        setValue('deductionPercentage', '45')
      }
    }
  }, [requestType, watchedValues.registration, watchedValues.deductionPercentage, setValue])

  // Calculate prices for cash requests
  const calculateCashPrices = () => {
    const car = parseFloat(carPrice || '0')
    const plate = parseFloat(platePrice || '0')
    const shipping = parseFloat(shippingPrice || '0')
    const additional = parseFloat(additionalPrice || '0')

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

  // Calculate amounts for installment requests
  const calculateInstallmentAmounts = () => {
    const salaryAmount = parseFloat(salary || '0')
    const deductionPercent = parseFloat(deductionPercentage || '0')
    const obl1 = parseFloat(obligation1 || '0')
    const obl2 = parseFloat(obligation2 || '0')
    const visa = parseFloat(visaAmount || '0')

    const deductedAmount = salaryAmount * (deductionPercent / 100)
    const totalObligations = obl1 + obl2 + (visa * 0.05)
    const finalAmount = deductedAmount - totalObligations

    return {
      deductedAmount,
      finalAmount,
      totalObligations
    }
  }

  // Calculate car prices for installment requests
  const calculateInstallmentCarPrices = () => {
    const carPrice = parseFloat(watchedValues.carPrice || '0')
    const additionalFees = parseFloat(watchedValues.additionalFees || '0')
    const shipping = parseFloat(watchedValues.shipping || '0')
    const registration = parseFloat(watchedValues.registration || '0')
    const otherAdditions = parseFloat(watchedValues.otherAdditions || '0')
    const plateNumber = parseFloat(watchedValues.plateNumber || '0')

    // جمع كل الرسوم ما عدا اللوح
    const subtotal = carPrice + additionalFees + shipping + registration + otherAdditions
    
    // إضافة الضريبة 15%
    const tax = subtotal * 0.15
    const totalWithTax = subtotal + tax
    
    // إضافة اللوح للحصول على السعر النهائي شامل الضريبة واللوح
    const finalPriceWithTaxAndPlate = totalWithTax + plateNumber
    
    // السعر شامل اللوح بدون ضريبة
    const priceWithPlateNoTax = subtotal + plateNumber

    return {
      subtotal,
      tax,
      totalWithTax,
      finalPriceWithTaxAndPlate,
      priceWithPlateNoTax,
      plateNumber
    }
  }

  // Calculate financing details for Rajhi Bank
  const calculateRajhiFinancing = () => {
    const carPriceWithTaxAndPlate = installmentCarPrices?.finalPriceWithTaxAndPlate || 0
    const downPaymentPercentage = parseFloat(watchedValues.downPaymentPercentage || '0') / 100
    const finalPaymentPercentage = parseFloat(watchedValues.finalPaymentPercentage || '0') / 100
    const profitMargin = parseFloat(watchedValues.profitMargin || '0') / 100
    const installmentMonths = parseInt(watchedValues.installmentMonths || '60')
    const insurancePercentage = parseFloat(watchedValues.insurancePercentage || '0') / 100

    // 1. الدفعة الأولى
    const downPayment = downPaymentPercentage * carPriceWithTaxAndPlate

    // 2. مبلغ التمويل
    const financingAmount = carPriceWithTaxAndPlate - downPayment

    // 3. الرسوم الإدارية = ROUND((MIN(5000, مبلغ التمويل * 1%)) * 1.15, 0)
    const adminFees = Math.round(Math.min(5000, financingAmount * 0.01) * 1.15)

    // 4. الدفعة الأخيرة
    const finalPayment = finalPaymentPercentage * carPriceWithTaxAndPlate

    // 5. التأمين للسنة الواحدة
    const annualInsurance = insurancePercentage * 1.15 * carPriceWithTaxAndPlate

    // 6. التأمين على إجمالي السنوات (مع انخفاض قيمة السيارة 15% كل سنة)
    let totalInsuranceAllYears = 0
    let currentCarValue = carPriceWithTaxAndPlate
    const years = Math.ceil(installmentMonths / 12)
    
    for (let year = 1; year <= years; year++) {
      const yearlyInsurance = insurancePercentage * 1.15 * currentCarValue
      totalInsuranceAllYears += yearlyInsurance
      currentCarValue *= 0.85 // انخفاض 15% كل سنة
    }

    // 7. التأمين للشهر الواحد
    const monthlyInsurance = totalInsuranceAllYears / installmentMonths

    // 8. إجمالي التأمين
    const totalInsurance = monthlyInsurance * installmentMonths

    // 9. القسط الشهري باستخدام PMT
    // PMT(rate, nper, pv, fv) = PMT(هامش الربح/12, عدد الأشهر, -مبلغ التمويل, الدفعة الأخيرة)
    const monthlyRate = profitMargin / 12
    const monthlyInstallment = calculatePMT(monthlyRate, installmentMonths, -financingAmount, finalPayment)

    return {
      carPriceWithTaxAndPlate,
      downPayment,
      financingAmount,
      adminFees,
      finalPayment,
      annualInsurance,
      totalInsuranceAllYears,
      monthlyInsurance,
      totalInsurance,
      monthlyInstallment,
      installmentMonths,
      profitMargin: profitMargin * 100 // للعرض كنسبة مئوية
    }
  }

  // PMT function implementation
  const calculatePMT = (rate: number, nper: number, pv: number, fv: number = 0, type: number = 0) => {
    if (rate === 0) {
      return -(pv + fv) / nper
    }
    const pvif = Math.pow(1 + rate, nper)
    const pmt = rate / (pvif - 1) * -(pv * pvif + fv)
    return type ? pmt / (1 + rate) : pmt
  }

  // Calculate financing details for all banks (excluding Rajhi - Rajhi has its own calculation)
  const calculateFinancing = () => {
    if (!installmentCarPrices) return null
    
    // السعر النهائي شامل الضريبة واللوح
    const finalPriceWithTaxAndPlate = installmentCarPrices.finalPriceWithTaxAndPlate || 0
    const priceWithPlateNoTax = installmentCarPrices.priceWithPlateNoTax || 0
    
    const downPaymentPercentage = parseFloat(watchedValues.downPaymentPercentage || '0') / 100
    const finalPaymentPercentage = parseFloat(watchedValues.finalPaymentPercentage || '0') / 100
    const installmentMonths = parseInt(watchedValues.installmentMonths || '60')
    const profitMargin = parseFloat(watchedValues.profitMargin || '0') / 100
    const insurancePercentage = parseFloat(watchedValues.insurancePercentage || '0') / 100
    
    if (profitMargin === 0) return null
    
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
      priceWithPlateNoTax,
      finalPriceWithTaxAndPlate
    }
  }

  // Fetch clients for dropdown
  const { data: clientsData } = useQuery(
    'all-clients',
    () => clientsService.getClients({ limit: 100 })
  )

  // Fetch banks for dropdowns
  const { data: banksData } = useQuery('banks', banksService.getBanks)

  // Auto-calculate financing rate based on bank matching
  const autoCalculatedRate = useMemo(() => {
    if (!financingBankId || !salaryBankId || !banksData || !workOrganization) return null
    
    const bank = banksData.find(b => b.id === financingBankId)
    
    if (!bank || !bank.bankRates) return null
    
    // Check if banks match (عميل محول)
    const isTransferred = financingBankId === salaryBankId
    
    // Map workOrganization to employerType (values must match BanksFinancing page)
    const employerTypeMap: {[key: string]: string} = {
      'COMPANY': 'PRIVATE',                    // شركة → PRIVATE في DB
      'PRIVATE_APPROVED': 'PRIVATE',           // خاص معتمد → PRIVATE في DB
      'PRIVATE_UNAPPROVED': 'PRIVATE_UNACCREDITED', // خاص غير معتمد → PRIVATE_UNACCREDITED في DB
      'GOVERNMENT': 'GOVERNMENT',              // حكومي → GOVERNMENT في DB
      'MILITARY': 'MILITARY',                  // عسكري → MILITARY في DB
      'RETIRED': 'RETIRED',                    // متقاعد → RETIRED في DB
    }
    
    const employerType = employerTypeMap[workOrganization]
    const clientType = isTransferred ? 'TRANSFERRED' : 'NON_TRANSFERRED'
    
    // Find the rate
    if (!employerType) return null
    
    const rate = bank.bankRates.find(
      r => r.employerType === employerType && r.clientType === clientType
    )
    
    return rate?.rate || null
  }, [financingBankId, salaryBankId, banksData, workOrganization])

  // Check if selected bank is Rajhi
  const selectedFinancingBank = banksData && financingBankId ? banksData.find(b => b.id === financingBankId) : null
  const isRajhiSelected = selectedFinancingBank && (
    selectedFinancingBank.name.toLowerCase().includes('راجحي') || 
    selectedFinancingBank.name.toLowerCase().includes('rajhi') ||
    financingBankId === 'rajhi'
  )
  
  const cashPrices = requestType === 'CASH' ? calculateCashPrices() : null
  const installmentAmounts = requestType === 'INSTALLMENT' ? calculateInstallmentAmounts() : null
  const installmentCarPrices = requestType === 'INSTALLMENT' ? calculateInstallmentCarPrices() : null
  const rajhiFinancing = requestType === 'INSTALLMENT' && isRajhiSelected ? calculateRajhiFinancing() : null
  const generalFinancing = requestType === 'INSTALLMENT' && !isRajhiSelected && financingBankId ? calculateFinancing() : null

  // Check if monthly installment exceeds allowed amount
  const monthlyInstallment = rajhiFinancing ? rajhiFinancing.monthlyInstallment : generalFinancing ? generalFinancing.monthlyInstallment : 0
  const finalAmount = installmentAmounts ? installmentAmounts.finalAmount : 0
  const showWarning = monthlyInstallment > 0 && finalAmount > 0 && monthlyInstallment > finalAmount

  // Fetch selected client details
  const { data: selectedClient } = useQuery(
    ['client', watchedValues.clientId],
    () => clientsService.getClient(watchedValues.clientId || ''),
    { enabled: !!watchedValues.clientId && watchedValues.clientId !== '' }
  )

  useEffect(() => {
    if (preselectedClientId) {
      setValue('clientId', preselectedClientId)
    }
  }, [preselectedClientId, setValue])

  // Auto-fill profit margin when all conditions are met
  useEffect(() => {
    if (requestType === 'INSTALLMENT' && autoCalculatedRate !== null && autoCalculatedRate !== undefined) {
      setValue('profitMargin', autoCalculatedRate.toString())
    }
  }, [autoCalculatedRate, requestType, setValue])

  // Load stored client data when client is selected
  useEffect(() => {
    if (selectedClient && requestType === 'INSTALLMENT') {
      try {
        // Load additional data
        if (selectedClient.additionalData) {
          const additionalData = JSON.parse(selectedClient.additionalData)
          if (additionalData.carName) setValue('carName', additionalData.carName)
          if (additionalData.workOrganization) setValue('workOrganization', additionalData.workOrganization)
          if (additionalData.age) setValue('age', additionalData.age.toString())
          if (additionalData.salaryBankId) setValue('salaryBankId', additionalData.salaryBankId)
          if (additionalData.salary) setValue('salary', additionalData.salary.toString())
          if (additionalData.insurancePercentage) setValue('insurancePercentage', additionalData.insurancePercentage.toString())
          if (additionalData.hasServiceStop !== undefined) setValue('hasServiceStop', additionalData.hasServiceStop)
        }

        // Load commitments
        if (selectedClient.commitments) {
          const commitments = JSON.parse(selectedClient.commitments)
          if (commitments.obligationTypes) setValue('obligationTypes', commitments.obligationTypes)
          if (commitments.deductionPercentage) setValue('deductionPercentage', commitments.deductionPercentage.toString())
          if (commitments.obligation1) setValue('obligation1', commitments.obligation1.toString())
          if (commitments.obligation2) setValue('obligation2', commitments.obligation2.toString())
          if (commitments.visaAmount) setValue('visaAmount', commitments.visaAmount.toString())
        }
      } catch (error) {
        console.error('Error loading client data:', error)
      }
    }
  }, [selectedClient?.id, requestType, setValue])

  // Auto-save additional data and commitments with debouncing
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  
  useEffect(() => {
    if (!selectedClient || requestType !== 'INSTALLMENT') return

    // Clear existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
    }

    // Set new timeout to save after 1 second of no changes
    saveTimeoutRef.current = setTimeout(async () => {
      try {
        const additionalData = {
          carName: watchedValues.carName || '',
          workOrganization: watchedValues.workOrganization || '',
          age: watchedValues.age ? parseInt(watchedValues.age) : undefined,
          salaryBankId: watchedValues.salaryBankId || '',
          salary: watchedValues.salary ? parseFloat(watchedValues.salary) : undefined,
          insurancePercentage: watchedValues.insurancePercentage ? parseFloat(watchedValues.insurancePercentage) : undefined,
          hasServiceStop: watchedValues.hasServiceStop || false,
        }

        const commitments = {
          obligationTypes: watchedValues.obligationTypes || [],
          deductionPercentage: watchedValues.deductionPercentage ? parseFloat(watchedValues.deductionPercentage) : undefined,
          obligation1: watchedValues.obligation1 ? parseFloat(watchedValues.obligation1) : undefined,
          obligation2: watchedValues.obligation2 ? parseFloat(watchedValues.obligation2) : undefined,
          visaAmount: watchedValues.visaAmount ? parseFloat(watchedValues.visaAmount) : undefined,
        }

        // Check if there's any data to save
        const hasAdditionalData = Object.values(additionalData).some(v => {
          if (typeof v === 'string') return v !== ''
          if (typeof v === 'number') return v !== 0
          if (typeof v === 'boolean') return v !== false
          return v !== undefined && v !== null
        })
        const hasCommitments = Object.values(commitments).some(v => {
          if (Array.isArray(v)) return v.length > 0
          if (typeof v === 'string') return v !== ''
          if (typeof v === 'number') return v !== 0
          return v !== undefined && v !== null
        })

        if (hasAdditionalData || hasCommitments) {
          await clientsService.updateClient(selectedClient.id, {
            additionalData: hasAdditionalData ? JSON.stringify(additionalData) : undefined,
            commitments: hasCommitments ? JSON.stringify(commitments) : undefined,
          })
          // Silently save - no toast to avoid annoying user
        }
      } catch (error) {
        console.error('Error auto-saving client data:', error)
      }
    }, 1000) // Wait 1 second after last change

    // Cleanup function
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }
    }
  }, [
    watchedValues.carName,
    watchedValues.workOrganization,
    watchedValues.age,
    watchedValues.salaryBankId,
    watchedValues.salary,
    watchedValues.insurancePercentage,
    watchedValues.hasServiceStop,
    watchedValues.obligationTypes,
    watchedValues.deductionPercentage,
    watchedValues.obligation1,
    watchedValues.obligation2,
    watchedValues.visaAmount,
    selectedClient?.id,
    requestType,
  ])

  const createRequestMutation = useMutation(
    (data: RequestForm) => {
      console.log('Creating request with data:', data)
      
      // Find the client to generate title
      const client = clientsData?.clients?.find(c => c.id === data.clientId)
      console.log('Found client:', client)
      const title = client ? `${client.name} - ${client.phonePrimary}` : ''
      console.log('Generated title:', title)
      
      let customFields: any = {}
      let finalPrice = data.price ? parseFloat(data.price) : undefined
      let installmentDetails = null

      if (data.requestType === 'CASH' && cashPrices) {
        customFields = {
          carName: data.carName || '',
          carPrice: parseFloat(data.carPrice || '0'),
          platePrice: parseFloat(data.platePrice || '0'),
          shippingPrice: parseFloat(data.shippingPrice || '0'),
          additionalPrice: parseFloat(data.additionalPrice || '0'),
          priceWithoutTax: cashPrices.priceWithoutTax,
          tax: cashPrices.tax,
          totalWithTax: cashPrices.totalWithTax,
          totalWithPlateNoTax: cashPrices.totalWithPlateNoTax,
          totalWithPlateAndTax: cashPrices.totalWithPlateAndTax,
        }
        // persist quick cost/support percent if provided
        const quickCost = (watchedValues as any)?._quickCost
        const supportPct = (watchedValues as any)?._supportPct
        if (quickCost) customFields.quickCost = parseFloat(quickCost)
        if (supportPct) customFields.supportPct = parseFloat(supportPct)
        finalPrice = cashPrices.totalWithPlateAndTax
      } else if (data.requestType === 'INSTALLMENT') {
        const amounts = installmentAmounts || { deductedAmount: 0, finalAmount: 0 }
        
        installmentDetails = {
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
          obligationTypes: data.obligationTypes || [],
          deductionPercentage: data.deductionPercentage ? parseFloat(data.deductionPercentage) : undefined,
          obligation1: data.obligation1 ? parseFloat(data.obligation1) : undefined,
          obligation2: data.obligation2 ? parseFloat(data.obligation2) : undefined,
          visaAmount: data.visaAmount ? parseFloat(data.visaAmount) : undefined,
          deductedAmount: amounts.deductedAmount || undefined,
          finalAmount: amounts.finalAmount || undefined,
          insurancePercentage: data.insurancePercentage ? parseFloat(data.insurancePercentage) : undefined,
          hasServiceStop: typeof data.hasServiceStop === 'string' 
            ? data.hasServiceStop === 'true' 
            : (data.hasServiceStop || false),
          // معاملات التمويل
          financingBankId: data.financingBankId || undefined,
          downPaymentPercentage: data.downPaymentPercentage ? parseFloat(data.downPaymentPercentage) : undefined,
          finalPaymentPercentage: data.finalPaymentPercentage ? parseFloat(data.finalPaymentPercentage) : undefined,
          profitMargin: data.profitMargin ? parseFloat(data.profitMargin) : undefined,
          installmentMonths: data.installmentMonths ? parseInt(data.installmentMonths) : undefined,
        }
        // allow saving quick cost/support percent under customFields for installment too
        const quickCost = (watchedValues as any)?._quickCost
        const supportPct = (watchedValues as any)?._supportPct
        if (quickCost || supportPct) {
          customFields = {
            ...(Object.keys(customFields).length ? customFields : {}),
            ...(quickCost ? { quickCost: parseFloat(quickCost) } : {}),
            ...(supportPct ? { supportPct: parseFloat(supportPct) } : {}),
          }
        }
      }
      
      const requestData = {
        clientId: data.clientId,
        title: title,
        type: data.requestType === 'CASH' ? RequestType.CASH : RequestType.INSTALLMENT,
        initialStatus: RequestStatus.AWAITING_CLIENT,
        price: finalPrice,
        customFields: Object.keys(customFields).length > 0 ? JSON.stringify(customFields) : undefined,
        installmentDetails: installmentDetails || undefined,
      }
      
      console.log('Request data to send:', requestData)
      console.log('Installment details:', installmentDetails)
      
      return requestsService.createRequest(requestData)
    },
    {
      onSuccess: (request) => {
        toast.success('تم إنشاء الطلب بنجاح')
        navigate(`/requests/${request.id}`)
      },
      onError: (error: any) => {
        toast.error(error.response?.data?.message || 'حدث خطأ أثناء إنشاء الطلب')
      },
      onSettled: () => {
        setIsSubmitting(false)
      },
    }
  )

  const onSubmit = (data: RequestForm) => {
    console.log('Form data:', data)
    setIsSubmitting(true)
    createRequestMutation.mutate(data)
  }
  
  const onError = (errors: any) => {
    console.error('Form validation errors:', errors)
    console.error('Form errors details:', JSON.stringify(errors, null, 2))
    
    // عرض الخطأ الأول في toast
    const firstError = Object.keys(errors)[0]
    if (firstError && errors[firstError]?.message) {
      toast.error(`${errors[firstError].message}`)
    } else {
      toast.error('يرجى التحقق من صحة البيانات المدخلة')
    }
  }

  const handleObligationTypeChange = (type: string, checked: boolean) => {
    const currentTypes = watchedValues.obligationTypes || []
    if (checked) {
      setValue('obligationTypes', [...currentTypes, type])
    } else {
      setValue('obligationTypes', currentTypes.filter(t => t !== type))
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

      <div className="max-w-4xl mx-auto">
        <div className="card">
          <div className="card-header">
            <h1 className="text-xl font-bold text-gray-900">إنشاء طلب جديد</h1>
          </div>
          <div className="card-body">
            <form 
              onSubmit={handleSubmit(onSubmit, onError)} 
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.target as HTMLElement).tagName !== 'BUTTON' && (e.target as HTMLElement).tagName !== 'TEXTAREA') {
                  e.preventDefault()
                }
              }}
              className="space-y-6"
            >
              {/* عرض الأخطاء العامة */}
              {Object.keys(errors).length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-md p-4">
                  <h3 className="text-sm font-bold text-red-800 mb-2">يرجى إصلاح الأخطاء التالية:</h3>
                  <ul className="list-disc list-inside text-sm text-red-700">
                    {errors.clientId && <li>{errors.clientId.message}</li>}
                    {errors.requestType && <li>{errors.requestType.message}</li>}
                    {errors.carPrice && <li>سعر السيارة: {errors.carPrice.message}</li>}
                  </ul>
                </div>
              )}
              
              {/* اختيار العميل */}
              <div>
                <label htmlFor="clientId" className="block text-sm font-medium text-gray-700 mb-2">
                  العميل <span className="text-red-500">*</span>
                </label>
                {!preselectedClientId && (
                  <input
                    type="text"
                    placeholder="ابحث عن عميل..."
                    value={clientSearch}
                    onChange={(e) => setClientSearch(e.target.value)}
                    className="input mb-2"
                  />
                )}
                <select
                  {...register('clientId')}
                  className="input"
                  disabled={!!preselectedClientId}
                >
                  <option value="">اختر العميل</option>
                  {clientsData?.clients
                    ?.filter((client) => 
                      !clientSearch || 
                      client.name.toLowerCase().includes(clientSearch.toLowerCase()) ||
                      client.phonePrimary.includes(clientSearch)
                    )
                    ?.map((client) => (
                      <option key={client.id} value={client.id}>
                        {client.name} - {client.phonePrimary}
                      </option>
                    ))}
                </select>
                {errors.clientId && (
                  <p className="mt-1 text-sm text-red-600">{errors.clientId.message}</p>
                )}

                {selectedClient && (
                  <div className="mt-2 p-3 bg-gray-50 rounded-md">
                    <p className="text-sm text-gray-700">
                      <strong>الاسم:</strong> {selectedClient.name}
                    </p>
                    <p className="text-sm text-gray-700">
                      <strong>الهاتف:</strong> {selectedClient.phonePrimary}
                    </p>
                  </div>
                )}
              </div>

              {/* المدينة - أعلى نوع الطلب */}
              {selectedClient && selectedClient.city && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    المدينة
                  </label>
                  <div className="input bg-gray-100 cursor-not-allowed">
                    {selectedClient.city}
                  </div>
                </div>
              )}

              {/* نوع الطلب */}
              <div>
                <label htmlFor="requestType" className="block text-sm font-medium text-gray-700 mb-2">
                  نوع الطلب <span className="text-red-500">*</span>
                </label>
                <select
                  {...register('requestType')}
                  className="input"
                >
                  <option value="CASH">كاش</option>
                  <option value="INSTALLMENT">تقسيط</option>
                </select>
                {errors.requestType && (
                  <p className="mt-1 text-sm text-red-600">{errors.requestType.message}</p>
                )}
              </div>


              {/* حقول حسب نوع الطلب */}
              {requestType === 'CASH' ? (
                // حقول الكاش
                <div className="space-y-4 border-2 border-blue-200 rounded-lg p-4 bg-blue-50">
                  <h4 className="text-sm font-bold text-blue-900 mb-3">تفاصيل الكاش</h4>
                  
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="sm:col-span-2">
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
                        سعر السيارة بطاقة 🚗
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
                        سعر اللوح 🔖
                      </label>
                      <input
                        {...register('platePrice')}
                        type="number"
                        step="0.01"
                        className="input"
                        placeholder="0.00"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        سعر الشحن 🚚
                      </label>
                      <input
                        {...register('shippingPrice')}
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
                        {...register('additionalPrice')}
                        type="number"
                        step="0.01"
                        className="input"
                        placeholder="0.00"
                      />
                    </div>
                  </div>

                  {/* عرض الحسابات */}
                  {cashPrices && (cashPrices.priceWithoutTax > 0 || cashPrices.totalWithPlateNoTax > 0) && (
                    <div className="mt-4 bg-white rounded-lg p-4 border-2 border-blue-300 space-y-3">
                      <h5 className="text-sm font-bold text-blue-900 mb-3">الحسابات التلقائية:</h5>
                      
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between py-2 border-b border-gray-200">
                          <span className="text-gray-700">سعر السيارة + الشحن + الزيادة:</span>
                          <span className="font-bold text-gray-900">{cashPrices.priceWithoutTax.toLocaleString()} ريال</span>
                        </div>
                        
                        <div className="flex justify-between py-2 border-b border-gray-200">
                          <span className="text-gray-700">الضريبة (15%):</span>
                          <span className="font-bold text-orange-600">{cashPrices.tax.toLocaleString()} ريال</span>
                        </div>
                        
                        <div className="flex justify-between py-2 border-b border-gray-200 bg-green-50 px-2 rounded">
                          <span className="text-gray-700 font-medium">السعر شامل اللوح (بدون ضريبة):</span>
                          <span className="font-bold text-green-700 text-lg">{cashPrices.totalWithPlateNoTax.toLocaleString()} ريال</span>
                        </div>
                        
                        <div className="flex justify-between py-2 bg-blue-100 px-2 rounded">
                          <span className="text-gray-900 font-bold">السعر الإجمالي (شامل كل شيء):</span>
                          <span className="font-bold text-blue-700 text-xl">{cashPrices.totalWithPlateAndTax.toLocaleString()} ريال</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                // حقول التقسيط
                <div className="space-y-6">
                  
                  {/* بيانات العميل الإضافية و الالتزامات */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {/* بيانات العميل الإضافية */}
                    <div className="border-2 border-purple-200 rounded-lg p-4 bg-purple-50">
                      <h4 className="text-sm font-bold text-purple-900 mb-3">بيانات العميل الإضافية</h4>
                      
                      <div className="grid grid-cols-1 gap-4">
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
                            <option value="">اختر جهة العمل</option>
                            {workOrganizationOptions.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            العمر
                          </label>
                          <input
                            {...register('age')}
                            type="number"
                            className="input"
                            placeholder="مثال: 35"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            البنك الذي ينزل عليه الراتب
                          </label>
                          <select {...register('salaryBankId')} className="input">
                            <option value="">اختر البنك</option>
                            {banksData?.map((bank) => (
                              <option key={bank.id} value={bank.id}>
                                {bank.name}
                              </option>
                            ))}
                          </select>
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
                            placeholder="مثال: 8000"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            نسبة التأمين (%)
                          </label>
                          <input
                            {...register('insurancePercentage')}
                            type="number"
                            step="0.01"
                            min="0"
                            max="100"
                            className="input"
                            placeholder="مثال: 5.5"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            هل يوجد إيقاف خدمات؟
                          </label>
                          <div className="flex items-center space-x-4">
                            <label className="flex items-center">
                              <input
                                {...register('hasServiceStop')}
                                type="radio"
                                value="true"
                                className="text-primary-600 focus:ring-primary-500"
                              />
                              <span className="mr-2 text-sm">نعم</span>
                            </label>
                            <label className="flex items-center">
                              <input
                                {...register('hasServiceStop')}
                                type="radio"
                                value="false"
                                className="text-primary-600 focus:ring-primary-500"
                              />
                              <span className="mr-2 text-sm">لا</span>
                            </label>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* قسم الالتزامات */}
                    <div className="border-2 border-orange-200 rounded-lg p-4 bg-orange-50">
                      <h4 className="text-sm font-bold text-orange-900 mb-3">الالتزامات</h4>
                    
                    <div className="space-y-4">
                      {/* نوع الالتزام */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          نوع الالتزام (يمكن اختيار أكثر من خيار)
                        </label>
                        <div className="flex gap-4 flex-wrap">
                          {obligationTypeOptions.map((option) => (
                            <label key={option.id} className="flex items-center">
                              <input
                                type="checkbox"
                                checked={watchedValues.obligationTypes?.includes(option.id) || false}
                                onChange={(e) => handleObligationTypeChange(option.id, e.target.checked)}
                                className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                              />
                              <span className="mr-2 text-sm text-gray-700">{option.label}</span>
                            </label>
                          ))}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            نسبة الاستقطاع (%)
                          </label>
                          <input
                            {...register('deductionPercentage')}
                            type="number"
                            step="0.01"
                            min="0"
                            max="100"
                            className="input"
                            placeholder="مثال: 33.5"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            التزام 1
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
                            التزام 2
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

                      {/* الحسابات التلقائية للالتزامات */}
                      {installmentAmounts && (installmentAmounts.deductedAmount > 0 || installmentAmounts.finalAmount !== 0) && (
                        <div className="mt-4 bg-white rounded-lg p-4 border-2 border-orange-300">
                          <h5 className="text-sm font-bold text-orange-900 mb-3">الحسابات التلقائية:</h5>
                          
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between py-2 border-b border-gray-200">
                              <span className="text-gray-700">المبلغ المستقطع (الراتب × النسبة):</span>
                              <span className="font-bold text-blue-600">{installmentAmounts.deductedAmount.toLocaleString()} ريال</span>
                            </div>
                            
                            <div className="flex justify-between py-2 border-b border-gray-200">
                              <span className="text-gray-700">إجمالي الالتزامات + (الفيزا × 0.05):</span>
                              <span className="font-bold text-red-600">{installmentAmounts.totalObligations.toLocaleString()} ريال</span>
                            </div>
                            
                            <div className="flex justify-between py-2 bg-green-100 px-2 rounded">
                              <span className="text-gray-900 font-bold">المبلغ المستقطع بعد خصم الالتزامات:</span>
                              <span className="font-bold text-green-700 text-lg">{installmentAmounts.finalAmount.toLocaleString()} ريال</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                    </div>
                  </div>

                  {/* تفاصيل سعر السيارة + تحليل ايراد سريع */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
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
                      <h4 className="text-sm font-bold text-yellow-900 mb-3">💰 تحليل ايراد سريع</h4>
                      {(() => {
                        const car = parseFloat(watchedValues.carPrice || '0') || 0
                        const add = parseFloat(watchedValues.additionalFees || '0') || 0
                        const ship = parseFloat(watchedValues.shipping || '0') || 0
                        const reg = parseFloat(watchedValues.registration || '0') || 0
                        const other = parseFloat(watchedValues.otherAdditions || '0') || 0
                        const plate = parseFloat(watchedValues.plateNumber || '0') || 0
                        const priceWithPlateNoTax = (car + add + ship + reg + other) + plate
                        const supportPct = parseFloat(((watchedValues as any)?._supportPct || '0')) || 0
                        const supportAmount = priceWithPlateNoTax * 1.15 * (supportPct / 100)
                        // عمولة البائع: 300 للتقسيط، 200 للكاش
                        const sellerCommission = requestType === 'INSTALLMENT' ? 300 : 200
                        // مصروفات البيع (بدون عمولة البائع)
                        const expensesWithoutCommission = reg + ship + plate + other + supportAmount
                        // مصروفات البيع (شاملة عمولة البائع)
                        const expenses = expensesWithoutCommission + sellerCommission
                        const cost = parseFloat(((watchedValues as any)?._quickCost || '0')) || 0
                        const net = priceWithPlateNoTax - cost - expenses
                        const pct = priceWithPlateNoTax > 0 ? (net / priceWithPlateNoTax) * 100 : 0
                        return (
                          <div className="space-y-3">
                            <div>
                              <label className="block text-sm font-semibold text-gray-800 mb-1">سعر البيع (تلقائي)</label>
                              <input className="input bg-gray-100" value={`${Math.round(priceWithPlateNoTax).toLocaleString()} ريال`} disabled />
                            </div>
                            <div>
                              <label className="block text-sm font-semibold text-gray-800 mb-1">سعر التكلفة أو شراء السيارة</label>
                              <input className="input" type="number" step="0.01" value={(watchedValues as any)?._quickCost || ''} onChange={(e)=>setValue('_quickCost' as any, e.target.value)} placeholder="0.00" />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className="block text-sm font-semibold text-gray-800 mb-1">حسبة الدعم (%)</label>
                                <input className="input" type="number" step="0.01" value={(watchedValues as any)?._supportPct || ''} onChange={(e)=>setValue('_supportPct' as any, e.target.value)} placeholder="أدخل النسبة" />
                              </div>
                              <div>
                                <label className="block text-sm font-semibold text-gray-800 mb-1">مبلغ حسبة الدعم</label>
                                <input className="input bg-gray-100" value={`${Math.round(supportAmount).toLocaleString()} ريال`} disabled />
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
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
                            <div>
                              <label className="block text-sm font-semibold text-gray-800 mb-1">إجمالي مصروفات البيع (تلقائي)</label>
                              <input className="input bg-gray-100" value={`${Math.round(expenses).toLocaleString()} ريال`} disabled />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className="block text-sm font-semibold text-gray-800 mb-1">صافي الايراد (مبلغ)</label>
                                <input className="input bg-gray-100" value={`${Math.round(net).toLocaleString()} ريال`} disabled />
                              </div>
                              <div>
                                <label className="block text-sm font-semibold text-gray-800 mb-1">صافي الايراد (نسبة)</label>
                                <input className="input bg-gray-100" value={`${pct.toFixed(2)} %`} disabled />
                              </div>
                            </div>
                          </div>
                        )
                      })()}
                    </div>
                  </div>

                  {/* معاملات التمويل */}
                  <div className="border-2 border-indigo-200 rounded-lg p-4 bg-indigo-50">
                    <h4 className="text-sm font-bold text-purple-900 mb-3">🏦 معاملات التمويل</h4>
                    
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      {/* البنك المختار للتمويل */}
                      <div className="sm:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          البنك المختار للتمويل 🏛️
                        </label>
                        <select
                          {...register('financingBankId')}
                          className="input"
                        >
                          <option value="">-- اختر البنك --</option>
                          {banksData?.map((bank) => (
                            <option key={bank.id} value={bank.id}>
                              {bank.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* ملاحظات البنك المختار للتمويل 🏛️ */}
                      {(() => {
                        if (!financingBankId || !banksData) return null;
                        
                        const selectedBank = banksData.find(b => b.id === financingBankId);
                        if (!selectedBank) return null;
                        
                        const isRajhiBank = selectedBank.name.toLowerCase().includes('راجحي') || 
                                           selectedBank.name.toLowerCase().includes('rajhi') ||
                                           financingBankId === 'rajhi';
                        
                        return (
                          <div className="sm:col-span-2 bg-blue-50 border border-blue-200 rounded-lg p-4">
                            <h5 className="text-sm font-bold text-blue-900 mb-2">📝 ملاحظات البنك المختار للتمويل 🏛️</h5>
                            <p className="text-sm text-blue-800 whitespace-pre-wrap">
                              {selectedBank.notes ? selectedBank.notes : (isRajhiBank ? 'بنك الراجحي - له معادلات خاصة للحساب. النسب في صفحة البنوك والتمويل تُستخدم للحساب، لكن المعادلة ثابتة.' : 'لا توجد ملاحظات خاصة بهذا البنك')}
                            </p>
                          </div>
                        );
                      })()}

                      {/* نسبة الدفعة الأولى */}
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
                          placeholder="مثال: 15"
                        />
                      </div>

                      {/* نسبة الدفعة الأخيرة */}
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
                          placeholder="مثال: 10"
                        />
                      </div>

                      {/* هامش الربح */}
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
                          placeholder="مثال: 7.5"
                          value={watchedValues.profitMargin || ''}
                          onChange={(e) => setValue('profitMargin', e.target.value)}
                        />
                        {autoCalculatedRate !== null && (
                          <p className="mt-1 text-xs text-green-600">
                            ✓ تم حسابها تلقائياً: {autoCalculatedRate}% (يمكنك تعديلها إذا لزم الأمر)
                          </p>
                        )}
                        {autoCalculatedRate === null && financingBankId && !isRajhiSelected && salaryBankId && workOrganization && (
                          <p className="mt-1 text-xs text-gray-500">
                            ℹ️ قم بإدخال النسبة يدوياً أو تأكد من وجود النسبة للبنك وجهة العمل المختارة
                          </p>
                        )}
                      </div>

                      {/* عدد أشهر التقسيط */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          عدد أشهر التقسيط 📅
                        </label>
                        <select
                          {...register('installmentMonths')}
                          className="input"
                        >
                          <option value="12">12 شهر (سنة واحدة)</option>
                          <option value="24">24 شهر (سنتان)</option>
                          <option value="36">36 شهر (3 سنوات)</option>
                          <option value="48">48 شهر (4 سنوات)</option>
                          <option value="60" selected>60 شهر (5 سنوات)</option>
                          <option value="72">72 شهر (6 سنوات)</option>
                          <option value="84">84 شهر (7 سنوات)</option>
                        </select>
                      </div>
                    </div>

                    {/* عرض نتائج التمويل للراجحي */}
                    {rajhiFinancing && (
                      <div className="mt-4 p-4 bg-white rounded-lg border border-purple-300">
                        <h5 className="text-sm font-bold text-purple-800 mb-3">💳 نتائج تمويل الراجحي</h5>
                        <div className="grid grid-cols-1 gap-3 text-sm">
                          <div className="grid grid-cols-2 gap-4">
                            <div className="p-2 bg-gray-50 rounded">
                              <span className="text-gray-600">مبلغ التمويل:</span>
                              <span className="font-bold text-blue-600 block">{rajhiFinancing.financingAmount.toLocaleString()} ريال</span>
                            </div>
                            <div className="p-2 bg-gray-50 rounded">
                              <span className="text-gray-600">الدفعة الأولى:</span>
                              <span className="font-bold text-green-600 block">{rajhiFinancing.downPayment.toLocaleString()} ريال</span>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="p-2 bg-gray-50 rounded">
                              <span className="text-gray-600">الرسوم الإدارية:</span>
                              <span className="font-bold text-red-600 block">{rajhiFinancing.adminFees.toLocaleString()} ريال</span>
                            </div>
                            <div className="p-2 bg-gray-50 rounded">
                              <span className="text-gray-600">الدفعة الأخيرة:</span>
                              <span className="font-bold text-purple-600 block">{rajhiFinancing.finalPayment.toLocaleString()} ريال</span>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="p-2 bg-gray-50 rounded">
                              <span className="text-gray-600">القسط الشهري:</span>
                              <span className="font-bold text-orange-600 block">{Math.abs(rajhiFinancing.monthlyInstallment).toLocaleString()} ريال</span>
                            </div>
                            <div className="p-2 bg-gray-50 rounded">
                              <span className="text-gray-600">التأمين الشهري:</span>
                              <span className="font-bold text-yellow-600 block">{rajhiFinancing.monthlyInsurance.toLocaleString()} ريال</span>
                            </div>
                          </div>
                          <div className="p-3 bg-gradient-to-r from-purple-100 to-blue-100 rounded border-l-4 border-purple-500">
                            <div className="flex justify-between items-center">
                              <span className="font-bold text-purple-800">إجمالي القسط الشهري (مع التأمين):</span>
                              <span className="font-bold text-purple-900 text-lg">
                                {(Math.abs(rajhiFinancing.monthlyInstallment) + rajhiFinancing.monthlyInsurance).toLocaleString()} ريال
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

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
                      </div>
                    )}
                    
                    {/* تحذير إذا كان القسط الشهري أعلى من المسموح */}
                    {showWarning && generalFinancing && (
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
                                القسط الشهري أعلى من المبلغ المسموح للعميل بعد خصم الالتزامات. يرجى مراجعة المعاملات أو التفاوض مع العميل.
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* معلومة */}
              <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                <p className="text-sm text-blue-800">
                  ℹ️ سيتم إنشاء الطلب في حالة "عميل لم يتم الرد" ويمكنك نقله بين الحالات من لوحة Kanban.
                </p>
              </div>

              {/* الأزرار */}
              <div className="flex justify-end gap-3">
                <Link
                  to="/requests"
                  className="btn-outline"
                >
                  إلغاء
                </Link>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? 'جاري الإنشاء...' : 'إنشاء الطلب'}
                </button>
              </div>
              {/* ensure all opened containers are closed */}
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}