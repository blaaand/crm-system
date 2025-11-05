export default function Formulas() {
  const openCalculator = (type: 'CASH' | 'COMMITMENTS' | 'TAX_REMOVAL') => {
    // Dispatch event to open floating calculator
    window.dispatchEvent(new CustomEvent('openCalculator', { detail: type }))
  }

  return (
    <div>
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
              onClick={() => openCalculator('CASH')}
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
              onClick={() => openCalculator('COMMITMENTS')}
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
              onClick={() => openCalculator('TAX_REMOVAL')}
              className="mt-4 w-full btn-primary"
            >
              فتح الحاسبة
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
