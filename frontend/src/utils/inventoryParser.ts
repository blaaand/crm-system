/**
 * Utility functions for parsing inventory data to extract company and category
 * This is executed once when saving inventory, not on every page load
 */

// قائمة الشركات مع الاختلافات المحتملة في الكتابة
const COMPANY_PATTERNS: { [key: string]: string[] } = {
  'جيتور': ['جيتور', 'geely', 'geetor', 'جيلي', 'جيتورا', 'جيتر', 'جيتورا', 'جيلي'],
  'هيونداي': ['هيونداي', 'هونداي', 'hyundai', 'هيوندا', 'هوندا', 'هيوند', 'هوند'],
  'تويوتا': ['تويوتا', 'toyota', 'تويوتاه', 'تويوت', 'تويوتا', 'تويو'],
  'نيسان': ['نيسان', 'nissan', 'نيسان', 'نيس', 'نيسا'],
  'شيفروليه': ['شيفروليه', 'chevrolet', 'شيفروليه', 'شيفروليت', 'شيفرول', 'شيفر', 'شيف'],
  'كيا': ['كيا', 'kia', 'كيا', 'كي'],
  'هوندا': ['هوندا', 'honda', 'هوندا', 'هوند', 'هون'],
  'فورد': ['فورد', 'ford', 'فورد', 'فور', 'فور'],
  'مرسيدس': ['مرسيدس', 'mercedes', 'مرسيدس', 'مرسدس', 'مرس', 'مرسد'],
  'بي إم دبليو': ['بي إم دبليو', 'bmw', 'بي ام دبليو', 'بي ام', 'b.m.w', 'بي ام دبليو'],
  'أودي': ['أودي', 'audi', 'أودي', 'أود'],
  'لكزس': ['لكزس', 'lexus', 'لكزس', 'لكز'],
  'مازدا': ['مازدا', 'mazda', 'مازدا', 'ماز'],
  'ميتسوبيشي': ['ميتسوبيشي', 'mitsubishi', 'ميتسوبيشي', 'ميتسوب', 'ميتسو'],
  'سوزوكي': ['سوزوكي', 'suzuki', 'سوزوكي', 'سوزو'],
  'رينو': ['رينو', 'renault', 'رينو', 'رين'],
  'بيجو': ['بيجو', 'peugeot', 'بيجو', 'بيج'],
}

// قائمة الفئات الشائعة
const CATEGORY_PATTERNS: { [key: string]: string[] } = {
  'النترا': ['النترا', 'elantra', 'الأنترا', 'النت', 'النتر', 'النترا', 'elantra'],
  'السوناتا': ['السوناتا', 'sonata', 'السونات', 'السون', 'سوناتا'],
  'الكامري': ['الكامري', 'camry', 'الكامري', 'الكامر', 'كامري'],
  'الكورولا': ['الكورولا', 'corolla', 'الكورول', 'الكور', 'كورولا'],
  'الراف 4': ['الراف 4', 'rav4', 'راف 4', 'الراف', 'راف4', 'rav 4'],
  'الهايلكس': ['الهايلكس', 'hilux', 'الهيلكس', 'الهيل', 'هايلكس'],
  'x50': ['x50', 'x 50', 'اكس 50', 'اكس50', 'x-50', 'اكس-50'],
  'x60': ['x60', 'x 60', 'اكس 60', 'اكس60', 'x-60', 'اكس-60'],
  'x70': ['x70', 'x 70', 'اكس 70', 'اكس70', 'x-70', 'اكس-70'],
  'x90': ['x90', 'x 90', 'اكس 90', 'اكس90', 'x-90', 'اكس-90'],
  'لاكجري': ['لاكجري', 'lacgry', 'لاكجري', 'لاكج', 'لاكجري', 'lacgry'],
  'سمار': ['سمار', 'smart', 'سما', 'سم', 'سمارت'],
  'كمفورت': ['كمفورت', 'comfort', 'كمفور', 'كمف', 'كومفورت'],
  'لوكس': ['لوكس', 'lux', 'لوك', 'لوكس', 'لكس'],
  'بريميوم': ['بريميوم', 'premium', 'بريمي', 'بريم', 'بريمي'],
  'النترا سمار': ['النترا سمار', 'elantra smart', 'النترا سمار', 'النت سمار'],
  'النترا كمفورت': ['النترا كمفورت', 'elantra comfort', 'النترا كمفورت', 'النت كمفورت'],
  'جيتور x50 لاكجري': ['جيتور x50 لاكجري', 'geely x50 lacgry', 'x50 لاكجري', 'x50 لاكج'],
  'جيتور x60 لاكجري': ['جيتور x60 لاكجري', 'geely x60 lacgry', 'x60 لاكجري', 'x60 لاكج'],
  'جيتور x70 لاكجري': ['جيتور x70 لاكجري', 'geely x70 lacgry', 'x70 لاكجري', 'x70 لاكج'],
  'جيتور x90 لاكجري': ['جيتور x90 لاكجري', 'geely x90 lacgry', 'x90 لاكجري', 'x90 لاكج'],
}

/**
 * Normalize text for comparison (remove diacritics, spaces, etc.)
 */
function normalizeText(text: string): string {
  if (!text) return ''
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/[أإآا]/g, 'ا') // normalize alef variations
    .replace(/[يى]/g, 'ي') // normalize yeh variations
    .replace(/[ةه]/g, 'ه') // normalize teh/heh
    .replace(/[ؤ]/g, 'و') // normalize waw with hamza
    .replace(/[ئ]/g, 'ي') // normalize yeh with hamza
    .replace(/[ًٌٍَُِّْ]/g, '') // remove diacritics
    .replace(/\s+/g, ' ') // normalize spaces
    .trim()
}

/**
 * Find company name from text
 */
function extractCompany(text: string): string {
  if (!text) return ''
  
  const normalized = normalizeText(text)
  
  // Search for company patterns
  for (const [company, patterns] of Object.entries(COMPANY_PATTERNS)) {
    for (const pattern of patterns) {
      const normalizedPattern = normalizeText(pattern)
      if (normalized.includes(normalizedPattern)) {
        return company
      }
    }
  }
  
  return ''
}

/**
 * Extract category from text (after removing company name)
 */
function extractCategory(text: string, company: string): string {
  if (!text) return ''
  
  const normalized = normalizeText(text)
  
  // Remove company name from text
  let textWithoutCompany = normalized
  if (company) {
    const companyPatterns = COMPANY_PATTERNS[company] || []
    for (const pattern of companyPatterns) {
      const normalizedPattern = normalizeText(pattern)
      // Remove company name (case-insensitive, whole word if possible)
      textWithoutCompany = textWithoutCompany.replace(new RegExp(`\\b${normalizedPattern}\\b`, 'gi'), '').trim()
      textWithoutCompany = textWithoutCompany.replace(normalizedPattern, '').trim()
    }
  }
  
  // Search for category patterns (longer patterns first for better matching)
  const sortedCategories = Object.entries(CATEGORY_PATTERNS).sort((a, b) => {
    const aMaxLen = Math.max(...a[1].map(p => p.length))
    const bMaxLen = Math.max(...b[1].map(p => p.length))
    return bMaxLen - aMaxLen // Longer patterns first
  })
  
  for (const [category, patterns] of sortedCategories) {
    for (const pattern of patterns) {
      const normalizedPattern = normalizeText(pattern)
      // Check if pattern exists in text (with or without company)
      if (textWithoutCompany.includes(normalizedPattern) || normalized.includes(normalizedPattern)) {
        return category
      }
    }
  }
  
  // If no category found, try to extract meaningful part after company
  if (textWithoutCompany.length > 0) {
    // Clean up text
    textWithoutCompany = textWithoutCompany.replace(/[^\w\s\u0600-\u06FF]/g, ' ').trim()
    // Take first meaningful words (2-4 words max, filter short words)
    const words = textWithoutCompany.split(/\s+/).filter(w => w.length > 2)
    if (words.length > 0) {
      const extracted = words.slice(0, 4).join(' ')
      // Only return if it's meaningful (at least 3 characters)
      if (extracted.length >= 3) {
        return extracted
      }
    }
  }
  
  return ''
}

/**
 * Extract company and category from inventory row
 * Checks "اسم الصنف" first, then "اسم المجموعة" if not found
 */
export function extractCompanyAndCategory(row: Record<string, any>, headers: string[]): { company: string; category: string } {
  // Find header names (case-insensitive, handle variations)
  const itemNameHeader = headers.find(h => 
    normalizeText(h).includes('اسم الصنف') || 
    normalizeText(h).includes('الصنف') ||
    normalizeText(h).includes('اسم') && normalizeText(h).includes('صنف')
  )
  
  const groupNameHeader = headers.find(h => 
    normalizeText(h).includes('اسم المجموعة') || 
    normalizeText(h).includes('المجموعة') ||
    normalizeText(h).includes('اسم') && normalizeText(h).includes('مجموعة')
  )
  
  // Try item name first
  let textToParse = ''
  if (itemNameHeader && row[itemNameHeader]) {
    textToParse = String(row[itemNameHeader]).trim()
  }
  
  // If not found or empty, try group name
  if (!textToParse && groupNameHeader && row[groupNameHeader]) {
    textToParse = String(row[groupNameHeader]).trim()
  }
  
  if (!textToParse) {
    return { company: '', category: '' }
  }
  
  // Extract company
  const company = extractCompany(textToParse)
  
  // Extract category
  const category = extractCategory(textToParse, company)
  
  return { company, category }
}

/**
 * Process inventory data to add company and category columns
 * This should be called once when saving inventory
 */
export function processInventoryData(headers: string[], data: Record<string, any>[]): {
  headers: string[]
  data: Record<string, any>[]
} {
  // Check if columns already exist
  const hasCompany = headers.some(h => normalizeText(h) === 'الشركة' || normalizeText(h).includes('شركة'))
  const hasCategory = headers.some(h => normalizeText(h) === 'الفئة' || normalizeText(h).includes('فئة'))
  
  const newHeaders = [...headers]
  const newData = [...data]
  
  // Add company column if not exists
  if (!hasCompany) {
    newHeaders.push('الشركة')
  }
  
  // Add category column if not exists
  if (!hasCategory) {
    newHeaders.push('الفئة')
  }
  
  // Process each row
  newData.forEach((row) => {
    // Only process if company or category is missing
    const companyHeader = newHeaders.find(h => normalizeText(h) === 'الشركة' || normalizeText(h).includes('شركة')) || 'الشركة'
    const categoryHeader = newHeaders.find(h => normalizeText(h) === 'الفئة' || normalizeText(h).includes('فئة')) || 'الفئة'
    
    if (!row[companyHeader] || !row[categoryHeader]) {
      const { company, category } = extractCompanyAndCategory(row, headers)
      
      // Only set if not already set (to preserve existing data)
      if (!row[companyHeader]) {
        row[companyHeader] = company
      }
      if (!row[categoryHeader]) {
        row[categoryHeader] = category
      }
    }
  })
  
  return { headers: newHeaders, data: newData }
}

