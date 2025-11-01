// Dynamic import at runtime to avoid breaking initial page load if the library fails to resolve

export interface EradData {
  requestType: 'CASH' | 'INSTALLMENT'
  priceWithPlateNoTax: number
  plateAmount: number
  shippingAmount: number
  supportPct?: number
  quickCost?: number
  vin?: string
}

declare global {
  interface Window {
    XlsxPopulate?: any
  }
}

async function loadXlsxPopulateFromCdn(): Promise<any> {
  if (window.XlsxPopulate) return window.XlsxPopulate
  await new Promise<void>((resolve, reject) => {
    const script = document.createElement('script')
    script.src = 'https://cdn.jsdelivr.net/npm/xlsx-populate/browser/xlsx-populate.min.js'
    script.async = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('تعذر تحميل مكتبة xlsx-populate'))
    document.head.appendChild(script)
  })
  if (!window.XlsxPopulate) throw new Error('لم يتم تحميل مكتبة xlsx-populate')
  return window.XlsxPopulate
}

export async function generateEradExcel(data: EradData): Promise<Blob> {
  const XlsxPopulate = await loadXlsxPopulateFromCdn()
  const res = await fetch('/templates/erad.xlsx')
  if (!res.ok) throw new Error('تعذر تحميل قالب إيراد')
  const arrayBuffer = await res.arrayBuffer()

  const workbook = await XlsxPopulate.fromDataAsync(arrayBuffer)
  const sheet = (workbook.sheet('Sheet1') || workbook.sheet(0))

  const setNumber = (addr: string, value: number) => {
    sheet.cell(addr).value(Number.isFinite(value) ? value : 0)
  }

  const setText = (addr: string, value: string) => {
    sheet.cell(addr).value(value)
  }

  setNumber('C24', Math.round(data.priceWithPlateNoTax))
  setText('C19', data.requestType === 'CASH' ? 'كاش' : 'تقسيط')

  const plateToG31 = Math.min(250, Math.max(0, data.plateAmount || 0))
  const plateRemainder = Math.max(0, (data.plateAmount || 0) - plateToG31)
  if (plateToG31 > 0) setNumber('G31', Math.round(plateToG31))
  if (plateRemainder > 0) setNumber('J31', Math.round(plateRemainder))

  if (data.shippingAmount && data.shippingAmount > 0) {
    setNumber('A40', Math.round(data.shippingAmount))
  }

  setNumber('D43', 70)

  // Optional: support percent → A34
  if (data.supportPct !== undefined) {
    setNumber('A34', data.supportPct)
  }
  // Optional: quick cost → C25
  if (data.quickCost !== undefined) {
    setNumber('C25', Math.round(data.quickCost))
  }
  // Optional: VIN → I10
  if (data.vin) {
    setText('I10', data.vin)
  }

  const blob = await workbook.outputAsync('blob')
  return blob as Blob
}

export interface OfferData {
  carName?: string
  bankName?: string
  saleNoPlate?: number
  plateAmount?: number
  vin?: string
  specifications?: string  // الموصفات - سيتم إدخاله في C22
  costColor?: string      // التكلفة.اللون - سيتم إدخاله في E22
  model?: string          // الموديل - سيتم إدخاله في D22
}

export async function generateOfferExcel(data: OfferData): Promise<Blob> {
  const XlsxPopulate = await loadXlsxPopulateFromCdn()
  const res = await fetch('/templates/offer.xlsx')
  if (!res.ok) throw new Error('تعذر تحميل قالب عرض السعر')
  const arrayBuffer = await res.arrayBuffer()

  const workbook = await XlsxPopulate.fromDataAsync(arrayBuffer)
  const sheet = (workbook.sheet('Sheet1') || workbook.sheet(0))

  const setNumber = (addr: string, value: number) => {
    sheet.cell(addr).value(Number.isFinite(value) ? value : 0)
  }
  const setText = (addr: string, value: string) => {
    sheet.cell(addr).value(value)
  }

  if (data.carName) setText('B22', data.carName)
  if (data.bankName) setText('C18', data.bankName)
  if (data.saleNoPlate !== undefined) setNumber('G22', Math.round(data.saleNoPlate))
  if (data.plateAmount !== undefined) setNumber('I22', Math.round(data.plateAmount))
  if (data.vin) setText('F22', data.vin)
  // بيانات السيارة المربوطة من المخزون
  if (data.specifications) setText('C22', data.specifications)  // الموصفات
  if (data.costColor) setText('E22', data.costColor)            // التكلفة.اللون
  if (data.model) setText('D22', data.model)                     // الموديل

  const blob = await workbook.outputAsync('blob')
  return blob as Blob
}

export interface CarHandoverData {
  // بيانات عامة
  branch?: string      // C6 - الفرع
  warehouse?: string   // C7 - المستودع
  
  // بيانات العميل
  company?: string     // C10 - الشركة/البنك (تلقائي)
  clientName?: string  // C11, C18 - اسم العميل
  clientPhone?: string // I10 - جوال العميل (تلقائي)
  clientIdNumber?: string // I11, C20 - رقم إثبات العميل (تلقائي)
  nationality?: string // C19 - الجنسية
  
  // بيانات السيارة
  manufacturer?: string  // C13 - شركة التصنيع
  carType?: string       // C14 - نوع السيارة
  carCategory?: string   // C15 - فئة السيارة
  color?: string         // C16 - اللون (تلقائي إذا مربوط)
  model?: string         // I13 - الموديل (تلقائي إذا مربوط)
  vin?: string           // I14 - رقم الهيكل (تلقائي إذا موجود)
  plateNumber?: string   // I15 - رقم اللوحة
}

export async function generateCarHandoverExcel(data: CarHandoverData): Promise<Blob> {
  const XlsxPopulate = await loadXlsxPopulateFromCdn()
  const res = await fetch('/templates/car-handover-receipt.xlsx')
  if (!res.ok) throw new Error('تعذر تحميل قالب سند تسليم السيارة')
  const arrayBuffer = await res.arrayBuffer()

  const workbook = await XlsxPopulate.fromDataAsync(arrayBuffer)
  const sheet = (workbook.sheet('Sheet1') || workbook.sheet(0))

  const setText = (addr: string, value: string) => {
    if (value) sheet.cell(addr).value(value)
  }

  // بيانات عامة
  if (data.branch) setText('C6', data.branch)
  if (data.warehouse) setText('C7', data.warehouse)
  
  // بيانات العميل
  if (data.company) setText('C10', data.company)
  if (data.clientName) {
    setText('C11', data.clientName)
    setText('C18', data.clientName)
  }
  if (data.clientPhone) setText('I10', data.clientPhone)
  if (data.clientIdNumber) {
    setText('I11', data.clientIdNumber)
    setText('C20', data.clientIdNumber)
  }
  if (data.nationality) setText('C19', data.nationality)
  
  // بيانات السيارة
  if (data.manufacturer) setText('C13', data.manufacturer)
  if (data.carType) setText('C14', data.carType)
  if (data.carCategory) setText('C15', data.carCategory)
  if (data.color) setText('C16', data.color)
  if (data.model) setText('I13', data.model)
  if (data.vin) setText('I14', data.vin)
  if (data.plateNumber) setText('I15', data.plateNumber)

  const blob = await workbook.outputAsync('blob')
  return blob as Blob
}

