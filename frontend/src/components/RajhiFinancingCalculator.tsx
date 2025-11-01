import React from 'react'

interface InstallmentDetails {
  carPrice?: number
  additionalFees?: number
  shipping?: number
  registration?: number
  otherAdditions?: number
  plateNumber?: number
  insurancePercentage?: number
  financingBankId?: string
  financingBank?: {
    id: string
    name: string
  }
  downPaymentPercentage?: number
  finalPaymentPercentage?: number
  profitMargin?: number
  installmentMonths?: number
}

interface RajhiFinancingCalculatorProps {
  installmentDetails: InstallmentDetails
}

export const RajhiFinancingCalculator: React.FC<RajhiFinancingCalculatorProps> = ({ 
  installmentDetails 
}) => {
  // Calculate car prices
  const calculateCarPrices = () => {
    const carPrice = installmentDetails.carPrice || 0
    const additionalFees = installmentDetails.additionalFees || 0
    const shipping = installmentDetails.shipping || 0
    const registration = installmentDetails.registration || 0
    const otherAdditions = installmentDetails.otherAdditions || 0
    const plateNumber = installmentDetails.plateNumber || 0

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

  // Calculate Rajhi financing details
  const calculateRajhiFinancing = () => {
    const carPrices = calculateCarPrices()
    const carPriceWithTaxAndPlate = carPrices.finalPriceWithTaxAndPlate
    const downPaymentPercentage = (installmentDetails.downPaymentPercentage || 0) / 100
    const finalPaymentPercentage = (installmentDetails.finalPaymentPercentage || 0) / 100
    const profitMargin = (installmentDetails.profitMargin || 0) / 100
    const installmentMonths = installmentDetails.installmentMonths || 60
    const insurancePercentage = (installmentDetails.insurancePercentage || 0) / 100

    // 3. الدفعة الأولى = (نسبة الدفعة الأولى * سعر السيارة)
    const downPayment = downPaymentPercentage * carPriceWithTaxAndPlate

    // 1. مبلغ التمويل = (سعر سيارة شامل الضريبة واللوح - مبلغ الدفعة الأولى)
    const financingAmount = carPriceWithTaxAndPlate - downPayment

    // 2. الرسوم الإدارية = ROUND((MIN(5000; مبلغ التمويل*1%); 0)*1.15
    const adminFees = Math.round(Math.min(5000, financingAmount * 0.01) * 1.15)

    // 4. الدفعة الأخيرة = (نسبة الدفعة الأخيرة * سعر السيارة)
    const finalPayment = finalPaymentPercentage * carPriceWithTaxAndPlate

    // 5. التأمين للسنة الواحدة = (نسبة التأمين * 1.15 * سعر سيارة شامل الضريبة واللوح)
    const annualInsurance = insurancePercentage * 1.15 * carPriceWithTaxAndPlate

    // 6. التأمين على إجمالي سنوات التقسيط (مع انخفاض قيمة السيارة 15% كل سنة)
    let totalInsuranceAllYears = 0
    let currentCarValue = carPriceWithTaxAndPlate
    const years = Math.ceil(installmentMonths / 12)
    
    for (let year = 1; year <= years; year++) {
      const yearlyInsurance = insurancePercentage * 1.15 * currentCarValue
      totalInsuranceAllYears += yearlyInsurance
      currentCarValue *= 0.85 // انخفاض 15% كل سنة
    }

    // 7. التأمين للشهر الواحد = (إجمالي سعر التأمين / عدد أشهر التقسيط)
    const monthlyInsurance = totalInsuranceAllYears / installmentMonths

    // 8. إجمالي التأمين = (التأمين للشهر الواحد * عدد أشهر التقسيط)
    const totalInsurance = monthlyInsurance * installmentMonths

    // 9. القسط الشهري = PMT(هامش الربح/12; عدد أشهر التقسيط; -مبلغ التمويل; مبلغ الدفعة الأخيرة)
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
      monthlyInstallment: Math.abs(monthlyInstallment),
      installmentMonths,
      profitMargin: profitMargin * 100,
      carPrices
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

  const financing = calculateRajhiFinancing()
  
  // Check if it's Rajhi Bank by ID, name, or financingBankId
  const bankName = installmentDetails.financingBank?.name || ''
  const isRajhiBank = 
    installmentDetails.financingBankId === 'rajhi' ||
    bankName.toLowerCase().includes('راجحي') ||
    bankName.toLowerCase().includes('rajhi')

  return (
    <div className="space-y-6">
      {/* Car Price Breakdown */}
      <div className="bg-green-50 border-2 border-green-200 rounded-lg p-4">
        <h4 className="text-sm font-bold text-green-900 mb-3">🚗 تفاصيل سعر السيارة</h4>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 mb-4">
          <div className="bg-white p-3 rounded-lg border border-green-300">
            <p className="text-xs text-gray-600">سعر السيارة الأساسي</p>
            <p className="text-lg font-bold text-gray-900">{(installmentDetails.carPrice || 0).toLocaleString()} ريال</p>
          </div>
          <div className="bg-white p-3 rounded-lg border border-green-300">
            <p className="text-xs text-gray-600">زيادة إضافية</p>
            <p className="text-lg font-bold text-gray-900">{(installmentDetails.additionalFees || 0).toLocaleString()} ريال</p>
          </div>
          <div className="bg-white p-3 rounded-lg border border-green-300">
            <p className="text-xs text-gray-600">الشحن</p>
            <p className="text-lg font-bold text-gray-900">{(installmentDetails.shipping || 0).toLocaleString()} ريال</p>
          </div>
          <div className="bg-white p-3 rounded-lg border border-green-300">
            <p className="text-xs text-gray-600">التجيير</p>
            <p className="text-lg font-bold text-gray-900">{(installmentDetails.registration || 0).toLocaleString()} ريال</p>
          </div>
          <div className="bg-white p-3 rounded-lg border border-green-300">
            <p className="text-xs text-gray-600">زيادة أخرى</p>
            <p className="text-lg font-bold text-gray-900">{(installmentDetails.otherAdditions || 0).toLocaleString()} ريال</p>
          </div>
          <div className="bg-white p-3 rounded-lg border border-green-300">
            <p className="text-xs text-gray-600">اللوح</p>
            <p className="text-lg font-bold text-gray-900">{(installmentDetails.plateNumber || 0).toLocaleString()} ريال</p>
          </div>
        </div>

        <div className="space-y-2 border-t-2 border-green-300 pt-3">
          <div className="flex justify-between py-2 px-3 bg-white rounded-lg">
            <span className="text-sm text-gray-700">المجموع الفرعي</span>
            <span className="font-bold text-gray-900">{financing.carPrices.subtotal.toLocaleString()} ريال</span>
          </div>
          <div className="flex justify-between py-2 px-3 bg-white rounded-lg">
            <span className="text-sm text-gray-700">الضريبة (15%)</span>
            <span className="font-bold text-red-600">+{financing.carPrices.tax.toLocaleString()} ريال</span>
          </div>
          <div className="flex justify-between py-3 px-3 bg-green-100 rounded-lg border-2 border-green-400">
            <span className="text-sm font-bold text-green-900">السعر النهائي (شامل الضريبة واللوح)</span>
            <span className="font-bold text-green-700 text-xl">{financing.carPrices.finalPriceWithTaxAndPlate.toLocaleString()} ريال</span>
          </div>
          <div className="flex justify-between py-2 px-3 bg-blue-100 rounded-lg border border-blue-300">
            <span className="text-sm font-medium text-blue-900">السعر شامل اللوح (بدون ضريبة)</span>
            <span className="font-bold text-blue-700">{financing.carPrices.priceWithPlateNoTax.toLocaleString()} ريال</span>
          </div>
        </div>
      </div>

      {/* Financing Results */}
      {isRajhiBank ? (
        <>
          <div className="bg-purple-50 border-2 border-purple-200 rounded-lg p-4">
            <h4 className="text-sm font-bold text-purple-900 mb-3">💳 نتائج تمويل الراجحي</h4>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 mb-4">
              <div className="bg-white p-3 rounded-lg border border-purple-300">
                <p className="text-xs text-gray-600">مبلغ التمويل</p>
                <p className="text-lg font-bold text-blue-600">{financing.financingAmount.toLocaleString()} ريال</p>
              </div>
              <div className="bg-white p-3 rounded-lg border border-purple-300">
                <p className="text-xs text-gray-600">الدفعة الأولى ({(installmentDetails.downPaymentPercentage || 0)}%)</p>
                <p className="text-lg font-bold text-green-600">{financing.downPayment.toLocaleString()} ريال</p>
              </div>
              <div className="bg-white p-3 rounded-lg border border-purple-300">
                <p className="text-xs text-gray-600">الرسوم الإدارية</p>
                <p className="text-lg font-bold text-red-600">{financing.adminFees.toLocaleString()} ريال</p>
              </div>
              <div className="bg-white p-3 rounded-lg border border-purple-300">
                <p className="text-xs text-gray-600">الدفعة الأخيرة ({(installmentDetails.finalPaymentPercentage || 0)}%)</p>
                <p className="text-lg font-bold text-purple-600">{financing.finalPayment.toLocaleString()} ريال</p>
              </div>
              <div className="bg-white p-3 rounded-lg border border-purple-300">
                <p className="text-xs text-gray-600">القسط الشهري</p>
                <p className="text-lg font-bold text-orange-600">{financing.monthlyInstallment.toLocaleString()} ريال</p>
              </div>
              <div className="bg-white p-3 rounded-lg border border-purple-300">
                <p className="text-xs text-gray-600">التأمين الشهري</p>
                <p className="text-lg font-bold text-yellow-600">{financing.monthlyInsurance.toLocaleString()} ريال</p>
              </div>
            </div>

            <div className="space-y-2 border-t-2 border-purple-300 pt-3">
              <div className="flex justify-between py-2 px-3 bg-white rounded-lg">
                <span className="text-sm text-gray-700">عدد الأشهر</span>
                <span className="font-bold text-gray-900">{financing.installmentMonths} شهر</span>
              </div>
              <div className="flex justify-between py-2 px-3 bg-white rounded-lg">
                <span className="text-sm text-gray-700">هامش الربح السنوي</span>
                <span className="font-bold text-gray-900">{financing.profitMargin.toFixed(2)}%</span>
              </div>
              <div className="flex justify-between py-3 px-3 bg-gradient-to-r from-purple-100 to-blue-100 rounded-lg border-l-4 border-purple-500">
                <span className="font-bold text-purple-800">إجمالي القسط الشهري (مع التأمين)</span>
                <span className="font-bold text-purple-900 text-xl">
                  {(financing.monthlyInstallment + financing.monthlyInsurance).toLocaleString()} ريال
                </span>
              </div>
            </div>
          </div>

          {/* Insurance Details */}
          <div className="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-4">
            <h4 className="text-sm font-bold text-yellow-900 mb-3">🛡️ تفاصيل التأمين</h4>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="bg-white p-3 rounded-lg border border-yellow-300">
                <p className="text-xs text-gray-600">نسبة التأمين</p>
                <p className="text-lg font-bold text-gray-900">{(installmentDetails.insurancePercentage || 0)}%</p>
              </div>
              <div className="bg-white p-3 rounded-lg border border-yellow-300">
                <p className="text-xs text-gray-600">التأمين السنوي</p>
                <p className="text-lg font-bold text-yellow-700">{financing.annualInsurance.toLocaleString()} ريال</p>
              </div>
              <div className="bg-white p-3 rounded-lg border border-yellow-300">
                <p className="text-xs text-gray-600">إجمالي التأمين ({Math.ceil(financing.installmentMonths / 12)} سنوات)</p>
                <p className="text-lg font-bold text-yellow-700">{financing.totalInsuranceAllYears.toLocaleString()} ريال</p>
              </div>
              <div className="bg-white p-3 rounded-lg border border-yellow-300">
                <p className="text-xs text-gray-600">التأمين الشهري</p>
                <p className="text-lg font-bold text-yellow-700">{financing.monthlyInsurance.toLocaleString()} ريال</p>
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className="bg-gray-50 border-2 border-gray-200 rounded-lg p-4">
          <h4 className="text-sm font-bold text-gray-900 mb-3">🏦 معلومات التمويل العامة</h4>
          <div className="text-center py-4">
            <p className="text-sm text-gray-600">
              {installmentDetails.financingBankId ? 
                `تم اختيار بنك آخر للتمويل. المعادلات التفصيلية متوفرة فقط لبنك الراجحي.` :
                `لم يتم اختيار بنك للتمويل بعد.`
              }
            </p>
            <p className="text-xs text-gray-500 mt-2">
              اختر "بنك الراجحي" لرؤية المعادلات التفصيلية والحسابات الدقيقة.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
